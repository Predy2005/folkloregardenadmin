<?php

namespace App\Controller;

use App\Entity\Cashbox;
use App\Entity\User;
use App\Repository\CashboxRepository;
use App\Serializer\CashboxSerializer;
use App\Service\CashboxClosureService;
use App\Service\CashboxService;
use App\Service\CashMovementService;
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
        private readonly CashMovementService $movementService,
        private readonly CashboxClosureService $closureService,
        private readonly CashboxSerializer $serializer,
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

        $data = array_map(fn(Cashbox $c) => $this->serializer->serializeCashbox($c), $boxes);

        return $this->json($data);
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

        return $this->json($this->serializer->serializeCashbox($box, true));
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
            $movement = $this->movementService->addMovement($box, $data['movementType'], (string) $data['amount'], [
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
                $result = $this->closureService->closeEventCashbox($box, (string) $data['actualCash'], $user, $data['notes'] ?? null);
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
}
