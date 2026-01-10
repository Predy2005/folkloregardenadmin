<?php
declare(strict_types=1);

namespace App\Repository;

use App\Entity\Invoice;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/**
 * @extends ServiceEntityRepository<Invoice>
 */
class InvoiceRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, Invoice::class);
    }

    /**
     * Najde faktury podle rezervace
     * @return Invoice[]
     */
    public function findByReservation(int $reservationId): array
    {
        return $this->createQueryBuilder('i')
            ->andWhere('i.reservation = :reservationId')
            ->setParameter('reservationId', $reservationId)
            ->orderBy('i.createdAt', 'DESC')
            ->getQuery()
            ->getResult();
    }

    /**
     * Najde faktury podle statusu
     * @return Invoice[]
     */
    public function findByStatus(string $status): array
    {
        return $this->createQueryBuilder('i')
            ->andWhere('i.status = :status')
            ->setParameter('status', $status)
            ->orderBy('i.createdAt', 'DESC')
            ->getQuery()
            ->getResult();
    }

    /**
     * Najde faktury v období
     * @return Invoice[]
     */
    public function findByDateRange(\DateTimeInterface $from, \DateTimeInterface $to): array
    {
        return $this->createQueryBuilder('i')
            ->andWhere('i.issueDate >= :from')
            ->andWhere('i.issueDate <= :to')
            ->setParameter('from', $from)
            ->setParameter('to', $to)
            ->orderBy('i.issueDate', 'DESC')
            ->getQuery()
            ->getResult();
    }

    /**
     * Najde neuhrazené faktury po splatnosti
     * @return Invoice[]
     */
    public function findOverdue(): array
    {
        return $this->createQueryBuilder('i')
            ->andWhere('i.status NOT IN (:paidStatuses)')
            ->andWhere('i.dueDate < :today')
            ->setParameter('paidStatuses', ['PAID', 'CANCELLED'])
            ->setParameter('today', new \DateTime())
            ->orderBy('i.dueDate', 'ASC')
            ->getQuery()
            ->getResult();
    }

    /**
     * Kontrola unikátnosti čísla faktury
     */
    public function isInvoiceNumberUnique(string $invoiceNumber, ?int $excludeId = null): bool
    {
        $qb = $this->createQueryBuilder('i')
            ->select('COUNT(i.id)')
            ->andWhere('i.invoiceNumber = :invoiceNumber')
            ->setParameter('invoiceNumber', $invoiceNumber);

        if ($excludeId !== null) {
            $qb->andWhere('i.id != :excludeId')
               ->setParameter('excludeId', $excludeId);
        }

        return (int) $qb->getQuery()->getSingleScalarResult() === 0;
    }
}
