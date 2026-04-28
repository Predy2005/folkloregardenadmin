<?php
declare(strict_types=1);

namespace App\Repository;

use App\Entity\PartnerCategory;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/**
 * @extends ServiceEntityRepository<PartnerCategory>
 */
class PartnerCategoryRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, PartnerCategory::class);
    }

    /**
     * @return list<PartnerCategory>
     */
    public function findOrdered(bool $activeOnly = false): array
    {
        $qb = $this->createQueryBuilder('c')
            ->orderBy('c.displayOrder', 'ASC')
            ->addOrderBy('c.name', 'ASC');
        if ($activeOnly) {
            $qb->andWhere('c.isActive = :a')->setParameter('a', true);
        }
        return $qb->getQuery()->getResult();
    }
}
