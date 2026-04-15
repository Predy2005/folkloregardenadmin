<?php

namespace App\Controller;

use App\Entity\CashMovement;
use App\Entity\User;
use App\Repository\EventRepository;
use App\Service\EventDashboardService;
use App\Service\CashboxService;
use App\Service\CashMovementService;
use App\Service\EventFinancialsService;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Annotation\Route;
use Symfony\Component\Security\Http\Attribute\IsGranted;

#[Route('/api/events')]
class EventFinanceController extends AbstractController
{
    public function __construct(
        private readonly EntityManagerInterface $em,
        private readonly EventDashboardService $dashboardService,
        private readonly EventFinancialsService $financialsService,
        private readonly CashboxService $cashboxService,
        private readonly CashMovementService $movementService,
    ) {
    }

    /**
     * Manager Dashboard - comprehensive event data for tablet management
     */
    #[Route('/{id}/manager-dashboard', name: 'event_manager_dashboard', methods: ['GET'])]
    #[IsGranted('events.read')]
    public function managerDashboard(int $id, EventRepository $eventRepository): JsonResponse
    {
        $event = $eventRepository->find($id);
        if (!$event) {
            return $this->json(['error' => 'Event not found'], 404);
        }

        $dashboardData = $this->dashboardService->getDashboardData($event);

        return $this->json($dashboardData);
    }

    /**
     * Get payment overview for event - all reservations and their payment status
     */
    #[Route('/{id}/payments', name: 'event_payments_overview', methods: ['GET'])]
    #[IsGranted('events.read')]
    public function getPaymentsOverview(int $id, EventRepository $eventRepository): JsonResponse
    {
        $event = $eventRepository->find($id);
        if (!$event) {
            return $this->json(['error' => 'Event not found'], 404);
        }

        $payments = $this->financialsService->getReservationPayments($event);
        return $this->json($payments);
    }

    /**
     * Update payment note for a reservation linked to this event
     */
    #[Route('/{id}/reservations/{reservationId}/payment-note', name: 'event_reservation_payment_note', methods: ['PUT', 'PATCH'])]
    #[IsGranted('events.update')]
    public function updateReservationPaymentNote(int $id, int $reservationId, Request $request, EventRepository $eventRepository): JsonResponse
    {
        $event = $eventRepository->find($id);
        if (!$event) {
            return $this->json(['error' => 'Event not found'], 404);
        }

        // Verify reservation is linked to this event via guests
        $isLinked = false;
        foreach ($event->getGuests() as $guest) {
            if ($guest->getReservation() && $guest->getReservation()->getId() === $reservationId) {
                $isLinked = true;
                break;
            }
        }

        if (!$isLinked) {
            return $this->json(['error' => 'Reservation is not linked to this event'], 400);
        }

        $reservation = $this->em->getRepository(\App\Entity\Reservation::class)->find($reservationId);
        if (!$reservation) {
            return $this->json(['error' => 'Reservation not found'], 404);
        }

        $data = json_decode($request->getContent(), true) ?? [];

        if (array_key_exists('paymentNote', $data)) {
            $reservation->setPaymentNote($data['paymentNote']);
        }

        $reservation->setUpdatedAt(new \DateTime());
        $this->em->flush();

        return $this->json([
            'success' => true,
            'reservationId' => $reservation->getId(),
            'paymentNote' => $reservation->getPaymentNote(),
            'paymentStatus' => $reservation->getPaymentStatus(),
        ]);
    }

