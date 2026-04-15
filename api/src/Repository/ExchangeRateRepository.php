<?php

declare(strict_types=1);

namespace App\Repository;

use App\Entity\ExchangeRate;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/**
 * @extends ServiceEntityRepository<ExchangeRate>
 */
class ExchangeRateRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, ExchangeRate::class);
    }

    /**
     * Find the latest rate for a currency pair on or before the given date.
     */
    public function findRate(string $base, string $target, \DateTimeInterface $date): ?ExchangeRate
    {
        return $this->createQueryBuilder('r')
            ->where('r.baseCurrency = :base')
            ->andWhere('r.targetCurrency = :target')
            ->andWhere('r.effectiveDate <= :date')
            ->setParameter('base', $base)
            ->setParameter('target', $target)
            ->setParameter('date', $date)
            ->orderBy('r.effectiveDate', 'DESC')
            ->setMaxResults(1)
            ->getQuery()
            ->getOneOrNullResult();
    }

    /**
     * Get all rates for a date range.
     */
    public function findByDateRange(\DateTimeInterface $from, \DateTimeInterface $to, ?string $base = null, ?string $target = null): array
    {
        $qb = $this->createQueryBuilder('r')
            ->where('r.effectiveDate BETWEEN :from AND :to')
            ->setParameter('from', $from)
            ->setParameter('to', $to)
            ->orderBy('r.effectiveDate', 'DESC');

        if ($base) {
            $qb->andWhere('r.baseCurrency = :base')->setParameter('base', $base);
        }
        if ($target) {
            $qb->andWhere('r.targetCurrency = :target')->setParameter('target', $target);
        }

        return $qb->getQuery()->getResult();
    }
}
