<?php

declare(strict_types=1);

namespace App\Serializer;

use App\Entity\Cashbox;
use App\Entity\CashboxClosure;
use App\Entity\CashboxTransfer;
use App\Entity\CashMovement;
use App\Entity\CashboxAuditLog;
use Doctrine\ORM\EntityManagerInterface;

class CashboxSerializer
{
    public function __construct(
        private readonly EntityManagerInterface $em,
    ) {
    }

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

    public function serializeTransfer(CashboxTransfer $t): array
    {
        return [
            'id' => $t->getId(),
            'amount' => $t->getAmount(),
            'currency' => $t->getCurrency(),
            'targetCurrency' => $t->getTargetCurrency(),
            'targetAmount' => $t->getTargetAmount(),
            'exchangeRate' => $t->getExchangeRate(),
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

    public function serializeAuditLog(CashboxAuditLog $log): array
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
