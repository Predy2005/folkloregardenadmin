<?php

declare(strict_types=1);

namespace App\Service;

use App\Entity\Event;
use App\Entity\EventGuest;
use App\Entity\EventMenu;
use App\Entity\EventStaffAssignment;
use App\Entity\EventVoucher;
use App\Repository\CashboxRepository;
use App\Repository\CashMovementRepository;
use App\Repository\ReservationRepository;
use App\Repository\StaffingFormulaRepository;
use App\Repository\StaffMemberRepository;
use App\Repository\StaffRoleRepository;
use App\Repository\VoucherRepository;
use Doctrine\ORM\EntityManagerInterface;

class EventDashboardService
{
    private const STAFFING_CATEGORY_LABELS = [
        'cisniciWaiters' => 'Číšníci',
        'kuchariChefs' => 'Kuchaři',
        'pomocneSilyHelpers' => 'Pomocné síly',
        'moderatoriHosts' => 'Moderátoři',
        'muzikantiMusicians' => 'Muzikanti',
        'tanecniciDancers' => 'Tanečníci',
        'fotografkyPhotographers' => 'Fotografové',
        'sperkyJewelry' => 'Šperky',
    ];

    public function __construct(
        private EntityManagerInterface $em,
        private StaffingFormulaRepository $staffingFormulaRepo,
        private StaffMemberRepository $staffMemberRepo,
        private StaffRoleRepository $staffRoleRepo,
        private CashboxRepository $cashboxRepo,
        private CashMovementRepository $cashMovementRepo,
        private ReservationRepository $reservationRepo,
        private VoucherRepository $voucherRepo,
    ) {
    }

    /**
     * Get all dashboard data for an event
     */
    public function getDashboardData(Event $event): array
    {
        return [
            'event' => $this->eventToArray($event),
            'guestsBySpace' => $this->getGuestsBySpace($event),
            'staffing' => $this->getStaffingOverview($event),
            'transport' => $this->getTransportSummary($event),
            'vouchers' => $this->getVoucherSummary($event),
            'financials' => $this->getFinancials($event),
            'stats' => $this->getQuickStats($event),
        ];
    }

    /**
     * Get guest statistics grouped by space
     */
    public function getGuestsBySpace(Event $event): array
    {
        $guests = $event->getGuests();
        $spaces = $event->getSpaces();

        // If no spaces defined, use venue or default
        $spaceNames = [];
        foreach ($spaces as $space) {
            $spaceNames[] = $space->getSpaceName();
        }
        if (empty($spaceNames)) {
            $spaceNames[] = $event->getVenue() ?? 'ROUBENKA';
        }

        $result = [];
        foreach ($spaceNames as $spaceName) {
            $spaceGuests = $this->filterGuestsBySpace($guests, $spaceName);

            $result[] = [
                'spaceName' => $spaceName,
                'totalGuests' => count($spaceGuests),
                'paidGuests' => count(array_filter($spaceGuests, fn($g) => $g->isPaid())),
                'freeGuests' => count(array_filter($spaceGuests, fn($g) => !$g->isPaid())),
                'presentGuests' => count(array_filter($spaceGuests, fn($g) => $g->isPresent())),
                'nationalityBreakdown' => $this->getNationalityBreakdown($spaceGuests),
                'menuBreakdown' => $this->getMenuBreakdown($spaceGuests),
            ];
        }

        // If only one space or no space filtering possible, return single aggregated space
        if (count($result) === 1 || $this->allGuestsInSingleSpace($guests)) {
            $allGuests = iterator_to_array($guests);
            return [[
                'spaceName' => $spaceNames[0] ?? 'ROUBENKA',
                'totalGuests' => count($allGuests),
                'paidGuests' => count(array_filter($allGuests, fn($g) => $g->isPaid())),
                'freeGuests' => count(array_filter($allGuests, fn($g) => !$g->isPaid())),
                'presentGuests' => count(array_filter($allGuests, fn($g) => $g->isPresent())),
                'nationalityBreakdown' => $this->getNationalityBreakdown($allGuests),
                'menuBreakdown' => $this->getMenuBreakdown($allGuests),
            ]];
        }

        return $result;
    }

