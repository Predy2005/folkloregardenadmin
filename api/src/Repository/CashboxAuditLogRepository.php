<?php

namespace App\Repository;

use App\Entity\CashboxAuditLog;
use App\Entity\Cashbox;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

class CashboxAuditLogRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, CashboxAuditLog::class);
    }

    public function findByCashbox(Cashbox $cashbox, int $limit = 200, int $offset = 0): array
    {
        return $this->createQueryBuilder('a')
            ->where('a.cashbox = :cashbox')
            ->setParameter('cashbox', $cashbox)
            ->orderBy('a.createdAt', 'DESC')
            ->setMaxResults($limit)
            ->setFirstResult($offset)
            ->getQuery()
            ->getResult();
    }
}
