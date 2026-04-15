<?php

declare(strict_types=1);

namespace App\Service;

use App\Entity\Cashbox;
use App\Entity\CashboxClosure;
use App\Entity\CashMovement;
use App\Entity\Event;
use App\Entity\EventStaffAssignment;
use App\Entity\StaffMember;
use App\Entity\User;
use App\Repository\CashboxRepository;
use App\Repository\CompanySettingsRepository;
use Doctrine\ORM\EntityManagerInterface;

class CashboxService
{
    private ?string $currentIp = null;

    public function __construct(
        private readonly EntityManagerInterface $em,
        private readonly CashboxRepository $cashboxRepo,
        private readonly CompanySettingsRepository $settingsRepo,
        private readonly CashMovementService $movementService,
    ) {
    }

    public function setCurrentIp(?string $ip): void
    {
        $this->currentIp = $ip;
        $this->movementService->setCurrentIp($ip);
    }

    // ─── Main Cashbox ────────────────────────────────────────────────

    public function getMainCashbox(string $currency = 'CZK'): ?Cashbox
    {
        return $this->cashboxRepo->findOneBy(['cashboxType' => 'MAIN', 'currency' => $currency]);
    }

    public function getOrCreateMainCashbox(string $currency = 'CZK'): Cashbox
    {
        $main = $this->getMainCashbox($currency);
        if ($main) {
            return $main;
        }

        $suffix = $currency !== 'CZK' ? " ($currency)" : '';
        $main = new Cashbox();
        $main->setName('Hlavní kasa' . $suffix);
        $main->setCashboxType('MAIN');
        $main->setCurrency($currency);
        $main->setIsActive(true);
        $this->em->persist($main);
        $this->em->flush();

        return $main;
    }

    /**
     * Get all main cashboxes (one per currency).
     * @return Cashbox[]
     */
    public function getMainCashboxes(): array
    {
        return $this->cashboxRepo->findBy(['cashboxType' => 'MAIN'], ['currency' => 'ASC']);
    }

    // ─── Event Cashbox ───────────────────────────────────────────────

    public function getEventCashbox(Event $event, string $currency = 'CZK'): ?Cashbox
    {
        return $this->cashboxRepo->findOneBy([
            'cashboxType' => 'EVENT',
            'event' => $event,
            'currency' => $currency,
        ]);
    }

    /**
     * Get all event cashboxes (one per currency).
     * @return Cashbox[]
     */
    public function getEventCashboxes(Event $event): array
    {
        return $this->cashboxRepo->findBy([
            'cashboxType' => 'EVENT',
            'event' => $event,
        ], ['currency' => 'ASC']);
    }

    public function getOrCreateEventCashbox(Event $event, string $initialBalance = '0.00', string $currency = 'CZK'): Cashbox
    {
        $cashbox = $this->getEventCashbox($event, $currency);
        if ($cashbox) {
            return $cashbox;
        }

        $suffix = $currency !== 'CZK' ? " ($currency)" : '';
        $cashbox = new Cashbox();
        $cashbox->setName('Kasa - ' . $event->getName() . $suffix);
        $cashbox->setCashboxType('EVENT');
        $cashbox->setEvent($event);
        $cashbox->setCurrency($currency);
        $cashbox->setInitialBalance($initialBalance);
        $cashbox->setCurrentBalance($initialBalance);
        $cashbox->setIsActive(true);
        $this->em->persist($cashbox);
        $this->em->flush();

        return $cashbox;
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
                            $this->movementService->addMovement($main, 'EXPENSE', $transferAmount, [
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

        $movement = $this->movementService->addMovement($cashbox, $movementType, $absAmount, [
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

        $movement = $this->movementService->addMovement($cashbox, 'EXPENSE', $amount, [
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
