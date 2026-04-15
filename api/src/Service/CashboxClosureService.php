<?php

declare(strict_types=1);

namespace App\Service;

use App\Entity\Cashbox;
use App\Entity\CashboxClosure;
use App\Entity\CashMovement;
use App\Entity\User;
use App\Serializer\CashboxSerializer;
use Doctrine\ORM\EntityManagerInterface;

class CashboxClosureService
{
    private ?string $currentIp = null;

    public function __construct(
        private readonly EntityManagerInterface $em,
        private readonly CashboxService $cashboxService,
        private readonly CashMovementService $movementService,
        private readonly CashboxSerializer $serializer,
    ) {
    }

    public function setCurrentIp(?string $ip): void
    {
        $this->currentIp = $ip;
    }

    /**
     * Closes event cashbox, creates CashboxClosure, and transfers net result to main cashbox.
     *
     * @return array{closure: CashboxClosure, pendingTransfer: ?\App\Entity\CashboxTransfer, transferAmount: string}
     */
    public function closeEventCashbox(Cashbox $eventCashbox, string $actualCash, User $user, ?string $notes = null): array
    {
        if (!$eventCashbox->isActive()) {
            throw new \RuntimeException('Kasa je již uzavřena');
        }
        if ($eventCashbox->getCashboxType() !== 'EVENT') {
            throw new \RuntimeException('Toto není kasa eventu.');
        }

        $this->em->beginTransaction();
        try {
            // Calculate totals
            $conn = $this->em->getConnection();
            $row = $conn->fetchAssociative(
                "SELECT
                    COALESCE(SUM(CASE WHEN movement_type = 'INCOME' THEN amount ELSE 0 END), 0) AS total_income,
                    COALESCE(SUM(CASE WHEN movement_type = 'EXPENSE' THEN amount ELSE 0 END), 0) AS total_expense
                 FROM cash_movement WHERE cashbox_id = :id",
                ['id' => $eventCashbox->getId()]
            );

            $totalIncome = (string) ($row['total_income'] ?? '0');
            $totalExpense = (string) ($row['total_expense'] ?? '0');
            $expected = $eventCashbox->getCurrentBalance();
            $difference = bcsub($actualCash, $expected, 2);
            $net = bcsub($totalIncome, $totalExpense, 2);

            // Create closure record
            $closure = new CashboxClosure();
            $closure->setCashbox($eventCashbox)
                ->setExpectedCash($expected)
                ->setActualCash($actualCash)
                ->setDifference($difference)
                ->setTotalIncome($totalIncome)
                ->setTotalExpense($totalExpense)
                ->setNetResult($net)
                ->setClosedBy($user);

            if ($notes) {
                $closure->setNotes($notes);
            }

            $this->em->persist($closure);

            // Close the event cashbox
            $eventCashbox->setIsActive(false);
            $eventCashbox->setClosedAt(new \DateTime());

            // Create a PENDING transfer to main cashbox (requires approval)
            // Peníze se nepřevedou automaticky - musí schválit majitel/superadmin
            $pendingTransfer = null;
            $transferAmount = $actualCash;

            if (bccomp($actualCash, '0', 2) > 0) {
                $mainCashbox = $this->cashboxService->getOrCreateMainCashbox();

                // Create EXPENSE in event cashbox (money leaves)
                $expenseMovement = new CashMovement();
                $expenseMovement->setCashbox($eventCashbox);
                $expenseMovement->setMovementType('EXPENSE');
                $expenseMovement->setAmount($actualCash);
                $expenseMovement->setCategory('TRANSFER_TO_MAIN');
                $expenseMovement->setDescription('Převod do hlavní kasy (čeká na schválení)');
                $expenseMovement->setUser($user);
                $this->em->persist($expenseMovement);

                // Update event cashbox balance
                $eventCashbox->setCurrentBalance(bcsub($eventCashbox->getCurrentBalance(), $actualCash, 2));

                $this->em->flush(); // get movement ID

                // Create pending transfer record
                $pendingTransfer = new \App\Entity\CashboxTransfer();
                $pendingTransfer->setSourceCashbox($mainCashbox); // source = main (for the transfer entity structure)
                $pendingTransfer->setTargetEvent($eventCashbox->getEvent());
                $pendingTransfer->setAmount($actualCash);
                $pendingTransfer->setDescription('Předání kasy z eventu: ' . $eventCashbox->getName() . ($notes ? ' (' . $notes . ')' : ''));
                $pendingTransfer->setStatus('PENDING');
                $pendingTransfer->setInitiatedBy($user);
                $pendingTransfer->setSourceMovementId($expenseMovement->getId());

                $this->em->persist($pendingTransfer);
            }

            $this->em->flush();
            $this->em->commit();

            $this->logAudit($eventCashbox, $user, 'CASHBOX_CLOSE', 'Cashbox', $eventCashbox->getId(), $this->serializer->serializeClosure($closure), "Kasa uzavřena, převod " . $actualCash . " Kč čeká na schválení");

            return [
                'closure' => $closure,
                'pendingTransfer' => $pendingTransfer,
                'transferAmount' => $transferAmount,
            ];
        } catch (\Throwable $e) {
            $this->em->rollback();
            throw $e;
        }
    }

