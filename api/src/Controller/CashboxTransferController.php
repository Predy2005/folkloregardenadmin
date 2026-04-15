<?php

namespace App\Controller;

use App\Entity\CashboxTransfer;
use App\Entity\User;
use App\Repository\CashboxTransferRepository;
use App\Repository\EventRepository;
use App\Serializer\CashboxSerializer;
use App\Service\CashboxService;
use App\Service\CashboxTransferService;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Annotation\Route;
use Symfony\Component\Security\Http\Attribute\IsGranted;

#[Route('/api/cashbox')]
class CashboxTransferController extends AbstractController
{
    public function __construct(
        private readonly EntityManagerInterface $em,
        private readonly CashboxService $cashboxService,
        private readonly CashboxTransferService $transferService,
        private readonly CashboxSerializer $serializer,
    ) {
    }

    #[Route('/main/transfer-to-event', name: 'cashbox_transfer_to_event', methods: ['POST'])]
    #[IsGranted('cashbox.update')]
    public function initiateTransfer(Request $request, EventRepository $eventRepo): JsonResponse
    {
        $this->transferService->setCurrentIp($request->getClientIp());
        if ($this->cashboxService->isMainCashboxHidden()) {
            return $this->json(['error' => 'Not found'], 404);
        }

        $data = json_decode($request->getContent(), true) ?? [];
        if (!isset($data['eventId'], $data['amount'])) {
            return $this->json(['error' => 'Missing required fields: eventId, amount'], 400);
        }

        $event = $eventRepo->find($data['eventId']);
        if (!$event) {
            return $this->json(['error' => 'Event nenalezen'], 404);
        }

        $amount = (float) $data['amount'];
        if ($amount <= 0) {
            return $this->json(['error' => 'Částka musí být kladná'], 400);
        }

        $user = $this->getUser();
        if (!$user instanceof User) {
            return $this->json(['error' => 'Unauthorized'], 401);
        }

        try {
            $transfer = $this->transferService->initiateTransferToEvent(
                $event,
                (string) $amount,
                $user,
                $data['description'] ?? null
            );

            return $this->json($this->serializer->serializeTransfer($transfer), 201);
        } catch (\RuntimeException $e) {
            return $this->json(['error' => $e->getMessage()], 400);
        }
    }

    #[Route('/transfers/pending', name: 'cashbox_transfers_pending', methods: ['GET'])]
    #[IsGranted('cashbox.read')]
    public function pendingTransfers(CashboxTransferRepository $transferRepo): JsonResponse
    {
        $transfers = $transferRepo->findAllPending();
        return $this->json(array_map(
            fn(CashboxTransfer $t) => $this->serializer->serializeTransfer($t),
            $transfers
        ));
    }

    #[Route('/transfers/all', name: 'cashbox_transfers_all', methods: ['GET'])]
    #[IsGranted('cashbox.read')]
    public function allTransfers(CashboxTransferRepository $transferRepo): JsonResponse
    {
        $main = $this->cashboxService->getMainCashbox();
        if (!$main) {
            return $this->json([]);
        }
        $transfers = $transferRepo->findBySourceCashbox($main);
        return $this->json(array_map(
            fn(CashboxTransfer $t) => $this->serializer->serializeTransfer($t),
            $transfers
        ));
    }

    #[Route('/event/{eventId}/pending-transfers', name: 'cashbox_event_pending_transfers', methods: ['GET'])]
    #[IsGranted('events.read')]
    public function eventPendingTransfers(int $eventId, EventRepository $eventRepo, CashboxTransferRepository $transferRepo): JsonResponse
    {
        $event = $eventRepo->find($eventId);
        if (!$event) {
            return $this->json(['error' => 'Event nenalezen'], 404);
        }

        $transfers = $transferRepo->findPendingByEvent($event);
        return $this->json(array_map(
            fn(CashboxTransfer $t) => $this->serializer->serializeTransfer($t),
            $transfers
        ));
    }

