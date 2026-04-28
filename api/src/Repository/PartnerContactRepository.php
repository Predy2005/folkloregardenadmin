<?php
declare(strict_types=1);

namespace App\Repository;

use App\Entity\PartnerContact;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/**
 * @extends ServiceEntityRepository<PartnerContact>
 */
class PartnerContactRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, PartnerContact::class);
    }

    /**
     * @return list<PartnerContact>
     */
    public function findByPartnerOrdered(int $partnerId): array
    {
        return $this->createQueryBuilder('c')
            ->andWhere('IDENTITY(c.partner) = :pid')->setParameter('pid', $partnerId)
            ->orderBy('c.displayOrder', 'ASC')
            ->addOrderBy('c.lastName', 'ASC')
            ->addOrderBy('c.firstName', 'ASC')
            ->getQuery()
            ->getResult();
    }
}
