<?php

namespace App\Controller;

use App\Entity\StaffRole;
use App\Repository\StaffRoleRepository;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Annotation\Route;

#[Route('/api/staff-roles')]
class StaffRoleController extends AbstractController
{
    #[Route('', methods: ['GET'])]
    public function list(StaffRoleRepository $repo): JsonResponse
    {
        $items = $repo->findAll();
        $data = array_map(fn(StaffRole $r) => [
            'id' => $r->getId(),
            'name' => $r->getName(),
            'description' => $r->getDescription(),
            'requiredPerGuests' => $r->getRequiredPerGuests(),
            'guestsRatio' => $r->getGuestsRatio(),
            'createdAt' => $r->getCreatedAt()->format(DATE_ATOM),
        ], $items);
        return $this->json($data);
    }

    #[Route('', methods: ['POST'])]
    public function create(Request $request, EntityManagerInterface $em): JsonResponse
    {
        $data = json_decode($request->getContent(), true) ?? [];
        $r = new StaffRole();
        $r->setName($data['name'] ?? '');
        $r->setDescription($data['description'] ?? null);
        $r->setRequiredPerGuests((int)($data['requiredPerGuests'] ?? 0));
        $r->setGuestsRatio((int)($data['guestsRatio'] ?? 10));
        $em->persist($r);
        $em->flush();
        return $this->json(['status' => 'created', 'id' => $r->getId()], 201);
    }

    #[Route('/{id}', methods: ['PUT','PATCH'])]
    public function update(int $id, Request $request, StaffRoleRepository $repo, EntityManagerInterface $em): JsonResponse
    {
        $r = $repo->find($id);
        if (!$r) { return $this->json(['error' => 'Not found'], 404); }
        $data = json_decode($request->getContent(), true) ?? [];
        if (array_key_exists('name', $data)) $r->setName((string)$data['name']);
        if (array_key_exists('description', $data)) $r->setDescription($data['description']);
        if (array_key_exists('requiredPerGuests', $data)) $r->setRequiredPerGuests((int)$data['requiredPerGuests']);
        if (array_key_exists('guestsRatio', $data)) $r->setGuestsRatio((int)$data['guestsRatio']);
        $em->flush();
        return $this->json(['status' => 'updated']);
    }

    #[Route('/{id}', methods: ['DELETE'])]
    public function delete(int $id, StaffRoleRepository $repo, EntityManagerInterface $em): JsonResponse
    {
        $r = $repo->find($id);
        if (!$r) { return $this->json(['error' => 'Not found'], 404); }
        $em->remove($r);
        $em->flush();
        return $this->json(['status' => 'deleted']);
    }
}
