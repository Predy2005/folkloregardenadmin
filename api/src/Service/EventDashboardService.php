<?php

declare(strict_types=1);

namespace App\Service;

use App\Entity\Event;
use App\Entity\EventGuest;
use App\Entity\EventMenu;
use App\Entity\EventStaffAssignment;
use App\Entity\EventVoucher;
use App\Repository\CashboxRepository;
use App\Repository\CashboxTransferRepository;
use App\Repository\CashMovementRepository;
use App\Repository\InvoiceRepository;
use App\Repository\ReservationRepository;
use App\Repository\StaffingFormulaRepository;
use App\Repository\StaffMemberRepository;
use App\Repository\StaffRoleRepository;
use App\Repository\VoucherRepository;
use App\Repository\EventStaffRequirementRepository;
use Doctrine\ORM\EntityManagerInterface;

class EventDashboardService
{
    // Base category translations - supports both old and new category formats
    private const STAFFING_CATEGORY_LABELS = [
        // Old format (Czech/English mixed)
        'cisniciWaiters' => 'Číšníci',
        'cisniciwaiter' => 'Číšníci',
        'kuchariChefs' => 'Kuchaři',
        'kucharichefs' => 'Kuchaři',
        'pomocneSilyHelpers' => 'Pomocné síly',
        'pomocnesilyhelpers' => 'Pomocné síly',
        'moderatoriHosts' => 'Moderátoři',
        'moderatorihosts' => 'Moderátoři',
        'muzikantiMusicians' => 'Hudebníci',
        'muzikantimusicians' => 'Hudebníci',
        'tanecniciDancers' => 'Tanečníci',
        'tanecnicidancers' => 'Tanečníci',
        'fotografkyPhotographers' => 'Fotografové',
        'fotografkyphotographers' => 'Fotografové',
        'sperkyJewelry' => 'Prodejci šperků',
        'sperkyjewelry' => 'Prodejci šperků',
        // New format (simple English)
        'waiter' => 'Číšníci',
        'chef' => 'Kuchaři',
        'coordinator' => 'Koordinátoři',
        'bartender' => 'Barmani',
        'hostess' => 'Hostesky',
        'security' => 'Ochranka',
        'musician' => 'Hudebníci',
        'dancer' => 'Tanečníci',
        'photographer' => 'Fotografové',
        'sound_tech' => 'Zvukaři',
        'cleaner' => 'Úklid',
        'driver' => 'Řidiči',
        'manager' => 'Manažeři',
        'head_chef' => 'Šéfkuchaři',
        'sous_chef' => 'Pomocní kuchaři',
        'prep_cook' => 'Přípraváři',
        'head_waiter' => 'Vrchní číšníci',
        'helper' => 'Pomocné síly',
        'host' => 'Moderátoři',
        'jewelry' => 'Prodejci šperků',
    ];

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
        private EntityManagerInterface $em,
        private StaffingFormulaRepository $staffingFormulaRepo,
        private StaffMemberRepository $staffMemberRepo,
        private StaffRoleRepository $staffRoleRepo,
        private CashboxRepository $cashboxRepo,
        private CashMovementRepository $cashMovementRepo,
        private ReservationRepository $reservationRepo,
        private VoucherRepository $voucherRepo,
        private InvoiceRepository $invoiceRepo,
        private EventStaffRequirementRepository $staffRequirementRepo,
        private StaffRequirementService $staffRequirementService,
        private CashboxService $cashboxService,
        private CashboxTransferRepository $cashboxTransferRepo,
    ) {
    }

    /**
     * Převede event type na frontend formát
     */
    private function normalizeEventTypeForFrontend(?string $eventType): ?string
    {
        if ($eventType === null) {
            return null;
        }
        return self::EVENT_TYPE_TO_FRONTEND[$eventType] ?? $eventType;
    }

    /**
     * Get all dashboard data for an event
     */
    public function getDashboardData(Event $event): array
    {
        $pendingTransfers = $this->cashboxTransferRepo->findPendingByEvent($event);

        return [
            'event' => $this->eventToArray($event),
            'guestsBySpace' => $this->getGuestsBySpace($event),
            'staffing' => $this->getStaffingOverview($event),
            'transport' => $this->getTransportSummary($event),
            'vouchers' => $this->getVoucherSummary($event),
            'financials' => $this->getFinancials($event),
            'stats' => $this->getQuickStats($event),
            'pendingTransfers' => array_map(
                fn($t) => $this->cashboxService->serializeTransfer($t),
                $pendingTransfers
            ),
        ];
    }

    /**
     * Get guest statistics grouped by space
     */
    public function getGuestsBySpace(Event $event): array
    {
        $guests = $event->getGuests();
        $spaces = $event->getSpaces();

        // If no spaces defined, use venue or default (normalized to lowercase)
        $spaceNames = [];
        foreach ($spaces as $space) {
            $spaceNames[] = strtolower($space->getSpaceName());
        }
        if (empty($spaceNames)) {
            $spaceNames[] = strtolower($event->getVenue() ?? 'ROUBENKA');
        }

        $result = [];
        foreach ($spaceNames as $index => $spaceName) {
            $isFirstSpace = ($index === 0);
            $spaceGuests = $this->filterGuestsBySpace($guests, $spaceName, $isFirstSpace);

            // Count paying vs non-paying based on guest type
            // driver, guide = non-paying (zdarma)
            // adult, child, infant = paying (platící)
            $paidCount = 0;
            $freeCount = 0;
            foreach ($spaceGuests as $g) {
                $type = $g->getType();
                if ($type === 'driver' || $type === 'guide') {
                    $freeCount++;
                } else {
                    $paidCount++;
                }
            }

            $result[] = [
                'spaceName' => $spaceName,
                'totalGuests' => count($spaceGuests),
                'paidGuests' => $paidCount,
                'freeGuests' => $freeCount,
                'presentGuests' => count(array_filter($spaceGuests, fn($g) => $g->isPresent())),
                'nationalityBreakdown' => $this->getNationalityBreakdown($spaceGuests),
                'menuBreakdown' => $this->getMenuBreakdown($spaceGuests),
                'menuByNationality' => $this->getMenuByNationality($spaceGuests),
                'menuByReservation' => $this->getMenuByReservation($spaceGuests),
            ];
        }

        // Always return all configured spaces (even if empty) so user can move guests between them
        return $result;
    }

    /**
     * Get staffing requirements vs actual assignments
     */
    public function getStaffingOverview(Event $event): array
    {
        $assignments = $event->getStaffAssignments();

        // First, try to get stored requirements
        $storedRequirements = $this->staffRequirementRepo->findByEvent($event);

        // If no stored requirements, use the StaffRequirementService to calculate and store them
        if (empty($storedRequirements)) {
            $storedRequirements = $this->staffRequirementService->recalculateRequirements($event);
        }

        // Build required staff per category from stored requirements
        $required = [];

        if (!empty($storedRequirements)) {
            // First pass: determine the BEST category for each assignment (each assignment counted ONCE)
            $assignmentCategoryMap = []; // assignmentId => category
            foreach ($assignments as $assignment) {
                $assignmentId = $assignment->getId();
                $roleId = $assignment->getStaffRoleId();
                $staffMember = $assignment->getStaffMemberId()
                    ? $this->staffMemberRepo->find($assignment->getStaffMemberId())
                    : null;
                $position = $staffMember?->getPosition();

                // Find the best matching category for this assignment
                // Priority: 1) role match with requirement's roleId, 2) role name match, 3) position match
                $bestCategory = null;

                foreach ($storedRequirements as $req) {
                    $cat = $req->getCategory();
                    $catRoleId = $req->getStaffRoleId();

                    // Exact role ID match (highest priority)
                    if ($roleId && $catRoleId && $roleId === $catRoleId) {
                        $bestCategory = $cat;
                        break; // exact match, stop looking
                    }
                }

                if (!$bestCategory) {
                    // Try role name match
                    foreach ($storedRequirements as $req) {
                        $cat = $req->getCategory();
                        if ($roleId && $this->isRoleInCategory($roleId, $cat)) {
                            $bestCategory = $cat;
                            break;
                        }
                    }
                }

                if (!$bestCategory) {
                    // Fall back to position match
                    foreach ($storedRequirements as $req) {
                        $cat = $req->getCategory();
                        if ($position && $this->isPositionInCategory($position, $cat)) {
                            $bestCategory = $cat;
                            break;
                        }
                    }
                }

                if ($bestCategory) {
                    $assignmentCategoryMap[$assignmentId] = $bestCategory;
                }
            }

            // Second pass: build requirement data using the deduplicated mapping
            foreach ($storedRequirements as $req) {
                $category = $req->getCategory();
                $requiredCount = $req->getRequiredCount();
                $categoryRoleId = $req->getStaffRoleId();

                $assigned = 0;
                $confirmed = 0;
                $present = 0;
                $assignmentIds = [];

                foreach ($assignments as $assignment) {
                    $assignmentId = $assignment->getId();
                    if (($assignmentCategoryMap[$assignmentId] ?? null) === $category) {
                        $assigned++;
                        $assignmentIds[] = $assignmentId;
                        $status = $assignment->getAttendanceStatus();
                        if ($status === 'CONFIRMED') {
                            $confirmed++;
                        }
                        if ($status === 'PRESENT') {
                            $present++;
                            $confirmed++;
                        }
                    }
                }

                $required[] = [
                    'category' => $category,
                    'label' => $this->translateCategoryLabel($category),
                    'roleId' => $categoryRoleId,
                    'required' => $requiredCount,
                    'assigned' => $assigned,
                    'confirmed' => $confirmed,
                    'present' => $present,
                    'shortfall' => max(0, $requiredCount - $assigned),
                    'operationalShortfall' => max(0, $requiredCount - $present),
                    'isManualOverride' => $req->isManualOverride(),
                    'assignmentIds' => $assignmentIds,
                ];
            }
        } else {
            // Fallback: Calculate from formulas (legacy behavior)
            $required = $this->calculateRequirementsFromFormulas($event, $assignments);
        }

        // Get detailed assignments with staff member info
        $assignmentDetails = [];
        foreach ($assignments as $assignment) {
            $staffMember = $this->staffMemberRepo->find($assignment->getStaffMemberId());
            $staffRole = $assignment->getStaffRoleId()
                ? $this->staffRoleRepo->find($assignment->getStaffRoleId())
                : null;

            // Use staffRole name if available, otherwise fallback to staffMember position
            $roleName = $staffRole?->getName() ?? $staffMember?->getPosition();

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
                'role' => $roleName,
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
     * Get transport/taxi summary from reservations linked to this event
     */
    public function getTransportSummary(Event $event): array
    {
        // Get unique reservations linked to this event through EventGuests
        $guests = $event->getGuests();
        $reservationIds = [];
        foreach ($guests as $guest) {
            $reservation = $guest->getReservation();
            if ($reservation && !in_array($reservation->getId(), $reservationIds)) {
                $reservationIds[] = $reservation->getId();
            }
        }

        // Get actual reservation entities
        $reservations = [];
        foreach ($reservationIds as $resId) {
            $res = $this->reservationRepo->find($resId);
            if ($res) {
                $reservations[] = $res;
            }
        }

        $taxiReservations = [];
        $totalPassengers = 0;
        $reservationsWithTransfer = 0;

        foreach ($reservations as $reservation) {
            // Use new ReservationTransfer entities if available, fallback to legacy fields
            $transfers = $reservation->getTransfers();
            if ($transfers && $transfers->count() > 0) {
                $reservationsWithTransfer++;
                $resPassengers = 0;
                $transferDetails = [];
                foreach ($transfers as $transfer) {
                    $resPassengers += $transfer->getPersonCount();
                    $transferDetails[] = [
                        'address' => $transfer->getAddress(),
                        'personCount' => $transfer->getPersonCount(),
                        'transportCompanyId' => $transfer->getTransportCompany()?->getId(),
                        'transportCompanyName' => $transfer->getTransportCompany()?->getName(),
                        'transportVehicleId' => $transfer->getTransportVehicle()?->getId(),
                        'transportVehiclePlate' => $transfer->getTransportVehicle()?->getLicensePlate(),
                        'transportDriverId' => $transfer->getTransportDriver()?->getId(),
                        'transportDriverName' => $transfer->getTransportDriver()?->getFullName(),
                    ];
                }
                $taxiReservations[] = [
                    'reservationId' => $reservation->getId(),
                    'contactName' => $reservation->getContactName(),
                    'contactPhone' => $reservation->getContactPhone(),
                    'contactEmail' => $reservation->getContactEmail(),
                    'pickupAddress' => $transfers->first() ? $transfers->first()->getAddress() : null,
                    'passengerCount' => $resPassengers,
                    'hasTaxi' => true,
                    'transfers' => $transferDetails,
                ];
                $totalPassengers += $resPassengers;
            } else {
                // Legacy fallback
                $transferCount = $reservation->getTransferCount() ?? 0;
                if ($transferCount > 0) {
                    $reservationsWithTransfer++;
                    $taxiReservations[] = [
                        'reservationId' => $reservation->getId(),
                        'contactName' => $reservation->getContactName(),
                        'contactPhone' => $reservation->getContactPhone(),
                        'contactEmail' => $reservation->getContactEmail(),
                        'pickupAddress' => $reservation->getTransferAddress(),
                        'passengerCount' => $transferCount,
                        'hasTaxi' => true,
                        'transfers' => [],
                    ];
                    $totalPassengers += $transferCount;
                }
            }
        }

        // Also include EventTransport assignments
        $eventTransportAssignments = [];
        foreach ($event->getTransportAssignments() as $et) {
            $eventTransportAssignments[] = [
                'id' => $et->getId(),
                'companyId' => $et->getCompany()?->getId(),
                'companyName' => $et->getCompany()?->getName(),
                'vehicleId' => $et->getVehicle()?->getId(),
                'vehiclePlate' => $et->getVehicle()?->getLicensePlate(),
                'driverId' => $et->getDriver()?->getId(),
                'driverName' => $et->getDriver()?->getFullName(),
                'transportType' => $et->getTransportType(),
                'scheduledTime' => $et->getScheduledTime()?->format('H:i'),
                'pickupLocation' => $et->getPickupLocation(),
                'dropoffLocation' => $et->getDropoffLocation(),
                'passengerCount' => $et->getPassengerCount(),
                'price' => $et->getPrice(),
                'paymentStatus' => $et->getPaymentStatus(),
                'invoiceNumber' => $et->getInvoiceNumber(),
                'notes' => $et->getNotes(),
            ];
        }

        return [
            'reservationsWithTaxi' => $taxiReservations,
            'totalPassengers' => $totalPassengers,
            'totalReservations' => $reservationsWithTransfer,
            'eventTransports' => $eventTransportAssignments,
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
        // Find cashbox linked to this event by event_id
        $eventCashbox = $this->cashboxService->getEventCashbox($event);

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
                    'id' => $m->getId(),
                    'description' => $m->getDescription(),
                    'amount' => $amount,
                    'paidTo' => $m->getDescription(),
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
                    'id' => $m->getId(),
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
                'cashboxType' => $eventCashbox->getCashboxType(),
                'initialBalance' => $initialBalance,
                'currentBalance' => $currentBalance,
                'totalIncome' => $totalIncome,
                'totalExpense' => $totalExpenses,
                'isActive' => $eventCashbox->isActive(),
                'lockedBy' => $eventCashbox->getLockedBy()?->getId(),
                'lockedAt' => $eventCashbox->getLockedAt()?->format(DATE_ATOM),
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
            'payments' => $this->getReservationPayments($event),
        ];
    }

    /**
     * Get payment overview from reservations linked to this event
     */
    public function getReservationPayments(Event $event): array
    {
        // Get unique reservations linked to this event through EventGuests
        $guests = $event->getGuests();
        $reservationIds = [];
        foreach ($guests as $guest) {
            $reservation = $guest->getReservation();
            if ($reservation && !in_array($reservation->getId(), $reservationIds)) {
                $reservationIds[] = $reservation->getId();
            }
        }

        // Build reservation payment summaries
        $reservationSummaries = [];
        $totals = [
            'totalExpected' => 0,
            'totalPaid' => 0,
            'totalRemaining' => 0,
            'reservationCount' => 0,
            'paidCount' => 0,
            'partialCount' => 0,
            'unpaidCount' => 0,
        ];

        foreach ($reservationIds as $resId) {
            $reservation = $this->reservationRepo->find($resId);
            if (!$reservation) {
                continue;
            }

            $totalPrice = (float) ($reservation->getTotalPrice() ?? 0);
            $paidAmount = (float) ($reservation->getPaidAmount() ?? 0);
            $remainingAmount = max(0, $totalPrice - $paidAmount);
            $paymentStatus = $reservation->getPaymentStatus() ?? 'UNPAID';

            // Get invoices for this reservation
            $invoices = $this->invoiceRepo->findBy(['reservation' => $reservation]);
            $invoiceSummaries = [];
            foreach ($invoices as $invoice) {
                $invoiceSummaries[] = [
                    'id' => $invoice->getId(),
                    'invoiceNumber' => $invoice->getInvoiceNumber(),
                    'invoiceType' => $invoice->getInvoiceType(),
                    'status' => $invoice->getStatus(),
                    'total' => (float) $invoice->getTotal(),
                    'dueDate' => $invoice->getDueDate()?->format('Y-m-d'),
                ];
            }

            // Count guests from this reservation
            $guestCount = $this->getReservationGuestCount($reservation);

            $reservationSummaries[] = [
                'reservationId' => $reservation->getId(),
                'contactName' => $reservation->getContactName() ?? 'Neznámý',
                'contactEmail' => $reservation->getContactEmail(),
                'contactPhone' => $reservation->getContactPhone(),
                'guestCount' => $guestCount,
                'totalPrice' => $totalPrice,
                'paidAmount' => $paidAmount,
                'remainingAmount' => $remainingAmount,
                'paymentStatus' => $paymentStatus,
                'paymentMethod' => $reservation->getPaymentMethod(),
                'paymentNote' => $reservation->getPaymentNote(),
                'invoices' => $invoiceSummaries,
            ];

            // Update totals
            $totals['totalExpected'] += $totalPrice;
            $totals['totalPaid'] += $paidAmount;
            $totals['totalRemaining'] += $remainingAmount;
            $totals['reservationCount']++;

            if ($paymentStatus === 'PAID') {
                $totals['paidCount']++;
            } elseif ($paymentStatus === 'PARTIAL') {
                $totals['partialCount']++;
            } else {
                $totals['unpaidCount']++;
            }
        }

        // Get all invoices linked to the event:
        // 1) Via EventInvoice entity
        // 2) Via reservations linked to the event
        $allInvoices = [];
        $seenInvoiceIds = [];

        // From EventInvoice
        $eventInvoices = $event->getEventInvoices();
        foreach ($eventInvoices as $ei) {
            $invoice = $ei->getInvoice();
            if ($invoice && !in_array($invoice->getId(), $seenInvoiceIds)) {
                $seenInvoiceIds[] = $invoice->getId();
                $allInvoices[] = $this->serializeInvoiceSummary($invoice);
            }
        }

        // From reservations (may have invoices not linked via EventInvoice)
        foreach ($reservationIds as $resId) {
            $resInvoices = $this->invoiceRepo->findBy(['reservation' => $resId]);
            foreach ($resInvoices as $invoice) {
                if (!in_array($invoice->getId(), $seenInvoiceIds)) {
                    $seenInvoiceIds[] = $invoice->getId();
                    $allInvoices[] = $this->serializeInvoiceSummary($invoice);
                }
            }
        }

        return [
            'reservations' => $reservationSummaries,
            'totals' => $totals,
            'invoices' => $allInvoices,
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

    private function filterGuestsBySpace(iterable $guests, string $spaceName, bool $isFirstSpace = false): array
    {
        $result = [];

        foreach ($guests as $guest) {
            // First check if guest has direct space assignment
            $guestSpace = $guest->getSpace();

            if ($guestSpace !== null) {
                // Case-insensitive comparison
                if (strcasecmp($guestSpace, $spaceName) === 0) {
                    $result[] = $guest;
                }
                continue;
            }

            // Fall back to table's room
            $table = $guest->getEventTable();
            if ($table && strcasecmp($table->getRoom() ?? '', $spaceName) === 0) {
                $result[] = $guest;
            } elseif (!$table && $isFirstSpace) {
                // Guests without any assignment go to first/default space
                $result[] = $guest;
            }
        }

        return $result;
    }

    private function allGuestsInSingleSpace(iterable $guests): bool
    {
        $spaces = [];
        foreach ($guests as $guest) {
            // Check direct space first
            $space = $guest->getSpace();
            if ($space === null) {
                // Fall back to table's room
                $table = $guest->getEventTable();
                $space = $table ? $table->getRoom() : 'default';
            }
            // Normalize to lowercase for comparison
            $spaces[strtolower($space ?? 'default')] = true;
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

    /**
     * Get menu breakdown grouped by nationality
     */
    private function getMenuByNationality(array $guests): array
    {
        $byNationality = [];

        foreach ($guests as $guest) {
            $nat = $guest->getNationality() ?? 'unknown';
            $menuItem = $guest->getMenuItem();
            $menuName = $menuItem ? $menuItem->getMenuName() : 'Bez menu';
            $surcharge = $menuItem ? (float) ($menuItem->getPricePerUnit() ?? 0) : 0;

            if (!isset($byNationality[$nat])) {
                $byNationality[$nat] = [
                    'nationality' => $nat,
                    'menus' => [],
                    'totalCount' => 0,
                ];
            }

            $byNationality[$nat]['totalCount']++;

            if (!isset($byNationality[$nat]['menus'][$menuName])) {
                $byNationality[$nat]['menus'][$menuName] = [
                    'menuName' => $menuName,
                    'count' => 0,
                    'surcharge' => $surcharge,
                ];
            }
            $byNationality[$nat]['menus'][$menuName]['count']++;
        }

        // Convert menus from associative to indexed arrays and sort by totalCount
        $result = [];
        foreach ($byNationality as $nat => $data) {
            $data['menus'] = array_values($data['menus']);
            $result[] = $data;
        }

        // Sort by totalCount descending
        usort($result, fn($a, $b) => $b['totalCount'] - $a['totalCount']);

        return $result;
    }

    /**
     * Get menu breakdown grouped by reservation
     */
    private function getMenuByReservation(array $guests): array
    {
        $byReservation = [];

        foreach ($guests as $guest) {
            $reservation = $guest->getReservation();
            if (!$reservation) {
                continue; // Skip guests without reservation
            }

            $resId = $reservation->getId();
            $menuItem = $guest->getMenuItem();
            $menuName = $menuItem ? $menuItem->getMenuName() : 'Bez menu';
            $surcharge = $menuItem ? (float) ($menuItem->getPricePerUnit() ?? 0) : 0;

            if (!isset($byReservation[$resId])) {
                $byReservation[$resId] = [
                    'reservationId' => $resId,
                    'contactName' => $reservation->getContactName() ?? 'Neznama rezervace',
                    'nationality' => $reservation->getContactNationality(),
                    'menus' => [],
                    'totalCount' => 0,
                ];
            }

            $byReservation[$resId]['totalCount']++;

            if (!isset($byReservation[$resId]['menus'][$menuName])) {
                $byReservation[$resId]['menus'][$menuName] = [
                    'menuName' => $menuName,
                    'count' => 0,
                    'surcharge' => $surcharge,
                ];
            }
            $byReservation[$resId]['menus'][$menuName]['count']++;
        }

        // Convert menus from associative to indexed arrays
        $result = [];
        foreach ($byReservation as $resId => $data) {
            $data['menus'] = array_values($data['menus']);
            $result[] = $data;
        }

        // Sort by totalCount descending
        usort($result, fn($a, $b) => $b['totalCount'] - $a['totalCount']);

        return $result;
    }

    /**
     * Translate category label - handles formats like "security_FOLKLORE_SHOW" and "cisniciWaiters"
     */
    private function translateCategoryLabel(string $category): string
    {
        // First check exact match in labels (case-insensitive)
        $categoryLower = strtolower($category);
        foreach (self::STAFFING_CATEGORY_LABELS as $key => $label) {
            if (strtolower($key) === $categoryLower) {
                return $label;
            }
        }

        // Check for partial match with the original category
        foreach (self::STAFFING_CATEGORY_LABELS as $key => $label) {
            if (str_contains($categoryLower, strtolower($key)) || str_contains(strtolower($key), $categoryLower)) {
                return $label;
            }
        }

        // Normalize and try again
        $normalized = $this->normalizeCategory($category);
        if (isset(self::STAFFING_CATEGORY_LABELS[$normalized])) {
            return self::STAFFING_CATEGORY_LABELS[$normalized];
        }

        // Extract base category (before underscore with event type)
        $baseCategory = strtolower(preg_replace('/_[A-Z_]+$/', '', $category));
        return self::STAFFING_CATEGORY_LABELS[$baseCategory] ?? ucfirst(str_replace('_', ' ', $baseCategory));
    }

    /**
     * Extract base category from full category string (e.g., "security_FOLKLORE_SHOW" -> "security")
     */
    private function getBaseCategory(string $category): string
    {
        return strtolower(preg_replace('/_[A-Z_]+$/', '', $category));
    }

    /**
     * Check if a staff member's position (enum value) belongs to a category.
     * Uses direct mapping from position codes to categories.
     */
    private function isPositionInCategory(string $position, string $category): bool
    {
        $normalizedCategory = $this->normalizeCategory($category);
        $positionUpper = strtoupper($position);

        $positionToCategory = [
            'WAITER' => 'waiter',
            'HEAD_WAITER' => 'waiter',
            'CHEF' => 'chef',
            'HEAD_CHEF' => 'chef',
            'SOUS_CHEF' => 'chef',
            'PREP_COOK' => 'chef',
            'BARTENDER' => 'bartender',
            'HOSTESS' => 'hostess',
            'COORDINATOR' => 'coordinator',
            'SECURITY' => 'security',
            'MUSICIAN' => 'musician',
            'BAND' => 'musician',
            'DANCER' => 'dancer',
            'DANCE_GROUP' => 'dancer',
            'MODERATOR' => 'coordinator',
            'PHOTOGRAPHER' => 'photographer',
            'SOUND_TECH' => 'sound_tech',
            'CLEANER' => 'cleaner',
            'DRIVER' => 'driver',
            'MANAGER' => 'manager',
        ];

        $mappedCategory = $positionToCategory[$positionUpper] ?? null;
        return $mappedCategory === $normalizedCategory;
    }

    private function isRoleInCategory(int $roleId, string $category): bool
    {
        $role = $this->staffRoleRepo->find($roleId);
        if (!$role) {
            return false;
        }

        // Normalize the category to find matching role keywords
        $normalizedCategory = $this->normalizeCategory($category);

        // Map role names to normalized categories
        $roleName = strtolower($role->getName());
        $categoryMap = [
            'waiter' => ['waiter', 'head_waiter', 'číšník', 'cisnik', 'servírka', 'cisnici'],
            'chef' => ['chef', 'head_chef', 'sous_chef', 'prep_cook', 'cook', 'kuchař', 'kuchar', 'kuchari'],
            'helper' => ['helper', 'pomocnik', 'pomocná', 'pomocne', 'pomocnesily'],
            'host' => ['host', 'moderator', 'moderátor', 'moderatori'],
            'musician' => ['musician', 'muzikant', 'hudebník', 'hudebnik', 'muzikanti'],
            'dancer' => ['dancer', 'tanečník', 'tanecnik', 'tanecnici'],
            'photographer' => ['photographer', 'fotograf', 'fotografka', 'fotografky'],
            'jewelry' => ['jewelry', 'šperky', 'sperky', 'prodejce'],
            'coordinator' => ['coordinator', 'koordinátor', 'koordinator'],
            'bartender' => ['bartender', 'barman', 'barmanka'],
            'hostess' => ['hostess', 'hosteska'],
            'security' => ['security', 'ochranka', 'bodyguard'],
            'sound_tech' => ['sound_tech', 'zvukař', 'zvukar', 'technik'],
            'cleaner' => ['cleaner', 'uklízeč', 'uklizec', 'úklid'],
            'driver' => ['driver', 'řidič', 'ridic'],
            'manager' => ['manager', 'manažer', 'manazer'],
        ];

        $keywords = $categoryMap[$normalizedCategory] ?? [$normalizedCategory];
        foreach ($keywords as $keyword) {
            if (str_contains($roleName, $keyword)) {
                return true;
            }
        }
        return false;
    }

    /**
     * Normalize category name to a standard format
     * Handles: "cisniciWaiters", "waiter_FOLKLORE_SHOW", "waiter"
     */
    private function normalizeCategory(string $category): string
    {
        $categoryLower = strtolower($category);

        // Map old Czech/English mixed names to normalized categories
        $normalizationMap = [
            'cisniciwaiter' => 'waiter',
            'kucharichef' => 'chef',
            'pomocnesilyhelper' => 'helper',
            'moderatorihost' => 'host',
            'muzikantimusician' => 'musician',
            'tanecnicidancer' => 'dancer',
            'fotografkyphotographer' => 'photographer',
            'sperkyjewelry' => 'jewelry',
        ];

        // Check for old format (e.g., "cisniciWaiters" -> "cisniciwaiter")
        foreach ($normalizationMap as $pattern => $normalized) {
            if (str_starts_with($categoryLower, substr($pattern, 0, 6))) {
                return $normalized;
            }
        }

        // Extract base category from event-type-specific format (e.g., "waiter_FOLKLORE_SHOW" -> "waiter")
        return $this->getBaseCategory($category);
    }

    /**
     * Get the primary staff role ID for a formula category
     */
    private function getRoleIdForCategory(string $category): ?int
    {
        // Normalize to standard category first
        $normalizedCategory = $this->normalizeCategory($category);

        // Map normalized categories to Czech role names (matching database)
        $categoryToRoleNames = [
            'waiter' => ['Číšník', 'WAITER', 'Cisnik'],
            'chef' => ['Kuchař', 'CHEF', 'Kuchar'],
            'helper' => ['Pomocná síla', 'HELPER', 'Pomocnik'],
            'host' => ['Moderátor', 'HOST', 'Moderator'],
            'musician' => ['Kapela', 'MUSICIAN', 'Hudebník'],
            'dancer' => ['Tanečník', 'DANCER', 'Tanecnik'],
            'photographer' => ['Fotograf', 'PHOTOGRAPHER'],
            'jewelry' => ['Prodejce šperků', 'JEWELRY', 'Sperky'],
            'coordinator' => ['Koordinátor', 'COORDINATOR', 'Koordinator'],
            'bartender' => ['Barman', 'BARTENDER'],
            'hostess' => ['Hosteska', 'HOSTESS'],
            'security' => ['Ochranka', 'SECURITY'],
            'sound_tech' => ['Zvukař', 'SOUND_TECH'],
            'cleaner' => ['Úklid', 'CLEANER'],
            'driver' => ['Řidič', 'DRIVER'],
            'manager' => ['Manažer', 'MANAGER'],
        ];

        $possibleNames = $categoryToRoleNames[$normalizedCategory] ?? [strtoupper($normalizedCategory)];

        foreach ($possibleNames as $roleName) {
            $role = $this->staffRoleRepo->findOneBy(['name' => $roleName]);
            if ($role) {
                return $role->getId();
            }
        }

        return null;
    }

    private function getReservationGuestCount($reservation): int
    {
        $count = 0;
        foreach ($reservation->getPersons() as $person) {
            $count++;
        }
        return $count ?: 1;
    }

    private function serializeInvoiceSummary(\App\Entity\Invoice $invoice): array
    {
        return [
            'id' => $invoice->getId(),
            'invoiceNumber' => $invoice->getInvoiceNumber(),
            'invoiceType' => $invoice->getInvoiceType(),
            'status' => $invoice->getStatus(),
            'total' => (float) $invoice->getTotal(),
            'customerName' => $invoice->getCustomerName(),
            'reservationId' => $invoice->getReservation()?->getId(),
            'dueDate' => $invoice->getDueDate()?->format('Y-m-d'),
            'paidAt' => $invoice->getPaidAt()?->format('Y-m-d'),
            'originalInvoiceId' => $invoice->getOriginalInvoiceId(),
        ];
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

    /**
     * Normalize event type to match formula naming convention.
     * Maps Czech/legacy names to standard English format.
     */
    private function normalizeEventType(string $eventType): string
    {
        $eventTypeUpper = strtoupper($eventType);

        // Map Czech/legacy event types to standard English format
        $typeMap = [
            'FOLKLORNI_SHOW' => 'FOLKLORE_SHOW',
            'FOLKLORNÍ_SHOW' => 'FOLKLORE_SHOW',
            'SVATBA' => 'WEDDING',
            'FIREMNI_AKCE' => 'CORPORATE',
            'FIREMNÍ_AKCE' => 'CORPORATE',
            'SOUKROMA_AKCE' => 'PRIVATE_EVENT',
            'SOUKROMÁ_AKCE' => 'PRIVATE_EVENT',
        ];

        return $typeMap[$eventTypeUpper] ?? $eventTypeUpper;
    }

    /**
     * Calculate staff requirements from formulas (legacy fallback method)
     * Used when no stored requirements exist and StaffRequirementService is not available
     */
    private function calculateRequirementsFromFormulas(Event $event, iterable $assignments): array
    {
        $totalGuests = $event->getGuestsTotal();
        $eventType = $event->getEventType();

        // Get applicable formulas
        $allFormulas = $this->staffingFormulaRepo->findEnabled();

        // Normalize event type to match formula naming convention
        $normalizedEventType = $eventType ? $this->normalizeEventType($eventType) : null;

        // Filter formulas by event type if applicable
        $formulas = [];
        if ($normalizedEventType) {
            // Try event-type-specific formulas first
            foreach ($allFormulas as $f) {
                if (str_ends_with(strtoupper($f->getCategory()), '_' . $normalizedEventType)) {
                    $formulas[] = $f;
                }
            }
        }

        // Fallback to generic formulas if no event-type-specific ones found
        if (empty($formulas)) {
            foreach ($allFormulas as $f) {
                if (!preg_match('/_[A-Z]+/', $f->getCategory())) {
                    $formulas[] = $f;
                }
            }
        }

        $required = [];

        foreach ($formulas as $formula) {
            $category = $this->normalizeCategory($formula->getCategory());
            $ratio = $formula->getRatio();
            $requiredCount = $ratio > 0 ? (int) ceil($totalGuests / $ratio) : 0;
            $categoryRoleId = $this->getRoleIdForCategory($category);

            // Count assigned staff in this category
            $assigned = 0;
            $confirmed = 0;
            $present = 0;
            $assignmentIds = [];
            foreach ($assignments as $assignment) {
                $roleId = $assignment->getStaffRoleId();
                $staffMember = $assignment->getStaffMemberId()
                    ? $this->staffMemberRepo->find($assignment->getStaffMemberId())
                    : null;
                $position = $staffMember?->getPosition();

                $matches = false;
                if ($roleId && $this->isRoleInCategory($roleId, $category)) {
                    $matches = true;
                } elseif ($position && $this->isPositionInCategory($position, $category)) {
                    $matches = true;
                }

                if ($matches) {
                    $assigned++;
                    $assignmentIds[] = $assignment->getId();
                    $status = $assignment->getAttendanceStatus();
                    if ($status === 'CONFIRMED') {
                        $confirmed++;
                    }
                    if ($status === 'PRESENT') {
                        $present++;
                        $confirmed++;
                    }
                }
            }

            $required[] = [
                'category' => $category,
                'label' => $this->translateCategoryLabel($category),
                'roleId' => $categoryRoleId,
                'required' => $requiredCount,
                'assigned' => $assigned,
                'confirmed' => $confirmed,
                'present' => $present,
                'shortfall' => max(0, $requiredCount - $assigned),
                'operationalShortfall' => max(0, $requiredCount - $present),
                'isManualOverride' => false,
                'assignmentIds' => $assignmentIds,
            ];
        }

        return $required;
    }

    private function eventToArray(Event $event): array
    {
        $guests = $event->getGuests();

        // Collect unique reservations with guest counts
        $reservationData = []; // [id => ['reservation' => Reservation, 'guestCount' => int]]
        foreach ($guests as $guest) {
            $reservation = $guest->getReservation();
            if ($reservation) {
                $resId = $reservation->getId();
                if (!isset($reservationData[$resId])) {
                    $reservationData[$resId] = [
                        'reservation' => $reservation,
                        'guestCount' => 0,
                    ];
                }
                $reservationData[$resId]['guestCount']++;
            }
        }

        // Build source reservations array
        $sourceReservations = [];
        foreach ($reservationData as $data) {
            $res = $data['reservation'];
            $sourceReservations[] = [
                'id' => $res->getId(),
                'contactName' => $res->getContactName() ?? 'Neznámý',
                'guestCount' => $data['guestCount'],
            ];
        }

        // Get space names
        $spaceNames = [];
        foreach ($event->getSpaces() as $space) {
            $spaceNames[] = $space->getSpaceName();
        }
        // If no spaces defined, use venue as default
        if (empty($spaceNames) && $event->getVenue()) {
            $spaceNames[] = $event->getVenue();
        }

        // Aggregate nationality breakdown from all guests
        $nationalityBreakdown = [];
        foreach ($guests as $guest) {
            $nat = $guest->getNationality() ?? 'unknown';
            $nationalityBreakdown[$nat] = ($nationalityBreakdown[$nat] ?? 0) + 1;
        }
        arsort($nationalityBreakdown);

        // Count paying vs non-paying guests based on type
        // driver, guide = non-paying (neplatící)
        // adult, child, infant = paying (platící)
        $guestsPaid = 0;
        $guestsFree = 0;
        foreach ($guests as $guest) {
            $type = $guest->getType();
            if ($type === 'driver' || $type === 'guide') {
                $guestsFree++;
            } else {
                $guestsPaid++;
            }
        }
        $guestsTotal = $guestsPaid + $guestsFree;

        // Calculate staff summary from staffing overview
        $staffingData = $this->getStaffingOverview($event);
        $staffRequired = 0;
        $staffAssigned = 0;
        $staffPresent = 0;
        foreach ($staffingData['required'] as $req) {
            $staffRequired += $req['required'];
            $staffAssigned += $req['assigned'];
            $staffPresent += $req['present'];
        }

        return [
            'id' => $event->getId(),
            'name' => $event->getName(),
            'eventType' => $this->normalizeEventTypeForFrontend($event->getEventType()),
            'eventDate' => $event->getEventDate()->format('Y-m-d'),
            'eventTime' => $event->getEventTime()->format('H:i:s'),
            'durationMinutes' => $event->getDurationMinutes(),
            'guestsPaid' => $guestsPaid,
            'guestsFree' => $guestsFree,
            'guestsTotal' => $guestsTotal,
            'venue' => $event->getVenue(),
            'status' => $event->getStatus(),
            'language' => $event->getLanguage(),
            'organizerCompany' => $event->getOrganizerCompany(),
            'organizerPerson' => $event->getOrganizerPerson(),
            'organizerPhone' => $event->getOrganizerPhone(),
            'organizerEmail' => $event->getOrganizerEmail(),
            'reservationCount' => count($sourceReservations),
            'spaces' => $spaceNames,
            'nationalityBreakdown' => $nationalityBreakdown,
            'sourceReservations' => $sourceReservations,
            'staffRequired' => $staffRequired,
            'staffAssigned' => $staffAssigned,
            'staffPresent' => $staffPresent,
        ];
    }
}