    /**
     * Performs a daily close/reconciliation for the main cashbox without deactivating it.
     *
     * @return array{closure: CashboxClosure}
     */
    public function closeMainCashbox(Cashbox $mainCashbox, string $actualCash, User $user, ?string $notes = null): array
    {
        if ($mainCashbox->getCashboxType() !== 'MAIN') {
            throw new \RuntimeException('Toto neni hlavni kasa.');
        }

        // Find last closure for this cashbox to calculate period totals
        $lastClosure = $this->em->getRepository(CashboxClosure::class)
            ->findOneBy(['cashbox' => $mainCashbox], ['closedAt' => 'DESC']);

        $conn = $this->em->getConnection();

        if ($lastClosure) {
            // Sum movements since last closure
            $row = $conn->fetchAssociative(
                "SELECT
                    COALESCE(SUM(CASE WHEN movement_type = 'INCOME' THEN amount ELSE 0 END), 0) AS total_income,
                    COALESCE(SUM(CASE WHEN movement_type = 'EXPENSE' THEN amount ELSE 0 END), 0) AS total_expense
                 FROM cash_movement WHERE cashbox_id = :id AND created_at > :since",
                ['id' => $mainCashbox->getId(), 'since' => $lastClosure->getClosedAt()->format('Y-m-d H:i:s')]
            );
        } else {
            // All-time totals
            $row = $conn->fetchAssociative(
                "SELECT
                    COALESCE(SUM(CASE WHEN movement_type = 'INCOME' THEN amount ELSE 0 END), 0) AS total_income,
                    COALESCE(SUM(CASE WHEN movement_type = 'EXPENSE' THEN amount ELSE 0 END), 0) AS total_expense
                 FROM cash_movement WHERE cashbox_id = :id",
                ['id' => $mainCashbox->getId()]
            );
        }

        $totalIncome = (string) ($row['total_income'] ?? '0');
        $totalExpense = (string) ($row['total_expense'] ?? '0');
        $expectedCash = $mainCashbox->getCurrentBalance();
        $difference = bcsub($actualCash, $expectedCash, 2);
        $net = bcsub($totalIncome, $totalExpense, 2);

        // Create closure record
        $closure = new CashboxClosure();
        $closure->setCashbox($mainCashbox)
            ->setExpectedCash($expectedCash)
            ->setActualCash($actualCash)
            ->setDifference($difference)
            ->setTotalIncome($totalIncome)
            ->setTotalExpense($totalExpense)
            ->setNetResult($net)
            ->setClosedBy($user);

        if ($notes) {
            $closure->setNotes($notes);
        }

        $this->em->persist($closure);

        // Set currentBalance to actualCash (the verified amount) - do NOT deactivate
        $mainCashbox->setCurrentBalance($actualCash);

        $this->em->flush();

        $this->logAudit($mainCashbox, $user, 'CASHBOX_RECONCILE', 'Cashbox', $mainCashbox->getId(), $this->serializer->serializeClosure($closure), "Denni uzaverka: ocekavano {$expectedCash}, skutecnost {$actualCash}, rozdil {$difference}");

        return [
            'closure' => $closure,
        ];
    }

