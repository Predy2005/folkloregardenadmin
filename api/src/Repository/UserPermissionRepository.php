<?php

namespace App\Repository;

use App\Entity\User;
use App\Entity\Permission;
use App\Entity\UserPermission;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/**
 * @extends ServiceEntityRepository<UserPermission>
 */
class UserPermissionRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, UserPermission::class);
    }

    public function findByUser(User $user): array
    {
        return $this->findBy(['user' => $user]);
    }

    public function findByPermission(Permission $permission): array
    {
        return $this->findBy(['permission' => $permission]);
    }

    public function findByUserAndPermission(User $user, Permission $permission): ?UserPermission
    {
        return $this->findOneBy([
            'user' => $user,
            'permission' => $permission,
        ]);
    }

    /**
     * Delete all direct permissions for a user
     */
    public function deleteByUser(User $user): int
    {
        return $this->createQueryBuilder('up')
            ->delete()
            ->where('up.user = :user')
            ->setParameter('user', $user)
            ->getQuery()
            ->execute();
    }

    /**
     * Get granted permissions for user
     */
    public function findGrantedByUser(User $user): array
    {
        return $this->findBy([
            'user' => $user,
            'granted' => true,
        ]);
    }

    /**
     * Get revoked permissions for user
     */
    public function findRevokedByUser(User $user): array
    {
        return $this->findBy([
            'user' => $user,
            'granted' => false,
        ]);
    }
}
