<?php

declare(strict_types=1);

namespace App\Service;

use App\Entity\Cashbox;
use App\Entity\CashboxTransfer;
use App\Entity\Event;
use App\Entity\User;
use App\Serializer\CashboxSerializer;
use Doctrine\ORM\EntityManagerInterface;

class CashboxTransferService
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

    public function initiateTransferToEvent(Event $event, string $amount, User $user, ?string $description = null): CashboxTransfer
    {
        $main = $this->cashboxService->getMainCashbox();
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
        $movement = $this->movementService->addMovement($main, 'EXPENSE', $amount, [
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

        $this->logAudit($main, $user, 'TRANSFER_CREATE', 'CashboxTransfer', $transfer->getId(), $this->serializer->serializeTransfer($transfer), "Převod na event: {$amount}");

        return $transfer;
    }

    public function confirmTransfer(CashboxTransfer $transfer, User $user): Cashbox
    {
        if ($transfer->getStatus() !== 'PENDING') {
            throw new \RuntimeException('Tento převod již byl zpracován.');
        }

        $event = $transfer->getTargetEvent();
        $amount = $transfer->getAmount();
        $existingCashbox = $this->cashboxService->getEventCashbox($event);

        if ($existingCashbox) {
            // Cashbox already exists — add INCOME movement
            $movement = $this->movementService->addMovement($existingCashbox, 'INCOME', $amount, [
                'category' => 'Převod z hlavní kasy',
                'description' => 'Potvrzený převod z hlavní kasy',
                'user' => $user,
            ]);
            $transfer->setTargetMovementId($movement->getId());
            $eventCashbox = $existingCashbox;
        } else {
            // Create new event cashbox with initial balance
            $eventCashbox = $this->cashboxService->getOrCreateEventCashbox($event, $amount);
        }

        $transfer->setStatus('CONFIRMED');
        $transfer->setConfirmedBy($user);
        $transfer->setConfirmedAt(new \DateTime());

        $this->em->flush();

        $this->logAudit($eventCashbox, $user, 'TRANSFER_CONFIRM', 'CashboxTransfer', $transfer->getId(), null, "Převod potvrzen");

        return $eventCashbox;
    }

    /**
     * Approve a closure transfer (Event -> Main cashbox).
     * Called by owner/superadmin to confirm the cash handover from closed event cashbox.
     */
    public function approveClosureTransfer(CashboxTransfer $transfer, User $user): void
    {
        if ($transfer->getStatus() !== 'PENDING') {
            throw new \RuntimeException('Tento převod již byl zpracován.');
        }

        $amount = $transfer->getAmount();
        $mainCashbox = $this->cashboxService->getOrCreateMainCashbox();

        // Add INCOME to main cashbox
        $incomeMovement = $this->movementService->addMovement($mainCashbox, 'INCOME', $amount, [
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

        $refundMovement = $this->movementService->addMovement($main, 'INCOME', $transfer->getAmount(), [
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
            $refundMovement = $this->movementService->addMovement($sourceCashbox, 'INCOME', $amount, [
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

            $this->logAudit($sourceCashbox, $user, 'TRANSFER_CANCEL', 'CashboxTransfer', $transfer->getId(), $this->serializer->serializeTransfer($transfer), "Převod zrušen, vráceno {$amount} Kč");
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