    /**
     * Get a full cashbox report for a date range.
     */
    public function getCashboxReport(Cashbox $cashbox, ?string $dateFrom = null, ?string $dateTo = null): array
    {
        $conn = $this->em->getConnection();

        // Base condition
        $conditions = ['cashbox_id = ?'];
        $params = [$cashbox->getId()];

        if ($dateFrom) {
            $conditions[] = 'created_at >= ?';
            $params[] = $dateFrom . ' 00:00:00';
        }
        if ($dateTo) {
            $conditions[] = 'created_at <= ?';
            $params[] = $dateTo . ' 23:59:59';
        }

        $where = implode(' AND ', $conditions);

        // Summary by type
        $summary = $conn->fetchAssociative(
            "SELECT
                COALESCE(SUM(CASE WHEN movement_type = 'INCOME' THEN amount ELSE 0 END), 0) AS total_income,
                COALESCE(SUM(CASE WHEN movement_type = 'EXPENSE' THEN amount ELSE 0 END), 0) AS total_expense,
                COUNT(*) AS movement_count
            FROM cash_movement WHERE {$where}",
            $params
        );

        // Breakdown by category
        $byCategory = $conn->fetchAllAssociative(
            "SELECT
                movement_type,
                COALESCE(category, 'Bez kategorie') AS category,
                COUNT(*) AS count,
                SUM(amount) AS total
            FROM cash_movement WHERE {$where}
            GROUP BY movement_type, category
            ORDER BY movement_type, total DESC",
            $params
        );

        // Corrections count
        $corrections = $conn->fetchAssociative(
            "SELECT COUNT(*) AS count, COALESCE(SUM(amount), 0) AS total
            FROM cash_movement WHERE {$where} AND category = 'KOREKCE'",
            $params
        );

        return [
            'cashboxId' => $cashbox->getId(),
            'cashboxName' => $cashbox->getName(),
            'currency' => $cashbox->getCurrency(),
            'currentBalance' => $cashbox->getCurrentBalance(),
            'initialBalance' => $cashbox->getInitialBalance(),
            'period' => ['from' => $dateFrom, 'to' => $dateTo],
            'summary' => [
                'totalIncome' => $summary['total_income'] ?? '0',
                'totalExpense' => $summary['total_expense'] ?? '0',
                'netResult' => bcsub($summary['total_income'] ?? '0', $summary['total_expense'] ?? '0', 2),
                'movementCount' => (int) ($summary['movement_count'] ?? 0),
            ],
            'byCategory' => array_map(fn($row) => [
                'type' => $row['movement_type'],
                'category' => $row['category'],
                'count' => (int) $row['count'],
                'total' => $row['total'],
            ], $byCategory),
            'corrections' => [
                'count' => (int) ($corrections['count'] ?? 0),
                'total' => $corrections['total'] ?? '0',
            ],
        ];
    }

    // ─── Audit Logging ────────────────────────────────────────────────

    private function logAudit(
        ?Cashbox $cashbox,
        ?User $user,
        string $action,
        string $entityType,
        ?int $entityId,
        ?array $changeData = null,
        ?string $description = null,
    ): void {
        $log = new \App\Entity\CashboxAuditLog();
        $log->setCashbox($cashbox);
        $log->setUser($user);
        $log->setAction($action);
        $log->setEntityType($entityType);
        $log->setEntityId($entityId);
        $log->setChangeData($changeData);
        $log->setDescription($description);
        $log->setIpAddress($this->currentIp);
        $this->em->persist($log);
    }
}