    /**
     * Get staffing requirements vs actual assignments
     */
    public function getStaffingOverview(Event $event): array
    {
        $totalGuests = $event->getGuestsTotal();
        $formulas = $this->staffingFormulaRepo->findEnabled();
        $assignments = $event->getStaffAssignments();

        // Calculate required staff per category
        $required = [];
        foreach ($formulas as $formula) {
            $category = $formula->getCategory();
            $ratio = $formula->getRatio();
            $requiredCount = $ratio > 0 ? (int) ceil($totalGuests / $ratio) : 0;

            // Count assigned staff in this category
            $assigned = 0;
            $confirmed = 0;
            foreach ($assignments as $assignment) {
                $roleId = $assignment->getStaffRoleId();
                if ($roleId && $this->isRoleInCategory($roleId, $category)) {
                    $assigned++;
                    if ($assignment->getAttendanceStatus() === 'PRESENT' || $assignment->getAttendanceStatus() === 'CONFIRMED') {
                        $confirmed++;
                    }
                }
            }

            $required[] = [
                'category' => $category,
                'label' => self::STAFFING_CATEGORY_LABELS[$category] ?? $category,
                'required' => $requiredCount,
                'assigned' => $assigned,
                'confirmed' => $confirmed,
                'shortfall' => max(0, $requiredCount - $assigned),
            ];
        }

        // Get detailed assignments with staff member info
        $assignmentDetails = [];
        foreach ($assignments as $assignment) {
            $staffMember = $this->staffMemberRepo->find($assignment->getStaffMemberId());
            $staffRole = $assignment->getStaffRoleId()
                ? $this->staffRoleRepo->find($assignment->getStaffRoleId())
                : null;

            $assignmentDetails[] = [
                'id' => $assignment->getId(),
                'staffMember' => $staffMember ? [
                    'id' => $staffMember->getId(),
                    'name' => trim($staffMember->getFirstName() . ' ' . $staffMember->getLastName()),
                    'phone' => $staffMember->getPhone(),
                    'email' => $staffMember->getEmail(),
                    'position' => $staffMember->getPosition(),
                    'hourlyRate' => $staffMember->getHourlyRate(),
                ] : null,
                'role' => $staffRole?->getName(),
                'roleId' => $assignment->getStaffRoleId(),
                'assignmentStatus' => $assignment->getAssignmentStatus(),
                'attendanceStatus' => $assignment->getAttendanceStatus(),
                'hoursWorked' => (float) $assignment->getHoursWorked(),
                'paymentAmount' => $assignment->getPaymentAmount() ? (float) $assignment->getPaymentAmount() : null,
                'paymentStatus' => $assignment->getPaymentStatus(),
                'notes' => $assignment->getNotes(),
            ];
        }

        return [
            'required' => $required,
            'assignments' => $assignmentDetails,
        ];
    }

    /**
     * Get transport/taxi summary from reservations
     */
    public function getTransportSummary(Event $event): array
    {
        // Get reservations for this event's date
        $eventDate = $event->getEventDate();
        $reservations = $this->reservationRepo->findBy(['date' => $eventDate]);

        // Note: Taxi field doesn't exist yet in Reservation entity
        // This is a placeholder that returns basic reservation contact info
        $taxiReservations = [];
        $totalPassengers = 0;

        foreach ($reservations as $reservation) {
            // For now, include all reservations as potential transport needs
            // TODO: Add taxi/pickup field to Reservation entity
            $taxiReservations[] = [
                'reservationId' => $reservation->getId(),
                'contactName' => $reservation->getName(),
                'contactPhone' => $reservation->getPhone(),
                'contactEmail' => $reservation->getEmail(),
                'pickupAddress' => null, // To be added
                'passengerCount' => $this->getReservationGuestCount($reservation),
                'hasTaxi' => false, // To be added
            ];
            $totalPassengers += $this->getReservationGuestCount($reservation);
        }

        return [
            'reservationsWithTaxi' => $taxiReservations,
            'totalPassengers' => $totalPassengers,
            'totalReservations' => count($reservations),
        ];
    }

