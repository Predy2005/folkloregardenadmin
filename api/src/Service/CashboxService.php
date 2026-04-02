<?php

declare(strict_types=1);

namespace App\Service;

use App\Entity\Cashbox;
use App\Entity\CashboxClosure;
use App\Entity\CashMovement;
use App\Entity\CompanySettings;
use App\Entity\Event;
use App\Entity\EventStaffAssignment;
use App\Entity\StaffMember;
use App\Entity\User;
use App\Entity\CashboxTransfer;
use App\Repository\CashboxRepository;
use App\Repository\CashboxTransferRepository;
use App\Repository\CashMovementCategoryRepository;
use App\Repository\CompanySettingsRepository;
use Doctrine\ORM\EntityManagerInterface;

class CashboxService
{
    private ?string $currentIp = null;

    public function __construct(
        private readonly EntityManagerInterface $em,
        private readonly CashboxRepository $cashboxRepo,
        private readonly CompanySettingsRepository $settingsRepo,
        private readonly CashMovementCategoryRepository $categoryRepo,
        private readonly CashboxTransferRepository $transferRepo,
    ) {
    }

    public function setCurrentIp(?string $ip): void
    {
        $this->currentIp = $ip;
    }

    // ─── Main Cashbox ────────────────────────────────────────────────

    public function getMainCashbox(): ?Cashbox
    {
        return $this->cashboxRepo->findOneBy(['cashboxType' => 'MAIN']);
    }

    public function getOrCreateMainCashbox(): Cashbox
    {
        $main = $this->getMainCashbox();
        if ($main) {
            return $main;
        }

        $main = new Cashbox();
        $main->setName('Hlavní kasa');
        $main->setCashboxType('MAIN');
        $main->setIsActive(true);
        $this->em->persist($main);
        $this->em->flush();

        return $main;
    }

    // ─── Event Cashbox ───────────────────────────────────────────────

    public function getEventCashbox(Event $event): ?Cashbox
    {
        return $this->cashboxRepo->findOneBy([
            'cashboxType' => 'EVENT',
            'event' => $event,
        ]);
    }

    public function getOrCreateEventCashbox(Event $event, string $initialBalance = '0.00'): Cashbox
    {
        $cashbox = $this->getEventCashbox($event);
        if ($cashbox) {
            return $cashbox;
        }

        $cashbox = new Cashbox();
        $cashbox->setName('Kasa - ' . $event->getName());
        $cashbox->setCashboxType('EVENT');
        $cashbox->setEvent($event);
        $cashbox->setInitialBalance($initialBalance);
        $cashbox->setCurrentBalance($initialBalance);
        $cashbox->setIsActive(true);
        $this->em->persist($cashbox);
        $this->em->flush();

        return $cashbox;
    }

    // ─── Movements ───────────────────────────────────────────────────

    /**
     * @param array{
     *   category?: string,
     *   description?: string,
     *   paymentMethod?: string,
     *   referenceId?: string,
     *   staffMemberId?: int,
     *   eventStaffAssignmentId?: int,
     *   user?: User,
     * } $options
     */
    public function addMovement(Cashbox $cashbox, string $movementType, string $amount, array $options = []): CashMovement
    {
        if (!in_array($movementType, ['INCOME', 'EXPENSE'], true)) {
            throw new \InvalidArgumentException('Neplatný typ pohybu: ' . $movementType);
        }
        if (bccomp($amount, '0', 2) <= 0) {
            throw new \InvalidArgumentException('Částka musí být kladná');
        }
        if (!$cashbox->isActive()) {
            throw new \RuntimeException('Pokladna je uzavřená, nelze přidávat pohyby.');
        }
        if ($cashbox->getLockedBy() !== null) {
            throw new \RuntimeException('Pokladna je zamčená, nelze přidávat pohyby.');
        }

        $m = new CashMovement();
        $m->setCashbox($cashbox);
        $m->setMovementType($movementType);
        $m->setAmount($amount);

        if (isset($options['category']) && !empty($options['category'])) {
            $m->setCategory($options['category']);
            // Auto-register category for future autocomplete
            $catType = $movementType === 'INCOME' ? 'INCOME' : 'EXPENSE';
            $catEntity = $this->categoryRepo->findOrCreate($options['category'], $catType);
            $this->em->persist($catEntity);
        }
        if (isset($options['description'])) {
            $m->setDescription($options['description']);
        }
        if (isset($options['paymentMethod'])) {
            $m->setPaymentMethod($options['paymentMethod']);
        }
        if (isset($options['referenceId'])) {
            $m->setReferenceId($options['referenceId']);
        }
        if (isset($options['staffMemberId'])) {
            $m->setStaffMemberId($options['staffMemberId']);
        }
        if (isset($options['eventStaffAssignmentId'])) {
            $m->setEventStaffAssignmentId($options['eventStaffAssignmentId']);
        }
        if (isset($options['user'])) {
            $m->setUser($options['user']);
        }

        // Update balance using bcmath
        $current = $cashbox->getCurrentBalance();
        if ($movementType === 'INCOME') {
            $newBalance = bcadd($current, $amount, 2);
        } else {
            $newBalance = bcsub($current, $amount, 2);
        }
        $cashbox->setCurrentBalance($newBalance);

        $this->em->persist($m);
        $this->em->flush(); // ensure ID is generated before audit log

        $user = $options['user'] ?? null;
        $this->logAudit($cashbox, $user, 'MOVEMENT_CREATE', 'CashMovement', $m->getId(), $this->serializeMovement($m), "Nový pohyb: {$movementType} {$amount} {$cashbox->getCurrency()}");

        return $m;
    }

