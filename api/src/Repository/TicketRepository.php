<?php
declare(strict_types=1);

namespace App\Repository;

use App\Entity\Ticket;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/**
 * @extends ServiceEntityRepository<Ticket>
 */
class TicketRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, Ticket::class);
    }

    /**
     * Najde existující auto-error ticket podle hashe (kvůli deduplikaci výjimek).
     */
    public function findByErrorHash(string $hash): ?Ticket
    {
        return $this->findOneBy(['errorHash' => $hash]);
    }

    /**
     * Filtrovaný seznam.
     *
     * @param array<string,mixed> $filters
     * @return list<Ticket>
     */
    public function findFiltered(array $filters = []): array
    {
        $qb = $this->createQueryBuilder('t')
            ->orderBy('t.createdAt', 'DESC');

        if (!empty($filters['status']) && is_array($filters['status'])) {
            $qb->andWhere('t.status IN (:statuses)')->setParameter('statuses', $filters['status']);
        }
        if (!empty($filters['priority']) && is_array($filters['priority'])) {
            $qb->andWhere('t.priority IN (:priorities)')->setParameter('priorities', $filters['priority']);
        }
        if (!empty($filters['type']) && is_array($filters['type'])) {
            $qb->andWhere('t.type IN (:types)')->setParameter('types', $filters['type']);
        }
        if (!empty($filters['source']) && is_array($filters['source'])) {
            $qb->andWhere('t.source IN (:sources)')->setParameter('sources', $filters['source']);
        }
        if (!empty($filters['assignedToId'])) {
            $qb->andWhere('IDENTITY(t.assignedTo) = :uid')->setParameter('uid', (int)$filters['assignedToId']);
        }
        if (!empty($filters['search'])) {
            $qb->andWhere('LOWER(t.title) LIKE :s OR LOWER(t.description) LIKE :s')
               ->setParameter('s', '%' . mb_strtolower((string)$filters['search']) . '%');
        }

        return $qb->getQuery()->getResult();
    }

    /**
     * @return array{open:int, in_progress:int, waiting:int, total:int}
     */
    public function getCounts(): array
    {
        $rows = $this->createQueryBuilder('t')
            ->select('t.status, COUNT(t.id) AS cnt')
            ->groupBy('t.status')
            ->getQuery()
            ->getArrayResult();

        $counts = ['open' => 0, 'in_progress' => 0, 'waiting' => 0, 'total' => 0];
        foreach ($rows as $row) {
            $count = (int)$row['cnt'];
            $counts['total'] += $count;
            if ($row['status'] === Ticket::STATUS_OPEN) $counts['open'] += $count;
            if ($row['status'] === Ticket::STATUS_IN_PROGRESS) $counts['in_progress'] += $count;
            if ($row['status'] === Ticket::STATUS_WAITING) $counts['waiting'] += $count;
        }
        return $counts;
    }
}
