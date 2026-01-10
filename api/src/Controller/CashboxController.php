<?php

namespace App\Controller;

use App\Entity\Cashbox;
use App\Entity\CashMovement;
use App\Entity\CashboxClosure;
use App\Entity\Reservation;
use App\Entity\User;
use App\Repository\CashboxRepository;
use App\Repository\CashMovementRepository;
use App\Repository\CashboxClosureRepository;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Annotation\Route;
use Symfony\Component\Security\Http\Attribute\IsGranted;

#[Route('/api/cashbox')]
class CashboxController extends AbstractController
{
    public function __construct(private readonly EntityManagerInterface $em)
    {
    }

    #[Route('', name: 'cashbox_list', methods: ['GET'])]
    #[IsGranted('cashbox.read')]
    public function list(CashboxRepository $repo): JsonResponse
    {
        $boxes = $repo->findBy([], ['isActive' => 'DESC', 'openedAt' => 'DESC']);
        $data = array_map(function (Cashbox $c) {
            return [
                'id' => $c->getId(),
                'name' => $c->getName(),
                'currency' => $c->getCurrency(),
                'initialBalance' => $c->getInitialBalance(),
                'currentBalance' => $c->getCurrentBalance(),
                'reservationId' => $c->getReservation()?->getId(),
                'openedAt' => $c->getOpenedAt()->format(DATE_ATOM),
                'closedAt' => $c->getClosedAt()?->format(DATE_ATOM),
                'isActive' => $c->isActive(),
                'userId' => $c->getUser()?->getId(),
            ];
        }, $boxes);
        return $this->json($data);
    }

    #[Route('/{id}', name: 'cashbox_detail', methods: ['GET'])]
    #[IsGranted('cashbox.read')]
    public function detail(int $id, CashboxRepository $repo, CashMovementRepository $movRepo): JsonResponse
    {
        $box = $repo->find($id);
        if (!$box) { return $this->json(['error' => 'Not found'], 404); }

        $qb = $movRepo->createQueryBuilder('m')
            ->andWhere('m.cashbox = :cb')
            ->setParameter('cb', $box)
            ->orderBy('m.createdAt', 'DESC')
            ->setMaxResults(100);
        $movements = $qb->getQuery()->getResult();
        $mvData = array_map(function (CashMovement $m) {
            return [
                'id' => $m->getId(),
                'movementType' => $m->getMovementType(),
                'category' => $m->getCategory(),
                'amount' => $m->getAmount(),
                'currency' => $m->getCurrency(),
                'description' => $m->getDescription(),
                'paymentMethod' => $m->getPaymentMethod(),
                'referenceId' => $m->getReferenceId(),
                'reservationId' => $m->getReservation()?->getId(),
                'userId' => $m->getUser()?->getId(),
                'createdAt' => $m->getCreatedAt()->format(DATE_ATOM),
            ];
        }, $movements);

        $data = [
            'id' => $box->getId(),
            'name' => $box->getName(),
            'description' => $box->getDescription(),
            'currency' => $box->getCurrency(),
            'initialBalance' => $box->getInitialBalance(),
            'currentBalance' => $box->getCurrentBalance(),
            'reservationId' => $box->getReservation()?->getId(),
            'openedAt' => $box->getOpenedAt()->format(DATE_ATOM),
            'closedAt' => $box->getClosedAt()?->format(DATE_ATOM),
            'isActive' => $box->isActive(),
            'userId' => $box->getUser()?->getId(),
            'notes' => $box->getNotes(),
            'movements' => $mvData,
        ];
        return $this->json($data);
    }

    #[Route('', name: 'cashbox_create', methods: ['POST'])]
    #[IsGranted('cashbox.create')]
    public function create(Request $request): JsonResponse
    {
        $data = json_decode($request->getContent(), true) ?? [];
        if (!isset($data['name'])) {
            return $this->json(['error' => 'Missing required field: name'], 400);
        }
        $box = new Cashbox();
        $box->setName($data['name']);
        if (isset($data['description'])) $box->setDescription($data['description']);
        if (isset($data['currency'])) $box->setCurrency($data['currency']);
        if (isset($data['initialBalance'])) {
            $box->setInitialBalance((string)$data['initialBalance']);
            $box->setCurrentBalance((string)$data['initialBalance']);
        }
        if (isset($data['reservationId'])) {
            $res = $this->em->getRepository(Reservation::class)->find((int)$data['reservationId']);
            if ($res) $box->setReservation($res);
        }
        if (isset($data['userId'])) {
            $user = $this->em->getRepository(User::class)->find((int)$data['userId']);
            if ($user) $box->setUser($user);
        }
        if (isset($data['notes'])) $box->setNotes($data['notes']);
        $this->em->persist($box);
        $this->em->flush();
        return $this->json(['status' => 'created', 'id' => $box->getId()], 201);
    }

