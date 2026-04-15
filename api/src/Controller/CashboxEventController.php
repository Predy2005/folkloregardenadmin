<?php

namespace App\Controller;

use App\Entity\User;
use App\Repository\CashboxClosureRepository;
use App\Repository\EventRepository;
use App\Serializer\CashboxSerializer;
use App\Service\CashboxClosureService;
use App\Service\CashboxService;
use App\Service\CashMovementService;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Annotation\Route;
use Symfony\Component\Security\Http\Attribute\IsGranted;

#[Route('/api/cashbox')]
class CashboxEventController extends AbstractController
{
    public function __construct(
        private readonly EntityManagerInterface $em,
        private readonly CashboxService $cashboxService,
        private readonly CashMovementService $movementService,
        private readonly CashboxClosureService $closureService,
        private readonly CashboxSerializer $serializer,
    ) {
    }

    #[Route('/event/{eventId}', name: 'cashbox_event_detail', methods: ['GET'])]
    #[IsGranted('cashbox.read')]
    public function eventDetail(int $eventId, EventRepository $eventRepo): JsonResponse
    {
        $event = $eventRepo->find($eventId);
        if (!$event) {
            return $this->json(['error' => 'Event not found'], 404);
        }

        $cashbox = $this->cashboxService->getEventCashbox($event);
        if (!$cashbox) {
            return $this->json(['error' => 'Kasa eventu neexistuje.', 'exists' => false], 404);
        }

        return $this->json($this->serializer->serializeCashbox($cashbox, true));
    }

    #[Route('/event/{eventId}', name: 'cashbox_event_create', methods: ['POST'])]
    #[IsGranted('cashbox.create')]
    public function eventCreate(int $eventId, Request $request, EventRepository $eventRepo): JsonResponse
    {
        $event = $eventRepo->find($eventId);
        if (!$event) {
            return $this->json(['error' => 'Event not found'], 404);
        }

        $existing = $this->cashboxService->getEventCashbox($event);
        if ($existing) {
            return $this->json(['error' => 'Kasa pro tento event již existuje.', 'id' => $existing->getId()], 409);
        }

        $data = json_decode($request->getContent(), true) ?? [];
        $initialBalance = (string) ($data['initialBalance'] ?? '0.00');

        $cashbox = $this->cashboxService->getOrCreateEventCashbox($event, $initialBalance);

        return $this->json($this->serializer->serializeCashbox($cashbox), 201);
    }

    #[Route('/event/{eventId}/adjust-balance', name: 'cashbox_event_adjust_balance', methods: ['POST'])]
    #[IsGranted('ROLE_SUPER_ADMIN')]
    public function eventAdjustBalance(int $eventId, Request $request): JsonResponse
    {
        $event = $this->em->getRepository(\App\Entity\Event::class)->find($eventId);
        if (!$event) {
            return $this->json(['error' => 'Event nenalezen'], 404);
        }

        $cashbox = $this->cashboxService->getEventCashbox($event);
        if (!$cashbox) {
            return $this->json(['error' => 'Kasa eventu neexistuje'], 404);
        }

        $data = json_decode($request->getContent(), true) ?? [];
        if (!isset($data['newBalance']) || !isset($data['reason'])) {
            return $this->json(['error' => 'Povinné pole: newBalance, reason'], 400);
        }

        $this->cashboxService->setCurrentIp($request->getClientIp());
        $user = $this->getUser();

        try {
            $movement = $this->cashboxService->adjustBalance(
                $cashbox,
                (string) $data['newBalance'],
                $data['reason'],
                $user
            );
            $this->em->flush();
        } catch (\RuntimeException | \InvalidArgumentException $e) {
            return $this->json(['error' => $e->getMessage()], 400);
        }

        return $this->json([
            'status' => 'ok',
            'movement' => $this->serializer->serializeMovement($movement),
            'newBalance' => $cashbox->getCurrentBalance(),
        ]);
    }