    // ─── Staff Payments ──────────────────────────────────────────────

    public function calculateStaffPayment(EventStaffAssignment $assignment): ?string
    {
        $member = $this->em->getRepository(StaffMember::class)->find($assignment->getStaffMemberId());
        if (!$member) {
            return null;
        }

        // Fixed rate takes priority
        if ($member->getFixedRate() !== null && bccomp($member->getFixedRate(), '0', 2) > 0) {
            return $member->getFixedRate();
        }

        // Hourly calculation
        if ($member->getHourlyRate() !== null && bccomp($member->getHourlyRate(), '0', 2) > 0) {
            $hours = $assignment->getHoursWorked();
            if ($hours !== null && bccomp((string) $hours, '0', 2) > 0) {
                return bcmul($member->getHourlyRate(), (string) $hours, 2);
            }
        }

        return null;
    }

    public function payStaffAssignment(
        EventStaffAssignment $assignment,
        string $amount,
        User $user,
        string $paymentMethod = 'CASH',
    ): CashMovement {
        $event = $assignment->getEvent();
        if (!$event) {
            throw new \RuntimeException('Assignment nemá přiřazený event.');
        }

        $cashbox = $this->getOrCreateEventCashbox($event);

        $member = $this->em->getRepository(StaffMember::class)->find($assignment->getStaffMemberId());
        $staffName = $member ? ($member->getFirstName() . ' ' . $member->getLastName()) : ('Staff #' . $assignment->getStaffMemberId());

        $movement = $this->addMovement($cashbox, 'EXPENSE', $amount, [
            'category' => 'STAFF_PAYMENT',
            'description' => 'Výplata: ' . $staffName,
            'paymentMethod' => $paymentMethod,
            'staffMemberId' => $assignment->getStaffMemberId(),
            'eventStaffAssignmentId' => $assignment->getId(),
            'user' => $user,
        ]);

        $assignment->setPaymentAmount($amount);
        $assignment->setPaymentStatus('PAID');

        return $movement;
    }

    /**
     * @return array{totalPaid: string, paidCount: int, results: array<array{assignmentId: int, staffName: string, amount: string}>}
     */
    public function payAllStaff(Event $event, User $user): array
    {
        $this->em->beginTransaction();
        try {
            $results = [];
            $totalPaid = '0.00';
            $paidCount = 0;

            foreach ($event->getStaffAssignments() as $assignment) {
                if ($assignment->getPaymentStatus() !== 'PENDING') {
                    continue;
                }

                // If assignment already has a custom payment amount, use it
                $amount = $assignment->getPaymentAmount();
                if ($amount === null || bccomp($amount, '0', 2) <= 0) {
                    $amount = $this->calculateStaffPayment($assignment);
                }

                if ($amount === null || bccomp($amount, '0', 2) <= 0) {
                    continue;
                }

                $this->payStaffAssignment($assignment, $amount, $user);

                $member = $this->em->getRepository(StaffMember::class)->find($assignment->getStaffMemberId());
                $staffName = $member ? ($member->getFirstName() . ' ' . $member->getLastName()) : ('Staff #' . $assignment->getStaffMemberId());

                $results[] = [
                    'assignmentId' => $assignment->getId(),
                    'staffName' => $staffName,
                    'amount' => $amount,
                ];
                $totalPaid = bcadd($totalPaid, $amount, 2);
                $paidCount++;
            }

            $this->em->flush();
            $this->em->commit();

            return [
                'totalPaid' => $totalPaid,
                'paidCount' => $paidCount,
                'results' => $results,
            ];
        } catch (\Throwable $e) {
            $this->em->rollback();
            throw $e;
        }
    }

