<?php

namespace App\Controller;

use App\Entity\User;
use App\Repository\EventRepository;
use App\Service\StaffRequirementService;
use App\Service\CashboxService;
use App\Service\Push\PushNotificationService;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Annotation\Route;
use Symfony\Component\Security\Http\Attribute\IsGranted;

#[Route('/api/events')]
class EventStaffController extends AbstractController
{
    // Mapování backend event types na frontend formát
    private const EVENT_TYPE_TO_FRONTEND = [
        'FOLKLORE_SHOW' => 'folklorni_show',
        'WEDDING' => 'svatba',
        'CORPORATE' => 'event',
        'PRIVATE_EVENT' => 'privat',
        'folklorni_show' => 'folklorni_show',
        'svatba' => 'svatba',
        'event' => 'event',
        'privat' => 'privat',
    ];

    public function __construct(
        private readonly EntityManagerInterface $em,
        private readonly StaffRequirementService $staffRequirementService,
        private readonly CashboxService $cashboxService,
        private readonly PushNotificationService $push,
    ) {
    }

    private function normalizeEventTypeForFrontend(?string $eventType): ?string
    {
        if ($eventType === null) {
            return null;
        }
        return self::EVENT_TYPE_TO_FRONTEND[$eventType] ?? $eventType;
    }

    // ========================================================================
    // STAFF REQUIREMENTS ENDPOINTS
    // ========================================================================

    /**
     * Get staff requirements for an event
     */
    #[Route('/{id}/staff-requirements', name: 'event_staff_requirements_get', methods: ['GET'])]
    #[IsGranted('events.read')]
    public function getStaffRequirements(int $id, EventRepository $eventRepository): JsonResponse
    {
        $event = $eventRepository->find($id);
        if (!$event) {
            return $this->json(['error' => 'Event not found'], 404);
        }

        $requirements = $this->staffRequirementService->getRequirements($event);

        return $this->json([
            'eventId' => $id,
            'guestCount' => $event->getGuestsTotal(),
            'requirements' => $requirements,
        ]);
    }

    /**
     * Recalculate staff requirements based on formulas
     */
    #[Route('/{id}/staff-requirements/recalculate', name: 'event_staff_requirements_recalculate', methods: ['POST'])]
    #[IsGranted('events.update')]
    public function recalculateStaffRequirements(int $id, Request $request, EventRepository $eventRepository): JsonResponse
    {
        $event = $eventRepository->find($id);
        if (!$event) {
            return $this->json(['error' => 'Event not found'], 404);
        }

        $data = json_decode($request->getContent(), true);
        $forceOverwrite = $data['forceOverwrite'] ?? false;

        try {
            $calculatedRequirements = $this->staffRequirementService->recalculateRequirements($event, $forceOverwrite);
            $requirements = $this->staffRequirementService->getRequirements($event);

            return $this->json([
                'success' => true,
                'message' => 'Staff requirements recalculated',
                'eventId' => $id,
                'eventType' => $this->normalizeEventTypeForFrontend($event->getEventType()),
                'guestCount' => $event->getGuestsTotal(),
                'calculatedCount' => count($calculatedRequirements),
                'requirements' => $requirements,
            ]);
        } catch (\Exception $e) {
            return $this->json([
                'error' => 'Failed to recalculate requirements',
                'message' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ], 500);
        }
    }

