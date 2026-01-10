<?php

namespace App\Repository;

use App\Entity\StaffingFormula;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/**
 * @extends ServiceEntityRepository<StaffingFormula>
 */
class StaffingFormulaRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, StaffingFormula::class);
    }

    /**
     * @return StaffingFormula[]
     */
    public function findEnabled(): array
    {
        return $this->createQueryBuilder('f')
            ->andWhere('f.enabled = :enabled')
            ->setParameter('enabled', true)
            ->orderBy('f.category', 'ASC')
            ->getQuery()
            ->getResult();
    }

    public function findOneByCategory(string $category): ?StaffingFormula
    {
        return $this->findOneBy(['category' => $category]);
    }

    /**
     * @return array<string, StaffingFormula>
     */
    public function findEnabledMapByCategory(): array
    {
        $items = $this->findEnabled();
        $map = [];
        foreach ($items as $i) {
            $map[$i->getCategory()] = $i;
        }
        return $map;
    }
}
