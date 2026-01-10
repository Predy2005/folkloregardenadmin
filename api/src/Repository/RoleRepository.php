<?php

namespace App\Repository;

use App\Entity\Role;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/**
 * @extends ServiceEntityRepository<Role>
 */
class RoleRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, Role::class);
    }

    public function findByName(string $name): ?Role
    {
        return $this->findOneBy(['name' => strtoupper($name)]);
    }

    /**
     * @return Role[]
     */
    public function findAllOrderedByPriority(): array
    {
        return $this->createQueryBuilder('r')
            ->orderBy('r.priority', 'DESC')
            ->addOrderBy('r.name', 'ASC')
            ->getQuery()
            ->getResult();
    }

    /**
     * @return Role[]
     */
    public function findNonSystemRoles(): array
    {
        return $this->createQueryBuilder('r')
            ->where('r.isSystem = false')
            ->orderBy('r.priority', 'DESC')
            ->addOrderBy('r.name', 'ASC')
            ->getQuery()
            ->getResult();
    }

    /**
     * Find role with all permissions loaded
     */
    public function findWithPermissions(int $id): ?Role
    {
        return $this->createQueryBuilder('r')
            ->leftJoin('r.rolePermissions', 'rp')
            ->leftJoin('rp.permission', 'p')
            ->addSelect('rp', 'p')
            ->where('r.id = :id')
            ->setParameter('id', $id)
            ->getQuery()
            ->getOneOrNullResult();
    }
}