    /**
     * Update a specific staff requirement manually
     */
    #[Route('/{id}/staff-requirements/{category}', name: 'event_staff_requirement_update', methods: ['PUT'])]
    #[IsGranted('events.update')]
    public function updateStaffRequirement(int $id, string $category, Request $request, EventRepository $eventRepository): JsonResponse
    {
        $event = $eventRepository->find($id);
        if (!$event) {
            return $this->json(['error' => 'Event not found'], 404);
        }

        $data = json_decode($request->getContent(), true);
        $count = $data['required'] ?? $data['count'] ?? null;

        if ($count === null || !is_numeric($count)) {
            return $this->json(['error' => 'Required count is required'], 400);
        }

        try {
            $requirement = $this->staffRequirementService->updateRequirement($event, $category, (int) $count);

            return $this->json([
                'success' => true,
                'requirement' => [
                    'id' => $requirement->getId(),
                    'category' => $requirement->getCategory(),
                    'required' => $requirement->getRequiredCount(),
                    'isManualOverride' => $requirement->isManualOverride(),
                ],
            ]);
        } catch (\Exception $e) {
            return $this->json([
                'error' => 'Failed to update requirement',
                'message' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Reset a category to auto-calculated value
     */
    #[Route('/{id}/staff-requirements/{category}/reset', name: 'event_staff_requirement_reset', methods: ['POST'])]
    #[IsGranted('events.update')]
    public function resetStaffRequirement(int $id, string $category, EventRepository $eventRepository): JsonResponse
    {
        $event = $eventRepository->find($id);
        if (!$event) {
            return $this->json(['error' => 'Event not found'], 404);
        }

        try {
            $requirement = $this->staffRequirementService->resetToAutoCalculated($event, $category);

            if (!$requirement) {
                return $this->json(['error' => 'Requirement not found'], 404);
            }

            return $this->json([
                'success' => true,
                'requirement' => [
                    'id' => $requirement->getId(),
                    'category' => $requirement->getCategory(),
                    'required' => $requirement->getRequiredCount(),
                    'isManualOverride' => $requirement->isManualOverride(),
                ],
            ]);
        } catch (\Exception $e) {
            return $this->json([
                'error' => 'Failed to reset requirement',
                'message' => $e->getMessage(),
            ], 500);
        }
    }

    // ========================================================================
    // STAFF ASSIGNMENTS ENDPOINTS
    // ========================================================================

    /**
     * Mark all staff assignments as present (quick check-in)
     */
    #[Route('/{id}/staff-assignments/mark-all-present', name: 'event_staff_mark_all_present', methods: ['POST'])]
    #[IsGranted('events.update')]
    public function markAllStaffPresent(int $id, EventRepository $eventRepository): JsonResponse
    {
        $event = $eventRepository->find($id);
        if (!$event) {
            return $this->json(['error' => 'Event not found'], 404);
        }

        $updatedCount = 0;
        foreach ($event->getStaffAssignments() as $assignment) {
            if ($assignment->getAttendanceStatus() !== 'PRESENT') {
                $assignment->setAttendanceStatus('PRESENT');
                $updatedCount++;
            }
        }

        $this->em->flush();

        return $this->json([
            'status' => 'success',
            'updatedCount' => $updatedCount,
            'totalAssignments' => count($event->getStaffAssignments())
        ]);
    }

    /**
     * Fix staff assignments without roles (assign role based on staff member's position)
     */
    #[Route('/{id}/staff-assignments/fix-roles', name: 'event_staff_fix_roles', methods: ['POST'])]
    #[IsGranted('events.update')]
    public function fixStaffRoles(int $id, EventRepository $eventRepository): JsonResponse
    {
        $event = $eventRepository->find($id);
        if (!$event) {
            return $this->json(['error' => 'Event not found'], 404);
        }

        $staffRoleRepo = $this->em->getRepository(\App\Entity\StaffRole::class);
        $staffMemberRepo = $this->em->getRepository(\App\Entity\StaffMember::class);

        $fixedCount = 0;
        foreach ($event->getStaffAssignments() as $assignment) {
            if ($assignment->getStaffRoleId() === null) {
                $staffMember = $staffMemberRepo->find($assignment->getStaffMemberId());
                if ($staffMember && $staffMember->getPosition()) {
                    $role = $staffRoleRepo->findOneBy(['name' => $staffMember->getPosition()]);
                    if ($role) {
                        $assignment->setStaffRoleId($role->getId());
                        $fixedCount++;
                    }
                }
            }
        }

        $this->em->flush();

        return $this->json([
            'status' => 'success',
            'fixedCount' => $fixedCount,
            'totalAssignments' => count($event->getStaffAssignments())
        ]);
    }

    /**
     * Update individual staff assignment attendance status
     */
    #[Route('/{id}/staff-assignments/{assignmentId}/attendance', name: 'event_staff_update_attendance', methods: ['PUT'])]
    #[IsGranted('events.update')]
    public function updateStaffAttendance(int $id, int $assignmentId, Request $request, EventRepository $eventRepository): JsonResponse
    {
        $event = $eventRepository->find($id);
        if (!$event) {
            return $this->json(['error' => 'Event not found'], 404);
        }

        $data = json_decode($request->getContent(), true) ?? [];
        $status = $data['status'] ?? null;

        // Valid statuses
        $validStatuses = ['UNKNOWN', 'CONFIRMED', 'PRESENT', 'ABSENT', 'LEFT_EARLY'];
        if (!in_array($status, $validStatuses)) {
            return $this->json(['error' => 'Invalid status. Must be one of: ' . implode(', ', $validStatuses)], 400);
        }

        // Find the assignment
        $assignment = null;
        foreach ($event->getStaffAssignments() as $a) {
            if ($a->getId() === $assignmentId) {
                $assignment = $a;
                break;
            }
        }

        if (!$assignment) {
            return $this->json(['error' => 'Assignment not found'], 404);
        }

        $assignment->setAttendanceStatus($status);
        $this->em->flush();

        return $this->json([
            'status' => 'success',
            'assignmentId' => $assignmentId,
            'attendanceStatus' => $status,
        ]);
    }

    /**
     * Update presence count for a staff role
     */
    #[Route('/{id}/staff-assignments/role/{role}/presence', name: 'event_staff_role_presence', methods: ['PUT'])]
    #[IsGranted('events.update')]
    public function updateStaffRolePresence(int $id, string $role, Request $request, EventRepository $eventRepository): JsonResponse
    {
        $event = $eventRepository->find($id);
        if (!$event) {
            return $this->json(['error' => 'Event not found'], 404);
        }

        $data = json_decode($request->getContent(), true) ?? [];
        $presentCount = (int) ($data['presentCount'] ?? 0);

        // Get all assignments for this role
        $staffRoleRepo = $this->em->getRepository(\App\Entity\StaffRole::class);
        $staffMemberRepo = $this->em->getRepository(\App\Entity\StaffMember::class);

        $assignments = [];
        foreach ($event->getStaffAssignments() as $assignment) {
            $assignmentRole = null;

            // Get role from StaffRole entity
            if ($assignment->getStaffRoleId()) {
                $staffRole = $staffRoleRepo->find($assignment->getStaffRoleId());
                if ($staffRole) {
                    $assignmentRole = $staffRole->getName();
                }
            }

            // Fallback to staff member's position
            if (!$assignmentRole && $assignment->getStaffMemberId()) {
                $member = $staffMemberRepo->find($assignment->getStaffMemberId());
                if ($member) {
                    $assignmentRole = $member->getPosition();
                }
            }

            if ($assignmentRole === $role) {
                $assignments[] = $assignment;
            }
        }

        if (empty($assignments)) {
            return $this->json(['error' => 'No assignments found for this role'], 404);
        }

        // Validate count
        $maxCount = count($assignments);
        $presentCount = max(0, min($presentCount, $maxCount));

        // Update presence - first N are PRESENT, rest are CONFIRMED
        $updatedCount = 0;
        foreach ($assignments as $index => $assignment) {
            $shouldBePresent = $index < $presentCount;
            $newStatus = $shouldBePresent ? 'PRESENT' : 'CONFIRMED';

            if ($assignment->getAttendanceStatus() !== $newStatus) {
                $assignment->setAttendanceStatus($newStatus);
                $updatedCount++;
            }
        }

        $this->em->flush();

        return $this->json([
            'status' => 'success',
            'role' => $role,
            'presentCount' => $presentCount,
            'totalCount' => $maxCount,
            'updatedCount' => $updatedCount,
        ]);
    }

    #[Route('/{id}/staff-assignments', name: 'event_staff_assignments_list', methods: ['GET'])]
    #[IsGranted('events.read')]
    public function listStaffAssignments(int $id, EventRepository $eventRepository): JsonResponse
    {
        $event = $eventRepository->find($id);
        if (!$event) {
            return $this->json(['error' => 'Not found'], 404);
        }

        $staffMemberRepo = $this->em->getRepository(\App\Entity\StaffMember::class);
        $staffRoleRepo = $this->em->getRepository(\App\Entity\StaffRole::class);

        $assignments = [];
        foreach ($event->getStaffAssignments() as $a) {
            $staffMember = $staffMemberRepo->find($a->getStaffMemberId());
            $staffRole = $a->getStaffRoleId() ? $staffRoleRepo->find($a->getStaffRoleId()) : null;

            $assignments[] = [
                'id' => $a->getId(),
                'staffMemberId' => $a->getStaffMemberId(),
                'staffRoleId' => $a->getStaffRoleId(),
                'assignmentStatus' => $a->getAssignmentStatus(),
                'attendanceStatus' => $a->getAttendanceStatus(),
                'hoursWorked' => (float) $a->getHoursWorked(),
                'paymentAmount' => $a->getPaymentAmount() !== null ? (float) $a->getPaymentAmount() : null,
                'paymentStatus' => $a->getPaymentStatus(),
                'notes' => $a->getNotes(),
                'staffMember' => $staffMember ? [
                    'id' => $staffMember->getId(),
                    'firstName' => $staffMember->getFirstName(),
                    'lastName' => $staffMember->getLastName(),
                    'position' => $staffMember->getPosition(),
                    'phone' => $staffMember->getPhone(),
                    'email' => $staffMember->getEmail(),
                    'hourlyRate' => $staffMember->getHourlyRate(),
                ] : null,
                'role' => $staffRole?->getName(),
            ];
        }

        return $this->json($assignments);
    }

    #[Route('/{id}/staff-assignments', name: 'event_staff_assignment_create', methods: ['POST'])]
    #[IsGranted('events.update')]
    public function createStaffAssignment(int $id, Request $request, EventRepository $eventRepository): JsonResponse
    {
        $event = $eventRepository->find($id);
        if (!$event) {
            return $this->json(['error' => 'Event not found'], 404);
        }

        $data = json_decode($request->getContent(), true) ?? [];

        if (empty($data['staffMemberId'])) {
            return $this->json(['error' => 'staffMemberId is required'], 400);
        }

        $staffMemberRepo = $this->em->getRepository(\App\Entity\StaffMember::class);
        $staffRoleRepo = $this->em->getRepository(\App\Entity\StaffRole::class);

        $staffMember = $staffMemberRepo->find($data['staffMemberId']);

        // Auto-detect role from staff member's position if not provided
        $staffRoleId = $data['staffRoleId'] ?? null;
        if (!$staffRoleId && $staffMember && $staffMember->getPosition()) {
            // Look up the role by position name
            $role = $staffRoleRepo->findOneBy(['name' => $staffMember->getPosition()]);
            if ($role) {
                $staffRoleId = $role->getId();
            }
        }

        $assignment = new \App\Entity\EventStaffAssignment();
        $assignment->setEvent($event);
        $assignment->setStaffMemberId($data['staffMemberId']);
        $assignment->setStaffRoleId($staffRoleId);
        $assignment->setAssignmentStatus($data['assignmentStatus'] ?? 'ASSIGNED');
        $assignment->setAttendanceStatus($data['attendanceStatus'] ?? 'PENDING');
        $assignment->setHoursWorked((string) ($data['hoursWorked'] ?? '0'));
        $paymentAmount = $data['paymentAmount'] ?? null;
        $assignment->setPaymentAmount($paymentAmount !== null ? (string) $paymentAmount : null);
        $assignment->setPaymentStatus($data['paymentStatus'] ?? 'PENDING');
        $assignment->setNotes($data['notes'] ?? null);

        $this->em->persist($assignment);
        $this->em->flush();

        $staffRole = $staffRoleId ? $staffRoleRepo->find($staffRoleId) : null;

        // Push notifikace — pokud má staff připojený mobilní účet
        if ($staffMember && ($linkedUser = $staffMember->getUser()) !== null) {
            try {
                $roleHint = match (strtoupper($staffMember->getPosition() ?? '')) {
                    'WAITER', 'CISNIK' => 'WAITER',
                    'COOK', 'KUCHAR' => 'COOK',
                    default => null,
                };
                $this->push->notifyStaffAssignedToEvent($linkedUser, $event, $roleHint);
            } catch (\Throwable) {
                // Push nesmí zabít kritickou operaci — ticho spolknout
            }
        }

        return $this->json([
            'id' => $assignment->getId(),
            'staffMemberId' => $assignment->getStaffMemberId(),
            'staffRoleId' => $assignment->getStaffRoleId(),
            'assignmentStatus' => $assignment->getAssignmentStatus(),
            'attendanceStatus' => $assignment->getAttendanceStatus(),
            'hoursWorked' => (float) $assignment->getHoursWorked(),
            'paymentAmount' => $assignment->getPaymentAmount() !== null ? (float) $assignment->getPaymentAmount() : null,
            'paymentStatus' => $assignment->getPaymentStatus(),
            'notes' => $assignment->getNotes(),
            'staffMember' => $staffMember ? [
                'id' => $staffMember->getId(),
                'firstName' => $staffMember->getFirstName(),
                'lastName' => $staffMember->getLastName(),
                'position' => $staffMember->getPosition(),
                'phone' => $staffMember->getPhone(),
                'email' => $staffMember->getEmail(),
                'hourlyRate' => $staffMember->getHourlyRate(),
            ] : null,
            'role' => $staffRole?->getName(),
        ], 201);
    }

    #[Route('/{id}/staff-assignments/{assignmentId}', name: 'event_staff_assignment_update', methods: ['PUT'])]
    #[IsGranted('events.update')]
    public function updateStaffAssignment(int $id, int $assignmentId, Request $request, EventRepository $eventRepository): JsonResponse
    {
        $event = $eventRepository->find($id);
        if (!$event) {
            return $this->json(['error' => 'Event not found'], 404);
        }

        $assignment = $this->em->getRepository(\App\Entity\EventStaffAssignment::class)->find($assignmentId);
        if (!$assignment || $assignment->getEvent()->getId() !== $id) {
            return $this->json(['error' => 'Staff assignment not found'], 404);
        }

        $data = json_decode($request->getContent(), true) ?? [];

        if (isset($data['staffMemberId'])) $assignment->setStaffMemberId($data['staffMemberId']);
        if (array_key_exists('staffRoleId', $data)) $assignment->setStaffRoleId($data['staffRoleId']);
        if (isset($data['assignmentStatus'])) $assignment->setAssignmentStatus($data['assignmentStatus']);
        if (isset($data['attendanceStatus'])) $assignment->setAttendanceStatus($data['attendanceStatus']);
        if (isset($data['hoursWorked'])) $assignment->setHoursWorked((string) $data['hoursWorked']);
        if (array_key_exists('paymentAmount', $data)) {
            $assignment->setPaymentAmount($data['paymentAmount'] !== null ? (string) $data['paymentAmount'] : null);
        }
        if (isset($data['paymentStatus'])) $assignment->setPaymentStatus($data['paymentStatus']);
        if (array_key_exists('notes', $data)) $assignment->setNotes($data['notes']);

        $this->em->flush();

        $staffMemberRepo = $this->em->getRepository(\App\Entity\StaffMember::class);
        $staffRoleRepo = $this->em->getRepository(\App\Entity\StaffRole::class);

        $staffMember = $staffMemberRepo->find($assignment->getStaffMemberId());
        $staffRole = $assignment->getStaffRoleId() ? $staffRoleRepo->find($assignment->getStaffRoleId()) : null;

        return $this->json([
            'id' => $assignment->getId(),
            'staffMemberId' => $assignment->getStaffMemberId(),
            'staffRoleId' => $assignment->getStaffRoleId(),
            'assignmentStatus' => $assignment->getAssignmentStatus(),
            'attendanceStatus' => $assignment->getAttendanceStatus(),
            'hoursWorked' => (float) $assignment->getHoursWorked(),
            'paymentAmount' => $assignment->getPaymentAmount() !== null ? (float) $assignment->getPaymentAmount() : null,
            'paymentStatus' => $assignment->getPaymentStatus(),
            'notes' => $assignment->getNotes(),
            'staffMember' => $staffMember ? [
                'id' => $staffMember->getId(),
                'firstName' => $staffMember->getFirstName(),
                'lastName' => $staffMember->getLastName(),
                'position' => $staffMember->getPosition(),
                'phone' => $staffMember->getPhone(),
                'email' => $staffMember->getEmail(),
                'hourlyRate' => $staffMember->getHourlyRate(),
            ] : null,
            'role' => $staffRole?->getName(),
        ]);
    }

    #[Route('/{id}/staff-assignments/{assignmentId}', name: 'event_staff_assignment_delete', methods: ['DELETE'])]
    #[IsGranted('events.update')]
    public function deleteStaffAssignment(int $id, int $assignmentId, EventRepository $eventRepository): JsonResponse
    {
        $event = $eventRepository->find($id);
        if (!$event) {
            return $this->json(['error' => 'Event not found'], 404);
        }

        $assignment = $this->em->getRepository(\App\Entity\EventStaffAssignment::class)->find($assignmentId);
        if (!$assignment || $assignment->getEvent()->getId() !== $id) {
            return $this->json(['error' => 'Staff assignment not found'], 404);
        }

        $this->em->remove($assignment);
        $this->em->flush();

        return $this->json(['status' => 'deleted']);
    }

    // ========================================================================
    // STAFF PAYMENT ENDPOINTS
    // ========================================================================

    /**
     * Pay staff assignment - update payment and create cash movement in event cashbox
     */
    #[Route('/{id}/staff-assignments/{assignmentId}/pay', name: 'event_pay_staff', methods: ['POST'])]
    #[IsGranted('events.update')]
    public function payStaffAssignment(int $id, int $assignmentId, Request $request, EventRepository $eventRepository): JsonResponse
    {
        $event = $eventRepository->find($id);
        if (!$event) {
            return $this->json(['error' => 'Event not found'], 404);
        }

        $data = json_decode($request->getContent(), true) ?? [];
        $hoursWorked = $data['hoursWorked'] ?? null;
        $paymentAmount = $data['paymentAmount'] ?? null;
        $paymentMethod = $data['paymentMethod'] ?? 'CASH';

        // Find the assignment
        $assignment = null;
        foreach ($event->getStaffAssignments() as $a) {
            if ($a->getId() === $assignmentId) {
                $assignment = $a;
                break;
            }
        }

        if (!$assignment) {
            return $this->json(['error' => 'Staff assignment not found'], 404);
        }

        if ($hoursWorked !== null) {
            $assignment->setHoursWorked((string) $hoursWorked);
        }

        // Determine amount
        $amount = $paymentAmount;
        if ($amount === null || (float) $amount <= 0) {
            $amount = $this->cashboxService->calculateStaffPayment($assignment);
        }
        if ($amount === null || (float) $amount <= 0) {
            return $this->json(['error' => 'Nelze vypočítat částku, zadejte ji ručně.'], 400);
        }

        $user = $this->getUser();
        if (!$user instanceof User) {
            return $this->json(['error' => 'Unauthorized'], 401);
        }

        try {
            $movement = $this->cashboxService->payStaffAssignment($assignment, (string) $amount, $user, $paymentMethod);
            $this->em->flush();
        } catch (\RuntimeException $e) {
            return $this->json(['error' => $e->getMessage()], 400);
        }

        $cashbox = $this->cashboxService->getEventCashbox($event);

        return $this->json([
            'success' => true,
            'movementId' => $movement->getId(),
            'assignment' => [
                'id' => $assignment->getId(),
                'hoursWorked' => (float) $assignment->getHoursWorked(),
                'paymentAmount' => $assignment->getPaymentAmount() ? (float) $assignment->getPaymentAmount() : null,
                'paymentStatus' => $assignment->getPaymentStatus(),
            ],
            'cashboxBalance' => $cashbox ? (float) $cashbox->getCurrentBalance() : null,
        ]);
    }

    /**
     * Pay all pending staff assignments for an event
     */
    #[Route('/{id}/pay-all-staff', name: 'event_pay_all_staff', methods: ['POST'])]
    #[IsGranted('events.update')]
    public function payAllStaff(int $id, EventRepository $eventRepository): JsonResponse
    {
        $event = $eventRepository->find($id);
        if (!$event) {
            return $this->json(['error' => 'Event not found'], 404);
        }

        $user = $this->getUser();
        if (!$user instanceof User) {
            return $this->json(['error' => 'Unauthorized'], 401);
        }

        try {
            $result = $this->cashboxService->payAllStaff($event, $user);
        } catch (\RuntimeException $e) {
            return $this->json(['error' => $e->getMessage()], 400);
        }

        return $this->json([
            'success' => true,
            'totalPaid' => $result['totalPaid'],
            'paidCount' => $result['paidCount'],
            'results' => $result['results'],
        ]);
    }
}
