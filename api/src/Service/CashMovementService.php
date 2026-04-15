<?php

declare(strict_types=1);

namespace App\Service;

use App\Entity\Cashbox;
use App\Entity\CashMovement;
use App\Entity\User;
use App\Repository\CashMovementCategoryRepository;
use App\Serializer\CashboxSerializer;
use Doctrine\ORM\EntityManagerInterface;

class CashMovementService
{
    private ?string $currentIp = null;

    public function __construct(
        private readonly EntityManagerInterface $em,
        private readonly CashMovementCategoryRepository $categoryRepo,
        private readonly CashboxSerializer $serializer,
    ) {
    }

    public function setCurrentIp(?string $ip): void
    {
        $this->currentIp = $ip;
    }

    /**
     * @param array{
     *   category?: string,
     *   description?: string,
     *   paymentMethod?: string,
     *   referenceId?: string,
     *   staffMemberId?: int,
     *   eventStaffAssignmentId?: int,
     *   eventTableId?: int,
     *   eventId?: int,
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
        $m->setCurrency($cashbox->getCurrency());

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
        if (isset($options['eventTableId'])) {
            $m->setEventTableId($options['eventTableId']);
        }
        if (isset($options['eventId'])) {
            $m->setEventId($options['eventId']);
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
        $this->logAudit($cashbox, $user, 'MOVEMENT_CREATE', 'CashMovement', $m->getId(), $this->serializer->serializeMovement($m), "Nový pohyb: {$movementType} {$amount} {$cashbox->getCurrency()}");

        return $m;
    }

    public function editMovement(CashMovement $movement, array $changes, User $user): CashMovement
    {
        $cashbox = $movement->getCashbox();
        if (!$cashbox->isActive()) {
            throw new \RuntimeException('Kasa není aktivní');
        }
        if ($cashbox->getLockedBy()) {
            throw new \RuntimeException('Kasa je zamčená');
        }

        $oldData = $this->serializer->serializeMovement($movement);

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

        $newData = $this->serializer->serializeMovement($movement);
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

        $deletedData = $this->serializer->serializeMovement($movement);
        $this->logAudit($cashbox, $user, 'MOVEMENT_DELETE', 'CashMovement', $movement->getId(), $deletedData, "Pohyb smazán: {$movement->getMovementType()} {$movement->getAmount()}");

        $this->em->remove($movement);
    }

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
            'movements' => array_map(fn(CashMovement $m) => $this->serializer->serializeMovement($m), $movements),
            'total' => $total,
            'page' => $page,
            'limit' => $limit,
            'totalPages' => (int) ceil($total / max($limit, 1)),
        ];
    }

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
