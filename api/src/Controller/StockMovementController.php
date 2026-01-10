<?php
namespace App\Controller;

use App\Entity\StockMovement;
use App\Repository\StockMovementRepository;
use App\Repository\StockItemRepository;
use App\Repository\ReservationRepository;
use App\Repository\UserRepository;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Annotation\Route;
use Symfony\Component\Security\Http\Attribute\IsGranted;

#[Route('/api/stock-movements')]
class StockMovementController extends AbstractController
{
    #[Route('', methods: ['GET'])]
    #[IsGranted('stock_movements.read')]
    public function list(StockMovementRepository $repo): JsonResponse
    {
        return $this->json($repo->findBy([], ['id' => 'DESC']));
    }

    #[Route('', methods: ['POST'])]
    #[IsGranted('stock_movements.create')]
    public function create(
        Request $request,
        EntityManagerInterface $em,
        StockItemRepository $stockItemRepo,
        ReservationRepository $reservationRepo,
        UserRepository $userRepo
    ): JsonResponse {
        $data = json_decode($request->getContent(), true) ?? [];

        $stockItemId = $data['stockItemId'] ?? null;
        $movementType = strtoupper($data['movementType'] ?? '');
        $quantity = isset($data['quantity']) ? (string)$data['quantity'] : null;
        if (!$stockItemId || !in_array($movementType, ['IN','OUT','ADJUSTMENT'], true) || $quantity === null) {
            return $this->json(['error' => 'Invalid payload'], 400);
        }

        $stockItem = $stockItemRepo->find((int)$stockItemId);
        if (!$stockItem) { return $this->json(['error' => 'Stock item not found'], 404); }

        $movement = new StockMovement();
        $movement->setStockItem($stockItem)
            ->setMovementType($movementType)
            ->setQuantity($quantity)
            ->setReason($data['reason'] ?? null);

        if (!empty($data['reservationId'])) {
            $reservation = $reservationRepo->find((int)$data['reservationId']);
            if ($reservation) { $movement->setReservation($reservation); }
        }
        if (!empty($data['userId'])) {
            $user = $userRepo->find((int)$data['userId']);
            if ($user) { $movement->setUser($user); }
        }

        // Adjust stock quantity (application-level trigger)
        $currentQty = (float)$stockItem->getQuantityAvailable();
        $delta = (float)$quantity;
        if ($movementType === 'IN') {
            $newQty = $currentQty + $delta;
        } elseif ($movementType === 'OUT') {
            $newQty = $currentQty - $delta;
        } else { // ADJUSTMENT
            $newQty = $delta;
        }
        $stockItem->setQuantityAvailable(number_format($newQty, 2, '.', ''));

        $em->persist($movement);
        $em->flush();

        return $this->json(['status' => 'created', 'id' => $movement->getId(), 'quantityAvailable' => $stockItem->getQuantityAvailable()], 201);
    }
}
