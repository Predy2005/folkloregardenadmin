<?php

namespace App\Controller;

use App\Entity\Cashbox;
use App\Entity\CashboxTransfer;
use App\Entity\Event;
use App\Entity\User;
use App\Repository\CashboxClosureRepository;
use App\Repository\CashboxRepository;
use App\Repository\CashboxTransferRepository;
use App\Repository\EventRepository;
use App\Service\CashboxService;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Annotation\Route;
use Symfony\Component\Security\Http\Attribute\IsGranted;

#[Route('/api/cashbox')]
class CashboxController extends AbstractController
{
    public function __construct(
        private readonly EntityManagerInterface $em,
        private readonly CashboxService $cashboxService,
    ) {
    }

    // ─── List all cashboxes ──────────────────────────────────────────

    #[Route('', name: 'cashbox_list', methods: ['GET'])]
    #[IsGranted('cashbox.read')]
    public function list(CashboxRepository $repo): JsonResponse
    {
        $boxes = $repo->findBy([], ['isActive' => 'DESC', 'openedAt' => 'DESC']);

        // Filter out hidden main cashbox
        if ($this->cashboxService->isMainCashboxHidden()) {
            $boxes = array_filter($boxes, fn(Cashbox $c) => $c->getCashboxType() !== 'MAIN');
            $boxes = array_values($boxes);
        }

        $data = array_map(fn(Cashbox $c) => $this->cashboxService->serializeCashbox($c), $boxes);

        return $this->json($data);
    }

    // ═══════════════════════════════════════════════════════════════════
    //  MAIN CASHBOX
    // ═══════════════════════════════════════════════════════════════════

    #[Route('/main', name: 'cashbox_main_detail', methods: ['GET'])]
    #[IsGranted('cashbox.read')]
    public function mainDetail(): JsonResponse
    {
        if ($this->cashboxService->isMainCashboxHidden()) {
            return $this->json(['error' => 'Not found'], 404);
        }

        $main = $this->cashboxService->getMainCashbox();
        if (!$main) {
            return $this->json(['error' => 'Hlavní kasa neexistuje. Inicializujte ji.'], 404);
        }

        return $this->json($this->cashboxService->serializeCashbox($main, true));
    }

    #[Route('/main/movements', name: 'cashbox_main_movements', methods: ['GET'])]
    #[IsGranted('cashbox.read')]
    public function mainMovements(Request $request): JsonResponse
    {
        if ($this->cashboxService->isMainCashboxHidden()) {
            return $this->json(['error' => 'Not found'], 404);
        }

        $main = $this->cashboxService->getMainCashbox();
        if (!$main) {
            return $this->json(['movements' => [], 'total' => 0, 'page' => 1, 'limit' => 50, 'totalPages' => 0]);
        }

        $filters = [
            'dateFrom' => $request->query->get('dateFrom'),
            'dateTo' => $request->query->get('dateTo'),
            'category' => $request->query->get('category'),
            'movementType' => $request->query->get('movementType'),
            'currency' => $request->query->get('currency'),
        ];
        $page = max(1, (int) $request->query->get('page', 1));
        $limit = min(100, max(10, (int) $request->query->get('limit', 50)));

        return $this->json($this->cashboxService->getFilteredMovements($main, $filters, $page, $limit));
    }

    #[Route('/main', name: 'cashbox_main_init', methods: ['POST'])]
    #[IsGranted('cashbox.create')]
    public function mainInit(Request $request): JsonResponse
    {
        if ($this->cashboxService->isMainCashboxHidden()) {
            return $this->json(['error' => 'Not found'], 404);
        }

        $existing = $this->cashboxService->getMainCashbox();
        if ($existing) {
            return $this->json(['error' => 'Hlavní kasa již existuje.'], 409);
        }

        $data = json_decode($request->getContent(), true) ?? [];
        $main = $this->cashboxService->getOrCreateMainCashbox();

        if (isset($data['initialBalance'])) {
            $main->setInitialBalance((string) $data['initialBalance']);
            $main->setCurrentBalance((string) $data['initialBalance']);
            $this->em->flush();
        }

        return $this->json($this->cashboxService->serializeCashbox($main), 201);
    }

