<?php

namespace App\Repository;

use App\Entity\User;
use App\Entity\Role;
use App\Entity\UserRole;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/**
 * @extends ServiceEntityRepository<UserRole>
 */
class UserRoleRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, UserRole::class);
    }

    public function findByUser(User $user): array
    {
        return $this->findBy(['user' => $user]);
    }

    public function findByRole(Role $role): array
    {
        return $this->findBy(['role' => $role]);
    }

    public function findByUserAndRole(User $user, Role $role): ?UserRole
    {
        return $this->findOneBy([
            'user' => $user,
            'role' => $role,
        ]);
    }

    /**
     * Delete all roles for a user
     */
    public function deleteByUser(User $user): int
    {
        return $this->createQueryBuilder('ur')
            ->delete()
            ->where('ur.user = :user')
            ->setParameter('user', $user)
            ->getQuery()
            ->execute();
    }

    /**
     * Count users with a specific role
     */
    public function countByRole(Role $role): int
    {
        return $this->count(['role' => $role]);
    }
}
