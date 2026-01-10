<?php

namespace App\Controller;

use App\Entity\User;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Annotation\Route;
use Symfony\Component\PasswordHasher\Hasher\UserPasswordHasherInterface;
use Symfony\Component\Security\Http\Attribute\IsGranted;

class UserController extends AbstractController
{
    private EntityManagerInterface $entityManager;

    public function __construct(EntityManagerInterface $entityManager)
    {
        $this->entityManager = $entityManager;
    }

    #[Route('/api/users', name: 'api_user_list', methods: ['GET'])]
    #[IsGranted('users.read')]
    public function list(): JsonResponse
    {
        $users = $this->entityManager->getRepository(User::class)->findAll();
        $data = array_map(function (User $user) {
            return [
                'id' => $user->getId(),
                'username' => $user->getUsername(),
                'email' => $user->getEmail(),
                'roles' => $user->getAssignedRoleNames(),
                'isSuperAdmin' => $user->isSuperAdmin(),
                'lastLoginAt' => $user->getLastLoginAt() ? $user->getLastLoginAt()->format('Y-m-d H:i:s') : null,
                'lastLoginIp' => $user->getLastLoginIp(),
            ];
        }, $users);
        return $this->json($data);
    }

    #[Route('/api/users/{id}', name: 'api_user_edit', methods: ['PUT', 'PATCH'])]
    #[IsGranted('users.update')]
    public function edit(Request $request, int $id, UserPasswordHasherInterface $passwordHasher): JsonResponse
    {
        $user = $this->entityManager->getRepository(User::class)->find($id);
        if (!$user) {
            return $this->json(['message' => 'User not found'], 404);
        }

        $data = $request->toArray();

        if (isset($data['username'])) {
            $user->setUsername($data['username']);
        }
        if (isset($data['email'])) {
            $user->setEmail($data['email']);
        }
        if (isset($data['name']) && method_exists($user, 'setName')) {
            $user->setName($data['name']);
        }
        if (isset($data['role'])) {
            $user->setRoles([$data['role']]);
        }
        if (isset($data['password'])) {
            $hashedPassword = $passwordHasher->hashPassword($user, $data['password']);
            $user->setPassword($hashedPassword);
        }

        $this->entityManager->flush();

        return $this->json(['message' => 'User updated successfully']);
    }

    #[Route('/api/users', name: 'api_user_create', methods: ['POST'])]
    #[IsGranted('users.create')]
    public function create(Request $request, UserPasswordHasherInterface $passwordHasher): JsonResponse
    {
        $data = $request->toArray();

        if (empty($data['email'])) {
            return $this->json(['error' => 'Email is required'], 400);
        }
        if (empty($data['password'])) {
            return $this->json(['error' => 'Password is required'], 400);
        }

        // Check if user with this email already exists
        $existing = $this->entityManager->getRepository(User::class)->findOneBy(['email' => $data['email']]);
        if ($existing) {
            return $this->json(['error' => 'User with this email already exists'], 409);
        }

        $user = new User();
        // Username is used for login, so set it to email for consistency
        $user->setUsername($data['email']);
        $user->setEmail($data['email']);

        if (isset($data['name']) && method_exists($user, 'setName')) {
            $user->setName($data['name']);
        }

        $hashedPassword = $passwordHasher->hashPassword($user, $data['password']);
        $user->setPassword($hashedPassword);

        $this->entityManager->persist($user);
        $this->entityManager->flush();

        return $this->json([
            'id' => $user->getId(),
            'username' => $user->getUsername(),
            'email' => $user->getEmail(),
            'roles' => $user->getAssignedRoleNames(),
            'isSuperAdmin' => $user->isSuperAdmin(),
        ], 201);
    }


    #[Route('/api/users/{id}', name: 'api_user_delete', methods: ['DELETE'])]
    #[IsGranted('users.delete')]
    public function delete(int $id): JsonResponse
    {
        $user = $this->entityManager->getRepository(User::class)->find($id);
        if (!$user) {
            return $this->json(['error' => 'User not found'], 404);
        }

        // Protect super admin from deletion
        if ($user->isSuperAdmin()) {
            return $this->json(['error' => 'Cannot delete super admin user'], 403);
        }

        $this->entityManager->remove($user);
        $this->entityManager->flush();

        return $this->json(['message' => 'User deleted successfully']);
    }
}