<?php
namespace App\Controller;

use App\Entity\StockMovement;
use App\Repository\StockMovementRepository;
use App\Repository\StockItemRepository;
use App\Repository\ReservationRepository;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Annotation\Route;
use Symfony\Component\Security\Http\Attribute\IsGranted;

#[Route('/api/stock-movements')]
class StockMovementController extends AbstractController
{
    private StockMovementRepository $movementRepo;
    private StockItemRepository $stockItemRepo;
    private ReservationRepository $reservationRepo;
    private EntityManagerInterface $em;

    public function __construct(
        StockMovementRepository $movementRepo,
        StockItemRepository $stockItemRepo,
        ReservationRepository $reservationRepo,
        EntityManagerInterface $em
    ) {
        $this->movementRepo = $movementRepo;
        $this->stockItemRepo = $stockItemRepo;
        $this->reservationRepo = $reservationRepo;
        $this->em = $em;
    }

    #[Route('', methods: ['GET'])]
    #[IsGranted('stock_movements.read')]
    public function list(Request $request): JsonResponse
    {
        $stockItemId = $request->query->get('stockItemId');
        $limit = min(200, max(10, (int) $request->query->get('limit', 100)));
        $offset = max(0, (int) $request->query->get('offset', 0));

        $criteria = [];
        if ($stockItemId) {
            $criteria['stockItem'] = $stockItemId;
        }

        $movements = $this->movementRepo->findBy($criteria, ['id' => 'DESC'], $limit, $offset);

        $data = array_map(function($m) {
            $item = $m->getStockItem();
            return [
                'id' => $m->getId(),
                'stockItemId' => $item?->getId(),
                'stockItemName' => $item?->getName(),
                'movementType' => $m->getMovementType(),
                'quantity' => (float) $m->getQuantity(),
                'reason' => $m->getReason(),
                'reservationId' => $m->getReservation()?->getId(),
                'userId' => $m->getUser()?->getId(),
                'userName' => $m->getUser()?->getUsername(),
                'createdAt' => $m->getCreatedAt()->format(DATE_ATOM),
            ];
        }, $movements);

        return $this->json($data);
    }

    #[Route('/by-item/{stockItemId}', methods: ['GET'])]
    #[IsGranted('stock_movements.read')]
    public function byItem(int $stockItemId, Request $request): JsonResponse
    {
        $stockItem = $this->stockItemRepo->find($stockItemId);
        if (!$stockItem) {
            return $this->json(['error' => 'Stock item not found'], 404);
        }

        $limit = min(200, max(10, (int) $request->query->get('limit', 100)));
        $offset = max(0, (int) $request->query->get('offset', 0));

        $movements = $this->movementRepo->findBy(
            ['stockItem' => $stockItemId],
            ['id' => 'DESC'],
            $limit,
            $offset
        );

        $data = array_map(function($m) use ($stockItem) {
            return [
                'id' => $m->getId(),
                'stockItemId' => $stockItem->getId(),
                'stockItemName' => $stockItem->getName(),
                'movementType' => $m->getMovementType(),
                'quantity' => (float) $m->getQuantity(),
                'reason' => $m->getReason(),
                'reservationId' => $m->getReservation()?->getId(),
                'userId' => $m->getUser()?->getId(),
                'userName' => $m->getUser()?->getUsername(),
                'createdAt' => $m->getCreatedAt()->format(DATE_ATOM),
            ];
        }, $movements);

        return $this->json($data);
    }

