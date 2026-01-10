<?php

namespace App\Controller;

use App\Entity\UserLoginLog;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\Routing\Annotation\Route;

class UserLoginLogController extends AbstractController
{
    #[Route('/api/user-login-logs', name: 'api_user_login_logs', methods: ['GET'])]
    public function list(): JsonResponse
    {
        $logs = $this->getDoctrine()->getRepository(UserLoginLog::class)->findAll();
        $data = array_map(function (UserLoginLog $log) {
            // Předpokládáme, že getUser() vrací instanci User se získaným id přes getId()
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

    // V budoucnu lze vytvořit endpoint pro zaznamenání nového logu přihlášení.
}