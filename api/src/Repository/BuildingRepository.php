<?php

declare(strict_types=1);

namespace App\Repository;

use App\Entity\Building;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/**
 * @extends ServiceEntityRepository<Building>
 */
class BuildingRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, Building::class);
    }

    /**
     * @return Building[]
     */
    public function findAllActive(): array
    {
        return $this->createQueryBuilder('b')
            ->where('b.isActive = true')
            ->orderBy('b.sortOrder', 'ASC')
            ->getQuery()
            ->getResult();
    }

    /**
     * @return Building[]
     */
    public function findAllWithRooms(): array
    {
        return $this->createQueryBuilder('b')
            ->leftJoin('b.rooms', 'r')
            ->addSelect('r')
            ->orderBy('b.sortOrder', 'ASC')
            ->addOrderBy('r.sortOrder', 'ASC')
            ->getQuery()
            ->getResult();
    }
}
