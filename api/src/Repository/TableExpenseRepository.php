<?php

declare(strict_types=1);

namespace App\Repository;

use App\Entity\TableExpense;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/**
 * @extends ServiceEntityRepository<TableExpense>
 */
class TableExpenseRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, TableExpense::class);
    }

    /**
     * @return TableExpense[]
     */
    public function findByEventTable(int $eventTableId): array
    {
        return $this->createQueryBuilder('e')
            ->where('e.eventTable = :tableId')
            ->setParameter('tableId', $eventTableId)
            ->orderBy('e.createdAt', 'DESC')
            ->getQuery()
            ->getResult();
    }

    public function getExpenseSummaryByEvent(int $eventId): array
    {
        return $this->createQueryBuilder('e')
            ->select('IDENTITY(e.eventTable) as tableId, e.category, SUM(e.totalPrice) as total, COUNT(e.id) as count')
            ->where('e.event = :eventId')
            ->setParameter('eventId', $eventId)
            ->groupBy('e.eventTable, e.category')
            ->getQuery()
            ->getResult();
    }
}
