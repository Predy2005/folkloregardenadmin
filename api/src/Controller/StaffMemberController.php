<?php

namespace App\Controller;

use App\Entity\StaffMember;
use App\Repository\StaffMemberRepository;
use App\Repository\EventStaffAssignmentRepository;
use App\Repository\StaffAttendanceRepository;
use App\Repository\EventRepository;
use App\Service\MobileAccountProvisioningService;
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
                'isGroup' => $m->isGroup(),
                'groupSize' => $m->getGroupSize(),
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

    #[Route('/bulk-update', methods: ['PUT', 'PATCH'])]
    #[IsGranted('ROLE_SUPER_ADMIN')]
    public function bulkUpdate(Request $request, StaffMemberRepository $repo, EntityManagerInterface $em): JsonResponse
    {
        $data = json_decode($request->getContent(), true) ?? [];
        $ids = $data['ids'] ?? [];
        $updates = $data['updates'] ?? [];
        if (!is_array($ids) || count($ids) === 0) {
            return $this->json(['error' => 'No IDs provided'], 400);
        }
        if (!is_array($updates) || count($updates) === 0) {
            return $this->json(['error' => 'No updates provided'], 400);
        }

        $allowedFields = ['isActive', 'position', 'hourlyRate', 'fixedRate'];
        $count = 0;
        foreach ($ids as $id) {
            $m = $repo->find((int)$id);
            if (!$m) { continue; }
            foreach ($updates as $field => $value) {
                if (!in_array($field, $allowedFields, true)) { continue; }
                match ($field) {
                    'isActive' => $m->setIsActive((bool)$value),
                    'position' => $m->setPosition((string)$value),
                    'hourlyRate' => $m->setHourlyRate((string)$value),
                    'fixedRate' => $m->setFixedRate((string)$value),
                };
            }
            $count++;
        }
        $em->flush();

        return $this->json(['status' => 'updated', 'count' => $count]);
    }

    #[Route('/bulk-delete', methods: ['DELETE'])]
    #[IsGranted('ROLE_SUPER_ADMIN')]
    public function bulkDelete(Request $request, StaffMemberRepository $repo, EntityManagerInterface $em): JsonResponse
    {
        $data = json_decode($request->getContent(), true) ?? [];
        $ids = $data['ids'] ?? [];
        if (!is_array($ids) || count($ids) === 0) {
            return $this->json(['error' => 'No IDs provided'], 400);
        }

        $count = 0;
        foreach ($ids as $id) {
            $m = $repo->find((int)$id);
            if ($m) {
                $em->remove($m);
                $count++;
            }
        }
        $em->flush();

        return $this->json(['status' => 'deleted', 'count' => $count]);
    }

    #[Route('/{id}', methods: ['GET'], requirements: ['id' => '\d+'])]
    #[IsGranted('staff.read')]
    public function show(int $id, StaffMemberRepository $repo): JsonResponse
    {
        $m = $repo->find($id);
        if (!$m) {
            return $this->json(['error' => 'Staff member not found'], 404);
        }

        return $this->json([
            'id' => $m->getId(),
            'firstName' => $m->getFirstName(),
            'lastName' => $m->getLastName(),
            'email' => $m->getEmail(),
            'phone' => $m->getPhone(),
            'address' => $m->getAddress(),
            'dateOfBirth' => $m->getDateOfBirth()?->format('Y-m-d'),
            'position' => $m->getPosition(),
            'hourlyRate' => $m->getHourlyRate(),
            'fixedRate' => $m->getFixedRate(),
            'isGroup' => $m->isGroup(),
            'groupSize' => $m->getGroupSize(),
            'isActive' => $m->isActive(),
            'emergencyContact' => $m->getEmergencyContact(),
            'emergencyPhone' => $m->getEmergencyPhone(),
            'notes' => $m->getNotes(),
            'createdAt' => $m->getCreatedAt()->format(DATE_ATOM),
            'updatedAt' => $m->getUpdatedAt()->format(DATE_ATOM),
        ]);
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
                    $m->setPosition($roleEntity->getName());
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
        if (array_key_exists('isGroup', $data)) {
            $m->setIsGroup((bool)$data['isGroup']);
        }
        if (array_key_exists('groupSize', $data)) {
            $m->setGroupSize($data['groupSize'] ? (int)$data['groupSize'] : null);
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
        if (array_key_exists('isGroup', $data)) $m->setIsGroup((bool)$data['isGroup']);
        if (array_key_exists('groupSize', $data)) $m->setGroupSize($data['groupSize'] ? (int)$data['groupSize'] : null);

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

    #[Route('/{id}/history', methods: ['GET'], requirements: ['id' => '\d+'])]
    #[IsGranted('staff.read')]
    public function history(int $id, StaffMemberRepository $repo, EventStaffAssignmentRepository $assignmentRepo, StaffAttendanceRepository $attendanceRepo, EventRepository $eventRepo): JsonResponse
    {
        $m = $repo->find($id);
        if (!$m) {
            return $this->json(['error' => 'Staff member not found'], 404);
        }

        // Get all event staff assignments for this member
        $assignments = $assignmentRepo->findBy(['staffMemberId' => $id]);
        $assignmentData = [];
        $totalEarned = 0;
        $totalUnpaid = 0;
        $totalHoursFromAssignments = 0;

        foreach ($assignments as $a) {
            $event = $a->getEvent();
            $eventName = $event ? $event->getName() : null;
            $eventDate = $event ? $event->getEventDate()->format('Y-m-d') : null;
            $amount = $a->getPaymentAmount() ? (float)$a->getPaymentAmount() : 0;
            $totalHoursFromAssignments += (float)$a->getHoursWorked();

            if ($a->getPaymentStatus() === 'PAID') {
                $totalEarned += $amount;
            } else {
                $totalUnpaid += $amount;
            }

            $assignmentData[] = [
                'id' => $a->getId(),
                'eventId' => $event?->getId(),
                'eventName' => $eventName,
                'eventDate' => $eventDate,
                'assignmentStatus' => $a->getAssignmentStatus(),
                'attendanceStatus' => $a->getAttendanceStatus(),
                'hoursWorked' => $a->getHoursWorked(),
                'paymentAmount' => $a->getPaymentAmount(),
                'paymentStatus' => $a->getPaymentStatus(),
                'notes' => $a->getNotes(),
                'assignedAt' => $a->getAssignedAt()->format(DATE_ATOM),
            ];
        }

        // Get all staff attendance records for this member
        $attendances = $attendanceRepo->findBy(['staffMember' => $id]);
        $attendanceData = [];
        $totalHoursFromAttendance = 0;

        foreach ($attendances as $att) {
            $hours = $att->getHoursWorked() ? (float)$att->getHoursWorked() : 0;
            $totalHoursFromAttendance += $hours;
            $attAmount = $att->getPaymentAmount() ? (float)$att->getPaymentAmount() : 0;
            if ($att->isPaid()) {
                $totalEarned += $attAmount;
            } else {
                $totalUnpaid += $attAmount;
            }

            $attendanceData[] = [
                'id' => $att->getId(),
                'staffMemberId' => $att->getStaffMember()->getId(),
                'staffMemberName' => $att->getStaffMember()->getFirstName() . ' ' . $att->getStaffMember()->getLastName(),
                'reservationId' => $att->getReservation()?->getId(),
                'eventId' => $att->getEventId(),
                'attendanceDate' => $att->getAttendanceDate()->format('Y-m-d'),
                'hoursWorked' => $att->getHoursWorked(),
                'notes' => $att->getNotes(),
                'isPaid' => $att->isPaid(),
                'paidAt' => $att->getPaidAt()?->format(DATE_ATOM),
                'paymentAmount' => $att->getPaymentAmount(),
                'paymentNote' => $att->getPaymentNote(),
                'createdAt' => $att->getCreatedAt()->format(DATE_ATOM),
            ];
        }

        return $this->json([
            'assignments' => $assignmentData,
            'attendances' => $attendanceData,
            'summary' => [
                'totalEvents' => count($assignmentData),
                'totalHours' => round($totalHoursFromAssignments + $totalHoursFromAttendance, 2),
                'totalEarned' => round($totalEarned, 2),
                'totalUnpaid' => round($totalUnpaid, 2),
            ],
        ]);
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

    // ─── Mobile account (PR #3) ────────────────────────────────────────

    #[Route('/{id}/mobile-account', methods: ['GET'])]
    #[IsGranted('staff.read')]
    public function getMobileAccount(
        int $id,
        StaffMemberRepository $repo,
        MobileAccountProvisioningService $provisioner
    ): JsonResponse {
        $staff = $repo->find($id);
        if (!$staff) {
            return $this->json(['error' => 'Not found'], 404);
        }
        $expected = MobileAccountProvisioningService::deriveMobileRoleFromPosition($staff->getPosition());
        return $this->json($provisioner->describe($staff->getUser(), $expected));
    }

    #[Route('/{id}/mobile-account', methods: ['POST'])]
    #[IsGranted('staff.update')]
    public function createMobileAccount(
        int $id,
        Request $request,
        StaffMemberRepository $repo,
        MobileAccountProvisioningService $provisioner
    ): JsonResponse {
        $staff = $repo->find($id);
        if (!$staff) {
            return $this->json(['error' => 'Not found'], 404);
        }
        $data = json_decode($request->getContent(), true) ?? [];
        // Role už neakceptujeme z body — odvozuje se z staff.position.
        $generatePassword = (bool)($data['generatePassword'] ?? true);
        $pin = isset($data['pin']) ? (string)$data['pin'] : null;
        $pinDeviceId = isset($data['pinDeviceId']) ? (string)$data['pinDeviceId'] : null;

        try {
            $result = $provisioner->provisionForStaffMember($staff, $generatePassword, $pin, $pinDeviceId);
        } catch (\InvalidArgumentException | \DomainException $e) {
            return $this->json(['error' => $e->getMessage()], 400);
        } catch (\RuntimeException $e) {
            return $this->json(['error' => $e->getMessage()], 500);
        }

        return $this->json([
            'status' => 'created',
            'userId' => $result['user']->getId(),
            'email' => $result['user']->getEmail(),
            'plainPassword' => $result['plainPassword'], // zobrazí se POUZE TEĎ
            'role' => $result['role'], // derivovaná z staff.position
        ], 201);
    }

    #[Route('/{id}/mobile-account/sync-role', methods: ['POST'])]
    #[IsGranted('staff.update')]
    public function syncMobileRole(
        int $id,
        StaffMemberRepository $repo,
        MobileAccountProvisioningService $provisioner
    ): JsonResponse {
        $staff = $repo->find($id);
        if (!$staff || !$staff->getUser()) {
            return $this->json(['error' => 'Staff member nemá mobilní účet.'], 404);
        }
        try {
            $newRole = $provisioner->syncRoleWithPosition($staff);
        } catch (\DomainException $e) {
            return $this->json(['error' => $e->getMessage()], 400);
        }
        return $this->json(['status' => 'synced', 'role' => $newRole]);
    }

    #[Route('/{id}/mobile-account/password', methods: ['PUT'])]
    #[IsGranted('staff.update')]
    public function resetMobilePassword(
        int $id,
        StaffMemberRepository $repo,
        MobileAccountProvisioningService $provisioner
    ): JsonResponse {
        $staff = $repo->find($id);
        if (!$staff || !$staff->getUser()) {
            return $this->json(['error' => 'Staff member nemá mobilní účet.'], 404);
        }
        $plain = $provisioner->resetPassword($staff->getUser());
        return $this->json(['status' => 'reset', 'plainPassword' => $plain]);
    }

    #[Route('/{id}/mobile-account/pin', methods: ['PUT'])]
    #[IsGranted('staff.update')]
    public function setMobilePin(
        int $id,
        Request $request,
        StaffMemberRepository $repo,
        MobileAccountProvisioningService $provisioner
    ): JsonResponse {
        $staff = $repo->find($id);
        if (!$staff || !$staff->getUser()) {
            return $this->json(['error' => 'Staff member nemá mobilní účet.'], 404);
        }
        $data = json_decode($request->getContent(), true) ?? [];
        $pin = isset($data['pin']) ? (string)$data['pin'] : '';
        $deviceId = isset($data['deviceId']) ? (string)$data['deviceId'] : null;
        try {
            $provisioner->setPin($staff->getUser(), $pin, $deviceId);
        } catch (\InvalidArgumentException $e) {
            return $this->json(['error' => $e->getMessage()], 400);
        }
        return $this->json(['status' => 'pin_set']);
    }

    #[Route('/{id}/mobile-account/pin', methods: ['DELETE'])]
    #[IsGranted('staff.update')]
    public function disableMobilePin(
        int $id,
        StaffMemberRepository $repo,
        MobileAccountProvisioningService $provisioner
    ): JsonResponse {
        $staff = $repo->find($id);
        if (!$staff || !$staff->getUser()) {
            return $this->json(['error' => 'Staff member nemá mobilní účet.'], 404);
        }
        $provisioner->disablePin($staff->getUser());
        return $this->json(['status' => 'pin_disabled']);
    }

    #[Route('/{id}/mobile-account', methods: ['DELETE'])]
    #[IsGranted('staff.update')]
    public function revokeMobileAccount(
        int $id,
        StaffMemberRepository $repo,
        MobileAccountProvisioningService $provisioner
    ): JsonResponse {
        $staff = $repo->find($id);
        if (!$staff || !$staff->getUser()) {
            return $this->json(['error' => 'Staff member nemá mobilní účet.'], 404);
        }
        try {
            $provisioner->revoke($staff->getUser());
        } catch (\DomainException $e) {
            return $this->json(['error' => $e->getMessage()], 400);
        }
        return $this->json(['status' => 'revoked']);
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
