<?php

namespace App\Repository;

use App\Entity\Permission;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/**
 * @extends ServiceEntityRepository<Permission>
 */
class PermissionRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, Permission::class);
    }

    public function findByKey(string $key): ?Permission
    {
        $parts = explode('.', $key, 2);
        if (count($parts) !== 2) {
            return null;
        }

        return $this->findOneBy([
            'module' => $parts[0],
            'action' => $parts[1],
        ]);
    }

    public function findByModule(string $module): array
    {
        return $this->findBy(['module' => $module], ['action' => 'ASC']);
    }

    /**
     * @return Permission[]
     */
    public function findAllGroupedByModule(): array
    {
        return $this->createQueryBuilder('p')
            ->orderBy('p.module', 'ASC')
            ->addOrderBy('p.action', 'ASC')
            ->getQuery()
            ->getResult();
    }

    /**
     * Get all unique module names
     * @return string[]
     */
    public function findAllModules(): array
    {
        $result = $this->createQueryBuilder('p')
            ->select('DISTINCT p.module')
            ->orderBy('p.module', 'ASC')
            ->getQuery()
            ->getScalarResult();

        return array_column($result, 'module');
    }
}
