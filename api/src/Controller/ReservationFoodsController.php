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