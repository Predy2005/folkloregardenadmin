<?php

namespace App\Repository;

use App\Entity\ReservationType;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/**
 * @extends ServiceEntityRepository<ReservationType>
 */
class ReservationTypeRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, ReservationType::class);
    }

    /**
     * @return ReservationType[]
     */
    public function findAllOrdered(): array
    {
        return $this->createQueryBuilder('rt')
            ->orderBy('rt.sortOrder', 'ASC')
            ->addOrderBy('rt.name', 'ASC')
            ->getQuery()
            ->getResult();
    }

    public function findByCode(string $code): ?ReservationType
    {
        return $this->findOneBy(['code' => $code]);
    }

    public function findDefault(): ?ReservationType
    {
        return $this->findByCode('standard');
    }
}