    #[Route('', methods: ['POST'])]
    #[IsGranted('stock_movements.create')]
    public function create(Request $request): JsonResponse
    {
        $data = json_decode($request->getContent(), true) ?? [];

        $stockItemId = $data['stockItemId'] ?? null;
        $movementType = strtoupper($data['movementType'] ?? '');
        $quantity = isset($data['quantity']) ? (string)$data['quantity'] : null;
        if (!$stockItemId || !in_array($movementType, ['IN','OUT','ADJUSTMENT'], true) || $quantity === null) {
            return $this->json(['error' => 'Invalid payload'], 400);
        }

        $stockItem = $this->stockItemRepo->find((int)$stockItemId);
        if (!$stockItem) {
            return $this->json(['error' => 'Stock item not found'], 404);
        }

        $delta = (float)$quantity;
        $currentQty = (float)$stockItem->getQuantityAvailable();

        // Negative stock protection for OUT movements
        if ($movementType === 'OUT' && $delta > $currentQty) {
            return $this->json([
                'error' => 'Insufficient stock',
                'available' => $currentQty,
                'requested' => $delta,
            ], 422);
        }

        $this->em->beginTransaction();
        try {
            $movement = new StockMovement();
            $movement->setStockItem($stockItem)
                ->setMovementType($movementType)
                ->setQuantity($quantity)
                ->setReason($data['reason'] ?? null);

            // Set user from security context
            $user = $this->getUser();
            if ($user) {
                $movement->setUser($user);
            }

            if (!empty($data['reservationId'])) {
                $reservation = $this->reservationRepo->find((int)$data['reservationId']);
                if ($reservation) {
                    $movement->setReservation($reservation);
                }
            }

            // Adjust stock quantity
            if ($movementType === 'IN') {
                $newQty = $currentQty + $delta;
            } elseif ($movementType === 'OUT') {
                $newQty = $currentQty - $delta;
            } else { // ADJUSTMENT
                $newQty = $delta;
            }
            $stockItem->setQuantityAvailable(number_format($newQty, 2, '.', ''));

            $this->em->persist($movement);
            $this->em->flush();
            $this->em->commit();

            return $this->json([
                'id' => $movement->getId(),
                'stockItemId' => $stockItem->getId(),
                'stockItemName' => $stockItem->getName(),
                'movementType' => $movement->getMovementType(),
                'quantity' => (float) $movement->getQuantity(),
                'reason' => $movement->getReason(),
                'reservationId' => $movement->getReservation()?->getId(),
                'userId' => $movement->getUser()?->getId(),
                'userName' => $movement->getUser()?->getUsername(),
                'createdAt' => $movement->getCreatedAt()->format(DATE_ATOM),
                'quantityAvailable' => (float) $stockItem->getQuantityAvailable(),
            ], 201);
        } catch (\Throwable $e) {
            $this->em->rollback();
            return $this->json(['error' => 'Failed to create movement: ' . $e->getMessage()], 500);
        }
    }

    #[Route('/batch', methods: ['POST'])]
    #[IsGranted('stock_movements.create')]
    public function batch(Request $request): JsonResponse
    {
        $payload = json_decode($request->getContent(), true) ?? [];
        $movementsData = $payload['movements'] ?? [];
        $supplier = $payload['supplier'] ?? null;

        if (empty($movementsData) || !is_array($movementsData)) {
            return $this->json(['error' => 'movements array is required'], 400);
        }

        $this->em->beginTransaction();
        try {
            $user = $this->getUser();
            $results = [];
            $updatedItems = [];

            foreach ($movementsData as $index => $data) {
                $stockItemId = $data['stockItemId'] ?? null;
                $movementType = strtoupper($data['movementType'] ?? '');
                $quantity = isset($data['quantity']) ? (string)$data['quantity'] : null;

                if (!$stockItemId || !in_array($movementType, ['IN','OUT','ADJUSTMENT'], true) || $quantity === null) {
                    throw new \InvalidArgumentException("Invalid data at index $index");
                }

                $stockItem = $this->stockItemRepo->find((int)$stockItemId);
                if (!$stockItem) {
                    throw new \InvalidArgumentException("Stock item not found at index $index (id: $stockItemId)");
                }

                $delta = (float)$quantity;
                $currentQty = (float)$stockItem->getQuantityAvailable();

                if ($movementType === 'OUT' && $delta > $currentQty) {
                    throw new \InvalidArgumentException(
                        "Insufficient stock for item '{$stockItem->getName()}' at index $index: available $currentQty, requested $delta"
                    );
                }

                $reason = $data['reason'] ?? null;
                if ($supplier && !$reason) {
                    $reason = "Supplier: $supplier";
                }

                $movement = new StockMovement();
                $movement->setStockItem($stockItem)
                    ->setMovementType($movementType)
                    ->setQuantity($quantity)
                    ->setReason($reason);

                if ($user) {
                    $movement->setUser($user);
                }

                // Adjust stock quantity
                if ($movementType === 'IN') {
                    $newQty = $currentQty + $delta;
                } elseif ($movementType === 'OUT') {
                    $newQty = $currentQty - $delta;
                } else {
                    $newQty = $delta;
                }
                $stockItem->setQuantityAvailable(number_format($newQty, 2, '.', ''));

                $this->em->persist($movement);

                $results[] = [
                    'stockItemId' => $stockItem->getId(),
                    'stockItemName' => $stockItem->getName(),
                    'movementType' => $movementType,
                    'quantity' => $delta,
                    'newQuantityAvailable' => $newQty,
                ];
                $updatedItems[$stockItem->getId()] = $stockItem->getName();
            }

            $this->em->flush();
            $this->em->commit();

            return $this->json([
                'status' => 'created',
                'count' => count($results),
                'supplier' => $supplier,
                'movements' => $results,
                'updatedItemIds' => array_keys($updatedItems),
            ], 201);
        } catch (\InvalidArgumentException $e) {
            $this->em->rollback();
            return $this->json(['error' => $e->getMessage()], 400);
        } catch (\Throwable $e) {
            $this->em->rollback();
            return $this->json(['error' => 'Batch failed: ' . $e->getMessage()], 500);
        }
    }
}