    #[Route('/event/{eventId}/report', name: 'cashbox_event_report', methods: ['GET'])]
    #[IsGranted('cashbox.read')]
    public function eventReport(int $eventId, Request $request): JsonResponse
    {
        $event = $this->em->getRepository(\App\Entity\Event::class)->find($eventId);
        if (!$event) {
            return $this->json(['error' => 'Event nenalezen'], 404);
        }

        $cashbox = $this->cashboxService->getEventCashbox($event);
        if (!$cashbox) {
            return $this->json(['error' => 'Kasa eventu neexistuje'], 404);
        }

        $dateFrom = $request->query->get('dateFrom');
        $dateTo = $request->query->get('dateTo');

        return $this->json($this->closureService->getCashboxReport($cashbox, $dateFrom, $dateTo));
    }

    #[Route('/event/{eventId}/movement', name: 'cashbox_event_movement', methods: ['POST'])]
    #[IsGranted('cashbox.update')]
    public function eventMovement(int $eventId, Request $request, EventRepository $eventRepo): JsonResponse
    {
        $event = $eventRepo->find($eventId);
        if (!$event) {
            return $this->json(['error' => 'Event not found'], 404);
        }

        $cashbox = $this->cashboxService->getEventCashbox($event);
        if (!$cashbox) {
            return $this->json(['error' => 'Kasa eventu neexistuje. Vytvořte ji nejdřív.'], 404);
        }

        $data = json_decode($request->getContent(), true) ?? [];
        foreach (['movementType', 'amount'] as $req) {
            if (!isset($data[$req])) {
                return $this->json(['error' => 'Missing required field: ' . $req], 400);
            }
        }

        if (!in_array($data['movementType'], ['INCOME', 'EXPENSE'], true)) {
            return $this->json(['error' => 'Neplatný typ pohybu. Povolené hodnoty: INCOME, EXPENSE'], 400);
        }

        $this->cashboxService->setCurrentIp($request->getClientIp());

        try {
            $user = $this->getUser();
            $movement = $this->movementService->addMovement($cashbox, $data['movementType'], (string) $data['amount'], [
                'category' => $data['category'] ?? null,
                'description' => $data['description'] ?? null,
                'paymentMethod' => $data['paymentMethod'] ?? null,
                'user' => $user instanceof User ? $user : null,
            ]);
            $this->em->flush();
        } catch (\RuntimeException $e) {
            return $this->json(['error' => $e->getMessage()], 400);
        }

        return $this->json([
            'status' => 'ok',
            'movementId' => $movement->getId(),
            'currentBalance' => $cashbox->getCurrentBalance(),
        ]);
    }

    #[Route('/event/{eventId}/movement/{movementId}', name: 'cashbox_event_edit_movement', methods: ['PUT', 'PATCH'])]
    #[IsGranted('cashbox.update')]
    public function editEventMovement(int $eventId, int $movementId, Request $request): JsonResponse
    {
        $this->cashboxService->setCurrentIp($request->getClientIp());
        $event = $this->em->getRepository(\App\Entity\Event::class)->find($eventId);
        if (!$event) return $this->json(['error' => 'Event nenalezen'], 404);

        $cashbox = $this->cashboxService->getEventCashbox($event);
        if (!$cashbox) return $this->json(['error' => 'Kasa eventu neexistuje'], 404);

        $movement = $this->em->getRepository(\App\Entity\CashMovement::class)->find($movementId);
        if (!$movement || $movement->getCashbox()->getId() !== $cashbox->getId()) {
            return $this->json(['error' => 'Pohyb nenalezen'], 404);
        }

        $data = json_decode($request->getContent(), true) ?? [];
        $user = $this->getUser();

        try {
            $updated = $this->movementService->editMovement($movement, $data, $user);
            $this->em->flush();
            return $this->json($this->serializer->serializeMovement($updated));
        } catch (\RuntimeException $e) {
            return $this->json(['error' => $e->getMessage()], 400);
        }
    }

