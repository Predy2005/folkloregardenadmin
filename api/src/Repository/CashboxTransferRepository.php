<?php
declare(strict_types=1);

namespace App\Repository;

use App\Entity\Cashbox;
use App\Entity\CashboxTransfer;
use App\Entity\Event;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/**
 * @extends ServiceEntityRepository<CashboxTransfer>
 */
class CashboxTransferRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, CashboxTransfer::class);
    }

    /**
     * @return CashboxTransfer[]
     */
    public function findPendingByEvent(Event $event): array
    {
        return $this->findBy(
            ['targetEvent' => $event, 'status' => 'PENDING'],
            ['initiatedAt' => 'DESC']
        );
    }

    /**
     * @return CashboxTransfer[]
     */
    public function findByEvent(Event $event): array
    {
        return $this->findBy(
            ['targetEvent' => $event],
            ['initiatedAt' => 'DESC']
        );
    }

    /**
     * @return CashboxTransfer[]
     */
    public function findBySourceCashbox(Cashbox $cashbox): array
    {
        return $this->findBy(
            ['sourceCashbox' => $cashbox],
            ['initiatedAt' => 'DESC']
        );
    }

    /**
     * @return CashboxTransfer[]
     */
    public function findAllPending(): array
    {
        return $this->findBy(
            ['status' => 'PENDING'],
            ['initiatedAt' => 'DESC']
        );
    }
}
