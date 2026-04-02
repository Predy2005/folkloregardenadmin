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
use Symfony\Component\HttpFoundation\Response;
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

    #[Route('/main/adjust-balance', name: 'cashbox_main_adjust_balance', methods: ['POST'])]
    #[IsGranted('ROLE_SUPER_ADMIN')]
    public function mainAdjustBalance(Request $request): JsonResponse
    {
        $main = $this->cashboxService->getMainCashbox();
        if (!$main) {
            return $this->json(['error' => 'Hlavní kasa neexistuje'], 404);
        }

        $data = json_decode($request->getContent(), true) ?? [];
        if (!isset($data['newBalance']) || !isset($data['reason'])) {
            return $this->json(['error' => 'Povinné pole: newBalance, reason'], 400);
        }

        $this->cashboxService->setCurrentIp($request->getClientIp());
        $user = $this->getUser();

        try {
            $movement = $this->cashboxService->adjustBalance(
                $main,
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
            'movement' => $this->cashboxService->serializeMovement($movement),
            'newBalance' => $main->getCurrentBalance(),
        ]);
    }

    #[Route('/main/info', name: 'cashbox_main_update_info', methods: ['PUT', 'PATCH'])]
    #[IsGranted('cashbox.update')]
    public function mainUpdateInfo(Request $request): JsonResponse
    {
        $main = $this->cashboxService->getMainCashbox();
        if (!$main) {
            return $this->json(['error' => 'Hlavní kasa neexistuje'], 404);
        }

        $data = json_decode($request->getContent(), true) ?? [];
        $this->cashboxService->setCurrentIp($request->getClientIp());
        $user = $this->getUser();

        $this->cashboxService->updateCashboxInfo($main, $data, $user);

        return $this->json(['status' => 'ok']);
    }

    #[Route('/main/report', name: 'cashbox_main_report', methods: ['GET'])]
    #[IsGranted('cashbox.read')]
    public function mainReport(Request $request): JsonResponse
    {
        $main = $this->cashboxService->getMainCashbox();
        if (!$main) {
            return $this->json(['error' => 'Hlavní kasa neexistuje'], 404);
        }

        $dateFrom = $request->query->get('dateFrom');
        $dateTo = $request->query->get('dateTo');

        return $this->json($this->cashboxService->getCashboxReport($main, $dateFrom, $dateTo));
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
            'movement' => $this->cashboxService->serializeMovement($movement),
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

        return $this->json($this->cashboxService->getCashboxReport($cashbox, $dateFrom, $dateTo));
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

        if (!in_array($data['movementType'], ['INCOME', 'EXPENSE'], true)) {
            return $this->json(['error' => 'Neplatný typ pohybu. Povolené hodnoty: INCOME, EXPENSE'], 400);
        }

        $this->cashboxService->setCurrentIp($request->getClientIp());

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

    #[Route('/main/movement/{movementId}', name: 'cashbox_main_edit_movement', methods: ['PUT', 'PATCH'])]
    #[IsGranted('cashbox.update')]
    public function editMainMovement(int $movementId, Request $request): JsonResponse
    {
        $this->cashboxService->setCurrentIp($request->getClientIp());
        $main = $this->cashboxService->getMainCashbox();
        if (!$main) return $this->json(['error' => 'Hlavní kasa neexistuje'], 404);

        $movement = $this->em->getRepository(\App\Entity\CashMovement::class)->find($movementId);
        if (!$movement || $movement->getCashbox()->getId() !== $main->getId()) {
            return $this->json(['error' => 'Pohyb nenalezen'], 404);
        }

        $data = json_decode($request->getContent(), true) ?? [];
        $user = $this->getUser();

        try {
            $updated = $this->cashboxService->editMovement($movement, $data, $user);
            $this->em->flush();
            return $this->json($this->cashboxService->serializeMovement($updated));
        } catch (\RuntimeException $e) {
            return $this->json(['error' => $e->getMessage()], 400);
        }
    }

    #[Route('/main/movement/{movementId}', name: 'cashbox_main_delete_movement', methods: ['DELETE'])]
    #[IsGranted('cashbox.update')]
    public function deleteMainMovement(int $movementId, Request $request): JsonResponse
    {
        $this->cashboxService->setCurrentIp($request->getClientIp());
        $main = $this->cashboxService->getMainCashbox();
        if (!$main) return $this->json(['error' => 'Hlavní kasa neexistuje'], 404);

        $movement = $this->em->getRepository(\App\Entity\CashMovement::class)->find($movementId);
        if (!$movement || $movement->getCashbox()->getId() !== $main->getId()) {
            return $this->json(['error' => 'Pohyb nenalezen'], 404);
        }

        $user = $this->getUser();

        try {
            $this->cashboxService->deleteMovement($movement, $user);
            $this->em->flush();
            return $this->json(['status' => 'deleted']);
        } catch (\RuntimeException $e) {
            return $this->json(['error' => $e->getMessage()], 400);
        }
    }

    #[Route('/main/audit-log', name: 'cashbox_main_audit_log', methods: ['GET'])]
    #[IsGranted('cashbox.read')]
    public function mainAuditLog(Request $request): JsonResponse
    {
        $main = $this->cashboxService->getMainCashbox();
        if (!$main) return $this->json([]);

        $limit = min(200, max(10, (int) $request->query->get('limit', 100)));
        $offset = max(0, (int) $request->query->get('offset', 0));

        $logs = $this->em->getRepository(\App\Entity\CashboxAuditLog::class)->findByCashbox($main, $limit, $offset);

        return $this->json(array_map(fn($log) => $this->cashboxService->serializeAuditLog($log), $logs));
    }

    #[Route('/main/lock', name: 'cashbox_main_lock', methods: ['POST'])]
    #[IsGranted('cashbox.update')]
    public function mainLock(Request $request): JsonResponse
    {
        $this->cashboxService->setCurrentIp($request->getClientIp());
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
    public function mainReopen(Request $request): JsonResponse
    {
        $this->cashboxService->setCurrentIp($request->getClientIp());
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

    #[Route('/main/export', name: 'cashbox_main_export', methods: ['GET'])]
    #[IsGranted('cashbox.read')]
    public function exportMainMovements(Request $request): Response
    {
        $main = $this->cashboxService->getMainCashbox();
        if (!$main) {
            return new Response('Hlavní kasa neexistuje.', 404);
        }

        $filters = [
            'dateFrom' => $request->query->get('dateFrom'),
            'dateTo' => $request->query->get('dateTo'),
            'category' => $request->query->get('category'),
            'movementType' => $request->query->get('movementType'),
        ];

        $movements = $this->cashboxService->getAllFilteredMovements($main, $filters);
        $csv = $this->generateMovementsCsv($movements);
        $date = (new \DateTime())->format('Y-m-d');

        return new Response($csv, 200, [
            'Content-Type' => 'text/csv; charset=UTF-8',
            'Content-Disposition' => "attachment; filename=\"kasa-export-{$date}.csv\"",
        ]);
    }

    #[Route('/main/close', name: 'cashbox_main_close', methods: ['POST'])]
    #[IsGranted('cashbox.close')]
    public function mainClose(Request $request): JsonResponse
    {
        if ($this->cashboxService->isMainCashboxHidden()) {
            return $this->json(['error' => 'Not found'], 404);
        }

        $main = $this->cashboxService->getMainCashbox();
        if (!$main) {
            return $this->json(['error' => 'Hlavní kasa neexistuje.'], 404);
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
            $result = $this->cashboxService->closeMainCashbox(
                $main,
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
            'expectedCash' => $result['closure']->getExpectedCash(),
            'actualCash' => $result['closure']->getActualCash(),
            'difference' => $result['closure']->getDifference(),
            'currentBalance' => $main->getCurrentBalance(),
        ]);
    }

    // ═══════════════════════════════════════════════════════════════════
    //  EVENT CASHBOX
    // ═══════════════════════════════════════════════════════════════════

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

        $movements = $this->cashboxService->getAllFilteredMovements($cashbox, $filters);
        $csv = $this->generateMovementsCsv($movements);
        $date = (new \DateTime())->format('Y-m-d');
        $eventName = preg_replace('/[^a-zA-Z0-9_-]/', '_', $event->getName());

        return new Response($csv, 200, [
            'Content-Type' => 'text/csv; charset=UTF-8',
            'Content-Disposition' => "attachment; filename=\"kasa-event-{$eventName}-{$date}.csv\"",
        ]);
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

        if (!in_array($data['movementType'], ['INCOME', 'EXPENSE'], true)) {
            return $this->json(['error' => 'Neplatný typ pohybu. Povolené hodnoty: INCOME, EXPENSE'], 400);
        }

        $this->cashboxService->setCurrentIp($request->getClientIp());

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
            $updated = $this->cashboxService->editMovement($movement, $data, $user);
            $this->em->flush();
            return $this->json($this->cashboxService->serializeMovement($updated));
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
            $this->cashboxService->deleteMovement($movement, $user);
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

        return $this->json(array_map(fn($log) => $this->cashboxService->serializeAuditLog($log), $logs));
    }

    #[Route('/event/{eventId}/close', name: 'cashbox_event_close', methods: ['POST'])]
    #[IsGranted('cashbox.close')]
    public function eventClose(int $eventId, Request $request, EventRepository $eventRepo): JsonResponse
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
        $this->cashboxService->setCurrentIp($request->getClientIp());
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

        if (!in_array($data['movementType'], ['INCOME', 'EXPENSE'], true)) {
            return $this->json(['error' => 'Neplatný typ pohybu. Povolené hodnoty: INCOME, EXPENSE'], 400);
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

    #[Route('/main/reset', name: 'cashbox_main_reset', methods: ['POST'])]
    #[IsGranted('ROLE_SUPER_ADMIN')]
    public function mainReset(Request $request): JsonResponse
    {
        $main = $this->cashboxService->getMainCashbox();
        if (!$main) {
            return $this->json(['error' => 'Hlavní kasa neexistuje'], 404);
        }

        $data = json_decode($request->getContent(), true) ?? [];
        if (($data['confirm'] ?? '') !== 'RESET') {
            return $this->json(['error' => 'Pro reset pošlete { "confirm": "RESET" }'], 400);
        }

        $cashboxId = $main->getId();
        $conn = $this->em->getConnection();

        // Delete all related data
        $conn->executeStatement('DELETE FROM cashbox_audit_log WHERE cashbox_id = ?', [$cashboxId]);
        $conn->executeStatement('DELETE FROM cashbox_transfer WHERE source_cashbox_id = ?', [$cashboxId]);
        $conn->executeStatement('DELETE FROM cashbox_closure WHERE cashbox_id = ?', [$cashboxId]);
        $conn->executeStatement('DELETE FROM cash_movement WHERE cashbox_id = ?', [$cashboxId]);
        $conn->executeStatement('DELETE FROM cashbox WHERE id = ?', [$cashboxId]);

        // Clear entity manager to avoid stale references
        $this->em->clear();

        return $this->json(['status' => 'reset', 'message' => 'Hlavní kasa byla kompletně smazána. Můžete ji znovu inicializovat.']);
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
        $this->cashboxService->setCurrentIp($request->getClientIp());
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
    public function confirmTransfer(int $id, Request $request, CashboxTransferRepository $transferRepo): JsonResponse
    {
        $this->cashboxService->setCurrentIp($request->getClientIp());
        $user = $this->getUser();
        if (!$user instanceof User) {
            return $this->json(['error' => 'Unauthorized'], 401);
        }

        // Role check: only MANAGER+ or super admin can confirm
        if (!$user->isSuperAdmin()) {
            $roles = $user->getRoles();
            $allowed = array_intersect($roles, ['ROLE_SUPER_ADMIN', 'ROLE_ADMIN', 'ROLE_MANAGER']);
            if (empty($allowed)) {
                return $this->json(['error' => 'Pouze manažer může potvrdit převzetí peněz'], 403);
            }
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

    #[Route('/transfers/{id}/approve-closure', name: 'cashbox_transfer_approve_closure', methods: ['POST'])]
    #[IsGranted('ROLE_SUPER_ADMIN')]
    public function approveClosureTransfer(int $id, Request $request, CashboxTransferRepository $transferRepo): JsonResponse
    {
        $this->cashboxService->setCurrentIp($request->getClientIp());
        $user = $this->getUser();
        if (!$user instanceof User) {
            return $this->json(['error' => 'Unauthorized'], 401);
        }

        $transfer = $transferRepo->find($id);
        if (!$transfer) {
            return $this->json(['error' => 'Převod nenalezen'], 404);
        }

        try {
            $this->cashboxService->approveClosureTransfer($transfer, $user);

            return $this->json([
                'status' => 'CONFIRMED',
                'amount' => $transfer->getAmount(),
                'confirmedAt' => $transfer->getConfirmedAt()?->format(DATE_ATOM),
                'message' => 'Předání kasy schváleno. Peníze přijaty do hlavní kasy.',
            ]);
        } catch (\RuntimeException $e) {
            return $this->json(['error' => $e->getMessage()], 400);
        }
    }

    #[Route('/transfers/{id}/reject', name: 'cashbox_transfer_reject', methods: ['POST'])]
    public function rejectTransfer(int $id, Request $request, CashboxTransferRepository $transferRepo): JsonResponse
    {
        $this->cashboxService->setCurrentIp($request->getClientIp());
        $user = $this->getUser();
        if (!$user instanceof User) {
            return $this->json(['error' => 'Unauthorized'], 401);
        }

        // Role check: only MANAGER+ or super admin can reject
        if (!$user->isSuperAdmin()) {
            $roles = $user->getRoles();
            $allowed = array_intersect($roles, ['ROLE_SUPER_ADMIN', 'ROLE_ADMIN', 'ROLE_MANAGER']);
            if (empty($allowed)) {
                return $this->json(['error' => 'Pouze manažer může odmítnout převod'], 403);
            }
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

    #[Route('/transfers/{id}/cancel', name: 'cashbox_transfer_cancel', methods: ['POST'])]
    #[IsGranted('cashbox.update')]
    public function cancelTransfer(int $id, Request $request): JsonResponse
    {
        $this->cashboxService->setCurrentIp($request->getClientIp());
        $transfer = $this->em->getRepository(\App\Entity\CashboxTransfer::class)->find($id);
        if (!$transfer) return $this->json(['error' => 'Převod nenalezen'], 404);

        $user = $this->getUser();

        try {
            $this->cashboxService->cancelTransfer($transfer, $user);
            $this->em->flush();
            return $this->json(['status' => 'cancelled']);
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
