<?php

namespace App\Repository;

use App\Entity\DisabledDates;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/**
 * @extends ServiceEntityRepository<DisabledDates>
 */
class DisabledDatesRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, DisabledDates::class);
    }

    /**
     * @return DisabledDates[] Returns an array of DisabledDates objects for a given project
     */
    public function findByProject($project): array
    {
        return $this->createQueryBuilder('d')
            ->andWhere('d.project = :project')
            ->setParameter('project', $project)
            ->orderBy('d.date', 'ASC')
            ->getQuery()
            ->getResult();
    }

    public function findOneByDate($date): ?DisabledDates
    {
        return $this->createQueryBuilder('d')
            ->andWhere('d.date = :date')
            ->setParameter('date', $date)
            ->getQuery()
            ->getOneOrNullResult();
    }
}
