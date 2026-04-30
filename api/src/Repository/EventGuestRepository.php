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
     * Typy hostů, kteří jsou vždy "zdarma" (driver, guide, infant) —
     * bez ohledu na `isPaid` flag. Konzistentní s pricing logikou v
     * `useReservationPersons.defaultPrice` (frontend) i `SpecialDateRules`
     * (backend), kde tyto typy mají cenu 0.
     */
    private const FREE_TYPES = ['driver', 'guide', 'infant'];

    /**
     * Returns counts for a single event: total, paid, free.
     *
     * - `paid` = host typu `adult`/`child` s `isPaid = true`
     * - `free` = host typu `driver`/`guide`/`infant` NEBO `adult`/`child` s `isPaid = false`
     *
     * @return array{total:int, paid:int, free:int}
     */
    public function getCountsForEvent(int $eventId): array
    {
        $qb = $this->createQueryBuilder('g')
            ->select('COUNT(g.id) AS total')
            ->addSelect('SUM(CASE WHEN g.isPaid = true AND g.type NOT IN (:freeTypes) THEN 1 ELSE 0 END) AS paid')
            ->where('g.event = :eventId')
            ->setParameter('eventId', $eventId)
            ->setParameter('freeTypes', self::FREE_TYPES);

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
            ->addSelect('SUM(CASE WHEN g.isPaid = true AND g.type NOT IN (:freeTypes) THEN 1 ELSE 0 END) AS paid')
            ->where('g.event IN (:ids)')
            ->setParameter('ids', $eventIds)
            ->setParameter('freeTypes', self::FREE_TYPES)
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
