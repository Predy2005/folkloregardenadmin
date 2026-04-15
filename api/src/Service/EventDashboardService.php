<?php

declare(strict_types=1);

namespace App\Service;

use App\Entity\Event;
use App\Repository\CashboxTransferRepository;
use App\Serializer\CashboxSerializer;

class EventDashboardService
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
        private EventGuestStatsService $guestStatsService,
        private EventFinancialsService $financialsService,
        private CashboxService $cashboxService,
        private CashboxSerializer $cashboxSerializer,
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
            'guestsBySpace' => $this->guestStatsService->getGuestsBySpace($event),
            'staffing' => $this->guestStatsService->getStaffingOverview($event),
            'transport' => $this->guestStatsService->getTransportSummary($event),
            'vouchers' => $this->guestStatsService->getVoucherSummary($event),
            'financials' => $this->financialsService->getFinancials($event),
            'stats' => $this->getQuickStats($event),
            'pendingTransfers' => array_map(
                fn($t) => $this->cashboxSerializer->serializeTransfer($t),
                $pendingTransfers
            ),
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
        $staffingData = $this->guestStatsService->getStaffingOverview($event);
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
