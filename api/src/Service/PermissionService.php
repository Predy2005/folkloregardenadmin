<?php

namespace App\Service;

use App\Entity\Permission;
use App\Entity\Role;
use App\Entity\RolePermission;
use App\Entity\User;
use App\Entity\UserRole;
use App\Entity\UserPermission;
use App\Repository\PermissionRepository;
use App\Repository\RoleRepository;
use App\Repository\RolePermissionRepository;
use App\Repository\UserRoleRepository;
use App\Repository\UserPermissionRepository;
use Doctrine\ORM\EntityManagerInterface;

class PermissionService
{
    public function __construct(
        private EntityManagerInterface $em,
        private PermissionRepository $permissionRepository,
        private RoleRepository $roleRepository,
        private RolePermissionRepository $rolePermissionRepository,
        private UserRoleRepository $userRoleRepository,
        private UserPermissionRepository $userPermissionRepository,
    ) {}

    /**
     * Get all available permissions grouped by module
     * @return array<string, Permission[]>
     */
    public function getPermissionsGroupedByModule(): array
    {
        $permissions = $this->permissionRepository->findAllGroupedByModule();
        $grouped = [];

        foreach ($permissions as $permission) {
            $module = $permission->getModule();
            if (!isset($grouped[$module])) {
                $grouped[$module] = [];
            }
            $grouped[$module][] = $permission;
        }

        return $grouped;
    }

    /**
     * Assign a role to a user
     */
    public function assignRoleToUser(User $user, Role $role, ?User $assignedBy = null): UserRole
    {
        $existing = $this->userRoleRepository->findByUserAndRole($user, $role);
        if ($existing) {
            return $existing;
        }

        $userRole = new UserRole();
        $userRole->setUser($user);
        $userRole->setRole($role);
        $userRole->setAssignedBy($assignedBy);

        $this->em->persist($userRole);
        $this->em->flush();

        return $userRole;
    }

    /**
     * Remove a role from a user
     */
    public function removeRoleFromUser(User $user, Role $role): bool
    {
        $userRole = $this->userRoleRepository->findByUserAndRole($user, $role);
        if (!$userRole) {
            return false;
        }

        $this->em->remove($userRole);
        $this->em->flush();

        return true;
    }

    /**
     * Set roles for a user (replaces all existing roles)
     * @param Role[] $roles
     */
    public function setUserRoles(User $user, array $roles, ?User $assignedBy = null): void
    {
        // Remove existing roles
        $this->userRoleRepository->deleteByUser($user);

        // Add new roles
        foreach ($roles as $role) {
            $userRole = new UserRole();
            $userRole->setUser($user);
            $userRole->setRole($role);
            $userRole->setAssignedBy($assignedBy);
            $this->em->persist($userRole);
        }

        $this->em->flush();
    }

    /**
     * Grant a direct permission to a user
     */
    public function grantPermissionToUser(User $user, Permission $permission, ?User $assignedBy = null): UserPermission
    {
        $existing = $this->userPermissionRepository->findByUserAndPermission($user, $permission);

        if ($existing) {
            $existing->setGranted(true);
            $existing->setAssignedBy($assignedBy);
            $existing->setAssignedAt(new \DateTime());
        } else {
            $existing = new UserPermission();
            $existing->setUser($user);
            $existing->setPermission($permission);
            $existing->setGranted(true);
            $existing->setAssignedBy($assignedBy);
            $this->em->persist($existing);
        }

        $this->em->flush();
        return $existing;
    }

    /**
     * Revoke a direct permission from a user
     */
    public function revokePermissionFromUser(User $user, Permission $permission, ?User $assignedBy = null): UserPermission
    {
        $existing = $this->userPermissionRepository->findByUserAndPermission($user, $permission);

        if ($existing) {
            $existing->setGranted(false);
            $existing->setAssignedBy($assignedBy);
            $existing->setAssignedAt(new \DateTime());
        } else {
            $existing = new UserPermission();
            $existing->setUser($user);
            $existing->setPermission($permission);
            $existing->setGranted(false);
            $existing->setAssignedBy($assignedBy);
            $this->em->persist($existing);
        }

        $this->em->flush();
        return $existing;
    }

