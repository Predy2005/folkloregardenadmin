<?php

declare(strict_types=1);

namespace App\Controller;

use App\Entity\User;
use App\Service\MobileDataService;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
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
    ) {
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