    /**
     * Record a manual payment for a reservation linked to this event
     */
    #[Route('/{id}/reservations/{reservationId}/record-payment', name: 'event_reservation_record_payment', methods: ['POST'])]
    #[IsGranted('events.update')]
    public function recordReservationPayment(int $id, int $reservationId, Request $request, EventRepository $eventRepository): JsonResponse
    {
        $event = $eventRepository->find($id);
        if (!$event) {
            return $this->json(['error' => 'Event not found'], 404);
        }

        // Verify reservation is linked to this event
        $isLinked = false;
        foreach ($event->getGuests() as $guest) {
            if ($guest->getReservation() && $guest->getReservation()->getId() === $reservationId) {
                $isLinked = true;
                break;
            }
        }

        if (!$isLinked) {
            return $this->json(['error' => 'Reservation is not linked to this event'], 400);
        }

        $reservation = $this->em->getRepository(\App\Entity\Reservation::class)->find($reservationId);
        if (!$reservation) {
            return $this->json(['error' => 'Reservation not found'], 404);
        }

        $data = json_decode($request->getContent(), true) ?? [];
        $amount = $data['amount'] ?? null;
        $note = $data['note'] ?? null;
        $paymentMethod = $data['paymentMethod'] ?? 'CASH';

        if (!$amount || $amount <= 0) {
            return $this->json(['error' => 'Amount is required and must be positive'], 400);
        }

        // Update paid amount
        $currentPaid = (float) ($reservation->getPaidAmount() ?? 0);
        $newPaid = $currentPaid + $amount;
        $reservation->setPaidAmount((string) $newPaid);

        // Append to payment note
        $timestamp = (new \DateTime())->format('d.m.Y H:i');
        $noteEntry = "[{$timestamp}] Přijato {$amount} Kč ({$paymentMethod})";
        if ($note) {
            $noteEntry .= " - {$note}";
        }
        $existingNote = $reservation->getPaymentNote() ?? '';
        $reservation->setPaymentNote(trim($existingNote . "\n" . $noteEntry));

        // Update payment status
        $totalPrice = (float) ($reservation->getTotalPrice() ?? 0);
        if ($newPaid >= $totalPrice && $totalPrice > 0) {
            $reservation->setPaymentStatus('PAID');
        } elseif ($newPaid > 0) {
            $reservation->setPaymentStatus('PARTIAL');
        }

        $reservation->setUpdatedAt(new \DateTime());
        $this->em->flush();

        return $this->json([
            'success' => true,
            'reservationId' => $reservation->getId(),
            'paidAmount' => (float) $reservation->getPaidAmount(),
            'remainingAmount' => max(0, $totalPrice - $newPaid),
            'paymentStatus' => $reservation->getPaymentStatus(),
            'paymentNote' => $reservation->getPaymentNote(),
        ]);
    }

    /**
     * List cash movements linked to a specific event table.
     */
    #[Route('/{eventId}/tables/{tableId}/movements', name: 'event_table_movements', methods: ['GET'])]
    #[IsGranted('events.read')]
    public function listTableMovements(int $eventId, int $tableId, EventRepository $eventRepository): JsonResponse
    {
        $event = $eventRepository->find($eventId);
        if (!$event) {
            return $this->json(['error' => 'Event not found'], 404);
        }

        $movements = $this->em->getRepository(CashMovement::class)
            ->findBy(['eventTableId' => $tableId], ['createdAt' => 'DESC']);

        $data = [];
        foreach ($movements as $m) {
            // Only include movements for this event (belt-and-suspenders check)
            if ($m->getEventId() !== null && $m->getEventId() !== $eventId) {
                continue;
            }
            $data[] = [
                'id' => $m->getId(),
                'movementType' => $m->getMovementType(),
                'category' => $m->getCategory(),
                'amount' => (float) $m->getAmount(),
                'currency' => $m->getCurrency(),
                'description' => $m->getDescription(),
                'paymentMethod' => $m->getPaymentMethod(),
                'createdAt' => $m->getCreatedAt()->format(\DateTimeInterface::ATOM),
            ];
        }

        return $this->json($data);
    }

    /**
     * Summary of cash movements grouped by eventTableId, for floor-plan indicator badges.
     * Returns only tables that have at least one linked movement.
     */
    #[Route('/{eventId}/tables/movements-summary', name: 'event_tables_movements_summary', methods: ['GET'])]
    #[IsGranted('events.read')]
    public function tableMovementsSummary(int $eventId): JsonResponse
    {
        $conn = $this->em->getConnection();
        $rows = $conn->executeQuery(
            'SELECT event_table_id, movement_type, COUNT(*) AS cnt, COALESCE(SUM(amount::numeric), 0) AS total
             FROM cash_movement
             WHERE event_table_id IS NOT NULL AND (event_id = :e OR event_id IS NULL)
             GROUP BY event_table_id, movement_type',
            ['e' => $eventId]
        )->fetchAllAssociative();

        /** @var array<int, array{hasIncome: bool, hasExpense: bool, incomeTotal: float, expenseTotal: float}> $byTable */
        $byTable = [];
        foreach ($rows as $r) {
            $tableId = (int) $r['event_table_id'];
            if (!isset($byTable[$tableId])) {
                $byTable[$tableId] = ['hasIncome' => false, 'hasExpense' => false, 'incomeTotal' => 0.0, 'expenseTotal' => 0.0];
            }
            $amount = (float) $r['total'];
            if ($r['movement_type'] === 'INCOME') {
                $byTable[$tableId]['hasIncome'] = true;
                $byTable[$tableId]['incomeTotal'] = $amount;
            } else {
                $byTable[$tableId]['hasExpense'] = true;
                $byTable[$tableId]['expenseTotal'] = $amount;
            }
        }

        $out = [];
        foreach ($byTable as $tid => $info) {
            $out[] = ['tableId' => $tid] + $info;
        }
        return $this->json($out);
    }

