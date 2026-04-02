<?php
namespace App\Controller;

use App\Entity\StockItem;
use App\Repository\StockItemRepository;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Annotation\Route;
use Symfony\Component\Security\Http\Attribute\IsGranted;

#[Route('/api/stock-items')]
class StockItemController extends AbstractController
{
    #[Route('', methods: ['GET'])]
    #[IsGranted('stock_items.read')]
    public function list(StockItemRepository $repository): JsonResponse
    {
        return $this->json($repository->findAll());
    }

    #[Route('', methods: ['POST'])]
    #[IsGranted('stock_items.create')]
    public function create(Request $request, EntityManagerInterface $em): JsonResponse
    {
        $data = json_decode($request->getContent(), true) ?? [];
        $item = new StockItem();
        $item->setName($data['name'] ?? '');
        $item->setDescription($data['description'] ?? null);
        $item->setUnit($data['unit'] ?? 'kg');
        if (isset($data['quantityAvailable'])) { $item->setQuantityAvailable((string)$data['quantityAvailable']); }
        if (isset($data['minQuantity'])) { $item->setMinQuantity((string)$data['minQuantity']); }
        if (isset($data['pricePerUnit'])) { $item->setPricePerUnit((string)$data['pricePerUnit']); }
        $item->setSupplier($data['supplier'] ?? null);

        $em->persist($item);
        $em->flush();

        return $this->json(['status' => 'created', 'id' => $item->getId()], JsonResponse::HTTP_CREATED);
    }

    #[Route('/bulk-update', methods: ['PUT', 'PATCH'])]
    #[IsGranted('ROLE_SUPER_ADMIN')]
    public function bulkUpdate(Request $request, StockItemRepository $repository, EntityManagerInterface $em): JsonResponse
    {
        $data = json_decode($request->getContent(), true);
        $ids = $data['ids'] ?? [];
        $updates = $data['updates'] ?? [];

        if (empty($ids)) {
            return $this->json(['error' => 'No IDs provided'], JsonResponse::HTTP_BAD_REQUEST);
        }

        $allowedFields = ['supplier', 'minQuantity', 'pricePerUnit'];
        $count = 0;

        foreach ($ids as $id) {
            $item = $repository->find($id);
            if (!$item) {
                continue;
            }

            foreach ($updates as $field => $value) {
                if (!in_array($field, $allowedFields)) {
                    continue;
                }
                match ($field) {
                    'supplier' => $item->setSupplier($value),
                    'minQuantity' => $item->setMinQuantity($value !== null ? (string) $value : null),
                    'pricePerUnit' => $item->setPricePerUnit($value !== null ? (string) $value : null),
                };
            }
            $count++;
        }

        $em->flush();

        return $this->json(['status' => 'updated', 'count' => $count]);
    }

    #[Route('/bulk-delete', methods: ['DELETE'])]
    #[IsGranted('ROLE_SUPER_ADMIN')]
    public function bulkDelete(Request $request, StockItemRepository $repository, EntityManagerInterface $em): JsonResponse
    {
        $data = json_decode($request->getContent(), true);
        $ids = $data['ids'] ?? [];

        if (empty($ids)) {
            return $this->json(['error' => 'No IDs provided'], JsonResponse::HTTP_BAD_REQUEST);
        }

        $count = 0;
        foreach ($ids as $id) {
            $item = $repository->find($id);
            if (!$item) {
                continue;
            }
            $em->remove($item);
            $count++;
        }

        $em->flush();

        return $this->json(['status' => 'deleted', 'count' => $count]);
    }

    #[Route('/{id}', methods: ['PUT','PATCH'])]
    #[IsGranted('stock_items.update')]
    public function update(int $id, Request $request, StockItemRepository $repo, EntityManagerInterface $em): JsonResponse
    {
        $item = $repo->find($id);
        if (!$item) { return $this->json(['error' => 'Not found'], 404); }
        $data = json_decode($request->getContent(), true) ?? [];
        if (isset($data['name'])) $item->setName($data['name']);
        if (array_key_exists('description', $data)) $item->setDescription($data['description']);
        if (isset($data['unit'])) $item->setUnit($data['unit']);
        if (isset($data['quantityAvailable'])) $item->setQuantityAvailable((string)$data['quantityAvailable']);
        if (array_key_exists('minQuantity', $data)) $item->setMinQuantity($data['minQuantity'] !== null ? (string)$data['minQuantity'] : null);
        if (array_key_exists('pricePerUnit', $data)) $item->setPricePerUnit($data['pricePerUnit'] !== null ? (string)$data['pricePerUnit'] : null);
        if (array_key_exists('supplier', $data)) $item->setSupplier($data['supplier']);
        $em->flush();
        return $this->json(['status' => 'updated']);
    }

    #[Route('/{id}', methods: ['DELETE'])]
    #[IsGranted('stock_items.delete')]
    public function delete(int $id, StockItemRepository $repo, EntityManagerInterface $em): JsonResponse
    {
        $item = $repo->find($id);
        if (!$item) { return $this->json(['error' => 'Not found'], 404); }
        $em->remove($item);
        $em->flush();
        return $this->json(['status' => 'deleted']);
    }
}