    /**
     * Get voucher summary for the event
     */
    public function getVoucherSummary(Event $event): array
    {
        $eventVouchers = $event->getVouchers();
        $details = [];
        $validatedCount = 0;
        $pendingCount = 0;
        $totalVoucherGuests = 0;

        foreach ($eventVouchers as $ev) {
            $voucher = $ev->getVoucherId() ? $this->voucherRepo->find($ev->getVoucherId()) : null;

            $details[] = [
                'id' => $ev->getId(),
                'voucherId' => $ev->getVoucherId(),
                'voucherCode' => $voucher?->getCode(),
                'partnerName' => $voucher?->getPartner()?->getName(),
                'quantity' => $ev->getQuantity(),
                'validated' => $ev->isValidated(),
                'validatedAt' => $ev->getValidatedAt()?->format('Y-m-d H:i:s'),
            ];

            if ($ev->isValidated()) {
                $validatedCount += $ev->getQuantity();
            } else {
                $pendingCount += $ev->getQuantity();
            }
            $totalVoucherGuests += $ev->getQuantity();
        }

        return [
            'eventVouchers' => $details,
            'validatedCount' => $validatedCount,
            'pendingCount' => $pendingCount,
            'totalVoucherGuests' => $totalVoucherGuests,
        ];
    }

    /**
     * Get financial summary for the event
     */
    public function getFinancials(Event $event): array
    {
        // Find cashbox linked to this event (by date or reservation)
        $eventDate = $event->getEventDate();
        $cashboxes = $this->cashboxRepo->findBy(['isActive' => true]);

        // Find cashbox for this event date
        $eventCashbox = null;
        foreach ($cashboxes as $cb) {
            if ($cb->getOpenedAt()->format('Y-m-d') === $eventDate->format('Y-m-d')) {
                $eventCashbox = $cb;
                break;
            }
        }

        // Get all cash movements for this cashbox
        $movements = $eventCashbox
            ? $this->cashMovementRepo->findBy(['cashbox' => $eventCashbox])
            : [];

        // Group expenses and income by category
        $expensesByCategory = [];
        $incomeByCategory = [];
        $totalExpenses = 0;
        $totalIncome = 0;

        foreach ($movements as $m) {
            $category = $m->getCategory() ?? 'OTHER';
            $amount = (float) $m->getAmount();

            if ($m->getMovementType() === 'EXPENSE') {
                if (!isset($expensesByCategory[$category])) {
                    $expensesByCategory[$category] = [
                        'category' => $category,
                        'label' => $this->getExpenseCategoryLabel($category),
                        'items' => [],
                        'subtotal' => 0,
                    ];
                }
                $expensesByCategory[$category]['items'][] = [
                    'description' => $m->getDescription(),
                    'amount' => $amount,
                    'paidTo' => $m->getDescription(), // Use description as paidTo for now
                    'paymentMethod' => $m->getPaymentMethod(),
                    'createdAt' => $m->getCreatedAt()->format('Y-m-d H:i:s'),
                ];
                $expensesByCategory[$category]['subtotal'] += $amount;
                $totalExpenses += $amount;
            } else {
                if (!isset($incomeByCategory[$category])) {
                    $incomeByCategory[$category] = [
                        'category' => $category,
                        'label' => $this->getIncomeCategoryLabel($category),
                        'items' => [],
                        'subtotal' => 0,
                    ];
                }
                $incomeByCategory[$category]['items'][] = [
                    'description' => $m->getDescription(),
                    'amount' => $amount,
                    'source' => $m->getDescription(),
                    'createdAt' => $m->getCreatedAt()->format('Y-m-d H:i:s'),
                ];
                $incomeByCategory[$category]['subtotal'] += $amount;
                $totalIncome += $amount;
            }
        }

        $initialBalance = $eventCashbox ? (float) $eventCashbox->getInitialBalance() : 0;
        $currentBalance = $eventCashbox ? (float) $eventCashbox->getCurrentBalance() : 0;

        return [
            'cashbox' => $eventCashbox ? [
                'id' => $eventCashbox->getId(),
                'name' => $eventCashbox->getName(),
                'initialBalance' => $initialBalance,
                'currentBalance' => $currentBalance,
                'totalIncome' => $totalIncome,
                'totalExpense' => $totalExpenses,
                'isActive' => $eventCashbox->getIsActive(),
            ] : null,
            'expensesByCategory' => array_values($expensesByCategory),
            'incomeByCategory' => array_values($incomeByCategory),
            'settlement' => [
                'initialCash' => $initialBalance,
                'totalIncome' => $totalIncome,
                'totalExpenses' => $totalExpenses,
                'netResult' => $initialBalance + $totalIncome - $totalExpenses,
                'cashOnHand' => $currentBalance,
            ],
        ];
    }

