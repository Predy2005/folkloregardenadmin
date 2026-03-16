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
    public function __construct(
        private readonly EntityManagerInterface $em,
        private readonly CashboxRepository $cashboxRepo,
        private readonly CompanySettingsRepository $settingsRepo,
        private readonly CashMovementCategoryRepository $categoryRepo,
        private readonly CashboxTransferRepository $transferRepo,
    ) {
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

        // Update balance
        $current = (float) $cashbox->getCurrentBalance();
        $amt = (float) $amount;
        if ($movementType === 'INCOME') {
            $cashbox->setCurrentBalance((string) ($current + $amt));
        } else {
            $cashbox->setCurrentBalance((string) ($current - $amt));
        }

        $this->em->persist($m);

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
        if ($member->getFixedRate() !== null && (float) $member->getFixedRate() > 0) {
            return $member->getFixedRate();
        }

        // Hourly calculation
        if ($member->getHourlyRate() !== null && (float) $member->getHourlyRate() > 0) {
            $hours = (float) $assignment->getHoursWorked();
            if ($hours > 0) {
                return (string) round((float) $member->getHourlyRate() * $hours, 2);
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
        $results = [];
        $totalPaid = 0.0;
        $paidCount = 0;

        foreach ($event->getStaffAssignments() as $assignment) {
            if ($assignment->getPaymentStatus() !== 'PENDING') {
                continue;
            }

            // If assignment already has a custom payment amount, use it
            $amount = $assignment->getPaymentAmount();
            if ($amount === null || (float) $amount <= 0) {
                $amount = $this->calculateStaffPayment($assignment);
            }

            if ($amount === null || (float) $amount <= 0) {
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
            $totalPaid += (float) $amount;
            $paidCount++;
        }

        $this->em->flush();

        return [
            'totalPaid' => (string) $totalPaid,
            'paidCount' => $paidCount,
            'results' => $results,
        ];
    }

    // ─── Lock / Unlock ───────────────────────────────────────────────

    public function lockCashbox(Cashbox $cashbox, User $user): void
    {
        $cashbox->setLockedBy($user);
        $cashbox->setLockedAt(new \DateTime());
        $this->em->flush();
    }

    public function reopenCashbox(Cashbox $cashbox): void
    {
        $cashbox->setLockedBy(null);
        $cashbox->setLockedAt(null);

        // If was closed, reopen
        if (!$cashbox->isActive()) {
            $cashbox->setIsActive(true);
            $cashbox->setClosedAt(null);
        }

        $this->em->flush();
    }

    // ─── Close Event Cashbox + Transfer ──────────────────────────────

    /**
     * Closes event cashbox, creates CashboxClosure, and transfers net result to main cashbox.
     *
     * @return array{closure: CashboxClosure, transferMovement: ?CashMovement, transferAmount: string}
     */
    public function closeEventCashbox(Cashbox $eventCashbox, string $actualCash, User $user, ?string $notes = null): array
    {
        if ($eventCashbox->getCashboxType() !== 'EVENT') {
            throw new \RuntimeException('Toto není kasa eventu.');
        }

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
        $difference = (string) ((float) $actualCash - (float) $expected);
        $net = (string) ((float) $totalIncome - (float) $totalExpense);

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

        // Transfer actual cash to main cashbox
        $transferMovement = null;
        $transferAmount = $actualCash;

        if ((float) $actualCash > 0) {
            $mainCashbox = $this->getOrCreateMainCashbox();
            $transferMovement = $this->addMovement($mainCashbox, 'INCOME', $actualCash, [
                'category' => 'EVENT_TRANSFER',
                'description' => 'Převod z kasy eventu: ' . $eventCashbox->getName(),
                'user' => $user,
            ]);
        }

        $this->em->flush();

        return [
            'closure' => $closure,
            'transferMovement' => $transferMovement,
            'transferAmount' => $transferAmount,
        ];
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
        if ((float) $main->getCurrentBalance() < (float) $amount) {
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

        return $eventCashbox;
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

        // Count total
        $countQb = clone $qb;
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
        ];
    }

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
