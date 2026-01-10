<?php

namespace App\Controller;

use App\Entity\User;
use App\Repository\PermissionRepository;
use App\Repository\RoleRepository;
use App\Repository\UserRepository;
use App\Service\PermissionService;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Annotation\Route;
use Symfony\Component\Security\Http\Attribute\IsGranted;

#[Route('/api/permissions')]
class PermissionController extends AbstractController
{
    public function __construct(
        private EntityManagerInterface $em,
        private PermissionRepository $permissionRepository,
        private RoleRepository $roleRepository,
        private UserRepository $userRepository,
        private PermissionService $permissionService,
    ) {}

    /**
     * Get all available permissions
     */
    #[Route('', methods: ['GET'])]
    #[IsGranted('permissions.read')]
    public function list(): JsonResponse
    {
        $permissions = $this->permissionRepository->findAllGroupedByModule();

        $result = [];
        foreach ($permissions as $permission) {
            $result[] = $permission->toArray();
        }

        return $this->json([
            'permissions' => $result,
        ]);
    }

    /**
     * Get permissions grouped by module
     */
    #[Route('/grouped', methods: ['GET'])]
    #[IsGranted('permissions.read')]
    public function listGrouped(): JsonResponse
    {
        $grouped = $this->permissionService->getPermissionsGroupedByModule();

        $result = [];
        foreach ($grouped as $module => $permissions) {
            $result[$module] = array_map(fn($p) => $p->toArray(), $permissions);
        }

        return $this->json([
            'modules' => array_keys($result),
            'permissions' => $result,
        ]);
    }

    /**
     * Get all available modules
     */
    #[Route('/modules', methods: ['GET'])]
    #[IsGranted('permissions.read')]
    public function listModules(): JsonResponse
    {
        $modules = $this->permissionRepository->findAllModules();

        return $this->json([
            'modules' => $modules,
        ]);
    }

    /**
     * Get user's roles
     */
    #[Route('/users/{id}/roles', methods: ['GET'], requirements: ['id' => '\d+'])]
    #[IsGranted('permissions.read')]
    public function getUserRoles(int $id): JsonResponse
    {
        $user = $this->userRepository->find($id);

        if (!$user) {
            return $this->json(['error' => 'User not found'], Response::HTTP_NOT_FOUND);
        }

        $roles = [];
        foreach ($user->getUserRoles() as $userRole) {
            $role = $userRole->getRole();
            if ($role) {
                $roles[] = [
                    'id' => $role->getId(),
                    'name' => $role->getName(),
                    'displayName' => $role->getDisplayName(),
                    'assignedAt' => $userRole->getAssignedAt()?->format('c'),
                    'assignedBy' => $userRole->getAssignedBy()?->getUsername(),
                ];
            }
        }

        return $this->json([
            'userId' => $user->getId(),
            'username' => $user->getUsername(),
            'roles' => $roles,
        ]);
    }

    /**
     * Set user's roles
     */
    #[Route('/users/{id}/roles', methods: ['PUT'], requirements: ['id' => '\d+'])]
    #[IsGranted('permissions.update')]
    public function setUserRoles(int $id, Request $request): JsonResponse
    {
        $user = $this->userRepository->find($id);

        if (!$user) {
            return $this->json(['error' => 'User not found'], Response::HTTP_NOT_FOUND);
        }

        /** @var User $currentUser */
        $currentUser = $this->getUser();

        // Check if current user can manage target user
        if (!$this->permissionService->canManageUser($currentUser, $user)) {
            return $this->json(['error' => 'You cannot manage this user'], Response::HTTP_FORBIDDEN);
        }

        $data = json_decode($request->getContent(), true);

        if (!isset($data['roleIds']) || !is_array($data['roleIds'])) {
            return $this->json(['error' => 'roleIds array is required'], Response::HTTP_BAD_REQUEST);
        }

        // Find roles
        $roles = [];
        foreach ($data['roleIds'] as $roleId) {
            $role = $this->roleRepository->find($roleId);
            if ($role) {
                // Only super admin can assign SUPER_ADMIN role
                if ($role->getName() === 'SUPER_ADMIN' && !$currentUser->isSuperAdmin()) {
                    return $this->json(['error' => 'Only super admin can assign SUPER_ADMIN role'], Response::HTTP_FORBIDDEN);
                }
                $roles[] = $role;
            }
        }

        $this->permissionService->setUserRoles($user, $roles, $currentUser);

        return $this->json([
            'userId' => $user->getId(),
            'username' => $user->getUsername(),
            'roles' => $user->getAssignedRoleNames(),
        ]);
    }

