<?php
declare(strict_types=1);

namespace App\Repository;

use App\Entity\EventInvoice;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/**
 * @extends ServiceEntityRepository<EventInvoice>
 */
class EventInvoiceRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, EventInvoice::class);
    }

    /**
     * @return EventInvoice[]
     */
    public function findByEventId(int $eventId): array
    {
        return $this->createQueryBuilder('ei')
            ->andWhere('ei.event = :eventId')
            ->setParameter('eventId', $eventId)
            ->orderBy('ei.orderNumber', 'ASC')
            ->getQuery()
            ->getResult();
    }
}