    /**
     * Re-link a single cash movement to a different event table (or unlink with null).
     * Does NOT change cashbox balance — only the table attribution.
     */
    #[Route('/{eventId}/movements/{movementId}/relink-table', name: 'event_movement_relink_table', methods: ['POST'])]
    #[IsGranted('events.update')]
    public function relinkMovementTable(int $eventId, int $movementId, Request $request): JsonResponse
    {
        $movement = $this->em->getRepository(CashMovement::class)->find($movementId);
        if (!$movement) {
            return $this->json(['error' => 'Movement not found'], 404);
        }
        if ($movement->getEventId() !== null && $movement->getEventId() !== $eventId) {
            return $this->json(['error' => 'Movement does not belong to this event'], 403);
        }

        $data = json_decode($request->getContent(), true) ?? [];
        $targetTableId = array_key_exists('eventTableId', $data)
            ? ($data['eventTableId'] === null ? null : (int) $data['eventTableId'])
            : null;

        $movement->setEventTableId($targetTableId);
        $movement->setEventId($eventId); // ensure eventId is stamped for older rows
        $this->em->flush();

        return $this->json([
            'success' => true,
            'movementId' => $movement->getId(),
            'eventTableId' => $movement->getEventTableId(),
        ]);
    }

    /**
     * Move every cash movement linked to the source table over to the target table.
     */
    #[Route('/{eventId}/tables/{fromTableId}/movements/move-to/{toTableId}', name: 'event_movements_move_table', methods: ['POST'])]
    #[IsGranted('events.update')]
    public function moveTableMovements(int $eventId, int $fromTableId, int $toTableId): JsonResponse
    {
        if ($fromTableId === $toTableId) {
            return $this->json(['error' => 'Source and target must differ'], 400);
        }
        $movements = $this->em->getRepository(CashMovement::class)->findBy(['eventTableId' => $fromTableId]);
        $count = 0;
        foreach ($movements as $m) {
            if ($m->getEventId() !== null && $m->getEventId() !== $eventId) {
                continue;
            }
            $m->setEventTableId($toTableId);
            $m->setEventId($eventId);
            $count++;
        }
        $this->em->flush();

        return $this->json([
            'success' => true,
            'fromTableId' => $fromTableId,
            'toTableId' => $toTableId,
            'movedCount' => $count,
        ]);
    }

    /**
     * Add expense to event (creates event cashbox if needed)
     */
    #[Route('/{id}/expenses', name: 'event_add_expense', methods: ['POST'])]
    #[IsGranted('events.update')]
    public function addExpense(int $id, Request $request, EventRepository $eventRepository): JsonResponse
    {
        $event = $eventRepository->find($id);
        if (!$event) {
            return $this->json(['error' => 'Event not found'], 404);
        }

        $data = json_decode($request->getContent(), true) ?? [];
        $category = $data['category'] ?? 'OTHER';
        $amount = $data['amount'] ?? null;
        $description = $data['description'] ?? '';
        $paidTo = $data['paidTo'] ?? '';
        $paymentMethod = $data['paymentMethod'] ?? 'CASH';
        $eventTableId = isset($data['eventTableId']) ? (int) $data['eventTableId'] : null;

        if (!$amount || $amount <= 0) {
            return $this->json(['error' => 'Amount is required and must be positive'], 400);
        }

        $cashbox = $this->cashboxService->getOrCreateEventCashbox($event);

        $user = $this->getUser();

        try {
            $options = [
                'category' => $category,
                'description' => $description ?: $paidTo,
                'paymentMethod' => $paymentMethod,
                'user' => $user instanceof User ? $user : null,
                'eventId' => $event->getId(),
            ];
            if ($eventTableId) {
                $options['eventTableId'] = $eventTableId;
            }
            $movement = $this->movementService->addMovement($cashbox, 'EXPENSE', (string) $amount, $options);
            $this->em->flush();
        } catch (\RuntimeException $e) {
            return $this->json(['error' => $e->getMessage()], 400);
        }

        return $this->json([
            'success' => true,
            'movement' => [
                'id' => $movement->getId(),
                'category' => $movement->getCategory(),
                'amount' => (float) $movement->getAmount(),
                'description' => $movement->getDescription(),
            ],
            'cashboxBalance' => (float) $cashbox->getCurrentBalance(),
        ]);
    }

