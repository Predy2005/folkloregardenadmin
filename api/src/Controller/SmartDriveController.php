<?php

namespace App\Controller;

use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Annotation\Route;
use Symfony\Component\Security\Http\Attribute\IsGranted;
use Kreait\Firebase\Factory;
use Kreait\Firebase\Messaging\CloudMessage;
use Kreait\Firebase\Messaging\Notification;

#[Route('/smart-drive')]
#[IsGranted('IS_AUTHENTICATED_FULLY')]
class SmartDriveController extends AbstractController
{
    #[Route('/', name: 'smart_drive_index', methods: ['GET'])]
    public function index(): JsonResponse
    {
        return $this->json([
            'status' => 'ok',
            'message' => 'Smart Drive Controller is active.'
        ]);
    }

    #[Route('/assign', name: 'smart_drive_assign', methods: ['GET', 'POST'])]
    public function assignDriver(Request $request): JsonResponse
    {
        $data = json_decode($request->getContent(), true);

        $factory = (new Factory)->withServiceAccount(__DIR__ . '/../../config/serviceAccountKey.json');
        $messaging = $factory->createMessaging();

        $deviceToken = $data['deviceToken'] ?? null;

        if (!$deviceToken) {
            return $this->json(['status' => 'error', 'message' => 'Missing device token'], 400);
        }

        $message = CloudMessage::fromArray([
            'token' => $deviceToken,
            'notification' => [
                'title' => $data['notification']['title'] ?? 'Nová jízda',
                'body' => $data['notification']['body'] ?? 'Máte novou jízdu v 10:00.',
                'icon' => $data['notification']['icon'] ?? 'https://testujeme.online/logo.png',
            ],
            'data' => $data['data'] ?? []
        ]);

        try {
            $messaging->send($message);
        } catch (\Throwable $e) {
            return $this->json(['status' => 'error', 'message' => 'Notification failed', 'error' => $e->getMessage()], 500);
        }

        return $this->json([
            'status' => 'success',
            'assigned' => $data
        ]);
    }


    #[Route('/overview', name: 'smart_drive_overview', methods: ['GET'])]
    public function overview(): JsonResponse
    {
        // Example data, replace with actual logic
        $overview = [
            ['driver' => 'John Doe', 'pickup' => '08:00', 'location' => 'Main Gate'],
            ['driver' => 'Jane Smith', 'pickup' => '08:30', 'location' => 'Hotel A'],
        ];

        return $this->json([
            'status' => 'success',
            'overview' => $overview
        ]);
    }
}