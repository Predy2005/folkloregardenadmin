<?php

declare(strict_types=1);

namespace App\Service\Push;

use App\Entity\Event;
use App\Entity\EventTransport;
use App\Entity\User;
use App\Entity\UserDevice;
use App\Repository\UserDeviceRepository;
use Doctrine\ORM\EntityManagerInterface;
use Psr\Log\LoggerInterface;
use Psr\Log\NullLogger;

/**
 * High-level push notifikace pro mobilní aplikaci personálu.
 *
 * Zaobaluje ExpoPushClient do doménových volání („personál byl přiřazený
 * na event", „řidič má novou jízdu") a řeší:
 *   - vyhledání všech zařízení uživatele (UserDevice)
 *   - fan-out přes ExpoPushClient (batch až 100 tokenů / request)
 *   - automatické odstraňování mrtvých tokenů (DeviceNotRegistered)
 *   - defenzivní chování: nikdy netrejuje, logguje a vrací počet odeslaných
 *
 * Mobilka posílá Expo push tokeny (`ExponentPushToken[...]`) — drží se ve
 * sloupci `user_device.fcm_token` (název sloupce zachován z doby FCM direct;
 * hodnota je opaque string, tak na názvu sloupce nezáleží).
 */
class PushNotificationService
{
    public function __construct(
        private readonly ExpoPushClient $push,
        private readonly UserDeviceRepository $deviceRepo,
        private readonly EntityManagerInterface $em,
        private readonly LoggerInterface $logger = new NullLogger(),
    ) {
    }

    // ─── Doménové notifikace ─────────────────────────────────────────────

    public function notifyStaffAssignedToEvent(User $user, Event $event, ?string $role = null): int
    {
        $roleLabel = match ($role) {
            'WAITER' => 'číšník',
            'COOK' => 'kuchař',
            default => null,
        };
        $title = $roleLabel
            ? "Nová akce — {$roleLabel}"
            : 'Nová akce';
        $body = sprintf(
            '%s, %s od %s',
            $event->getName(),
            $event->getEventDate()->format('d.m.'),
            $event->getEventTime()->format('H:i')
        );
        return $this->notifyUser($user, $title, $body, [
            'type' => 'staff_assignment',
            'eventId' => $event->getId(),
            'deepLink' => '/events/' . $event->getId(),
        ]);
    }

    public function notifyStaffRemovedFromEvent(User $user, Event $event): int
    {
        return $this->notifyUser(
            $user,
            'Odhlášení z akce',
            sprintf('%s, %s — byl jsi odhlášen', $event->getName(), $event->getEventDate()->format('d.m.')),
            [
                'type' => 'staff_removal',
                'eventId' => $event->getId(),
            ]
        );
    }

    public function notifyDriverAssignedToTransport(User $user, EventTransport $t): int
    {
        $event = $t->getEvent();
        $when = $t->getScheduledTime()?->format('H:i') ?? $event?->getEventTime()->format('H:i') ?? '';
        $title = 'Nová jízda';
        $body = sprintf(
            '%s — %s %s, %s osob',
            $event?->getName() ?? 'Transport',
            $event?->getEventDate()->format('d.m.') ?? '',
            $when,
            $t->getPassengerCount() ?? '?'
        );
        return $this->notifyUser($user, $title, trim($body), [
            'type' => 'transport_assignment',
            'eventId' => $event?->getId(),
            'eventTransportId' => $t->getId(),
            'deepLink' => '/transports/' . $t->getId(),
        ]);
    }

    public function notifyDriverTransportChanged(User $user, EventTransport $t, string $summary): int
    {
        $event = $t->getEvent();
        return $this->notifyUser(
            $user,
            'Změna u jízdy',
            sprintf('%s — %s', $event?->getName() ?? 'Jízda', $summary),
            [
                'type' => 'transport_changed',
                'eventId' => $event?->getId(),
                'eventTransportId' => $t->getId(),
                'deepLink' => '/transports/' . $t->getId(),
            ]
        );
    }

    public function notifyDriverTransportCancelled(User $user, EventTransport $t): int
    {
        $event = $t->getEvent();
        return $this->notifyUser(
            $user,
            'Jízda zrušena',
            sprintf('%s, %s', $event?->getName() ?? 'Transport', $event?->getEventDate()->format('d.m.') ?? ''),
            [
                'type' => 'transport_cancelled',
                'eventId' => $event?->getId(),
                'eventTransportId' => $t->getId(),
            ]
        );
    }

    /**
     * Obecný způsob — pro vlastní notifikace z controllerů.
     *
     * @return int počet úspěšně odeslaných zpráv (součet přes všechna zařízení usera)
     */
    public function notifyUser(User $user, string $title, string $body, array $data = []): int
    {
        $devices = $this->deviceRepo->findByUser($user);
        if ($devices === []) {
            return 0;
        }

        $tokens = array_map(fn(UserDevice $d) => $d->getFcmToken(), $devices);
        $tokenToDevice = [];
        foreach ($devices as $d) {
            $tokenToDevice[$d->getFcmToken()] = $d;
        }

        try {
            $result = $this->push->sendToTokens($tokens, $title, $body, $data);
        } catch (\Throwable $e) {
            $this->logger->error('Expo push batch selhal: ' . $e->getMessage());
            return 0;
        }

        // Vyčistíme invalidní tokeny (uživatel odinstaloval app, vypršel token atd.)
        foreach ($result['invalidTokens'] as $badToken) {
            if (isset($tokenToDevice[$badToken])) {
                $this->em->remove($tokenToDevice[$badToken]);
            }
        }
        if ($result['invalidTokens'] !== []) {
            $this->em->flush();
        }

        // "lastSeenAt" refresh pro úspěšná zařízení
        foreach ($devices as $d) {
            if (!in_array($d->getFcmToken(), $result['invalidTokens'], true)) {
                $d->touch();
            }
        }
        $this->em->flush();

        return $result['successes'];
    }
}
