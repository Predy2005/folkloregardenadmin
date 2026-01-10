<?php

namespace App\Repository;

use App\Entity\EventGuest;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

class EventGuestRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, EventGuest::class);
    }

    /**
     * Returns counts for a single event: total, paid, free.
     * @return array{total:int, paid:int, free:int}
     */
    public function getCountsForEvent(int $eventId): array
    {
        $qb = $this->createQueryBuilder('g')
            ->select('COUNT(g.id) AS total')
            ->addSelect('SUM(CASE WHEN g.isPaid = true THEN 1 ELSE 0 END) AS paid')
            ->where('g.event = :eventId')
            ->setParameter('eventId', $eventId);

        $row = $qb->getQuery()->getSingleResult();
        $total = (int)($row['total'] ?? 0);
        $paid = (int)($row['paid'] ?? 0);
        $free = max(0, $total - $paid);
        return ['total' => $total, 'paid' => $paid, 'free' => $free];
    }

    /**
     * Returns counts for a set of events.
     * @param int[] $eventIds
     * @return array<int, array{total:int, paid:int, free:int}>
     */
    public function getCountsForEvents(array $eventIds): array
    {
        if (empty($eventIds)) {
            return [];
        }
        $qb = $this->createQueryBuilder('g')
            ->select('IDENTITY(g.event) AS eventId')
            ->addSelect('COUNT(g.id) AS total')
            ->addSelect('SUM(CASE WHEN g.isPaid = true THEN 1 ELSE 0 END) AS paid')
            ->where('g.event IN (:ids)')
            ->setParameter('ids', $eventIds)
            ->groupBy('eventId');

        $rows = $qb->getQuery()->getArrayResult();
        $out = [];
        foreach ($rows as $r) {
            $total = (int)($r['total'] ?? 0);
            $paid = (int)($r['paid'] ?? 0);
            $free = max(0, $total - $paid);
            $out[(int)$r['eventId']] = ['total' => $total, 'paid' => $paid, 'free' => $free];
        }
        return $out;
    }
}