    /**
     * Add income to event (creates event cashbox if needed)
     */
    #[Route('/{id}/income', name: 'event_add_income', methods: ['POST'])]
    #[IsGranted('events.update')]
    public function addIncome(int $id, Request $request, EventRepository $eventRepository): JsonResponse
    {
        $event = $eventRepository->find($id);
        if (!$event) {
            return $this->json(['error' => 'Event not found'], 404);
        }

        $data = json_decode($request->getContent(), true) ?? [];
        $category = $data['category'] ?? 'OTHER';
        $amount = $data['amount'] ?? null;
        $description = $data['description'] ?? '';
        $source = $data['source'] ?? '';
        $paymentMethod = $data['paymentMethod'] ?? 'CASH';
        $eventTableId = isset($data['eventTableId']) ? (int) $data['eventTableId'] : null;

        if (!$amount || $amount <= 0) {
            return $this->json(['error' => 'Amount is required and must be positive'], 400);
        }

        $cashbox = $this->cashboxService->getOrCreateEventCashbox($event);

        $user = $this->getUser();

        try {
            $options = [
                'category' => $category,
                'description' => $description ?: $source,
                'paymentMethod' => $paymentMethod,
                'user' => $user instanceof User ? $user : null,
                'eventId' => $event->getId(),
            ];
            if ($eventTableId) {
                $options['eventTableId'] = $eventTableId;
            }
            $movement = $this->movementService->addMovement($cashbox, 'INCOME', (string) $amount, $options);
            $this->em->flush();
        } catch (\RuntimeException $e) {
            return $this->json(['error' => $e->getMessage()], 400);
        }

        return $this->json([
            'success' => true,
            'movement' => [
                'id' => $movement->getId(),
                'category' => $movement->getCategory(),
                'amount' => (float) $movement->getAmount(),
                'description' => $movement->getDescription(),
            ],
            'cashboxBalance' => (float) $cashbox->getCurrentBalance(),
        ]);
    }

    /**
     * Storno pohybu v pokladně (vytvoří protipohyb)
     */
    #[Route('/{id}/movements/{movementId}/storno', name: 'event_storno_movement', methods: ['POST'])]
    #[IsGranted('events.update')]
    public function stornoMovement(int $id, int $movementId, Request $request, EventRepository $eventRepository): JsonResponse
    {
        $event = $eventRepository->find($id);
        if (!$event) {
            return $this->json(['error' => 'Event not found'], 404);
        }

        $originalMovement = $this->em->getRepository(CashMovement::class)->find($movementId);
        if (!$originalMovement) {
            return $this->json(['error' => 'Movement not found'], 404);
        }

        // Verify the movement belongs to this event's cashbox
        $eventCashbox = $this->cashboxService->getEventCashbox($event);
        if (!$eventCashbox || $originalMovement->getCashbox()?->getId() !== $eventCashbox->getId()) {
            return $this->json(['error' => 'Movement does not belong to this event'], 400);
        }

        $data = json_decode($request->getContent(), true) ?? [];
        $reason = $data['reason'] ?? 'Storno';

        $user = $this->getUser();
        $originalAmount = (float) $originalMovement->getAmount();
        $originalType = $originalMovement->getMovementType();
        $originalCategory = $originalMovement->getCategory() ?? 'OTHER';
        $originalDesc = $originalMovement->getDescription() ?? '';

        // Create reverse movement
        $reverseType = $originalType === 'EXPENSE' ? 'INCOME' : 'EXPENSE';
        $stornoDesc = "STORNO: {$originalDesc} — {$reason}";

        try {
            $stornoMovement = $this->movementService->addMovement($eventCashbox, $reverseType, (string) $originalAmount, [
                'category' => $originalCategory,
                'description' => $stornoDesc,
                'paymentMethod' => $originalMovement->getPaymentMethod(),
                'user' => $user instanceof User ? $user : null,
            ]);
            $this->em->flush();
        } catch (\RuntimeException $e) {
            return $this->json(['error' => $e->getMessage()], 400);
        }

        return $this->json([
            'success' => true,
            'stornoMovement' => [
                'id' => $stornoMovement->getId(),
                'amount' => $originalAmount,
                'type' => $reverseType,
                'description' => $stornoDesc,
            ],
            'cashboxBalance' => (float) $eventCashbox->getCurrentBalance(),
        ]);
    }
}