    /**
     * Get quick statistics
     */
    public function getQuickStats(Event $event): array
    {
        $guests = $event->getGuests();
        $schedules = $event->getSchedules();

        $totalGuests = count($guests);
        $presentGuests = 0;
        foreach ($guests as $g) {
            if ($g->isPresent()) {
                $presentGuests++;
            }
        }

        // Schedule progress
        $completedSchedules = 0;
        $currentActivity = null;
        $now = new \DateTime();

        foreach ($schedules as $s) {
            // Simple check: if schedule time is past, consider completed
            $scheduleTime = $s->getTimeSlot();
            if ($scheduleTime && $scheduleTime < $now) {
                $completedSchedules++;
            } else if ($currentActivity === null && $scheduleTime) {
                $currentActivity = $s->getActivity();
            }
        }

        return [
            'presentGuests' => $presentGuests,
            'totalGuests' => $totalGuests,
            'occupancyRate' => $totalGuests > 0 ? round(($presentGuests / $totalGuests) * 100, 1) : 0,
            'scheduleProgress' => [
                'completed' => $completedSchedules,
                'total' => count($schedules),
                'currentActivity' => $currentActivity,
            ],
        ];
    }

    // Helper methods

    private function filterGuestsBySpace(iterable $guests, string $spaceName): array
    {
        $result = [];
        foreach ($guests as $guest) {
            $table = $guest->getEventTable();
            if ($table && $table->getRoom() === $spaceName) {
                $result[] = $guest;
            } elseif (!$table) {
                // Guests without table assignment go to first/default space
                $result[] = $guest;
            }
        }
        return $result;
    }

    private function allGuestsInSingleSpace(iterable $guests): bool
    {
        $spaces = [];
        foreach ($guests as $guest) {
            $table = $guest->getEventTable();
            $space = $table ? $table->getRoom() : 'default';
            $spaces[$space] = true;
        }
        return count($spaces) <= 1;
    }

    private function getNationalityBreakdown(array $guests): array
    {
        $breakdown = [];
        foreach ($guests as $guest) {
            $nat = $guest->getNationality() ?? 'unknown';
            $breakdown[$nat] = ($breakdown[$nat] ?? 0) + 1;
        }
        arsort($breakdown);
        return $breakdown;
    }

