<?php

namespace App\Controller;

use App\Entity\ReservationType;
use App\Repository\ReservationTypeRepository;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Annotation\Route;
use Symfony\Component\Security\Http\Attribute\IsGranted;

class ReservationTypeController extends AbstractController
{
    public function __construct(
        private EntityManagerInterface $em,
        private ReservationTypeRepository $repository,
    ) {}

    #[Route('/api/reservation-types', name: 'api_reservation_types_list', methods: ['GET'])]
    #[IsGranted('reservation_types.read')]
    public function list(): JsonResponse
    {
        $types = $this->repository->findAllOrdered();
        $data = array_map(fn(ReservationType $t) => $this->serialize($t), $types);
        return $this->json($data);
    }

    #[Route('/api/reservation-types', name: 'api_reservation_types_create', methods: ['POST'])]
    #[IsGranted('reservation_types.create')]
    public function create(Request $request): JsonResponse
    {
        $data = json_decode($request->getContent(), true);
        if (!$data || empty($data['name']) || empty($data['code'])) {
            return $this->json(['error' => 'name and code are required'], JsonResponse::HTTP_BAD_REQUEST);
        }

        // Check unique code
        if ($this->repository->findByCode($data['code'])) {
            return $this->json(['error' => 'Code already exists'], JsonResponse::HTTP_CONFLICT);
        }

        $type = new ReservationType();
        $type->setName($data['name']);
        $type->setCode($data['code']);
        $type->setColor($data['color'] ?? '#3b82f6');
        $type->setIsSystem(false); // User-created types are never system
        $type->setSortOrder((int)($data['sortOrder'] ?? 0));
        if (isset($data['note'])) {
            $type->setNote($data['note'] ?: null);
        }

        $this->em->persist($type);
        $this->em->flush();

        return $this->json($this->serialize($type), JsonResponse::HTTP_CREATED);
    }

    #[Route('/api/reservation-types/{id}', name: 'api_reservation_types_update', methods: ['PUT'])]
    #[IsGranted('reservation_types.update')]
    public function update(int $id, Request $request): JsonResponse
    {
        $type = $this->repository->find($id);
        if (!$type) {
            return $this->json(['error' => 'Reservation type not found'], JsonResponse::HTTP_NOT_FOUND);
        }

        $data = json_decode($request->getContent(), true);
        if (!$data) {
            return $this->json(['error' => 'Invalid JSON'], JsonResponse::HTTP_BAD_REQUEST);
        }

        // code and isSystem cannot be changed
        if (isset($data['name'])) {
            $type->setName($data['name']);
        }
        if (isset($data['color'])) {
            $type->setColor($data['color']);
        }
        if (isset($data['sortOrder'])) {
            $type->setSortOrder((int)$data['sortOrder']);
        }
        if (array_key_exists('note', $data)) {
            $type->setNote($data['note'] ?: null);
        }

        $this->em->flush();

        return $this->json($this->serialize($type));
    }

    #[Route('/api/reservation-types/{id}', name: 'api_reservation_types_delete', methods: ['DELETE'])]
    #[IsGranted('reservation_types.delete')]
    public function delete(int $id): JsonResponse
    {
        $type = $this->repository->find($id);
        if (!$type) {
            return $this->json(['error' => 'Reservation type not found'], JsonResponse::HTTP_NOT_FOUND);
        }

        if ($type->isSystem()) {
            return $this->json(['error' => 'System reservation types cannot be deleted'], JsonResponse::HTTP_FORBIDDEN);
        }

        $this->em->remove($type);
        $this->em->flush();

        return new JsonResponse(null, JsonResponse::HTTP_NO_CONTENT);
    }

    private function serialize(ReservationType $type): array
    {
        return [
            'id' => $type->getId(),
            'name' => $type->getName(),
            'code' => $type->getCode(),
            'color' => $type->getColor(),
            'isSystem' => $type->isSystem(),
            'note' => $type->getNote(),
            'sortOrder' => $type->getSortOrder(),
            'createdAt' => $type->getCreatedAt()->format('Y-m-d H:i:s'),
            'updatedAt' => $type->getUpdatedAt()->format('Y-m-d H:i:s'),
        ];
    }
}
