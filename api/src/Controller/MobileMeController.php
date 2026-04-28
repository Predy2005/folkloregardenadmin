<?php

declare(strict_types=1);

namespace App\Controller;

use App\Entity\User;
use App\Service\MobileAuthService;
use App\Service\MobileDataService;
use App\Service\MobileProfileService;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\File\UploadedFile;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Annotation\Route;
use Symfony\Component\Security\Core\Exception\AccessDeniedException;
use Symfony\Component\Security\Http\Attribute\IsGranted;

/**
 * Osobní endpointy mobilní aplikace — vše se vztahuje k přihlášenému uživateli
 * (`/me` konvence). Data jsou scoped přes User → StaffMember / TransportDriver,
 * přes tyto endpointy nelze načíst cizí záznamy.
 *
 * Všechny cesty vyžadují IS_AUTHENTICATED_FULLY (dědí z firewallu).
 * Konkrétní mobilní permissions jsou vynucené `#[IsGranted(...)]` na každé metodě.
 */
#[Route('/api/mobile/me')]
class MobileMeController extends AbstractController
{
    public function __construct(
        private readonly MobileDataService $data,
        private readonly MobileProfileService $profile,
        private readonly MobileAuthService $auth,
    ) {
    }

    // ─── PROFIL ────────────────────────────────────────────────────────

    /**
     * Editace vlastního profilu — firstName, lastName, phone, email.
     * Backend updatuje navázaný StaffMember NEBO TransportDriver podle toho,
     * který je k userovi připojený.
     */
    #[Route('', methods: ['PATCH'])]
    #[IsGranted('mobile_self.read')]
    public function updateProfile(Request $request): JsonResponse
    {
        $user = $this->requireUser();
        $data = json_decode($request->getContent(), true) ?? [];
        try {
            $this->profile->updateProfile($user, $data);
            return $this->json($this->auth->describeUser($user));
        } catch (\DomainException | \InvalidArgumentException $e) {
            return $this->json(['error' => $e->getMessage()], 400);
        }
    }

    /**
     * Upload profilové fotky (multipart `photo` field).
     * Vrací updated /me payload s novou photoUrl.
     */
    #[Route('/photo', methods: ['POST'])]
    #[IsGranted('mobile_self.read')]
    public function uploadPhoto(Request $request): JsonResponse
    {
        $user = $this->requireUser();
        $file = $request->files->get('photo');
        if (!$file instanceof UploadedFile) {
            return $this->json(['error' => 'Pole "photo" (multipart soubor) je povinné.'], 400);
        }
        try {
            $this->profile->uploadPhoto($user, $file);
            return $this->json($this->auth->describeUser($user));
        } catch (\DomainException | \InvalidArgumentException $e) {
            return $this->json(['error' => $e->getMessage()], 400);
        }
    }

    /** Smazání profilové fotky. */
    #[Route('/photo', methods: ['DELETE'])]
    #[IsGranted('mobile_self.read')]
    public function deletePhoto(): JsonResponse
    {
        $user = $this->requireUser();
        $this->profile->deletePhoto($user);
        return $this->json($this->auth->describeUser($user));
    }

    // ─── EVENTY ─────────────────────────────────────────────────────────

    #[Route('/events', methods: ['GET'])]
    #[IsGranted('mobile_events.read')]
    public function listEvents(Request $request): JsonResponse
    {
        $user = $this->requireUser();
        $from = $this->parseDate($request->query->get('from'));
        $to = $this->parseDate($request->query->get('to'));

        return $this->json([
            'events' => $this->data->listEventsForStaff($user, $from, $to),
        ]);
    }

    /**
     * Historie minulých akcí (s payment statusem).
     * Pozor na pořadí route — musí být PŘED `/events/{id}`, jinak Symfony
     * matchne `id=history`.
     */
    #[Route('/events/history', methods: ['GET'])]
    #[IsGranted('mobile_events.read')]
    public function listEventHistory(): JsonResponse
    {
        $user = $this->requireUser();
        return $this->json([
            'events' => $this->data->listEventHistoryForStaff($user),
        ]);
    }

    #[Route('/events/{id}', methods: ['GET'], requirements: ['id' => '\d+'])]
    #[IsGranted('mobile_events.read')]
    public function getEvent(int $id): JsonResponse
    {
        $user = $this->requireUser();
        try {
            return $this->json($this->data->getEventDetailForStaff($user, $id));
        } catch (\DomainException $e) {
            return $this->json(['error' => $e->getMessage()], 404);
        }
    }