    #[Route('/event/{eventId}/movement/{movementId}', name: 'cashbox_event_delete_movement', methods: ['DELETE'])]
    #[IsGranted('cashbox.update')]
    public function deleteEventMovement(int $eventId, int $movementId, Request $request): JsonResponse
    {
        $this->cashboxService->setCurrentIp($request->getClientIp());
        $event = $this->em->getRepository(\App\Entity\Event::class)->find($eventId);
        if (!$event) return $this->json(['error' => 'Event nenalezen'], 404);

        $cashbox = $this->cashboxService->getEventCashbox($event);
        if (!$cashbox) return $this->json(['error' => 'Kasa eventu neexistuje'], 404);

        $movement = $this->em->getRepository(\App\Entity\CashMovement::class)->find($movementId);
        if (!$movement || $movement->getCashbox()->getId() !== $cashbox->getId()) {
            return $this->json(['error' => 'Pohyb nenalezen'], 404);
        }

        $user = $this->getUser();

        try {
            $this->movementService->deleteMovement($movement, $user);
            $this->em->flush();
            return $this->json(['status' => 'deleted']);
        } catch (\RuntimeException $e) {
            return $this->json(['error' => $e->getMessage()], 400);
        }
    }

    #[Route('/event/{eventId}/audit-log', name: 'cashbox_event_audit_log', methods: ['GET'])]
    #[IsGranted('cashbox.read')]
    public function eventAuditLog(int $eventId, Request $request): JsonResponse
    {
        $event = $this->em->getRepository(\App\Entity\Event::class)->find($eventId);
        if (!$event) return $this->json(['error' => 'Event nenalezen'], 404);

        $cashbox = $this->cashboxService->getEventCashbox($event);
        if (!$cashbox) return $this->json([]);

        $limit = min(200, max(10, (int) $request->query->get('limit', 100)));
        $offset = max(0, (int) $request->query->get('offset', 0));

        $logs = $this->em->getRepository(\App\Entity\CashboxAuditLog::class)->findByCashbox($cashbox, $limit, $offset);

        return $this->json(array_map(fn($log) => $this->serializer->serializeAuditLog($log), $logs));
    }

    #[Route('/event/{eventId}/close', name: 'cashbox_event_close', methods: ['POST'])]
    #[IsGranted('cashbox.close')]
    public function eventClose(int $eventId, Request $request, EventRepository $eventRepo): JsonResponse
    {
        $this->cashboxService->setCurrentIp($request->getClientIp());
        $this->closureService->setCurrentIp($request->getClientIp());
        $event = $eventRepo->find($eventId);
        if (!$event) {
            return $this->json(['error' => 'Event not found'], 404);
        }

        $cashbox = $this->cashboxService->getEventCashbox($event);
        if (!$cashbox) {
            return $this->json(['error' => 'Kasa eventu neexistuje.'], 404);
        }

        $data = json_decode($request->getContent(), true) ?? [];
        if (!isset($data['actualCash'])) {
            return $this->json(['error' => 'Missing required field: actualCash'], 400);
        }

        $user = $this->getUser();
        if (!$user instanceof User) {
            return $this->json(['error' => 'Unauthorized'], 401);
        }

        try {
            $result = $this->closureService->closeEventCashbox(
                $cashbox,
                (string) $data['actualCash'],
                $user,
                $data['notes'] ?? null,
            );
        } catch (\RuntimeException $e) {
            return $this->json(['error' => $e->getMessage()], 400);
        }

        return $this->json([
            'status' => 'closed',
            'closureId' => $result['closure']->getId(),
            'transferAmount' => $result['transferAmount'],
            'transferMovementId' => $result['transferMovement']?->getId(),
        ]);
    }

    #[Route('/event/{eventId}/reopen', name: 'cashbox_event_reopen', methods: ['POST'])]
    #[IsGranted('cashbox.reopen')]
    public function eventReopen(int $eventId, Request $request, EventRepository $eventRepo): JsonResponse
    {
        $this->cashboxService->setCurrentIp($request->getClientIp());
        $event = $eventRepo->find($eventId);
        if (!$event) {
            return $this->json(['error' => 'Event not found'], 404);
        }

        $cashbox = $this->cashboxService->getEventCashbox($event);
        if (!$cashbox) {
            return $this->json(['error' => 'Kasa eventu neexistuje.'], 404);
        }

        $this->cashboxService->reopenCashbox($cashbox);

        return $this->json(['status' => 'reopened']);
    }

