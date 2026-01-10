<?php

namespace App\Controller;

use App\Entity\StaffMemberRole;
use App\Repository\StaffMemberRepository;
use App\Repository\StaffRoleRepository;
use App\Repository\StaffMemberRoleRepository;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Annotation\Route;

#[Route('/api/staff-member-roles')]
class StaffMemberRoleController extends AbstractController
{
    #[Route('', methods: ['GET'])]
    public function list(Request $request, StaffMemberRoleRepository $repo): JsonResponse
    {
        $memberId = $request->query->getInt('memberId', 0);
        $roles = $memberId ? $repo->findBy(['staffMember' => $memberId]) : $repo->findAll();
        $data = array_map(function(StaffMemberRole $mr){
            return [
                'id' => $mr->getId(),
                'staffMemberId' => $mr->getStaffMember()->getId(),
                'staffRoleId' => $mr->getStaffRole()->getId(),
                'isPrimary' => $mr->isPrimary(),
                'createdAt' => $mr->getCreatedAt()->format(DATE_ATOM),
            ];
        }, $roles);
        return $this->json($data);
    }

    #[Route('', methods: ['POST'])]
    public function create(Request $request, StaffMemberRepository $memberRepo, StaffRoleRepository $roleRepo, EntityManagerInterface $em): JsonResponse
    {
        $data = json_decode($request->getContent(), true) ?? [];
        $member = $memberRepo->find((int)($data['staffMemberId'] ?? 0));
        if (!$member) { return $this->json(['error' => 'Staff member not found'], 404); }
        $role = $roleRepo->find((int)($data['staffRoleId'] ?? 0));
        if (!$role) { return $this->json(['error' => 'Staff role not found'], 404); }
        $mr = new StaffMemberRole();
        $mr->setStaffMember($member);
        $mr->setStaffRole($role);
        $mr->setIsPrimary((bool)($data['isPrimary'] ?? false));
        $em->persist($mr);
        $em->flush();
        return $this->json(['status' => 'created', 'id' => $mr->getId()], 201);
    }

    #[Route('/{id}', methods: ['DELETE'])]
    public function delete(int $id, StaffMemberRoleRepository $repo, EntityManagerInterface $em): JsonResponse
    {
        $mr = $repo->find($id);
        if (!$mr) { return $this->json(['error' => 'Not found'], 404); }
        $em->remove($mr);
        $em->flush();
        return $this->json(['status' => 'deleted']);
    }
}