    /**
     * Personál potvrdí účast nebo se odhlásí. Body:
     *   { response: "CONFIRMED" | "DECLINED", reason?: string }
     * Při DECLINED je reason povinný. Lock 4 h před začátkem akce.
     */
    #[Route('/events/{id}/respond', methods: ['POST'], requirements: ['id' => '\d+'])]
    #[IsGranted('mobile_events.read')]
    public function respondToEvent(int $id, Request $request): JsonResponse
    {
        $user = $this->requireUser();
        $data = json_decode($request->getContent(), true) ?? [];
        $response = isset($data['response']) ? (string)$data['response'] : '';
        $reason = isset($data['reason']) ? (string)$data['reason'] : null;
        try {
            return $this->json($this->data->respondToEvent($user, $id, $response, $reason));
        } catch (\InvalidArgumentException $e) {
            return $this->json(['error' => $e->getMessage()], 400);
        } catch (\DomainException $e) {
            return $this->json(['error' => $e->getMessage()], 409);
        }
    }

    // ─── DOCHÁZKA ──────────────────────────────────────────────────────

    #[Route('/attendance/checkin', methods: ['POST'])]
    #[IsGranted('mobile_attendance.record')]
    public function checkIn(Request $request): JsonResponse
    {
        $user = $this->requireUser();
        $data = json_decode($request->getContent(), true) ?? [];
        $eventId = isset($data['eventId']) ? (int)$data['eventId'] : 0;
        $at = $this->parseDateTime($data['at'] ?? null);
        if ($eventId <= 0) {
            return $this->json(['error' => 'Pole "eventId" je povinné.'], 400);
        }
        try {
            return $this->json($this->data->checkIn($user, $eventId, $at));
        } catch (\DomainException $e) {
            return $this->json(['error' => $e->getMessage()], 400);
        }
    }

    #[Route('/attendance/checkout', methods: ['POST'])]
    #[IsGranted('mobile_attendance.record')]
    public function checkOut(Request $request): JsonResponse
    {
        $user = $this->requireUser();
        $data = json_decode($request->getContent(), true) ?? [];
        $eventId = isset($data['eventId']) ? (int)$data['eventId'] : 0;
        $at = $this->parseDateTime($data['at'] ?? null);
        if ($eventId <= 0) {
            return $this->json(['error' => 'Pole "eventId" je povinné.'], 400);
        }
        try {
            return $this->json($this->data->checkOut($user, $eventId, $at));
        } catch (\DomainException $e) {
            return $this->json(['error' => $e->getMessage()], 400);
        }
    }

    // ─── TRANSPORT (pro řidiče) ────────────────────────────────────────

    #[Route('/transports', methods: ['GET'])]
    #[IsGranted('mobile_transport.read')]
    public function listTransports(Request $request): JsonResponse
    {
        $user = $this->requireUser();
        $from = $this->parseDate($request->query->get('from'));
        return $this->json([
            'transports' => $this->data->listTransportsForDriver($user, $from),
        ]);
    }

    #[Route('/transports/{id}', methods: ['GET'], requirements: ['id' => '\d+'])]
    #[IsGranted('mobile_transport.read')]
    public function getTransport(int $id): JsonResponse
    {
        $user = $this->requireUser();
        try {
            return $this->json($this->data->getTransportDetailForDriver($user, $id));
        } catch (\DomainException $e) {
            return $this->json(['error' => $e->getMessage()], 404);
        }
    }

    #[Route('/transports/{id}/status', methods: ['PUT'], requirements: ['id' => '\d+'])]
    #[IsGranted('mobile_transport.update')]
    public function updateTransportStatus(int $id, Request $request): JsonResponse
    {
        $user = $this->requireUser();
        $data = json_decode($request->getContent(), true) ?? [];
        $status = isset($data['status']) ? (string)$data['status'] : '';
        if ($status === '') {
            return $this->json(['error' => 'Pole "status" je povinné (IN_PROGRESS nebo DONE).'], 400);
        }
        try {
            return $this->json($this->data->updateTransportStatus($user, $id, $status));
        } catch (\InvalidArgumentException $e) {
            return $this->json(['error' => $e->getMessage()], 400);
        } catch (\DomainException $e) {
            return $this->json(['error' => $e->getMessage()], 404);
        }
    }

    // ─── Helpery ───────────────────────────────────────────────────────

    private function requireUser(): User
    {
        $u = $this->getUser();
        if (!$u instanceof User) {
            throw new AccessDeniedException();
        }
        return $u;
    }

    private function parseDate(mixed $v): ?\DateTimeInterface
    {
        if (!is_string($v) || $v === '') return null;
        try {
            return new \DateTimeImmutable($v);
        } catch (\Throwable) {
            return null;
        }
    }

    private function parseDateTime(mixed $v): ?\DateTimeInterface
    {
        if (!is_string($v) || $v === '') return null;
        try {
            return new \DateTimeImmutable($v);
        } catch (\Throwable) {
            return null;
        }
    }
}
