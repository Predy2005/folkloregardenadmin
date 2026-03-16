<?php

declare(strict_types=1);

namespace App\Repository;

use App\Entity\Event;
use App\Entity\EventStaffRequirement;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/**
 * @extends ServiceEntityRepository<EventStaffRequirement>
 */
class EventStaffRequirementRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, EventStaffRequirement::class);
    }

    /**
     * Get all requirements for an event
     * @return EventStaffRequirement[]
     */
    public function findByEvent(Event $event): array
    {
        return $this->findBy(['event' => $event]);
    }

    /**
     * Get requirement by event and category
     */
    public function findByEventAndCategory(Event $event, string $category): ?EventStaffRequirement
    {
        return $this->findOneBy([
            'event' => $event,
            'category' => $category,
        ]);
    }

    /**
     * Delete all requirements for an event (for recalculation)
     */
    public function deleteByEvent(Event $event): int
    {
        return $this->createQueryBuilder('r')
            ->delete()
            ->where('r.event = :event')
            ->setParameter('event', $event)
            ->getQuery()
            ->execute();
    }

    /**
     * Delete only auto-calculated requirements (keep manual overrides)
     */
    public function deleteAutoCalculatedByEvent(Event $event): int
    {
        return $this->createQueryBuilder('r')
            ->delete()
            ->where('r.event = :event')
            ->andWhere('r.isManualOverride = false')
            ->setParameter('event', $event)
            ->getQuery()
            ->execute();
    }
}