    /**
     * Get user's effective permissions
     */
    #[Route('/users/{id}/permissions', methods: ['GET'], requirements: ['id' => '\d+'])]
    #[IsGranted('permissions.read')]
    public function getUserPermissions(int $id): JsonResponse
    {
        $user = $this->userRepository->find($id);

        if (!$user) {
            return $this->json(['error' => 'User not found'], Response::HTTP_NOT_FOUND);
        }

        return $this->json([
            'userId' => $user->getId(),
            'username' => $user->getUsername(),
            'isSuperAdmin' => $user->isSuperAdmin(),
            'permissions' => $user->getEffectivePermissions(),
            'roles' => $user->getAssignedRoleNames(),
        ]);
    }

    /**
     * Get user's permission matrix (shows source of each permission)
     */
    #[Route('/users/{id}/matrix', methods: ['GET'], requirements: ['id' => '\d+'])]
    #[IsGranted('permissions.read')]
    public function getUserPermissionMatrix(int $id): JsonResponse
    {
        $user = $this->userRepository->find($id);

        if (!$user) {
            return $this->json(['error' => 'User not found'], Response::HTTP_NOT_FOUND);
        }

        $matrix = $this->permissionService->getUserPermissionMatrix($user);

        return $this->json([
            'userId' => $user->getId(),
            'username' => $user->getUsername(),
            'isSuperAdmin' => $user->isSuperAdmin(),
            'matrix' => $matrix,
        ]);
    }

    /**
     * Grant or revoke a direct permission for a user
     */
    #[Route('/users/{id}/permissions', methods: ['POST'], requirements: ['id' => '\d+'])]
    #[IsGranted('permissions.update')]
    public function setUserPermission(int $id, Request $request): JsonResponse
    {
        $user = $this->userRepository->find($id);

        if (!$user) {
            return $this->json(['error' => 'User not found'], Response::HTTP_NOT_FOUND);
        }

        /** @var User $currentUser */
        $currentUser = $this->getUser();

        // Check if current user can manage target user
        if (!$this->permissionService->canManageUser($currentUser, $user)) {
            return $this->json(['error' => 'You cannot manage this user'], Response::HTTP_FORBIDDEN);
        }

        $data = json_decode($request->getContent(), true);

        if (empty($data['permissionKey'])) {
            return $this->json(['error' => 'permissionKey is required'], Response::HTTP_BAD_REQUEST);
        }

        $permission = $this->permissionRepository->findByKey($data['permissionKey']);
        if (!$permission) {
            return $this->json(['error' => 'Permission not found'], Response::HTTP_NOT_FOUND);
        }

        $action = $data['action'] ?? 'grant'; // 'grant', 'revoke', or 'remove'

        if ($action === 'grant') {
            $this->permissionService->grantPermissionToUser($user, $permission, $currentUser);
        } elseif ($action === 'revoke') {
            $this->permissionService->revokePermissionFromUser($user, $permission, $currentUser);
        } elseif ($action === 'remove') {
            $this->permissionService->removeDirectPermission($user, $permission);
        } else {
            return $this->json(['error' => 'Invalid action. Use grant, revoke, or remove'], Response::HTTP_BAD_REQUEST);
        }

        return $this->json([
            'userId' => $user->getId(),
            'username' => $user->getUsername(),
            'permissions' => $user->getEffectivePermissions(),
        ]);
    }

    /**
     * Get current user's permissions (for frontend)
     */
    #[Route('/me', methods: ['GET'])]
    public function myPermissions(): JsonResponse
    {
        /** @var User|null $user */
        $user = $this->getUser();

        if (!$user) {
            return $this->json(['error' => 'Not authenticated'], Response::HTTP_UNAUTHORIZED);
        }

        return $this->json([
            'userId' => $user->getId(),
            'username' => $user->getUsername(),
            'isSuperAdmin' => $user->isSuperAdmin(),
            'roles' => $user->getAssignedRoleNames(),
            'permissions' => $user->getEffectivePermissions(),
        ]);
    }
}
