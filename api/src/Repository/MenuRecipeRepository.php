<?php

declare(strict_types=1);

namespace App\Repository;

use App\Entity\MenuRecipe;
use App\Entity\Recipe;
use App\Entity\ReservationFoods;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

class MenuRecipeRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, MenuRecipe::class);
    }

    /**
     * @return MenuRecipe[]
     */
    public function findByFood(ReservationFoods $food): array
    {
        return $this->createQueryBuilder('mr')
            ->join('mr.recipe', 'r')
            ->addSelect('r')
            ->where('mr.reservationFood = :food')
            ->setParameter('food', $food)
            ->getQuery()
            ->getResult();
    }

    /**
     * @return MenuRecipe[]
     */
    public function findByFoodId(int $foodId): array
    {
        return $this->createQueryBuilder('mr')
            ->join('mr.recipe', 'r')
            ->addSelect('r')
            ->where('mr.reservationFood = :foodId')
            ->setParameter('foodId', $foodId)
            ->getQuery()
            ->getResult();
    }

    /**
     * @return MenuRecipe[]
     */
    public function findByRecipe(Recipe $recipe): array
    {
        return $this->createQueryBuilder('mr')
            ->join('mr.reservationFood', 'rf')
            ->addSelect('rf')
            ->where('mr.recipe = :recipe')
            ->setParameter('recipe', $recipe)
            ->getQuery()
            ->getResult();
    }

    /**
     * Get all menu recipes with eager-loaded relations for a set of food IDs
     * @return MenuRecipe[]
     */
    public function findByFoodIds(array $foodIds): array
    {
        if (empty($foodIds)) {
            return [];
        }

        return $this->createQueryBuilder('mr')
            ->join('mr.recipe', 'r')
            ->addSelect('r')
            ->join('r.ingredients', 'ri')
            ->addSelect('ri')
            ->join('ri.stockItem', 'si')
            ->addSelect('si')
            ->where('mr.reservationFood IN (:foodIds)')
            ->setParameter('foodIds', $foodIds)
            ->getQuery()
            ->getResult();
    }
}
