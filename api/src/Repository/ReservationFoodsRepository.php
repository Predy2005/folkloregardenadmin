<?php

namespace App\Repository;

use App\Entity\ReservationFoods;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/**
 * @extends ServiceEntityRepository<ReservationFoods>
 */
class ReservationFoodsRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, ReservationFoods::class);
    }
    

    public function findChildrenMenus(): array
    {
        return $this->createQueryBuilder('f')
            ->andWhere('f.isChildMenu = :isChild')
            ->setParameter('isChild', true)
            ->getQuery()
            ->getResult();
    }

    public function findByFoodName(string $name): array
    {
        return $this->createQueryBuilder('f')
            ->andWhere('f.name LIKE :name')
            ->setParameter('name', '%' . $name . '%')
            ->orderBy('f.name', 'ASC')
            ->getQuery()
            ->getResult();
    }

    /**
     * Find food by external ID (from external reservation system)
     */
    public function findByExternalId(string $externalId): ?ReservationFoods
    {
        return $this->findOneBy(['externalId' => $externalId]);
    }

    /**
     * Find or create food by external ID
     * Used when syncing reservations from external system
     */
    public function findOrCreateByExternalId(string $externalId, string $fallbackName, int $fallbackPrice = 0): ReservationFoods
    {
        $food = $this->findByExternalId($externalId);

        if (!$food) {
            $food = new ReservationFoods();
            $food->setExternalId($externalId ?: null)
                ->setName($fallbackName)
                ->setPrice($fallbackPrice)
                ->setIsChildrenMenu(false);

            $this->getEntityManager()->persist($food);
            $this->getEntityManager()->flush();
        }

        return $food;
    }
}