    // ─── Lock / Unlock ───────────────────────────────────────────────

    public function lockCashbox(Cashbox $cashbox, User $user): void
    {
        $cashbox->setLockedBy($user);
        $cashbox->setLockedAt(new \DateTime());
        $this->em->flush();

        $this->logAudit($cashbox, $user, 'CASHBOX_LOCK', 'Cashbox', $cashbox->getId(), null, "Kasa zamčena");
    }

    public function reopenCashbox(Cashbox $cashbox, ?User $user = null): void
    {
        $cashbox->setLockedBy(null);
        $cashbox->setLockedAt(null);

        // If was closed, reopen
        if (!$cashbox->isActive()) {
            $cashbox->setIsActive(true);
            $cashbox->setClosedAt(null);

            // Reverse the transfer to main cashbox if this is an event cashbox
            if ($cashbox->getCashboxType() === 'EVENT') {
                $main = $this->getMainCashbox();
                if ($main) {
                    // Find the last closure for this cashbox
                    $closure = $this->em->getRepository(CashboxClosure::class)->findOneBy(
                        ['cashbox' => $cashbox],
                        ['closedAt' => 'DESC']
                    );
                    if ($closure) {
                        $transferAmount = $closure->getActualCash();
                        if (bccomp($transferAmount, '0', 2) > 0) {
                            // Reverse: create EXPENSE in main cashbox
                            $this->addMovement($main, 'EXPENSE', $transferAmount, [
                                'category' => 'EVENT_TRANSFER_REVERSAL',
                                'description' => 'Vrácení převodu - znovuotevření kasy: ' . $cashbox->getName(),
                                'user' => $user,
                            ]);
                        }
                    }
                }
            }
        }

        $this->em->flush();

        $this->logAudit($cashbox, $user, 'CASHBOX_REOPEN', 'Cashbox', $cashbox->getId(), null, "Kasa odemčena");
    }

    // ─── Close Event Cashbox + Transfer ──────────────────────────────