    #[Route('/transfers/{id}/confirm', name: 'cashbox_transfer_confirm', methods: ['POST'])]
    public function confirmTransfer(int $id, Request $request, CashboxTransferRepository $transferRepo): JsonResponse
    {
        $this->transferService->setCurrentIp($request->getClientIp());
        $user = $this->getUser();
        if (!$user instanceof User) {
            return $this->json(['error' => 'Unauthorized'], 401);
        }

        // Role check: only MANAGER+ or super admin can confirm
        if (!$user->isSuperAdmin()) {
            $roles = $user->getRoles();
            $allowed = array_intersect($roles, ['ROLE_SUPER_ADMIN', 'ROLE_ADMIN', 'ROLE_MANAGER']);
            if (empty($allowed)) {
                return $this->json(['error' => 'Pouze manažer může potvrdit převzetí peněz'], 403);
            }
        }

        $transfer = $transferRepo->find($id);
        if (!$transfer) {
            return $this->json(['error' => 'Převod nenalezen'], 404);
        }

        try {
            $eventCashbox = $this->transferService->confirmTransfer($transfer, $user);

            return $this->json([
                'status' => 'CONFIRMED',
                'cashbox' => $this->serializer->serializeCashbox($eventCashbox),
                'confirmedAt' => $transfer->getConfirmedAt()?->format(DATE_ATOM),
            ]);
        } catch (\RuntimeException $e) {
            return $this->json(['error' => $e->getMessage()], 400);
        }
    }

    #[Route('/transfers/{id}/approve-closure', name: 'cashbox_transfer_approve_closure', methods: ['POST'])]
    #[IsGranted('ROLE_SUPER_ADMIN')]
    public function approveClosureTransfer(int $id, Request $request, CashboxTransferRepository $transferRepo): JsonResponse
    {
        $this->transferService->setCurrentIp($request->getClientIp());
        $user = $this->getUser();
        if (!$user instanceof User) {
            return $this->json(['error' => 'Unauthorized'], 401);
        }

        $transfer = $transferRepo->find($id);
        if (!$transfer) {
            return $this->json(['error' => 'Převod nenalezen'], 404);
        }

        try {
            $this->transferService->approveClosureTransfer($transfer, $user);

            return $this->json([
                'status' => 'CONFIRMED',
                'amount' => $transfer->getAmount(),
                'confirmedAt' => $transfer->getConfirmedAt()?->format(DATE_ATOM),
                'message' => 'Předání kasy schváleno. Peníze přijaty do hlavní kasy.',
            ]);
        } catch (\RuntimeException $e) {
            return $this->json(['error' => $e->getMessage()], 400);
        }
    }

    #[Route('/transfers/{id}/reject', name: 'cashbox_transfer_reject', methods: ['POST'])]
    public function rejectTransfer(int $id, Request $request, CashboxTransferRepository $transferRepo): JsonResponse
    {
        $this->transferService->setCurrentIp($request->getClientIp());
        $user = $this->getUser();
        if (!$user instanceof User) {
            return $this->json(['error' => 'Unauthorized'], 401);
        }

        // Role check: only MANAGER+ or super admin can reject
        if (!$user->isSuperAdmin()) {
            $roles = $user->getRoles();
            $allowed = array_intersect($roles, ['ROLE_SUPER_ADMIN', 'ROLE_ADMIN', 'ROLE_MANAGER']);
            if (empty($allowed)) {
                return $this->json(['error' => 'Pouze manažer může odmítnout převod'], 403);
            }
        }

        $transfer = $transferRepo->find($id);
        if (!$transfer) {
            return $this->json(['error' => 'Převod nenalezen'], 404);
        }

        $data = json_decode($request->getContent(), true) ?? [];

        try {
            $this->transferService->rejectTransfer($transfer, $user, $data['reason'] ?? null);

            return $this->json([
                'status' => 'REJECTED',
                'refundAmount' => $transfer->getAmount(),
            ]);
        } catch (\RuntimeException $e) {
            return $this->json(['error' => $e->getMessage()], 400);
        }
    }

    #[Route('/transfers/{id}/cancel', name: 'cashbox_transfer_cancel', methods: ['POST'])]
    #[IsGranted('cashbox.update')]
    public function cancelTransfer(int $id, Request $request): JsonResponse
    {
        $this->transferService->setCurrentIp($request->getClientIp());
        $transfer = $this->em->getRepository(\App\Entity\CashboxTransfer::class)->find($id);
        if (!$transfer) return $this->json(['error' => 'Převod nenalezen'], 404);

        $user = $this->getUser();

        try {
            $this->transferService->cancelTransfer($transfer, $user);
            $this->em->flush();
            return $this->json(['status' => 'cancelled']);
        } catch (\RuntimeException $e) {
            return $this->json(['error' => $e->getMessage()], 400);
        }
    }
}