    #[Route('/{id}/movement', name: 'cashbox_add_movement', methods: ['POST'])]
    #[IsGranted('cashbox.update')]
    public function addMovement(int $id, Request $request, CashboxRepository $repo): JsonResponse
    {
        $box = $repo->find($id);
        if (!$box) { return $this->json(['error' => 'Cashbox not found'], 404); }
        $data = json_decode($request->getContent(), true) ?? [];
        foreach (['movementType','amount'] as $req) {
            if (!isset($data[$req])) return $this->json(['error' => 'Missing required field: '.$req], 400);
        }
        $m = new CashMovement();
        $m->setCashbox($box)
          ->setMovementType($data['movementType'])
          ->setAmount((string)$data['amount']);
        if (isset($data['category'])) $m->setCategory($data['category']);
        if (isset($data['currency'])) $m->setCurrency($data['currency']);
        if (isset($data['description'])) $m->setDescription($data['description']);
        if (isset($data['paymentMethod'])) $m->setPaymentMethod($data['paymentMethod']);
        if (isset($data['referenceId'])) $m->setReferenceId($data['referenceId']);
        if (isset($data['reservationId'])) {
            $res = $this->em->getRepository(Reservation::class)->find((int)$data['reservationId']);
            if ($res) $m->setReservation($res);
        }
        if (isset($data['userId'])) {
            $user = $this->em->getRepository(User::class)->find((int)$data['userId']);
            if ($user) $m->setUser($user);
        }
        $this->em->persist($m);
        $this->em->flush();
        // Refresh to get updated balance by trigger
        $this->em->refresh($box);
        return $this->json(['status' => 'ok', 'movementId' => $m->getId(), 'currentBalance' => $box->getCurrentBalance()]);
    }

    #[Route('/{id}/destroy', name: 'cashbox_destroy', methods: ['POST'])]
    #[IsGranted('cashbox.delete')]
    public function destroy(int $id, CashboxRepository $repo): JsonResponse
    {
        $box = $repo->find($id);
        if (!$box) { return $this->json(['error' => 'Cashbox not found'], 404); }
        $conn = $this->em->getConnection();
        $conn->executeStatement('SELECT destroy_cashbox(:id)', ['id' => $id]);
        // reload entity state
        $this->em->refresh($box);
        return $this->json(['status' => 'destroyed', 'currentBalance' => $box->getCurrentBalance(), 'isActive' => $box->isActive()]);
    }

    #[Route('/{id}/close', name: 'cashbox_close', methods: ['POST'])]
    #[IsGranted('cashbox.close')]
    public function close(int $id, Request $request, CashboxRepository $repo): JsonResponse
    {
        $box = $repo->find($id);
        if (!$box) { return $this->json(['error' => 'Cashbox not found'], 404); }
        $data = json_decode($request->getContent(), true) ?? [];
        if (!isset($data['actualCash'])) { return $this->json(['error' => 'Missing required field: actualCash'], 400); }

        // compute totals for the cashbox
        $conn = $this->em->getConnection();
        $row = $conn->fetchAssociative(
            'SELECT 
                COALESCE(SUM(CASE WHEN movement_type = \"INCOME\" THEN amount ELSE 0 END),0) AS total_income,
                COALESCE(SUM(CASE WHEN movement_type = \"EXPENSE\" THEN amount ELSE 0 END),0) AS total_expense
             FROM cash_movement WHERE cashbox_id = :id', ['id' => $id]
        );
        $totalIncome = (string)($row['total_income'] ?? '0');
        $totalExpense = (string)($row['total_expense'] ?? '0');
        $expected = $box->getCurrentBalance();
        $actual = (string)$data['actualCash'];
        // difference = actual - expected
        $difference = (string) ((float)$actual - (float)$expected);
        $net = (string) ((float)$totalIncome - (float)$totalExpense);

        $closure = new CashboxClosure();
        $closure->setCashbox($box)
            ->setExpectedCash($expected)
            ->setActualCash($actual)
            ->setDifference($difference)
            ->setTotalIncome($totalIncome)
            ->setTotalExpense($totalExpense)
            ->setNetResult($net);
        if (isset($data['notes'])) $closure->setNotes($data['notes']);
        if (isset($data['closedBy'])) {
            $user = $this->em->getRepository(User::class)->find((int)$data['closedBy']);
            if ($user) $closure->setClosedBy($user);
        }
        $this->em->persist($closure);

        // update cashbox state
        $box->setIsActive(false)->setClosedAt(new \DateTime());
        $this->em->flush();

        return $this->json(['status' => 'closed', 'closureId' => $closure->getId()]);
    }

    #[Route('/result/{reservationId}', name: 'cashbox_result_reservation', methods: ['GET'])]
    #[IsGranted('cashbox.read')]
    public function resultReservation(int $reservationId): JsonResponse
    {
        $conn = $this->em->getConnection();
        $row = $conn->fetchAssociative('SELECT * FROM calculate_event_result(:rid)', ['rid' => $reservationId]);
        if (!$row) { $row = ['total_income' => '0.00', 'total_expense' => '0.00', 'net_result' => '0.00']; }
        return $this->json([
            'reservationId' => $reservationId,
            'totalIncome' => $row['total_income'] ?? '0.00',
            'totalExpense' => $row['total_expense'] ?? '0.00',
            'netResult' => $row['net_result'] ?? '0.00',
        ]);
    }
}
