<?php

namespace App\Controller;

use App\Entity\StaffMember;
use App\Repository\StaffMemberRepository;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Annotation\Route;
use Symfony\Component\Security\Http\Attribute\IsGranted;

#[Route('/api/staff')]
class StaffMemberController extends AbstractController
{
    #[Route('', methods: ['GET'])]
    #[IsGranted('staff.read')]
    public function list(StaffMemberRepository $repo): JsonResponse
    {
        $items = $repo->findAll();
        $data = array_map(function (StaffMember $m) {
            return [
                'id' => $m->getId(),
                'firstName' => $m->getFirstName() ?? null,
                'lastName' => $m->getLastName() ?? null,
                'email' => $m->getEmail(),
                'phone' => $m->getPhone(),
                'address' => $m->getAddress(),
                'dateOfBirth' => $m->getDateOfBirth()?->format('Y-m-d'),
                'position' => $m->getPosition(),
                'hourlyRate' => $m->getHourlyRate(),
                'fixedRate' => $m->getFixedRate(),
                'isActive' => $m->isActive(),
                'emergencyContact' => $m->getEmergencyContact(),
                'emergencyPhone' => $m->getEmergencyPhone(),
                'notes' => $m->getNotes(),
                'createdAt' => $m->getCreatedAt()->format(DATE_ATOM),
                'updatedAt' => $m->getUpdatedAt()->format(DATE_ATOM),
            ];
        }, $items);
        return $this->json($data);
    }

    #[Route('', methods: ['POST'])]
    #[IsGranted('staff.create')]
    public function create(Request $request, EntityManagerInterface $em, \App\Repository\StaffRoleRepository $roleRepo): JsonResponse
    {
        $data = json_decode($request->getContent(), true) ?? [];

        $m = new StaffMember();

        if (array_key_exists('firstName', $data)) $m->setFirstName((string)$data['firstName']);
        if (array_key_exists('lastName', $data)) $m->setLastName((string)$data['lastName']);
        if (array_key_exists('email', $data)) $m->setEmail($data['email']);
        if (array_key_exists('phone', $data)) $m->setPhone($data['phone']);
        if (array_key_exists('address', $data)) $m->setAddress($data['address']);

        if (array_key_exists('dateOfBirth', $data)) {
            $m->setDateOfBirth($data['dateOfBirth'] ? new \DateTime($data['dateOfBirth']) : null);
        }

        if (array_key_exists('position', $data)) {
            $m->setPosition($data['position']);
        } elseif (array_key_exists('role', $data)) {
            $roleVal = $data['role'];
            if (is_numeric($roleVal)) {
                $roleEntity = $roleRepo->find((int)$roleVal);
                if ($roleEntity) {
                    $m->setPosition($roleEntity);
                } else {
                    $m->setPosition((string)$roleVal);
                }
            } else {
                $m->setPosition((string)$roleVal);
            }
        }

        if (array_key_exists('hourlyRate', $data)) {
            $m->setHourlyRate($this->normalizeNumberForRate($data['hourlyRate']));
        }
        if (array_key_exists('fixedRate', $data)) {
            $m->setFixedRate($this->normalizeNumberForRate($data['fixedRate']));
        }

        if (array_key_exists('isActive', $data)) {
            $m->setIsActive((bool)$data['isActive']);
        } elseif (array_key_exists('active', $data)) {
            $m->setIsActive((bool)$data['active']);
        } else {
            $m->setIsActive(true);
        }

        if (array_key_exists('emergencyContact', $data)) $m->setEmergencyContact($data['emergencyContact']);
        if (array_key_exists('emergencyPhone', $data)) $m->setEmergencyPhone($data['emergencyPhone']);
        if (array_key_exists('notes', $data)) $m->setNotes($data['notes']);

        $em->persist($m);
        $em->flush();

        return $this->json(['status' => 'created', 'id' => $m->getId()], JsonResponse::HTTP_CREATED);
    }

    #[Route('/{id}', methods: ['PUT', 'PATCH'])]
    #[IsGranted('staff.update')]
    public function update(int $id, Request $request, StaffMemberRepository $repo, EntityManagerInterface $em): JsonResponse
    {
        $m = $repo->find($id);
        if (!$m) {
            return $this->json(['error' => 'Not found'], 404);
        }
        $data = json_decode($request->getContent(), true) ?? [];

        if (array_key_exists('firstName', $data)) $m->setFirstName((string)$data['firstName']);
        if (array_key_exists('lastName', $data)) $m->setLastName((string)$data['lastName']);
        if (array_key_exists('email', $data)) $m->setEmail($data['email']);
        if (array_key_exists('phone', $data)) $m->setPhone($data['phone']);
        if (array_key_exists('address', $data)) $m->setAddress($data['address']);

        if (array_key_exists('dateOfBirth', $data)) {
            $m->setDateOfBirth($data['dateOfBirth'] ? new \DateTime($data['dateOfBirth']) : null);
        }

        if (array_key_exists('position', $data)) {
            $m->setPosition($data['position']);
        } elseif (array_key_exists('role', $data)) {
            $m->setPosition((string)$data['role']);
        }

        if (array_key_exists('hourlyRate', $data)) $m->setHourlyRate($this->normalizeNumberForRate($data['hourlyRate']));
        if (array_key_exists('fixedRate', $data)) $m->setFixedRate($this->normalizeNumberForRate($data['fixedRate']));

        if (array_key_exists('isActive', $data)) {
            $m->setIsActive((bool)$data['isActive']);
        } elseif (array_key_exists('active', $data)) {
            $m->setIsActive((bool)$data['active']);
        }

        if (array_key_exists('emergencyContact', $data)) $m->setEmergencyContact($data['emergencyContact']);
        if (array_key_exists('emergencyPhone', $data)) $m->setEmergencyPhone($data['emergencyPhone']);
        if (array_key_exists('notes', $data)) $m->setNotes($data['notes']);

        $em->flush();
        return $this->json(['status' => 'updated']);
    }

    #[Route('/{id}', methods: ['DELETE'])]
    #[IsGranted('staff.delete')]
    public function delete(int $id, StaffMemberRepository $repo, EntityManagerInterface $em): JsonResponse
    {
        $m = $repo->find($id);
        if (!$m) {
            return $this->json(['error' => 'Not found'], 404);
        }
        $em->remove($m);
        $em->flush();
        return $this->json(['status' => 'deleted']);
    }


    private function normalizeNumberForRate(mixed $value): ?string
    {
        if ($value === null || $value === '') {
            return null;
        }
        if (is_numeric($value)) {
            return (string)$value;
        }
        return null;
    }
}
