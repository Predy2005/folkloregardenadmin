<?php

declare(strict_types=1);

namespace App\Repository;

use App\Entity\Contact;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/**
 * @extends ServiceEntityRepository<Contact>
 */
class ContactRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, Contact::class);
    }

    /**
     * @return array{items: list<Contact>, total: int}
     */
    public function search(string $q = '', int $limit = 50, int $offset = 0): array
    {
        $qb = $this->createQueryBuilder('c');
        if ($q !== '') {
            $qb->andWhere('LOWER(c.name) LIKE :q OR LOWER(c.email) LIKE :q OR LOWER(c.company) LIKE :q OR c.phone LIKE :q2 OR c.invoiceIc LIKE :q2 OR c.invoiceDic LIKE :q2 OR LOWER(c.invoiceEmail) LIKE :q')
               ->setParameter('q', '%'.mb_strtolower($q).'%')
               ->setParameter('q2', '%'.$q.'%');
        }
        $qb->orderBy('c.updatedAt', 'DESC')
           ->setFirstResult($offset)
           ->setMaxResults($limit);
        $items = $qb->getQuery()->getResult();

        $countQb = $this->createQueryBuilder('c')
            ->select('COUNT(c.id)');
        if ($q !== '') {
            $countQb->andWhere('LOWER(c.name) LIKE :q OR LOWER(c.email) LIKE :q OR LOWER(c.company) LIKE :q OR c.phone LIKE :q2 OR c.invoiceIc LIKE :q2 OR c.invoiceDic LIKE :q2 OR LOWER(c.invoiceEmail) LIKE :q')
                    ->setParameter('q', '%'.mb_strtolower($q).'%')
                    ->setParameter('q2', '%'.$q.'%');
        }
        $total = (int)$countQb->getQuery()->getSingleScalarResult();
        return ['items' => $items, 'total' => $total];
    }

    public function findOneByNormalizedEmail(?string $email): ?Contact
    {
        $norm = Contact::normalizeEmail($email);
        if ($norm === null) return null;
        return $this->createQueryBuilder('c')
            ->andWhere('c.emailNormalized = :e')
            ->setParameter('e', $norm)
            ->setMaxResults(1)
            ->getQuery()->getOneOrNullResult();
    }

    public function findOneByNormalizedPhone(?string $phone): ?Contact
    {
        $norm = Contact::normalizePhone($phone);
        if ($norm === null) return null;
        return $this->createQueryBuilder('c')
            ->andWhere('c.phoneNormalized = :p')
            ->setParameter('p', $norm)
            ->setMaxResults(1)
            ->getQuery()->getOneOrNullResult();
    }

    public function findByIdentity(?string $email, ?string $phone, ?string $name, ?string $company): ?Contact
    {
        // Priority: email → phone → fallback (name+company) when email/phone are missing
        $byEmail = $this->findOneByNormalizedEmail($email);
        if ($byEmail) return $byEmail;
        $byPhone = $this->findOneByNormalizedPhone($phone);
        if ($byPhone) return $byPhone;
        $name = trim((string)$name);
        $company = trim((string)$company);
        if ($name !== '' && $company !== '') {
            return $this->createQueryBuilder('c')
                ->andWhere('LOWER(c.name) = :n AND LOWER(c.company) = :co')
                ->setParameter('n', mb_strtolower($name))
                ->setParameter('co', mb_strtolower($company))
                ->setMaxResults(1)
                ->getQuery()->getOneOrNullResult();
        }
        return null;
    }
}
