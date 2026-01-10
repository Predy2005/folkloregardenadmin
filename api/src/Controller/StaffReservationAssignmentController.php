<?php

namespace App\Controller;

use App\Entity\StaffReservationAssignment;
use App\Repository\StaffReservationAssignmentRepository;
use App\Repository\StaffMemberRepository;
use App\Repository\ReservationRepository;
use App\Repository\StaffRoleRepository;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Annotation\Route;

#[Route('/api/staff-assignments')]
class StaffReservationAssignmentController extends AbstractController
{
    #[Route('', methods: ['GET'])]
    public function list(Request $request, StaffReservationAssignmentRepository $repo): JsonResponse
    {
        $criteria = [];
        if ($request->query->has('reservationId')) {
            $criteria['reservation'] = (int)$request->query->get('reservationId');
        }
        if ($request->query->has('staffMemberId')) {
            $criteria['staffMember'] = (int)$request->query->get('staffMemberId');
        }
        $items = $criteria ? $repo->findBy($criteria) : $repo->findAll();
        $data = array_map(function(StaffReservationAssignment $a){
            return [
                'id' => $a->getId(),
                'staffMemberId' => $a->getStaffMember()->getId(),
                'reservationId' => $a->getReservation()->getId(),
                'staffRoleId' => $a->getStaffRole()?->getId(),
                'assignmentStatus' => $a->getAssignmentStatus(),
                'attendanceStatus' => $a->getAttendanceStatus(),
                'hoursWorked' => $a->getHoursWorked(),
                'paymentAmount' => $a->getPaymentAmount(),
                'paymentStatus' => $a->getPaymentStatus(),
                'notes' => $a->getNotes(),
                'assignedAt' => $a->getAssignedAt()->format(DATE_ATOM),
                'confirmedAt' => $a->getConfirmedAt()?->format(DATE_ATOM),
                'attendedAt' => $a->getAttendedAt()?->format(DATE_ATOM),
            ];
        }, $items);
        return $this->json($data);
    }

    #[Route('', methods: ['POST'])]
    public function create(Request $request, StaffMemberRepository $memberRepo, ReservationRepository $reservationRepo, StaffRoleRepository $roleRepo, EntityManagerInterface $em): JsonResponse
    {
        $data = json_decode($request->getContent(), true) ?? [];
        $member = $memberRepo->find((int)($data['staffMemberId'] ?? 0));
        if (!$member) { return $this->json(['error' => 'Staff member not found'], 404); }
        $reservation = $reservationRepo->find((int)($data['reservationId'] ?? 0));
        if (!$reservation) { return $this->json(['error' => 'Reservation not found'], 404); }
        $role = null;
        if (!empty($data['staffRoleId'])) {
            $role = $roleRepo->find((int)$data['staffRoleId']);
            if (!$role) { return $this->json(['error' => 'Staff role not found'], 404); }
        }
        $a = new StaffReservationAssignment();
        $a->setStaffMember($member);
        $a->setReservation($reservation);
        $a->setStaffRole($role);
        if (isset($data['assignmentStatus'])) $a->setAssignmentStatus((string)$data['assignmentStatus']);
        if (isset($data['attendanceStatus'])) $a->setAttendanceStatus((string)$data['attendanceStatus']);
        if (isset($data['hoursWorked'])) $a->setHoursWorked((string)$data['hoursWorked']);
        if (isset($data['paymentAmount'])) $a->setPaymentAmount((string)$data['paymentAmount']);
        if (isset($data['paymentStatus'])) $a->setPaymentStatus((string)$data['paymentStatus']);
        if (isset($data['notes'])) $a->setNotes($data['notes']);
        if (!empty($data['assignedAt'])) $a->setAssignedAt(new \DateTime($data['assignedAt']));
        if (!empty($data['confirmedAt'])) $a->setConfirmedAt(new \DateTime($data['confirmedAt']));
        if (!empty($data['attendedAt'])) $a->setAttendedAt(new \DateTime($data['attendedAt']));
        $em->persist($a);
        $em->flush();
        return $this->json(['status' => 'created', 'id' => $a->getId()], 201);
    }

    #[Route('/{id}', methods: ['PUT','PATCH'])]
    public function update(int $id, Request $request, StaffReservationAssignmentRepository $repo, StaffMemberRepository $memberRepo, ReservationRepository $reservationRepo, StaffRoleRepository $roleRepo, EntityManagerInterface $em): JsonResponse
    {
        $a = $repo->find($id);
        if (!$a) { return $this->json(['error' => 'Not found'], 404); }
        $data = json_decode($request->getContent(), true) ?? [];
        if (array_key_exists('staffMemberId', $data)) {
            $member = $memberRepo->find((int)$data['staffMemberId']);
            if (!$member) { return $this->json(['error' => 'Staff member not found'], 404); }
            $a->setStaffMember($member);
        }
        if (array_key_exists('reservationId', $data)) {
            $reservation = $reservationRepo->find((int)$data['reservationId']);
            if (!$reservation) { return $this->json(['error' => 'Reservation not found'], 404); }
            $a->setReservation($reservation);
        }
        if (array_key_exists('staffRoleId', $data)) {
            $role = $data['staffRoleId'] ? $roleRepo->find((int)$data['staffRoleId']) : null;
            if ($data['staffRoleId'] && !$role) { return $this->json(['error' => 'Staff role not found'], 404); }
            $a->setStaffRole($role);
        }
        if (array_key_exists('assignmentStatus', $data)) $a->setAssignmentStatus((string)$data['assignmentStatus']);
        if (array_key_exists('attendanceStatus', $data)) $a->setAttendanceStatus((string)$data['attendanceStatus']);
        if (array_key_exists('hoursWorked', $data)) $a->setHoursWorked((string)$data['hoursWorked']);
        if (array_key_exists('paymentAmount', $data)) $a->setPaymentAmount(isset($data['paymentAmount']) ? (string)$data['paymentAmount'] : null);
        if (array_key_exists('paymentStatus', $data)) $a->setPaymentStatus((string)$data['paymentStatus']);
        if (array_key_exists('notes', $data)) $a->setNotes($data['notes']);
        if (array_key_exists('assignedAt', $data)) $a->setAssignedAt(new \DateTime($data['assignedAt']));
        if (array_key_exists('confirmedAt', $data)) $a->setConfirmedAt($data['confirmedAt'] ? new \DateTime($data['confirmedAt']) : null);
        if (array_key_exists('attendedAt', $data)) $a->setAttendedAt($data['attendedAt'] ? new \DateTime($data['attendedAt']) : null);
        $em->flush();
        return $this->json(['status' => 'updated']);
    }

    #[Route('/{id}', methods: ['DELETE'])]
    public function delete(int $id, StaffReservationAssignmentRepository $repo, EntityManagerInterface $em): JsonResponse
    {
        $a = $repo->find($id);
        if (!$a) { return $this->json(['error' => 'Not found'], 404); }
        $em->remove($a);
        $em->flush();
        return $this->json(['status' => 'deleted']);
    }
}
