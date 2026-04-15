<?php

namespace App\Controller;

use App\Entity\User;
use App\Repository\CashboxClosureRepository;
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
class CashboxMainController extends AbstractController
{
    public function __construct(
        private readonly EntityManagerInterface $em,
        private readonly CashboxService $cashboxService,
        private readonly CashMovementService $movementService,
        private readonly CashboxClosureService $closureService,
        private readonly CashboxSerializer $serializer,
    ) {
    }

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

        return $this->json($this->serializer->serializeCashbox($main, true));
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

        return $this->json($this->serializer->serializeCashbox($main), 201);
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
            'movement' => $this->serializer->serializeMovement($movement),
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

        return $this->json($this->closureService->getCashboxReport($main, $dateFrom, $dateTo));
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

        return $this->json($this->movementService->getFilteredMovements($main, $filters, $page, $limit));
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
            $movement = $this->movementService->addMovement($main, $data['movementType'], (string) $data['amount'], [
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
            $updated = $this->movementService->editMovement($movement, $data, $user);
            $this->em->flush();
            return $this->json($this->serializer->serializeMovement($updated));
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
            $this->movementService->deleteMovement($movement, $user);
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

        return $this->json(array_map(fn($log) => $this->serializer->serializeAuditLog($log), $logs));
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
        return $this->json(array_map(fn($c) => $this->serializer->serializeClosure($c), $closures));
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

        $movements = $this->movementService->getAllFilteredMovements($main, $filters);
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
            $result = $this->closureService->closeMainCashbox(
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