    /**
     * Remove direct permission override from a user (will use role-based permission)
     */
    public function removeDirectPermission(User $user, Permission $permission): bool
    {
        $existing = $this->userPermissionRepository->findByUserAndPermission($user, $permission);
        if (!$existing) {
            return false;
        }

        $this->em->remove($existing);
        $this->em->flush();
        return true;
    }

    /**
     * Set permissions for a role (replaces all existing permissions)
     * @param string[] $permissionKeys
     */
    public function setRolePermissions(Role $role, array $permissionKeys): void
    {
        // Remove existing permissions
        $this->rolePermissionRepository->deleteByRole($role);

        // Add new permissions
        foreach ($permissionKeys as $key) {
            $permission = $this->permissionRepository->findByKey($key);
            if ($permission) {
                $rolePermission = new RolePermission();
                $rolePermission->setRole($role);
                $rolePermission->setPermission($permission);
                $this->em->persist($rolePermission);
            }
        }

        $this->em->flush();
    }

    /**
     * Add a permission to a role
     */
    public function addPermissionToRole(Role $role, Permission $permission): RolePermission
    {
        $existing = $this->rolePermissionRepository->findByRoleAndPermission($role, $permission);
        if ($existing) {
            return $existing;
        }

        $rolePermission = new RolePermission();
        $rolePermission->setRole($role);
        $rolePermission->setPermission($permission);

        $this->em->persist($rolePermission);
        $this->em->flush();

        return $rolePermission;
    }

    /**
     * Remove a permission from a role
     */
    public function removePermissionFromRole(Role $role, Permission $permission): bool
    {
        $rolePermission = $this->rolePermissionRepository->findByRoleAndPermission($role, $permission);
        if (!$rolePermission) {
            return false;
        }

        $this->em->remove($rolePermission);
        $this->em->flush();

        return true;
    }

    /**
     * Create a new role
     */
    public function createRole(string $name, ?string $displayName = null, ?string $description = null, int $priority = 0): Role
    {
        $role = new Role();
        $role->setName($name);
        $role->setDisplayName($displayName);
        $role->setDescription($description);
        $role->setPriority($priority);

        $this->em->persist($role);
        $this->em->flush();

        return $role;
    }

    /**
     * Check if user can manage another user's permissions
     * (Only super admins and admins can manage permissions, but no one can manage super admins)
     */
    public function canManageUser(User $manager, User $target): bool
    {
        // Cannot manage yourself
        if ($manager->getId() === $target->getId()) {
            return false;
        }

        // Only super admin can manage other super admins
        if ($target->isSuperAdmin()) {
            return $manager->isSuperAdmin();
        }

        // Super admin and users with permissions.update can manage others
        return $manager->isSuperAdmin() || $manager->hasPermission('permissions.update');
    }

    /**
     * Get permission matrix for a user showing all permissions and their sources
     * @return array<string, array{granted: bool, source: string}>
     */
    public function getUserPermissionMatrix(User $user): array
    {
        $matrix = [];
        $allPermissions = $this->permissionRepository->findAll();

        // First, mark all as not granted
        foreach ($allPermissions as $permission) {
            $matrix[$permission->getKey()] = [
                'granted' => false,
                'source' => 'none',
            ];
        }

        // Apply role permissions
        foreach ($user->getUserRoles() as $userRole) {
            $role = $userRole->getRole();
            if ($role) {
                foreach ($role->getRolePermissions() as $rp) {
                    $permission = $rp->getPermission();
                    if ($permission) {
                        $key = $permission->getKey();
                        $matrix[$key] = [
                            'granted' => true,
                            'source' => 'role:' . $role->getName(),
                        ];
                    }
                }
            }
        }

        // Apply direct user permissions (overrides role permissions)
        foreach ($user->getUserPermissions() as $userPermission) {
            $permission = $userPermission->getPermission();
            if ($permission) {
                $key = $permission->getKey();
                $matrix[$key] = [
                    'granted' => $userPermission->isGranted(),
                    'source' => $userPermission->isGranted() ? 'direct:grant' : 'direct:revoke',
                ];
            }
        }

        return $matrix;
    }
}
