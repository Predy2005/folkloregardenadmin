<?php

namespace App\Controller;

use App\Entity\User;
use App\Repository\UserRepository;
use App\Service\SafeMailerService;
use Doctrine\ORM\EntityManagerInterface;
use Lexik\Bundle\JWTAuthenticationBundle\Services\JWTTokenManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Mime\Email;
use Symfony\Component\PasswordHasher\Hasher\UserPasswordHasherInterface;
use Symfony\Component\Routing\Annotation\Route;
use Symfony\Component\Security\Core\Authentication\Token\Storage\TokenStorageInterface;
use Symfony\Component\Security\Http\Attribute\IsGranted;

final class AuthController extends AbstractController
{
    #[Route('/auth/register', name: 'api_register', methods: ['POST'])]
    #[IsGranted('ROLE_ADMIN')]
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
    public function forgotPassword(Request $request, UserRepository $userRepository, EntityManagerInterface $em, SafeMailerService $mailer): JsonResponse
    {
        $data = json_decode($request->getContent(), true);
        if (!isset($data['email'])) {
            return new JsonResponse(['error' => 'Email is required'], JsonResponse::HTTP_BAD_REQUEST);
        }

        $user = $userRepository->findOneBy(['email' => $data['email']]);

        // Always return the same response to prevent user enumeration
        $genericResponse = new JsonResponse(
            ['status' => 'Pokud e-mail existuje, byl odeslán odkaz pro obnovení hesla.'],
            JsonResponse::HTTP_OK
        );

        if (!$user) {
            return $genericResponse;
        }

        $resetToken = bin2hex(random_bytes(32));
        $user->setResetToken($resetToken);
        $user->setResetTokenExpiresAt(new \DateTime('+1 hour'));

        $em->persist($user);
        $em->flush();

        // Build reset link pointing to the frontend
        $frontendUrl = rtrim($_ENV['FRONTEND_URL'] ?? 'https://admin.folkloregarden.cz', '/');
        $resetLink = $frontendUrl . '/reset-password/' . $resetToken;

        $html = <<<HTML
        <!DOCTYPE html>
        <html lang="cs">
        <head><meta charset="UTF-8"><title>Obnovení hesla</title></head>
        <body style="font-family:Arial,sans-serif;color:#333;line-height:1.6;padding:20px;">
            <div style="max-width:500px;margin:0 auto;background:#fff;border-radius:8px;padding:30px;box-shadow:0 2px 10px rgba(0,0,0,0.1);">
                <h2 style="color:#DC1A15;margin-top:0;">Obnovení hesla</h2>
                <p>Obdrželi jsme žádost o obnovení hesla pro váš účet v systému Folklore Garden.</p>
                <p>Klikněte na tlačítko níže pro nastavení nového hesla:</p>
                <p style="text-align:center;margin:30px 0;">
                    <a href="{$resetLink}" style="display:inline-block;padding:12px 32px;background:#DC1A15;color:#fff;text-decoration:none;border-radius:30px;font-weight:bold;font-size:16px;">
                        Nastavit nové heslo
                    </a>
                </p>
                <p style="font-size:13px;color:#666;">Odkaz je platný 1 hodinu. Pokud jste o obnovení hesla nežádali, tento e-mail ignorujte.</p>
                <hr style="border:none;border-top:1px solid #eee;margin:20px 0;">
                <p style="font-size:12px;color:#999;margin-bottom:0;">Folklore Garden — Administrační systém</p>
            </div>
        </body>
        </html>
        HTML;

        try {
            $email = (new Email())
                ->from('info@folkloregarden.cz')
                ->to($user->getEmail())
                ->subject('Obnovení hesla — Folklore Garden')
                ->html($html);

            $mailer->send($email);
        } catch (\Exception $e) {
            error_log('Failed to send password reset email: ' . $e->getMessage());
        }

        return $genericResponse;
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