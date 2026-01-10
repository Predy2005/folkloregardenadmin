<?php
declare(strict_types=1);

namespace App\Repository;

use App\Entity\EventTag;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/**
 * @extends ServiceEntityRepository<EventTag>
 */
class EventTagRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, EventTag::class);
    }

    /**
     * Vrátí všechny tagy seřazené podle popularity
     * @return EventTag[]
     */
    public function findAllByPopularity(): array
    {
        return $this->createQueryBuilder('t')
            ->orderBy('t.usageCount', 'DESC')
            ->addOrderBy('t.name', 'ASC')
            ->getQuery()
            ->getResult();
    }

    /**
     * Vyhledá tagy podle prefixu (pro našeptávání)
     * @return EventTag[]
     */
    public function findByPrefix(string $prefix, int $limit = 10): array
    {
        return $this->createQueryBuilder('t')
            ->where('t.name LIKE :prefix')
            ->setParameter('prefix', $prefix . '%')
            ->orderBy('t.usageCount', 'DESC')
            ->setMaxResults($limit)
            ->getQuery()
            ->getResult();
    }

    /**
     * Najde nebo vytvoří tag
     */
    public function findOrCreate(string $name): EventTag
    {
        $tag = $this->findOneBy(['name' => $name]);

        if ($tag) {
            $tag->incrementUsageCount();
        } else {
            $tag = new EventTag();
            $tag->setName($name);
        }

        return $tag;
    }
}