    /**
     * Closes event cashbox, creates CashboxClosure, and transfers net result to main cashbox.
     *
     * @return array{closure: CashboxClosure, transferMovement: ?CashMovement, transferAmount: string}
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
                $mainCashbox = $this->getOrCreateMainCashbox();

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

            $this->logAudit($eventCashbox, $user, 'CASHBOX_CLOSE', 'Cashbox', $eventCashbox->getId(), $this->serializeClosure($closure), "Kasa uzavřena, převod " . $actualCash . " Kč čeká na schválení");

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

    // ─── Emergency Hide ──────────────────────────────────────────────

    public function isMainCashboxHidden(): bool
    {
        $settings = $this->settingsRepo->getDefault();
        return $settings !== null && $settings->isMainCashboxHidden();
    }

    public function hideMainCashbox(): void
    {
        $settings = $this->settingsRepo->getOrCreateDefault();
        $settings->setMainCashboxHidden(true);
        $settings->setUpdatedAt(new \DateTime());
        $this->em->flush();
    }

    public function unhideMainCashbox(): void
    {
        $settings = $this->settingsRepo->getOrCreateDefault();
        $settings->setMainCashboxHidden(false);
        $settings->setUpdatedAt(new \DateTime());
        $this->em->flush();
    }

    // ─── Transfers (Main → Event) ───────────────────────────────────

    public function initiateTransferToEvent(Event $event, string $amount, User $user, ?string $description = null): CashboxTransfer
    {
        $main = $this->getMainCashbox();
        if (!$main) {
            throw new \RuntimeException('Hlavní kasa neexistuje.');
        }
        if (!$main->isActive()) {
            throw new \RuntimeException('Hlavní kasa je uzavřená.');
        }
        if ($main->getLockedBy() !== null) {
            throw new \RuntimeException('Hlavní kasa je zamčená.');
        }
        if (bccomp($main->getCurrentBalance(), $amount, 2) < 0) {
            throw new \RuntimeException('Nedostatek prostředků v hlavní kase.');
        }

        // Create EXPENSE in main cashbox
        $movement = $this->addMovement($main, 'EXPENSE', $amount, [
            'category' => 'Převod na event',
            'description' => 'Převod na event: ' . $event->getName() . ($description ? ' – ' . $description : ''),
            'user' => $user,
        ]);

        // Create transfer record
        $transfer = new CashboxTransfer();
        $transfer->setSourceCashbox($main);
        $transfer->setTargetEvent($event);
        $transfer->setAmount($amount);
        $transfer->setDescription($description);
        $transfer->setStatus('PENDING');
        $transfer->setInitiatedBy($user);
        $transfer->setSourceMovementId($movement->getId());

        $this->em->persist($transfer);
        $this->em->flush();

        $this->logAudit($main, $user, 'TRANSFER_CREATE', 'CashboxTransfer', $transfer->getId(), $this->serializeTransfer($transfer), "Převod na event: {$amount}");

        return $transfer;
    }

    public function confirmTransfer(CashboxTransfer $transfer, User $user): Cashbox
    {
        if ($transfer->getStatus() !== 'PENDING') {
            throw new \RuntimeException('Tento převod již byl zpracován.');
        }

        $event = $transfer->getTargetEvent();
        $amount = $transfer->getAmount();
        $existingCashbox = $this->getEventCashbox($event);

        if ($existingCashbox) {
            // Cashbox already exists — add INCOME movement
            $movement = $this->addMovement($existingCashbox, 'INCOME', $amount, [
                'category' => 'Převod z hlavní kasy',
                'description' => 'Potvrzený převod z hlavní kasy',
                'user' => $user,
            ]);
            $transfer->setTargetMovementId($movement->getId());
            $eventCashbox = $existingCashbox;
        } else {
            // Create new event cashbox with initial balance
            $eventCashbox = $this->getOrCreateEventCashbox($event, $amount);
        }

        $transfer->setStatus('CONFIRMED');
        $transfer->setConfirmedBy($user);
        $transfer->setConfirmedAt(new \DateTime());

        $this->em->flush();

        $this->logAudit($eventCashbox, $user, 'TRANSFER_CONFIRM', 'CashboxTransfer', $transfer->getId(), null, "Převod potvrzen");

        return $eventCashbox;
    }

    /**
     * Approve a closure transfer (Event → Main cashbox).
     * Called by owner/superadmin to confirm the cash handover from closed event cashbox.
     */
    public function approveClosureTransfer(CashboxTransfer $transfer, User $user): void
    {
        if ($transfer->getStatus() !== 'PENDING') {
            throw new \RuntimeException('Tento převod již byl zpracován.');
        }

        $amount = $transfer->getAmount();
        $mainCashbox = $this->getOrCreateMainCashbox();

        // Add INCOME to main cashbox
        $incomeMovement = $this->addMovement($mainCashbox, 'INCOME', $amount, [
            'category' => 'EVENT_TRANSFER',
            'description' => 'Schválený převod z kasy eventu: ' . ($transfer->getTargetEvent()?->getName() ?? 'Neznámý'),
            'user' => $user,
        ]);

        $transfer->setStatus('CONFIRMED');
        $transfer->setConfirmedBy($user);
        $transfer->setConfirmedAt(new \DateTime());
        $transfer->setTargetMovementId($incomeMovement->getId());

        $this->em->flush();

        $this->logAudit($mainCashbox, $user, 'TRANSFER_CONFIRM', 'CashboxTransfer', $transfer->getId(), [
            'amount' => $amount,
            'eventName' => $transfer->getTargetEvent()?->getName(),
        ], "Předání kasy schváleno: {$amount} Kč přijato do hlavní kasy");
    }

