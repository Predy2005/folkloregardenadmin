<?php

namespace App\Controller;

use App\Entity\StaffAttendance;
use App\Repository\StaffAttendanceRepository;
use App\Repository\StaffMemberRepository;
use App\Repository\ReservationRepository;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Annotation\Route;
use Symfony\Component\Security\Http\Attribute\IsGranted;

#[Route('/api/staff-attendance')]
class StaffAttendanceController extends AbstractController
{
    #[Route('', methods: ['GET'])]
    #[IsGranted('staff_attendance.read')]
    public function list(Request $request, StaffAttendanceRepository $repo): JsonResponse
    {
        $criteria = [];
        if ($request->query->has('staffMemberId')) {
            $criteria['staffMember'] = (int)$request->query->get('staffMemberId');
        }
        if ($request->query->has('reservationId')) {
            $criteria['reservation'] = (int)$request->query->get('reservationId');
        }
        $items = $criteria ? $repo->findBy($criteria) : $repo->findAll();
        $data = array_map(function(StaffAttendance $a){
            return [
                'id' => $a->getId(),
                'staffMemberId' => $a->getStaffMember()->getId(),
                'reservationId' => $a->getReservation()?->getId(),
                'attendanceDate' => $a->getAttendanceDate()->format('Y-m-d'),
                'checkInTime' => $a->getCheckInTime()?->format(DATE_ATOM),
                'checkOutTime' => $a->getCheckOutTime()?->format(DATE_ATOM),
                'hoursWorked' => $a->getHoursWorked(),
                'notes' => $a->getNotes(),
                'createdAt' => $a->getCreatedAt()->format(DATE_ATOM),
            ];
        }, $items);
        return $this->json($data);
    }

    #[Route('', methods: ['POST'])]
    #[IsGranted('staff_attendance.create')]
    public function create(Request $request, StaffMemberRepository $memberRepo, ReservationRepository $reservationRepo, EntityManagerInterface $em): JsonResponse
    {
        $data = json_decode($request->getContent(), true) ?? [];
        $member = $memberRepo->find((int)($data['staffMemberId'] ?? 0));
        if (!$member) { return $this->json(['error' => 'Staff member not found'], 404); }
        $reservation = null;
        if (!empty($data['reservationId'])) {
            $reservation = $reservationRepo->find((int)$data['reservationId']);
            if (!$reservation) { return $this->json(['error' => 'Reservation not found'], 404); }
        }
        $a = new StaffAttendance();
        $a->setStaffMember($member);
        $a->setReservation($reservation);
        if (!empty($data['attendanceDate'])) $a->setAttendanceDate(new \DateTime($data['attendanceDate']));
        if (!empty($data['checkInTime'])) $a->setCheckInTime(new \DateTime($data['checkInTime']));
        if (!empty($data['checkOutTime'])) $a->setCheckOutTime(new \DateTime($data['checkOutTime']));
        if (isset($data['notes'])) $a->setNotes($data['notes']);
        $this->maybeComputeHours($a);
        if (array_key_exists('hoursWorked', $data) && $data['hoursWorked'] !== null) {
            $a->setHoursWorked((string)$data['hoursWorked']);
        }
        $em->persist($a);
        $em->flush();
        return $this->json(['status' => 'created', 'id' => $a->getId()], 201);
    }

    #[Route('/{id}', methods: ['PUT','PATCH'])]
    #[IsGranted('staff_attendance.update')]
    public function update(int $id, Request $request, StaffAttendanceRepository $repo, StaffMemberRepository $memberRepo, ReservationRepository $reservationRepo, EntityManagerInterface $em): JsonResponse
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
            $reservation = $data['reservationId'] ? $reservationRepo->find((int)$data['reservationId']) : null;
            if ($data['reservationId'] && !$reservation) { return $this->json(['error' => 'Reservation not found'], 404); }
            $a->setReservation($reservation);
        }
        if (array_key_exists('attendanceDate', $data)) $a->setAttendanceDate(new \DateTime($data['attendanceDate']));
        if (array_key_exists('checkInTime', $data)) $a->setCheckInTime($data['checkInTime'] ? new \DateTime($data['checkInTime']) : null);
        if (array_key_exists('checkOutTime', $data)) $a->setCheckOutTime($data['checkOutTime'] ? new \DateTime($data['checkOutTime']) : null);
        if (array_key_exists('notes', $data)) $a->setNotes($data['notes']);
        $this->maybeComputeHours($a);
        if (array_key_exists('hoursWorked', $data)) $a->setHoursWorked(isset($data['hoursWorked']) ? (string)$data['hoursWorked'] : null);
        $em->flush();
        return $this->json(['status' => 'updated']);
    }

    #[Route('/{id}', methods: ['DELETE'])]
    #[IsGranted('staff_attendance.update')]
    public function delete(int $id, StaffAttendanceRepository $repo, EntityManagerInterface $em): JsonResponse
    {
        $a = $repo->find($id);
        if (!$a) { return $this->json(['error' => 'Not found'], 404); }
        $em->remove($a);
        $em->flush();
        return $this->json(['status' => 'deleted']);
    }

    private function maybeComputeHours(StaffAttendance $a): void
    {
        $in = $a->getCheckInTime();
        $out = $a->getCheckOutTime();
        if ($in && $out) {
            $diff = $out->getTimestamp() - $in->getTimestamp();
            if ($diff > 0) {
                $hours = round($diff / 3600, 2);
                $a->setHoursWorked(number_format($hours, 2, '.', ''));
            }
        }
    }
}
