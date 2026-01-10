<?php

namespace App\Repository;

use App\Entity\UserLoginLog;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

class UserLoginLogRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, UserLoginLog::class);
    }

    // Přidejte vlastní metody pro dotazy, např. nalezení logů pro určitého uživatele.
}