    public function rejectTransfer(CashboxTransfer $transfer, User $user, ?string $reason = null): void
    {
        if ($transfer->getStatus() !== 'PENDING') {
            throw new \RuntimeException('Tento převod již byl zpracován.');
        }

        // Refund to main cashbox
        $main = $transfer->getSourceCashbox();
        $desc = 'Odmítnutý převod na event: ' . $transfer->getTargetEvent()->getName();
        if ($reason) {
            $desc .= ' – ' . $reason;
        }

        $refundMovement = $this->addMovement($main, 'INCOME', $transfer->getAmount(), [
            'category' => 'Vrácení převodu',
            'description' => $desc,
            'user' => $user,
        ]);

        $transfer->setStatus('REJECTED');
        $transfer->setConfirmedBy($user);
        $transfer->setConfirmedAt(new \DateTime());
        $transfer->setRefundMovementId($refundMovement->getId());

        $this->em->flush();

        $this->logAudit($main, $user, 'TRANSFER_REJECT', 'CashboxTransfer', $transfer->getId(), null, "Převod odmítnut");
    }

    public function serializeTransfer(CashboxTransfer $t): array
    {
        return [
            'id' => $t->getId(),
            'amount' => $t->getAmount(),
            'currency' => $t->getCurrency(),
            'description' => $t->getDescription(),
            'status' => $t->getStatus(),
            'eventId' => $t->getTargetEvent()->getId(),
            'eventName' => $t->getTargetEvent()->getName(),
            'initiatedByName' => $t->getInitiatedBy()->getUsername(),
            'confirmedByName' => $t->getConfirmedBy()?->getUsername(),
            'initiatedAt' => $t->getInitiatedAt()->format(DATE_ATOM),
            'confirmedAt' => $t->getConfirmedAt()?->format(DATE_ATOM),
        ];
    }

    // ─── Filtered Movements ───────────────────────────────────────────

    /**
     * @param array{dateFrom?: ?string, dateTo?: ?string, category?: ?string, movementType?: ?string, currency?: ?string} $filters
     */
    public function getFilteredMovements(Cashbox $cashbox, array $filters, int $page = 1, int $limit = 50): array
    {
        $qb = $this->em->getRepository(CashMovement::class)->createQueryBuilder('m')
            ->where('m.cashbox = :cashbox')
            ->setParameter('cashbox', $cashbox)
            ->orderBy('m.createdAt', 'DESC');

        if (!empty($filters['dateFrom'])) {
            $qb->andWhere('m.createdAt >= :dateFrom')
                ->setParameter('dateFrom', new \DateTime($filters['dateFrom']));
        }
        if (!empty($filters['dateTo'])) {
            $qb->andWhere('m.createdAt <= :dateTo')
                ->setParameter('dateTo', (new \DateTime($filters['dateTo']))->modify('+1 day'));
        }
        if (!empty($filters['category'])) {
            $qb->andWhere('m.category = :category')
                ->setParameter('category', $filters['category']);
        }
        if (!empty($filters['movementType'])) {
            $qb->andWhere('m.movementType = :movementType')
                ->setParameter('movementType', $filters['movementType']);
        }
        if (!empty($filters['currency'])) {
            $qb->andWhere('m.currency = :currency')
                ->setParameter('currency', $filters['currency']);
        }

        // Count total (reset ORDER BY to avoid PostgreSQL GROUP BY error)
        $countQb = clone $qb;
        $countQb->resetDQLPart('orderBy');
        $total = (int) $countQb->select('COUNT(m.id)')->getQuery()->getSingleScalarResult();

        // Paginate
        $movements = $qb->setFirstResult(($page - 1) * $limit)
            ->setMaxResults($limit)
            ->getQuery()
            ->getResult();

        return [
            'movements' => array_map(fn(CashMovement $m) => $this->serializeMovement($m), $movements),
            'total' => $total,
            'page' => $page,
            'limit' => $limit,
            'totalPages' => (int) ceil($total / max($limit, 1)),
        ];
    }

    // ─── All Filtered Movements (for CSV export) ──────────────────────