    #[Route('/event/{eventId}/lock', name: 'cashbox_event_lock', methods: ['POST'])]
    #[IsGranted('cashbox.update')]
    public function eventLock(int $eventId, Request $request, EventRepository $eventRepo): JsonResponse
    {
        $this->cashboxService->setCurrentIp($request->getClientIp());
        $event = $eventRepo->find($eventId);
        if (!$event) {
            return $this->json(['error' => 'Event not found'], 404);
        }

        $cashbox = $this->cashboxService->getEventCashbox($event);
        if (!$cashbox) {
            return $this->json(['error' => 'Kasa eventu neexistuje.'], 404);
        }

        $user = $this->getUser();
        if (!$user instanceof User) {
            return $this->json(['error' => 'Unauthorized'], 401);
        }

        $this->cashboxService->lockCashbox($cashbox, $user);

        return $this->json(['status' => 'locked']);
    }

    #[Route('/event/{eventId}/pay-staff/{assignmentId}', name: 'cashbox_event_pay_staff', methods: ['POST'])]
    #[IsGranted('cashbox.update')]
    public function eventPayStaff(int $eventId, int $assignmentId, Request $request, EventRepository $eventRepo): JsonResponse
    {
        $this->cashboxService->setCurrentIp($request->getClientIp());
        $event = $eventRepo->find($eventId);
        if (!$event) {
            return $this->json(['error' => 'Event not found'], 404);
        }

        $assignment = null;
        foreach ($event->getStaffAssignments() as $a) {
            if ($a->getId() === $assignmentId) {
                $assignment = $a;
                break;
            }
        }
        if (!$assignment) {
            return $this->json(['error' => 'Staff assignment not found'], 404);
        }

        if ($assignment->getPaymentStatus() === 'PAID') {
            return $this->json(['error' => 'Personál je již zaplacen'], 409);
        }

        $data = json_decode($request->getContent(), true) ?? [];
        $amount = $data['paymentAmount'] ?? null;

        if ($amount === null || (float) $amount <= 0) {
            // Try auto-calculate
            $amount = $this->cashboxService->calculateStaffPayment($assignment);
            if ($amount === null) {
                return $this->json(['error' => 'Nelze vypočítat částku, zadejte ji ručně.'], 400);
            }
        }

        if (isset($data['hoursWorked'])) {
            $assignment->setHoursWorked((string) $data['hoursWorked']);
        }

        $user = $this->getUser();
        if (!$user instanceof User) {
            return $this->json(['error' => 'Unauthorized'], 401);
        }

        try {
            $movement = $this->cashboxService->payStaffAssignment(
                $assignment,
                (string) $amount,
                $user,
                $data['paymentMethod'] ?? 'CASH',
            );
            $this->em->flush();
        } catch (\RuntimeException $e) {
            return $this->json(['error' => $e->getMessage()], 400);
        }

        return $this->json([
            'success' => true,
            'movementId' => $movement->getId(),
            'assignment' => [
                'id' => $assignment->getId(),
                'hoursWorked' => (float) $assignment->getHoursWorked(),
                'paymentAmount' => $assignment->getPaymentAmount() ? (float) $assignment->getPaymentAmount() : null,
                'paymentStatus' => $assignment->getPaymentStatus(),
            ],
            'cashboxBalance' => (float) $this->cashboxService->getEventCashbox($event)?->getCurrentBalance(),
        ]);
    }

