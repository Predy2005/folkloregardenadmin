<?php
declare(strict_types=1);

namespace App\Repository;

use App\Entity\CashMovementCategory;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/**
 * @extends ServiceEntityRepository<CashMovementCategory>
 */
class CashMovementCategoryRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, CashMovementCategory::class);
    }

    /**
     * @return CashMovementCategory[]
     */
    public function findAllByPopularity(?string $type = null): array
    {
        $qb = $this->createQueryBuilder('c')
            ->orderBy('c.usageCount', 'DESC')
            ->addOrderBy('c.name', 'ASC');

        if ($type) {
            $qb->where('c.type = :type OR c.type = :both')
                ->setParameter('type', $type)
                ->setParameter('both', 'BOTH');
        }

        return $qb->getQuery()->getResult();
    }

    /**
     * @return CashMovementCategory[]
     */
    public function findByPrefix(string $prefix, ?string $type = null, int $limit = 15): array
    {
        $qb = $this->createQueryBuilder('c')
            ->where('LOWER(c.name) LIKE LOWER(:prefix)')
            ->setParameter('prefix', $prefix . '%')
            ->orderBy('c.usageCount', 'DESC')
            ->setMaxResults($limit);

        if ($type) {
            $qb->andWhere('c.type = :type OR c.type = :both')
                ->setParameter('type', $type)
                ->setParameter('both', 'BOTH');
        }

        return $qb->getQuery()->getResult();
    }

    public function findOrCreate(string $name, string $type = 'BOTH'): CashMovementCategory
    {
        $cat = $this->findOneBy(['name' => $name]);

        if ($cat) {
            $cat->incrementUsageCount();
        } else {
            $cat = new CashMovementCategory();
            $cat->setName($name);
            $cat->setType($type);
        }

        return $cat;
    }
}