    /**
     * Returns ALL matching movements (no pagination) for CSV export.
     *
     * @param array{dateFrom?: ?string, dateTo?: ?string, category?: ?string, movementType?: ?string} $filters
     * @return CashMovement[]
     */
    public function getAllFilteredMovements(Cashbox $cashbox, array $filters): array
    {
        $qb = $this->em->getRepository(CashMovement::class)->createQueryBuilder('m')
            ->where('m.cashbox = :cashbox')
            ->setParameter('cashbox', $cashbox)
            ->orderBy('m.createdAt', 'DESC');

        if (!empty($filters['dateFrom'])) {
            $qb->andWhere('m.createdAt >= :dateFrom')
                ->setParameter('dateFrom', new \DateTime($filters['dateFrom']));
        }
        if (!empty($filters['dateTo'])) {
            $qb->andWhere('m.createdAt <= :dateTo')
                ->setParameter('dateTo', (new \DateTime($filters['dateTo']))->modify('+1 day'));
        }
        if (!empty($filters['category'])) {
            $qb->andWhere('m.category = :category')
                ->setParameter('category', $filters['category']);
        }
        if (!empty($filters['movementType'])) {
            $qb->andWhere('m.movementType = :movementType')
                ->setParameter('movementType', $filters['movementType']);
        }

        return $qb->getQuery()->getResult();
    }

    // ─── Close Main Cashbox (Daily Reconciliation) ──────────────────

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

        $this->logAudit($mainCashbox, $user, 'CASHBOX_RECONCILE', 'Cashbox', $mainCashbox->getId(), $this->serializeClosure($closure), "Denni uzaverka: ocekavano {$expectedCash}, skutecnost {$actualCash}, rozdil {$difference}");

