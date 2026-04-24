<?php

declare(strict_types=1);

namespace App\Controller;

use App\Entity\RefreshToken;
use App\Entity\User;
use App\Service\AuthException;
use App\Service\MobileAuthService;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Annotation\Route;
use Symfony\Component\Security\Core\Exception\AccessDeniedException;
use Symfony\Component\Security\Http\Attribute\IsGranted;

/**
 * Mobilní autentizace — oddělená cesta od /auth/*.
 *
 * Firewally: access_control povoluje /api/mobile/auth/(login|pin-login|refresh|logout)
 * jako anonymní, /api/mobile/auth/me vyžaduje IS_AUTHENTICATED_FULLY (JWT).
 */
#[Route('/api/mobile/auth')]
class MobileAuthController extends AbstractController
{
    public function __construct(
        private readonly MobileAuthService $auth,
    ) {
    }

    #[Route('/login', methods: ['POST'])]
    public function login(Request $request): JsonResponse
    {
        $data = json_decode($request->getContent(), true) ?? [];
        $identifier = isset($data['identifier']) ? (string)$data['identifier'] : '';
        $password = isset($data['password']) ? (string)$data['password'] : '';
        $deviceId = isset($data['deviceId']) ? (string)$data['deviceId'] : null;

        if ($identifier === '' || $password === '') {
            return $this->json(['error' => 'Pole "identifier" a "password" jsou povinná.'], 400);
        }

        try {
            $result = $this->auth->loginWithPassword($identifier, $password, $deviceId);
        } catch (AuthException $e) {
            return $this->json(['error' => $e->getMessage()], 401);
        }

        return $this->json($this->buildTokenResponse($result));
    }

    #[Route('/pin-login', methods: ['POST'])]
    public function pinLogin(Request $request): JsonResponse
    {
        $data = json_decode($request->getContent(), true) ?? [];
        $identifier = isset($data['identifier']) ? (string)$data['identifier'] : '';
        $pin = isset($data['pin']) ? (string)$data['pin'] : '';
        $deviceId = isset($data['deviceId']) ? (string)$data['deviceId'] : '';

        if ($identifier === '' || $pin === '' || $deviceId === '') {
            return $this->json(['error' => 'Pole "identifier", "pin" a "deviceId" jsou povinná.'], 400);
        }

        try {
            $result = $this->auth->loginWithPin($identifier, $pin, $deviceId);
        } catch (AuthException $e) {
            return $this->json(['error' => $e->getMessage()], 401);
        }

        return $this->json($this->buildTokenResponse($result));
    }

    #[Route('/refresh', methods: ['POST'])]
    public function refresh(Request $request): JsonResponse
    {
        $data = json_decode($request->getContent(), true) ?? [];
        $refreshToken = isset($data['refreshToken']) ? (string)$data['refreshToken'] : '';
        $deviceId = isset($data['deviceId']) ? (string)$data['deviceId'] : null;

        if ($refreshToken === '') {
            return $this->json(['error' => 'Pole "refreshToken" je povinné.'], 400);
        }

        try {
            $result = $this->auth->refresh($refreshToken, $deviceId);
        } catch (AuthException $e) {
            return $this->json(['error' => $e->getMessage()], 401);
        }

        return $this->json($this->buildTokenResponse($result));
    }

    #[Route('/logout', methods: ['POST'])]
    public function logout(Request $request): JsonResponse
    {
        $data = json_decode($request->getContent(), true) ?? [];
        $refreshToken = isset($data['refreshToken']) ? (string)$data['refreshToken'] : '';
        if ($refreshToken !== '') {
            $this->auth->logout($refreshToken);
        }
        return $this->json(['status' => 'logged_out']);
    }

    #[Route('/me', methods: ['GET'])]
    #[IsGranted('IS_AUTHENTICATED_FULLY')]
    public function me(): JsonResponse
    {
        $user = $this->getUser();
        if (!$user instanceof User) {
            throw new AccessDeniedException();
        }
        return $this->json($this->auth->describeUser($user));
    }

    /**
     * @param array{user: User, accessTokenPlain: string, refreshToken: RefreshToken, refreshTokenPlain: string} $result
     */
    private function buildTokenResponse(array $result): array
    {
        /** @var User $user */
        $user = $result['user'];
        /** @var RefreshToken $refresh */
        $refresh = $result['refreshToken'];

        return [
            'accessToken' => $result['accessTokenPlain'],
            'accessTokenExpiresIn' => MobileAuthService::ACCESS_TOKEN_TTL_SECONDS,
            'refreshToken' => $result['refreshTokenPlain'],
            'refreshTokenExpiresAt' => $refresh->getExpiresAt()->format('c'),
            'user' => $this->auth->describeUser($user),
        ];
    }
}
