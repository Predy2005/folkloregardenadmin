<?php

namespace App\Controller;

use App\Entity\UserLoginLog;
use App\Repository\UserLoginLogRepository;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\Routing\Annotation\Route;
use Symfony\Component\Security\Http\Attribute\IsGranted;

#[IsGranted('ROLE_ADMIN')]
class UserLoginLogController extends AbstractController
{
    #[Route('/api/user-login-logs', name: 'api_user_login_logs', methods: ['GET'])]
    public function list(UserLoginLogRepository $repo): JsonResponse
    {
        $logs = $repo->findAll();
        $data = array_map(function (UserLoginLog $log) {
            return [
                'id' => $log->getId(),
                'userId' => $log->getUser() ? $log->getUser()->getId() : null,
                'loginAt' => $log->getLoginAt() ? $log->getLoginAt()->format('Y-m-d H:i:s') : null,
                'ipAddress' => $log->getIpAddress(),
                'userAgent' => $log->getUserAgent(),
            ];
        }, $logs);
        return $this->json($data);
    }
}
