<?php

namespace App\Repository;

use App\Entity\Role;
use App\Entity\Permission;
use App\Entity\RolePermission;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/**
 * @extends ServiceEntityRepository<RolePermission>
 */
class RolePermissionRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, RolePermission::class);
    }

    public function findByRole(Role $role): array
    {
        return $this->findBy(['role' => $role]);
    }

    public function findByPermission(Permission $permission): array
    {
        return $this->findBy(['permission' => $permission]);
    }

    public function findByRoleAndPermission(Role $role, Permission $permission): ?RolePermission
    {
        return $this->findOneBy([
            'role' => $role,
            'permission' => $permission,
        ]);
    }

    /**
     * Delete all permissions for a role
     */
    public function deleteByRole(Role $role): int
    {
        return $this->createQueryBuilder('rp')
            ->delete()
            ->where('rp.role = :role')
            ->setParameter('role', $role)
            ->getQuery()
            ->execute();
    }
}
