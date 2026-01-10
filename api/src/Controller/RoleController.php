<?php

namespace App\Controller;

use App\Entity\Role;
use App\Entity\User;
use App\Repository\RoleRepository;
use App\Repository\PermissionRepository;
use App\Service\PermissionService;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Annotation\Route;
use Symfony\Component\Security\Http\Attribute\IsGranted;

#[Route('/api/roles')]
class RoleController extends AbstractController
{
    public function __construct(
        private EntityManagerInterface $em,
        private RoleRepository $roleRepository,
        private PermissionRepository $permissionRepository,
        private PermissionService $permissionService,
    ) {}

    #[Route('', methods: ['GET'])]
    #[IsGranted('permissions.read')]
    public function list(): JsonResponse
    {
        $roles = $this->roleRepository->findAllOrderedByPriority();

        return $this->json([
            'roles' => array_map(fn(Role $r) => $r->toArray(true), $roles),
        ]);
    }

    #[Route('/{id}', methods: ['GET'], requirements: ['id' => '\d+'])]
    #[IsGranted('permissions.read')]
    public function show(int $id): JsonResponse
    {
        $role = $this->roleRepository->findWithPermissions($id);

        if (!$role) {
            return $this->json(['error' => 'Role not found'], Response::HTTP_NOT_FOUND);
        }

        return $this->json([
            'role' => $role->toArray(true),
        ]);
    }

    #[Route('', methods: ['POST'])]
    #[IsGranted('permissions.update')]
    public function create(Request $request): JsonResponse
    {
        $data = json_decode($request->getContent(), true);

        if (empty($data['name'])) {
            return $this->json(['error' => 'Role name is required'], Response::HTTP_BAD_REQUEST);
        }

        // Check if role already exists
        $existing = $this->roleRepository->findByName($data['name']);
        if ($existing) {
            return $this->json(['error' => 'Role with this name already exists'], Response::HTTP_CONFLICT);
        }

        $role = new Role();
        $role->setName($data['name']);
        $role->setDisplayName($data['displayName'] ?? null);
        $role->setDescription($data['description'] ?? null);
        $role->setPriority($data['priority'] ?? 0);
        $role->setIsSystem(false);

        $this->em->persist($role);
        $this->em->flush();

        // Set permissions if provided
        if (!empty($data['permissions']) && is_array($data['permissions'])) {
            $this->permissionService->setRolePermissions($role, $data['permissions']);
        }

        return $this->json([
            'role' => $role->toArray(true),
        ], Response::HTTP_CREATED);
    }

    #[Route('/{id}', methods: ['PUT', 'PATCH'], requirements: ['id' => '\d+'])]
    #[IsGranted('permissions.update')]
    public function update(int $id, Request $request): JsonResponse
    {
        $role = $this->roleRepository->find($id);

        if (!$role) {
            return $this->json(['error' => 'Role not found'], Response::HTTP_NOT_FOUND);
        }

        // Cannot edit system roles (except permissions)
        $data = json_decode($request->getContent(), true);

        if (!$role->isSystem()) {
            if (isset($data['name'])) {
                // Check if new name conflicts with existing role
                $existing = $this->roleRepository->findByName($data['name']);
                if ($existing && $existing->getId() !== $role->getId()) {
                    return $this->json(['error' => 'Role with this name already exists'], Response::HTTP_CONFLICT);
                }
                $role->setName($data['name']);
            }

            if (array_key_exists('displayName', $data)) {
                $role->setDisplayName($data['displayName']);
            }

            if (array_key_exists('description', $data)) {
                $role->setDescription($data['description']);
            }

            if (isset($data['priority'])) {
                $role->setPriority((int)$data['priority']);
            }
        }

        // Update permissions (allowed even for system roles)
        if (isset($data['permissions']) && is_array($data['permissions'])) {
            $this->permissionService->setRolePermissions($role, $data['permissions']);
        }

        $this->em->flush();

        // Reload to get fresh permission data
        $role = $this->roleRepository->findWithPermissions($id);

        return $this->json([
            'role' => $role->toArray(true),
        ]);
    }

    #[Route('/{id}', methods: ['DELETE'], requirements: ['id' => '\d+'])]
    #[IsGranted('permissions.update')]
    public function delete(int $id): JsonResponse
    {
        $role = $this->roleRepository->find($id);

        if (!$role) {
            return $this->json(['error' => 'Role not found'], Response::HTTP_NOT_FOUND);
        }

        // Cannot delete system roles
        if ($role->isSystem()) {
            return $this->json(['error' => 'Cannot delete system role'], Response::HTTP_FORBIDDEN);
        }

        // Check if role is assigned to any users
        if ($role->getUserRoles()->count() > 0) {
            return $this->json([
                'error' => 'Cannot delete role that is assigned to users',
                'userCount' => $role->getUserRoles()->count(),
            ], Response::HTTP_CONFLICT);
        }

        $this->em->remove($role);
        $this->em->flush();

        return $this->json(['success' => true]);
    }

    #[Route('/{id}/permissions', methods: ['GET'], requirements: ['id' => '\d+'])]
    #[IsGranted('permissions.read')]
    public function getPermissions(int $id): JsonResponse
    {
        $role = $this->roleRepository->findWithPermissions($id);

        if (!$role) {
            return $this->json(['error' => 'Role not found'], Response::HTTP_NOT_FOUND);
        }

        return $this->json([
            'roleId' => $role->getId(),
            'roleName' => $role->getName(),
            'permissions' => $role->getPermissionKeys(),
        ]);
    }

    #[Route('/{id}/permissions', methods: ['PUT'], requirements: ['id' => '\d+'])]
    #[IsGranted('permissions.update')]
    public function setPermissions(int $id, Request $request): JsonResponse
    {
        $role = $this->roleRepository->find($id);

        if (!$role) {
            return $this->json(['error' => 'Role not found'], Response::HTTP_NOT_FOUND);
        }

        $data = json_decode($request->getContent(), true);

        if (!isset($data['permissions']) || !is_array($data['permissions'])) {
            return $this->json(['error' => 'Permissions array is required'], Response::HTTP_BAD_REQUEST);
        }

        $this->permissionService->setRolePermissions($role, $data['permissions']);

        // Reload to get fresh data
        $role = $this->roleRepository->findWithPermissions($id);

        return $this->json([
            'roleId' => $role->getId(),
            'roleName' => $role->getName(),
            'permissions' => $role->getPermissionKeys(),
        ]);
    }
}