    private function getMenuBreakdown(array $guests): array
    {
        $breakdown = [];
        foreach ($guests as $guest) {
            $menuItem = $guest->getMenuItem();
            $menuName = $menuItem ? $menuItem->getMenuName() : 'Bez menu';
            $surcharge = $menuItem ? (float) ($menuItem->getPricePerUnit() ?? 0) : 0;

            $key = $menuName;
            if (!isset($breakdown[$key])) {
                $breakdown[$key] = [
                    'menuName' => $menuName,
                    'count' => 0,
                    'surcharge' => $surcharge,
                ];
            }
            $breakdown[$key]['count']++;
        }
        return array_values($breakdown);
    }

    private function isRoleInCategory(int $roleId, string $category): bool
    {
        $role = $this->staffRoleRepo->find($roleId);
        if (!$role) {
            return false;
        }

        // Map role names to categories
        $roleName = strtolower($role->getName());
        $categoryMap = [
            'cisniciWaiters' => ['waiter', 'číšník', 'cisnik', 'servírka'],
            'kuchariChefs' => ['chef', 'cook', 'kuchař', 'kuchar'],
            'pomocneSilyHelpers' => ['helper', 'pomocná síla', 'pomocne sily'],
            'moderatoriHosts' => ['moderator', 'moderátor', 'host'],
            'muzikantiMusicians' => ['musician', 'muzikant', 'hudebník'],
            'tanecniciDancers' => ['dancer', 'tanečník', 'tanecnik'],
            'fotografkyPhotographers' => ['photographer', 'fotograf'],
            'sperkyJewelry' => ['jewelry', 'šperky', 'sperky'],
        ];

        $keywords = $categoryMap[$category] ?? [];
        foreach ($keywords as $keyword) {
            if (str_contains($roleName, $keyword)) {
                return true;
            }
        }
        return false;
    }

    private function getReservationGuestCount($reservation): int
    {
        $count = 0;
        foreach ($reservation->getPersons() as $person) {
            $count++;
        }
        return $count ?: 1;
    }

    private function getExpenseCategoryLabel(string $category): string
    {
        $labels = [
            'STAFF_WAITERS' => 'Číšníci',
            'STAFF_COOKS' => 'Kuchaři',
            'STAFF_HELPERS' => 'Pomocné síly',
            'ENTERTAINMENT_DANCERS' => 'Tanečníci',
            'ENTERTAINMENT_MUSICIANS' => 'Muzikanti',
            'ENTERTAINMENT_MODERATOR' => 'Moderátor',
            'PHOTOGRAPHER' => 'Fotograf',
            'CATERING' => 'Catering',
            'TRANSPORT' => 'Doprava',
            'MERCHANDISE_JEWELRY' => 'Šperky',
            'OTHER' => 'Ostatní',
        ];
        return $labels[$category] ?? $category;
    }

    private function getIncomeCategoryLabel(string $category): string
    {
        $labels = [
            'ONLINE_PAYMENT' => 'Online platby',
            'CASH_PAYMENT' => 'Hotovostní platby',
            'JEWELRY_SALES' => 'Prodej šperků',
            'MERCHANDISE' => 'Prodej zboží',
            'OTHER' => 'Ostatní',
        ];
        return $labels[$category] ?? $category;
    }

    private function eventToArray(Event $event): array
    {
        return [
            'id' => $event->getId(),
            'name' => $event->getName(),
            'eventType' => $event->getEventType(),
            'eventDate' => $event->getEventDate()->format('Y-m-d'),
            'eventTime' => $event->getEventTime()->format('H:i:s'),
            'durationMinutes' => $event->getDurationMinutes(),
            'guestsPaid' => $event->getGuestsPaid(),
            'guestsFree' => $event->getGuestsFree(),
            'guestsTotal' => $event->getGuestsTotal(),
            'venue' => $event->getVenue(),
            'status' => $event->getStatus(),
            'language' => $event->getLanguage(),
            'organizerCompany' => $event->getOrganizerCompany(),
            'organizerPerson' => $event->getOrganizerPerson(),
            'organizerPhone' => $event->getOrganizerPhone(),
            'organizerEmail' => $event->getOrganizerEmail(),
        ];
    }
}
