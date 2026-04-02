<?php

namespace App\Controller;

use App\Entity\ReservationFoods;
use App\Repository\ReservationFoodsRepository;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Annotation\Route;
use Symfony\Component\Security\Http\Attribute\IsGranted;

#[Route('/api/reservation-foods')]
class ReservationFoodsController extends AbstractController
{
    #[Route('', methods: ['GET'])]
    #[IsGranted('reservation_foods.read')]
    public function list(ReservationFoodsRepository $repository): JsonResponse
    {
        $foods = $repository->findAll();

        return $this->json($foods);
    }

    #[Route('', methods: ['POST'])]
    #[IsGranted('reservation_foods.create')]
    public function create(Request $request, EntityManagerInterface $em): JsonResponse
    {
        $data = json_decode($request->getContent(), true);

        $food = new ReservationFoods();
        $food->setName($data['name'] ?? '');
        $food->setDescription($data['description'] ?? null);
        $food->setPrice((int) ($data['price'] ?? 0));
        $food->setSurcharge((int) ($data['surcharge'] ?? 0));
        $food->setIsChildrenMenu($data['isChildrenMenu'] ?? $data['isChildMenu'] ?? false);
        $food->setExternalId(!empty($data['externalId']) ? $data['externalId'] : null);

        $em->persist($food);
        $em->flush();

        return $this->json(['status' => 'created', 'id' => $food->getId()], JsonResponse::HTTP_CREATED);
    }

    #[Route('/bulk-update', methods: ['PUT', 'PATCH'])]
    #[IsGranted('ROLE_SUPER_ADMIN')]
    public function bulkUpdate(Request $request, ReservationFoodsRepository $repository, EntityManagerInterface $em): JsonResponse
    {
        $data = json_decode($request->getContent(), true);
        $ids = $data['ids'] ?? [];
        $updates = $data['updates'] ?? [];

        if (empty($ids)) {
            return $this->json(['error' => 'No IDs provided'], JsonResponse::HTTP_BAD_REQUEST);
        }

        $allowedFields = ['price', 'surcharge', 'isChildrenMenu'];
        $count = 0;

        foreach ($ids as $id) {
            $food = $repository->find($id);
            if (!$food) {
                continue;
            }

            foreach ($updates as $field => $value) {
                if (!in_array($field, $allowedFields)) {
                    continue;
                }
                match ($field) {
                    'price' => $food->setPrice((int) $value),
                    'surcharge' => $food->setSurcharge((int) $value),
                    'isChildrenMenu' => $food->setIsChildrenMenu((bool) $value),
                };
            }
            $count++;
        }

        $em->flush();

        return $this->json(['status' => 'updated', 'count' => $count]);
    }

    #[Route('/bulk-delete', methods: ['DELETE'])]
    #[IsGranted('ROLE_SUPER_ADMIN')]
    public function bulkDelete(Request $request, ReservationFoodsRepository $repository, EntityManagerInterface $em): JsonResponse
    {
        $data = json_decode($request->getContent(), true);
        $ids = $data['ids'] ?? [];

        if (empty($ids)) {
            return $this->json(['error' => 'No IDs provided'], JsonResponse::HTTP_BAD_REQUEST);
        }

        $count = 0;
        foreach ($ids as $id) {
            $food = $repository->find($id);
            if (!$food) {
                continue;
            }
            $em->remove($food);
            $count++;
        }

        $em->flush();

        return $this->json(['status' => 'deleted', 'count' => $count]);
    }

    #[Route('/{id}', methods: ['PUT', 'PATCH'])]
    #[IsGranted('reservation_foods.update')]
    public function edit(int $id, Request $request, ReservationFoodsRepository $repository, EntityManagerInterface $em): JsonResponse
    {
        $food = $repository->find($id);

        if (!$food) {
            return $this->json(['error' => 'Not found'], JsonResponse::HTTP_NOT_FOUND);
        }

        $data = json_decode($request->getContent(), true);

        if (isset($data['name'])) {
            $food->setName($data['name']);
        }
        if (array_key_exists('description', $data)) {
            $food->setDescription($data['description'] ?: null);
        }
        if (isset($data['price'])) {
            $food->setPrice((int) $data['price']);
        }
        if (isset($data['surcharge'])) {
            $food->setSurcharge((int) $data['surcharge']);
        }
        if (isset($data['isChildrenMenu']) || isset($data['isChildMenu'])) {
            $food->setIsChildrenMenu($data['isChildrenMenu'] ?? $data['isChildMenu'] ?? false);
        }
        if (array_key_exists('externalId', $data)) {
            $food->setExternalId(!empty($data['externalId']) ? $data['externalId'] : null);
        }

        $em->flush();

        return $this->json(['status' => 'updated']);
    }

    #[Route('/{id}', methods: ['DELETE'])]
    #[IsGranted('reservation_foods.delete')]
    public function delete(int $id, ReservationFoodsRepository $repository, EntityManagerInterface $em): JsonResponse
    {
        $food = $repository->find($id);

        if (!$food) {
            return $this->json(['error' => 'Not found'], JsonResponse::HTTP_NOT_FOUND);
        }

        $em->remove($food);
        $em->flush();

        return $this->json(['status' => 'deleted']);
    }
}