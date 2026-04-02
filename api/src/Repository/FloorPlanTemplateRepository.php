<?php

declare(strict_types=1);

namespace App\Repository;

use App\Entity\FloorPlanTemplate;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/**
 * @extends ServiceEntityRepository<FloorPlanTemplate>
 */
class FloorPlanTemplateRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, FloorPlanTemplate::class);
    }
}
