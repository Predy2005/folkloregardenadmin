<?php

namespace App\Controller;

use App\Entity\User;
use App\Repository\UserRepository;
use Doctrine\ORM\EntityManagerInterface;
use Lexik\Bundle\JWTAuthenticationBundle\Services\JWTTokenManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\PasswordHasher\Hasher\UserPasswordHasherInterface;
use Symfony\Component\Routing\Annotation\Route;
use Symfony\Component\Security\Core\Authentication\Token\Storage\TokenStorageInterface;

final class AuthController extends AbstractController
{
    #[Route('/auth/register', name: 'api_register', methods: ['POST'])]
    public function register(
        Request                     $request,
        EntityManagerInterface      $em,
        UserPasswordHasherInterface $hasher,
        JWTTokenManagerInterface    $JWTManager
    ): JsonResponse
    {
        $data = json_decode($request->getContent(), true);

        if (!isset($data['email'], $data['password'])) {
            return new JsonResponse(['error' => 'Missing required fields (email, password)'], JsonResponse::HTTP_BAD_REQUEST);
        }

        $user = new User();
        $user->setUsername($data['email']);
        $user->setEmail($data['email']);
        $user->setPassword($hasher->hashPassword($user, $data['password']));
        $user->setRoles(['ROLE_USER']);
        $user->setCreatedAt(new \DateTime());
        $user->setUpdatedAt(new \DateTime());

        $em->persist($user);
        $em->flush();

        $token = $JWTManager->create($user);

        return new JsonResponse(['status' => 'User registered successfully', 'token' => $token], JsonResponse::HTTP_CREATED);
    }

    #[Route('/auth/login', name: 'api_login', methods: ['POST'])]
    public function login(): void
    {
        throw new \LogicException('This method is handled by the security system.');
    }

    #[Route('/auth/logout', name: 'api_logout', methods: ['POST'])]
    public function logout(): JsonResponse
    {
        return new JsonResponse(['status' => 'Logout successful.'], JsonResponse::HTTP_OK);
    }

    #[Route('/auth/forgot-password', name: 'api_forgot_password', methods: ['POST'])]
    public function forgotPassword(Request $request, UserRepository $userRepository, EntityManagerInterface $em): JsonResponse
    {
        $data = json_decode($request->getContent(), true);
        if (!isset($data['email'])) {
            return new JsonResponse(['error' => 'Email is required'], JsonResponse::HTTP_BAD_REQUEST);
        }

        $user = $userRepository->findOneBy(['email' => $data['email']]);
        if (!$user) {
            return new JsonResponse(['error' => 'User not found'], JsonResponse::HTTP_NOT_FOUND);
        }

        $resetToken = bin2hex(random_bytes(32));
        $user->setResetToken($resetToken);
        $user->setResetTokenExpiresAt(new \DateTime('+1 hour'));

        $em->persist($user);
        $em->flush();

        return new JsonResponse(['resetToken' => $resetToken], JsonResponse::HTTP_OK);
    }

    #[Route('/auth/reset-password', name: 'api_reset_password', methods: ['POST'])]
    public function resetPassword(Request $request, UserRepository $userRepository, EntityManagerInterface $em, UserPasswordHasherInterface $passwordHasher): JsonResponse
    {
        $data = json_decode($request->getContent(), true);
        if (!isset($data['resetToken'], $data['newPassword'])) {
            return new JsonResponse(['error' => 'Reset token and new password are required'], JsonResponse::HTTP_BAD_REQUEST);
        }

        $user = $userRepository->findOneBy(['resetToken' => $data['resetToken']]);
        if (!$user || $user->getResetTokenExpiresAt() < new \DateTime()) {
            return new JsonResponse(['error' => 'Invalid or expired reset token'], JsonResponse::HTTP_BAD_REQUEST);
        }

        $user->setPassword($passwordHasher->hashPassword($user, $data['newPassword']));
        $user->setResetToken(null);
        $user->setResetTokenExpiresAt(null);
        $user->setUpdatedAt(new \DateTime());

        $em->flush();

        return new JsonResponse(['status' => 'Password reset successfully'], JsonResponse::HTTP_OK);
    }

    #[Route('/auth/user', name: 'api_get_user', methods: ['GET'])]
    public function getUserInfo(TokenStorageInterface $tokenStorage): JsonResponse
    {
        $user = $tokenStorage->getToken()?->getUser();

        if (!$user instanceof User) {
            return new JsonResponse(['error' => 'Unauthorized'], JsonResponse::HTTP_UNAUTHORIZED);
        }

        return new JsonResponse([
            'id' => $user->getId(),
            'email' => $user->getEmail(),
            'username' => $user->getUsername(),
            'roles' => $user->getAssignedRoleNames(),
            'permissions' => $user->getEffectivePermissions(),
            'isSuperAdmin' => $user->isSuperAdmin(),
        ]);
    }

    #[Route('/auth/profile', name: 'api_update_profile', methods: ['PUT'])]
    public function updateProfile(
        Request $request,
        TokenStorageInterface $tokenStorage,
        EntityManagerInterface $em,
        UserPasswordHasherInterface $hasher
    ): JsonResponse
    {
        $user = $tokenStorage->getToken()?->getUser();

        if (!$user instanceof User) {
            return new JsonResponse(['error' => 'Unauthorized'], JsonResponse::HTTP_UNAUTHORIZED);
        }

        $data = json_decode($request->getContent(), true);

        // Update email/username if provided
        if (isset($data['email'])) {
            $user->setEmail($data['email']);
            $user->setUsername($data['email']);
        }

        // Update password if both current and new password are provided
        if (!empty($data['newPassword'])) {
            if (empty($data['currentPassword'])) {
                return new JsonResponse(['error' => 'Current password is required to change password'], JsonResponse::HTTP_BAD_REQUEST);
            }

            // Verify current password
            if (!$hasher->isPasswordValid($user, $data['currentPassword'])) {
                return new JsonResponse(['error' => 'Current password is incorrect'], JsonResponse::HTTP_BAD_REQUEST);
            }

            // Set new password
            $user->setPassword($hasher->hashPassword($user, $data['newPassword']));
        }

        $user->setUpdatedAt(new \DateTime());
        $em->flush();

        return new JsonResponse([
            'status' => 'Profile updated successfully',
            'user' => [
                'id' => $user->getId(),
                'email' => $user->getEmail(),
                'username' => $user->getUsername(),
                'roles' => $user->getAssignedRoleNames(),
                'permissions' => $user->getEffectivePermissions(),
                'isSuperAdmin' => $user->isSuperAdmin(),
            ]
        ]);
    }
}