        return [
            'closure' => $closure,
        ];
    }

        // ─── Serialization helpers ───────────────────────────────────────

    public function serializeCashbox(Cashbox $cashbox, bool $includeMovements = false): array
    {
        $data = [
            'id' => $cashbox->getId(),
            'name' => $cashbox->getName(),
            'description' => $cashbox->getDescription(),
            'cashboxType' => $cashbox->getCashboxType(),
            'currency' => $cashbox->getCurrency(),
            'initialBalance' => $cashbox->getInitialBalance(),
            'currentBalance' => $cashbox->getCurrentBalance(),
            'eventId' => $cashbox->getEvent()?->getId(),
            'eventName' => $cashbox->getEvent()?->getName(),
            'openedAt' => $cashbox->getOpenedAt()->format(DATE_ATOM),
            'closedAt' => $cashbox->getClosedAt()?->format(DATE_ATOM),
            'isActive' => $cashbox->isActive(),
            'lockedBy' => $cashbox->getLockedBy()?->getId(),
            'lockedAt' => $cashbox->getLockedAt()?->format(DATE_ATOM),
            'notes' => $cashbox->getNotes(),
        ];

        // Always include summary totals (computed from ALL movements via native SQL)
        $conn = $this->em->getConnection();
        $summaryRow = $conn->fetchAssociative(
            'SELECT
                COALESCE(SUM(CASE WHEN movement_type = \'INCOME\' THEN amount ELSE 0 END), 0) AS total_income,
                COALESCE(SUM(CASE WHEN movement_type = \'EXPENSE\' THEN amount ELSE 0 END), 0) AS total_expense,
                COUNT(id) AS movement_count
            FROM cash_movement WHERE cashbox_id = ?',
            [$cashbox->getId()]
        );
        $data['totalIncome'] = $summaryRow ? (string) $summaryRow['total_income'] : '0';
        $data['totalExpense'] = $summaryRow ? (string) $summaryRow['total_expense'] : '0';
        $data['movementCount'] = $summaryRow ? (int) $summaryRow['movement_count'] : 0;

        if ($includeMovements) {
            $movements = $this->em->getRepository(CashMovement::class)->findBy(
                ['cashbox' => $cashbox],
                ['createdAt' => 'DESC'],
                200
            );
            $data['movements'] = array_map(fn(CashMovement $m) => $this->serializeMovement($m), $movements);
        }

        return $data;
    }

    public function serializeMovement(CashMovement $m): array
    {
        return [
            'id' => $m->getId(),
            'movementType' => $m->getMovementType(),
            'category' => $m->getCategory(),
            'amount' => $m->getAmount(),
            'currency' => $m->getCurrency(),
            'description' => $m->getDescription(),
            'paymentMethod' => $m->getPaymentMethod(),
            'referenceId' => $m->getReferenceId(),
            'staffMemberId' => $m->getStaffMemberId(),
            'eventStaffAssignmentId' => $m->getEventStaffAssignmentId(),
            'reservationId' => $m->getReservation()?->getId(),
            'userId' => $m->getUser()?->getId(),
            'createdAt' => $m->getCreatedAt()->format(DATE_ATOM),
            'updatedAt' => $m->getUpdatedAt()?->format(DATE_ATOM),
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

    public function serializeAuditLog(\App\Entity\CashboxAuditLog $log): array
    {
        return [
            'id' => $log->getId(),
            'cashboxId' => $log->getCashbox()?->getId(),
            'userId' => $log->getUser()?->getId(),
            'userName' => $log->getUser()?->getUsername(),
            'action' => $log->getAction(),
            'entityType' => $log->getEntityType(),
            'entityId' => $log->getEntityId(),
            'changeData' => $log->getChangeData(),
            'description' => $log->getDescription(),
            'ipAddress' => $log->getIpAddress(),
            'createdAt' => $log->getCreatedAt()->format(DATE_ATOM),
        ];
    }

    // ─── Balance Adjustment & Cashbox Management ────────────────────

    /**
     * Adjust cashbox balance to match the real physical cash count.
     * Creates a corrective movement (INCOME if adding, EXPENSE if removing)
     * with category "KOREKCE" and a mandatory reason.
     */
    public function adjustBalance(Cashbox $cashbox, string $newBalance, string $reason, User $user): CashMovement
    {
        if (empty(trim($reason))) {
            throw new \InvalidArgumentException('Důvod korekce je povinný');
        }

        $currentBalance = $cashbox->getCurrentBalance();
        $diff = bcsub($newBalance, $currentBalance, 2);

        if (bccomp($diff, '0', 2) === 0) {
            throw new \RuntimeException('Nový zůstatek je stejný jako stávající');
        }

        $isPositive = bccomp($diff, '0', 2) > 0;
        $movementType = $isPositive ? 'INCOME' : 'EXPENSE';
        $absAmount = $isPositive ? $diff : bcsub('0', $diff, 2);

        // Temporarily unlock if locked (for the adjustment) - don't check lock
        $wasLocked = $cashbox->getLockedBy() !== null;
        $lockedBy = $cashbox->getLockedBy();
        $lockedAt = $cashbox->getLockedAt();
        if ($wasLocked) {
            $cashbox->setLockedBy(null);
            $cashbox->setLockedAt(null);
        }

        $movement = $this->addMovement($cashbox, $movementType, $absAmount, [
            'category' => 'KOREKCE',
            'description' => "Korekce zůstatku: {$reason} (před: {$currentBalance}, po: {$newBalance})",
            'user' => $user,
        ]);

        // Restore lock
        if ($wasLocked) {
            $cashbox->setLockedBy($lockedBy);
            $cashbox->setLockedAt($lockedAt);
        }

        $this->logAudit(
            $cashbox, $user, 'BALANCE_ADJUSTMENT', 'Cashbox', $cashbox->getId(),
            ['previousBalance' => $currentBalance, 'newBalance' => $newBalance, 'difference' => $diff, 'reason' => $reason],
            "Korekce zůstatku: {$currentBalance} → {$newBalance} ({$reason})"
        );

        return $movement;
    }

    /**
     * Update cashbox metadata (notes, name, description).
     */
    public function updateCashboxInfo(Cashbox $cashbox, array $changes, User $user): void
    {
        $oldData = [
            'name' => $cashbox->getName(),
            'description' => $cashbox->getDescription(),
            'notes' => $cashbox->getNotes(),
        ];

        if (isset($changes['notes'])) {
            $cashbox->setNotes($changes['notes']);
        }
        if (isset($changes['name'])) {
            $cashbox->setName($changes['name']);
        }
        if (isset($changes['description'])) {
            $cashbox->setDescription($changes['description']);
        }

        $newData = [
            'name' => $cashbox->getName(),
            'description' => $cashbox->getDescription(),
            'notes' => $cashbox->getNotes(),
        ];

        $this->logAudit(
            $cashbox, $user, 'CASHBOX_UPDATE', 'Cashbox', $cashbox->getId(),
            ['old' => $oldData, 'new' => $newData],
            "Aktualizace údajů pokladny"
        );

        $this->em->flush();
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

    // ─── Edit / Delete Movements ────────────────────────────────────

    public function editMovement(CashMovement $movement, array $changes, User $user): CashMovement
    {
        $cashbox = $movement->getCashbox();
        if (!$cashbox->isActive()) {
            throw new \RuntimeException('Kasa není aktivní');
        }
        if ($cashbox->getLockedBy()) {
            throw new \RuntimeException('Kasa je zamčená');
        }

        $oldData = $this->serializeMovement($movement);

        // If amount changed, adjust cashbox balance
        if (isset($changes['amount'])) {
            $oldAmount = $movement->getAmount();
            $newAmount = $changes['amount'];
            $diff = bcsub($newAmount, $oldAmount, 2);

            if ($movement->getMovementType() === 'INCOME') {
                $newBalance = bcadd($cashbox->getCurrentBalance(), $diff, 2);
            } else {
                $newBalance = bcsub($cashbox->getCurrentBalance(), $diff, 2);
            }
            $cashbox->setCurrentBalance($newBalance);
            $movement->setAmount(bcadd($newAmount, '0', 2)); // normalize to 2 decimal places
        }

        if (isset($changes['category'])) {
            $movement->setCategory($changes['category']);
        }
        if (isset($changes['description'])) {
            $movement->setDescription($changes['description']);
        }
        if (isset($changes['paymentMethod'])) {
            $movement->setPaymentMethod($changes['paymentMethod']);
        }

        $movement->setUpdatedAt(new \DateTime());

        $newData = $this->serializeMovement($movement);
        $this->logAudit($cashbox, $user, 'MOVEMENT_EDIT', 'CashMovement', $movement->getId(), ['old' => $oldData, 'new' => $newData], "Pohyb upraven");

        return $movement;
    }

    public function deleteMovement(CashMovement $movement, User $user): void
    {
        $cashbox = $movement->getCashbox();
        if (!$cashbox->isActive()) {
            throw new \RuntimeException('Kasa není aktivní');
        }
        if ($cashbox->getLockedBy()) {
            throw new \RuntimeException('Kasa je zamčená');
        }

        // Reverse balance effect
        $amount = $movement->getAmount();
        $currentBalance = $cashbox->getCurrentBalance();
        if ($movement->getMovementType() === 'INCOME') {
            $cashbox->setCurrentBalance(bcsub($currentBalance, $amount, 2));
        } else {
            $cashbox->setCurrentBalance(bcadd($currentBalance, $amount, 2));
        }

        $deletedData = $this->serializeMovement($movement);
        $this->logAudit($cashbox, $user, 'MOVEMENT_DELETE', 'CashMovement', $movement->getId(), $deletedData, "Pohyb smazán: {$movement->getMovementType()} {$movement->getAmount()}");

        $this->em->remove($movement);
    }

    // ─── Cancel Transfer ────────────────────────────────────────────

    public function cancelTransfer(CashboxTransfer $transfer, User $user): void
    {
        if ($transfer->getStatus() !== 'PENDING') {
            throw new \RuntimeException('Pouze čekající převody lze zrušit');
        }

        $this->em->beginTransaction();
        try {
            $sourceCashbox = $transfer->getSourceCashbox();
            $amount = $transfer->getAmount();

            // Refund to source cashbox
            $refundMovement = $this->addMovement($sourceCashbox, 'INCOME', $amount, [
                'category' => 'Zrušený převod',
                'description' => "Zrušený převod na event (původní ID: {$transfer->getId()})",
                'user' => $user,
            ]);

            $transfer->setStatus('CANCELLED');
            $transfer->setRefundMovementId($refundMovement->getId());
            $transfer->setConfirmedAt(new \DateTime());
            $transfer->setConfirmedBy($user);

            $this->em->flush();
            $this->em->commit();

            $this->logAudit($sourceCashbox, $user, 'TRANSFER_CANCEL', 'CashboxTransfer', $transfer->getId(), $this->serializeTransfer($transfer), "Převod zrušen, vráceno {$amount} Kč");
        } catch (\Throwable $e) {
            $this->em->rollback();
            throw $e;
        }
    }

    // ─── Serialization helpers ───────────────────────────────────────

    public function serializeClosure(CashboxClosure $c): array
    {
        return [
            'id' => $c->getId(),
            'expectedCash' => $c->getExpectedCash(),
            'actualCash' => $c->getActualCash(),
            'difference' => $c->getDifference(),
            'totalIncome' => $c->getTotalIncome(),
            'totalExpense' => $c->getTotalExpense(),
            'netResult' => $c->getNetResult(),
            'notes' => $c->getNotes(),
            'closedBy' => $c->getClosedBy()?->getId(),
            'closedAt' => $c->getClosedAt()->format(DATE_ATOM),
        ];
    }
}
