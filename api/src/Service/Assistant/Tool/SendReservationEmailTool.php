<?php

declare(strict_types=1);

namespace App\Service\Assistant\Tool;

use App\Entity\Reservation;
use App\Service\ReservationEmailService;
use Doctrine\ORM\EntityManagerInterface;

final class SendReservationEmailTool implements ToolInterface
{
    public function __construct(
        private readonly EntityManagerInterface $em,
        private readonly ReservationEmailService $email,
    ) {}

    public function getName(): string { return 'send_reservation_email'; }
    public function getDescription(): string
    {
        return 'Odešle potvrzovací / platební email zákazníkovi. Vyžaduje potvrzení.';
    }

    public function getParametersSchema(): array
    {
        return [
            'type' => 'object',
            'properties' => [
                'reservationId' => ['type' => 'integer'],
            ],
            'required' => ['reservationId'],
        ];
    }

    public function isReadOnly(): bool { return false; }
    public function getRequiredPermission(): ?string { return 'reservations.update'; }

    public function execute(array $params): array
    {
        $id = (int)($params['reservationId'] ?? 0);
        /** @var Reservation|null $r */
        $r = $this->em->getRepository(Reservation::class)->find($id);
        if (!$r) throw new \InvalidArgumentException('Rezervace nenalezena.');

        $ok = $this->email->sendReservationConfirmation($r);

        return [
            'id' => $id,
            'sent' => $ok,
            'link' => '/reservations/'.$id.'/edit',
            'message' => $ok ? 'Email odeslán zákazníkovi.' : 'Email se nepodařilo odeslat.',
        ];
    }

    public function buildPreview(array $params): ?string
    {
        $id = (int)($params['reservationId'] ?? 0);
        /** @var Reservation|null $r */
        $r = $this->em->getRepository(Reservation::class)->find($id);
        $who = $r?->getContactName() ?? "#$id";
        $mail = $r?->getContactEmail() ?? '?';
        return "Odeslat potvrzovací email: $who → $mail";
    }
}