    #[Route('/event/{eventId}/pay-all-staff', name: 'cashbox_event_pay_all_staff', methods: ['POST'])]
    #[IsGranted('cashbox.update')]
    public function eventPayAllStaff(int $eventId, Request $request, EventRepository $eventRepo): JsonResponse
    {
        $this->cashboxService->setCurrentIp($request->getClientIp());
        $event = $eventRepo->find($eventId);
        if (!$event) {
            return $this->json(['error' => 'Event not found'], 404);
        }

        $user = $this->getUser();
        if (!$user instanceof User) {
            return $this->json(['error' => 'Unauthorized'], 401);
        }

        try {
            $result = $this->cashboxService->payAllStaff($event, $user);
        } catch (\RuntimeException $e) {
            return $this->json(['error' => $e->getMessage()], 400);
        }

        return $this->json([
            'success' => true,
            'totalPaid' => $result['totalPaid'],
            'paidCount' => $result['paidCount'],
            'results' => $result['results'],
        ]);
    }

    #[Route('/event/{eventId}/closures', name: 'cashbox_event_closures', methods: ['GET'])]
    #[IsGranted('cashbox.read')]
    public function eventClosures(int $eventId, EventRepository $eventRepo, CashboxClosureRepository $closureRepo): JsonResponse
    {
        $event = $eventRepo->find($eventId);
        if (!$event) {
            return $this->json(['error' => 'Event not found'], 404);
        }

        $cashbox = $this->cashboxService->getEventCashbox($event);
        if (!$cashbox) {
            return $this->json([], 200);
        }

        $closures = $closureRepo->findBy(['cashbox' => $cashbox], ['closedAt' => 'DESC']);
        return $this->json(array_map(fn($c) => $this->serializer->serializeClosure($c), $closures));
    }

    #[Route('/event/{eventId}/export', name: 'cashbox_event_export', methods: ['GET'])]
    #[IsGranted('cashbox.read')]
    public function exportEventMovements(int $eventId, Request $request): Response
    {
        $event = $this->em->getRepository(\App\Entity\Event::class)->find($eventId);
        if (!$event) {
            return new Response('Event nenalezen.', 404);
        }

        $cashbox = $this->cashboxService->getEventCashbox($event);
        if (!$cashbox) {
            return new Response('Kasa eventu neexistuje.', 404);
        }

        $filters = [
            'dateFrom' => $request->query->get('dateFrom'),
            'dateTo' => $request->query->get('dateTo'),
            'category' => $request->query->get('category'),
            'movementType' => $request->query->get('movementType'),
        ];

        $movements = $this->movementService->getAllFilteredMovements($cashbox, $filters);
        $csv = $this->generateMovementsCsv($movements);
        $date = (new \DateTime())->format('Y-m-d');
        $eventName = preg_replace('/[^a-zA-Z0-9_-]/', '_', $event->getName());

        return new Response($csv, 200, [
            'Content-Type' => 'text/csv; charset=UTF-8',
            'Content-Disposition' => "attachment; filename=\"kasa-event-{$eventName}-{$date}.csv\"",
        ]);
    }

    // ─── CSV Helper ──────────────────────────────────────────────────

    /**
     * @param \App\Entity\CashMovement[] $movements
     */
    private function generateMovementsCsv(array $movements): string
    {
        $bom = "\xEF\xBB\xBF";
        $header = ['Datum', 'Typ', 'Kategorie', 'Částka', 'Měna', 'Popis', 'Platební metoda', 'Uživatel'];

        $handle = fopen('php://temp', 'r+');
        fwrite($handle, $bom);
        fputcsv($handle, $header, ';');

        foreach ($movements as $m) {
            $row = [
                $m->getCreatedAt()->format('d.m.Y H:i'),
                $m->getMovementType() === 'INCOME' ? 'Příjem' : 'Výdaj',
                $m->getCategory() ?? '',
                $m->getAmount(),
                $m->getCurrency(),
                $m->getDescription() ?? '',
                $m->getPaymentMethod() ?? '',
                $m->getUser() ? $m->getUser()->getUsername() : '',
            ];
            fputcsv($handle, $row, ';');
        }

        rewind($handle);
        $csv = stream_get_contents($handle);
        fclose($handle);

        return $csv;
    }
}