    #[Route('/main/movement', name: 'cashbox_main_movement', methods: ['POST'])]
    #[IsGranted('cashbox.update')]
    public function mainMovement(Request $request): JsonResponse
    {
        if ($this->cashboxService->isMainCashboxHidden()) {
            return $this->json(['error' => 'Not found'], 404);
        }

        $main = $this->cashboxService->getMainCashbox();
        if (!$main) {
            return $this->json(['error' => 'Hlavní kasa neexistuje.'], 404);
        }

        $data = json_decode($request->getContent(), true) ?? [];
        foreach (['movementType', 'amount'] as $req) {
            if (!isset($data[$req])) {
                return $this->json(['error' => 'Missing required field: ' . $req], 400);
            }
        }

        try {
            $user = $this->getUser();
            $movement = $this->cashboxService->addMovement($main, $data['movementType'], (string) $data['amount'], [
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
            'currentBalance' => $main->getCurrentBalance(),
        ]);
    }

    #[Route('/main/lock', name: 'cashbox_main_lock', methods: ['POST'])]
    #[IsGranted('cashbox.update')]
    public function mainLock(): JsonResponse
    {
        if ($this->cashboxService->isMainCashboxHidden()) {
            return $this->json(['error' => 'Not found'], 404);
        }

        $main = $this->cashboxService->getMainCashbox();
        if (!$main) {
            return $this->json(['error' => 'Hlavní kasa neexistuje.'], 404);
        }

        $user = $this->getUser();
        if (!$user instanceof User) {
            return $this->json(['error' => 'Unauthorized'], 401);
        }

        $this->cashboxService->lockCashbox($main, $user);

        return $this->json(['status' => 'locked']);
    }

    #[Route('/main/reopen', name: 'cashbox_main_reopen', methods: ['POST'])]
    #[IsGranted('cashbox.reopen')]
    public function mainReopen(): JsonResponse
    {
        if ($this->cashboxService->isMainCashboxHidden()) {
            return $this->json(['error' => 'Not found'], 404);
        }

        $main = $this->cashboxService->getMainCashbox();
        if (!$main) {
            return $this->json(['error' => 'Hlavní kasa neexistuje.'], 404);
        }

        $this->cashboxService->reopenCashbox($main);

        return $this->json(['status' => 'reopened']);
    }

    #[Route('/main/hide', name: 'cashbox_main_hide', methods: ['POST'])]
    #[IsGranted('ROLE_SUPER_ADMIN')]
    public function mainHide(): JsonResponse
    {
        $this->cashboxService->hideMainCashbox();
        return $this->json(['status' => 'hidden']);
    }

    #[Route('/main/unhide', name: 'cashbox_main_unhide', methods: ['POST'])]
    #[IsGranted('ROLE_SUPER_ADMIN')]
    public function mainUnhide(): JsonResponse
    {
        $this->cashboxService->unhideMainCashbox();
        return $this->json(['status' => 'unhidden']);
    }

    #[Route('/main/closures', name: 'cashbox_main_closures', methods: ['GET'])]
    #[IsGranted('cashbox.read')]
    public function mainClosures(CashboxClosureRepository $closureRepo): JsonResponse
    {
        if ($this->cashboxService->isMainCashboxHidden()) {
            return $this->json(['error' => 'Not found'], 404);
        }

        $main = $this->cashboxService->getMainCashbox();
        if (!$main) {
            return $this->json([], 200);
        }

        $closures = $closureRepo->findBy(['cashbox' => $main], ['closedAt' => 'DESC']);
        return $this->json(array_map(fn($c) => $this->cashboxService->serializeClosure($c), $closures));
    }

    // ═══════════════════════════════════════════════════════════════════
    //  EVENT CASHBOX
    // ═══════════════════════════════════════════════════════════════════

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

        return $this->json($this->cashboxService->serializeCashbox($cashbox, true));
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

        return $this->json($this->cashboxService->serializeCashbox($cashbox), 201);
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

        try {
            $user = $this->getUser();
            $movement = $this->cashboxService->addMovement($cashbox, $data['movementType'], (string) $data['amount'], [
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

    #[Route('/event/{eventId}/close', name: 'cashbox_event_close', methods: ['POST'])]
    #[IsGranted('cashbox.close')]
    public function eventClose(int $eventId, Request $request, EventRepository $eventRepo): JsonResponse
    {
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
            $result = $this->cashboxService->closeEventCashbox(
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
    public function eventReopen(int $eventId, EventRepository $eventRepo): JsonResponse
    {
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
    public function eventLock(int $eventId, EventRepository $eventRepo): JsonResponse
    {
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
    public function eventPayAllStaff(int $eventId, EventRepository $eventRepo): JsonResponse
    {
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
        return $this->json(array_map(fn($c) => $this->cashboxService->serializeClosure($c), $closures));
    }

    // ═══════════════════════════════════════════════════════════════════
    //  GENERIC (backward-compatible)
    // ═══════════════════════════════════════════════════════════════════

    #[Route('/{id}', name: 'cashbox_detail', methods: ['GET'], requirements: ['id' => '\d+'])]
    #[IsGranted('cashbox.read')]
    public function detail(int $id, CashboxRepository $repo): JsonResponse
    {
        $box = $repo->find($id);
        if (!$box) {
            return $this->json(['error' => 'Not found'], 404);
        }

        // Hide guard for main cashbox
        if ($box->getCashboxType() === 'MAIN' && $this->cashboxService->isMainCashboxHidden()) {
            return $this->json(['error' => 'Not found'], 404);
        }

        return $this->json($this->cashboxService->serializeCashbox($box, true));
    }

    #[Route('/{id}/movement', name: 'cashbox_add_movement', methods: ['POST'], requirements: ['id' => '\d+'])]
    #[IsGranted('cashbox.update')]
    public function addMovement(int $id, Request $request, CashboxRepository $repo): JsonResponse
    {
        $box = $repo->find($id);
        if (!$box) {
            return $this->json(['error' => 'Cashbox not found'], 404);
        }

        $data = json_decode($request->getContent(), true) ?? [];
        foreach (['movementType', 'amount'] as $req) {
            if (!isset($data[$req])) {
                return $this->json(['error' => 'Missing required field: ' . $req], 400);
            }
        }

        try {
            $user = $this->getUser();
            $movement = $this->cashboxService->addMovement($box, $data['movementType'], (string) $data['amount'], [
                'category' => $data['category'] ?? null,
                'description' => $data['description'] ?? null,
                'paymentMethod' => $data['paymentMethod'] ?? null,
                'referenceId' => $data['referenceId'] ?? null,
                'user' => $user instanceof User ? $user : null,
            ]);
            $this->em->flush();
        } catch (\RuntimeException $e) {
            return $this->json(['error' => $e->getMessage()], 400);
        }

        return $this->json([
            'status' => 'ok',
            'movementId' => $movement->getId(),
            'currentBalance' => $box->getCurrentBalance(),
        ]);
    }

    #[Route('/{id}/close', name: 'cashbox_close', methods: ['POST'], requirements: ['id' => '\d+'])]
    #[IsGranted('cashbox.close')]
    public function close(int $id, Request $request, CashboxRepository $repo): JsonResponse
    {
        $box = $repo->find($id);
        if (!$box) {
            return $this->json(['error' => 'Cashbox not found'], 404);
        }

        $data = json_decode($request->getContent(), true) ?? [];
        if (!isset($data['actualCash'])) {
            return $this->json(['error' => 'Missing required field: actualCash'], 400);
        }

        $user = $this->getUser();
        if (!$user instanceof User) {
            return $this->json(['error' => 'Unauthorized'], 401);
        }

        if ($box->getCashboxType() === 'EVENT') {
            try {
                $result = $this->cashboxService->closeEventCashbox($box, (string) $data['actualCash'], $user, $data['notes'] ?? null);
            } catch (\RuntimeException $e) {
                return $this->json(['error' => $e->getMessage()], 400);
            }
            return $this->json([
                'status' => 'closed',
                'closureId' => $result['closure']->getId(),
                'transferAmount' => $result['transferAmount'],
            ]);
        }

        // Generic close for non-event cashboxes (main or legacy)
        $conn = $this->em->getConnection();
        $row = $conn->fetchAssociative(
            "SELECT
                COALESCE(SUM(CASE WHEN movement_type = 'INCOME' THEN amount ELSE 0 END), 0) AS total_income,
                COALESCE(SUM(CASE WHEN movement_type = 'EXPENSE' THEN amount ELSE 0 END), 0) AS total_expense
             FROM cash_movement WHERE cashbox_id = :id",
            ['id' => $id]
        );
        $totalIncome = (string) ($row['total_income'] ?? '0');
        $totalExpense = (string) ($row['total_expense'] ?? '0');
        $expected = $box->getCurrentBalance();
        $actual = (string) $data['actualCash'];
        $difference = (string) ((float) $actual - (float) $expected);
        $net = (string) ((float) $totalIncome - (float) $totalExpense);

        $closure = new \App\Entity\CashboxClosure();
        $closure->setCashbox($box)
            ->setExpectedCash($expected)
            ->setActualCash($actual)
            ->setDifference($difference)
            ->setTotalIncome($totalIncome)
            ->setTotalExpense($totalExpense)
            ->setNetResult($net)
            ->setClosedBy($user);
        if (isset($data['notes'])) {
            $closure->setNotes($data['notes']);
        }
        $this->em->persist($closure);

        $box->setIsActive(false)->setClosedAt(new \DateTime());
        $this->em->flush();

        return $this->json(['status' => 'closed', 'closureId' => $closure->getId()]);
    }

    #[Route('/{id}/destroy', name: 'cashbox_destroy', methods: ['POST'], requirements: ['id' => '\d+'])]
    #[IsGranted('cashbox.delete')]
    public function destroy(int $id, CashboxRepository $repo): JsonResponse
    {
        $box = $repo->find($id);
        if (!$box) {
            return $this->json(['error' => 'Cashbox not found'], 404);
        }
        $conn = $this->em->getConnection();
        $conn->executeStatement('SELECT destroy_cashbox(:id)', ['id' => $id]);
        $this->em->refresh($box);
        return $this->json(['status' => 'destroyed', 'currentBalance' => $box->getCurrentBalance(), 'isActive' => $box->isActive()]);
    }

    #[Route('/result/{reservationId}', name: 'cashbox_result_reservation', methods: ['GET'])]
    #[IsGranted('cashbox.read')]
    public function resultReservation(int $reservationId): JsonResponse
    {
        $conn = $this->em->getConnection();
        $row = $conn->fetchAssociative('SELECT * FROM calculate_event_result(:rid)', ['rid' => $reservationId]);
        if (!$row) {
            $row = ['total_income' => '0.00', 'total_expense' => '0.00', 'net_result' => '0.00'];
        }
        return $this->json([
            'reservationId' => $reservationId,
            'totalIncome' => $row['total_income'] ?? '0.00',
            'totalExpense' => $row['total_expense'] ?? '0.00',
            'netResult' => $row['net_result'] ?? '0.00',
        ]);
    }

    // ═══════════════════════════════════════════════════════════════════
    //  TRANSFERS (Main → Event)
    // ═══════════════════════════════════════════════════════════════════

    #[Route('/main/transfer-to-event', name: 'cashbox_transfer_to_event', methods: ['POST'])]
    #[IsGranted('cashbox.update')]
    public function initiateTransfer(Request $request, EventRepository $eventRepo): JsonResponse
    {
        if ($this->cashboxService->isMainCashboxHidden()) {
            return $this->json(['error' => 'Not found'], 404);
        }

        $data = json_decode($request->getContent(), true) ?? [];
        if (!isset($data['eventId'], $data['amount'])) {
            return $this->json(['error' => 'Missing required fields: eventId, amount'], 400);
        }

        $event = $eventRepo->find($data['eventId']);
        if (!$event) {
            return $this->json(['error' => 'Event nenalezen'], 404);
        }

        $amount = (float) $data['amount'];
        if ($amount <= 0) {
            return $this->json(['error' => 'Částka musí být kladná'], 400);
        }

        $user = $this->getUser();
        if (!$user instanceof User) {
            return $this->json(['error' => 'Unauthorized'], 401);
        }

        try {
            $transfer = $this->cashboxService->initiateTransferToEvent(
                $event,
                (string) $amount,
                $user,
                $data['description'] ?? null
            );

            return $this->json($this->cashboxService->serializeTransfer($transfer), 201);
        } catch (\RuntimeException $e) {
            return $this->json(['error' => $e->getMessage()], 400);
        }
    }

    #[Route('/transfers/pending', name: 'cashbox_transfers_pending', methods: ['GET'])]
    #[IsGranted('cashbox.read')]
    public function pendingTransfers(CashboxTransferRepository $transferRepo): JsonResponse
    {
        $transfers = $transferRepo->findAllPending();
        return $this->json(array_map(
            fn(CashboxTransfer $t) => $this->cashboxService->serializeTransfer($t),
            $transfers
        ));
    }

    #[Route('/transfers/all', name: 'cashbox_transfers_all', methods: ['GET'])]
    #[IsGranted('cashbox.read')]
    public function allTransfers(CashboxTransferRepository $transferRepo): JsonResponse
    {
        $main = $this->cashboxService->getMainCashbox();
        if (!$main) {
            return $this->json([]);
        }
        $transfers = $transferRepo->findBySourceCashbox($main);
        return $this->json(array_map(
            fn(CashboxTransfer $t) => $this->cashboxService->serializeTransfer($t),
            $transfers
        ));
    }

    #[Route('/event/{eventId}/pending-transfers', name: 'cashbox_event_pending_transfers', methods: ['GET'])]
    #[IsGranted('events.read')]
    public function eventPendingTransfers(int $eventId, EventRepository $eventRepo, CashboxTransferRepository $transferRepo): JsonResponse
    {
        $event = $eventRepo->find($eventId);
        if (!$event) {
            return $this->json(['error' => 'Event nenalezen'], 404);
        }

        $transfers = $transferRepo->findPendingByEvent($event);
        return $this->json(array_map(
            fn(CashboxTransfer $t) => $this->cashboxService->serializeTransfer($t),
            $transfers
        ));
    }

    #[Route('/transfers/{id}/confirm', name: 'cashbox_transfer_confirm', methods: ['POST'])]
    public function confirmTransfer(int $id, CashboxTransferRepository $transferRepo): JsonResponse
    {
        $user = $this->getUser();
        if (!$user instanceof User) {
            return $this->json(['error' => 'Unauthorized'], 401);
        }

        // Role check: only MANAGER+ can confirm
        $roles = $user->getRoles();
        $allowed = array_intersect($roles, ['ROLE_SUPER_ADMIN', 'ROLE_ADMIN', 'ROLE_MANAGER']);
        if (empty($allowed)) {
            return $this->json(['error' => 'Pouze manažer může potvrdit převzetí peněz'], 403);
        }

        $transfer = $transferRepo->find($id);
        if (!$transfer) {
            return $this->json(['error' => 'Převod nenalezen'], 404);
        }

        try {
            $eventCashbox = $this->cashboxService->confirmTransfer($transfer, $user);

            return $this->json([
                'status' => 'CONFIRMED',
                'cashbox' => $this->cashboxService->serializeCashbox($eventCashbox),
                'confirmedAt' => $transfer->getConfirmedAt()?->format(DATE_ATOM),
            ]);
        } catch (\RuntimeException $e) {
            return $this->json(['error' => $e->getMessage()], 400);
        }
    }

    #[Route('/transfers/{id}/reject', name: 'cashbox_transfer_reject', methods: ['POST'])]
    public function rejectTransfer(int $id, Request $request, CashboxTransferRepository $transferRepo): JsonResponse
    {
        $user = $this->getUser();
        if (!$user instanceof User) {
            return $this->json(['error' => 'Unauthorized'], 401);
        }

        // Role check: only MANAGER+ can reject
        $roles = $user->getRoles();
        $allowed = array_intersect($roles, ['ROLE_SUPER_ADMIN', 'ROLE_ADMIN', 'ROLE_MANAGER']);
        if (empty($allowed)) {
            return $this->json(['error' => 'Pouze manažer může odmítnout převod'], 403);
        }

        $transfer = $transferRepo->find($id);
        if (!$transfer) {
            return $this->json(['error' => 'Převod nenalezen'], 404);
        }

        $data = json_decode($request->getContent(), true) ?? [];

        try {
            $this->cashboxService->rejectTransfer($transfer, $user, $data['reason'] ?? null);

            return $this->json([
                'status' => 'REJECTED',
                'refundAmount' => $transfer->getAmount(),
            ]);
        } catch (\RuntimeException $e) {
            return $this->json(['error' => $e->getMessage()], 400);
        }
    }

    // ═══════════════════════════════════════════════════════════════════
    //  HIDDEN STATUS (for sidebar/frontend)
    // ═══════════════════════════════════════════════════════════════════

    #[Route('/main/hidden-status', name: 'cashbox_main_hidden_status', methods: ['GET'])]
    public function mainHiddenStatus(): JsonResponse
    {
        return $this->json([
            'hidden' => $this->cashboxService->isMainCashboxHidden(),
        ]);
    }
}
