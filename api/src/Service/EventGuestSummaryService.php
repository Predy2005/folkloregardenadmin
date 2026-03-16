<?php

declare(strict_types=1);

namespace App\Service;

use App\Entity\Event;
use App\Entity\EventGuest;
use App\Repository\ReservationRepository;

/**
 * Unified service for calculating guest statistics
 *
 * This service is the SINGLE SOURCE OF TRUTH for all guest-related counts.
 * All components should use this service to avoid data inconsistencies.
 *
 * TERMINOLOGY:
 * - "paying guest" = guest type is adult/child (has payment obligation)
 * - "free guest" = guest type is driver/guide (no payment required)
 * - "paid" = reservation payment status is PAID
 * - "present" = guest has checked in at venue
 */
class EventGuestSummaryService
{
    public function __construct(
        private ReservationRepository $reservationRepo,
    ) {
    }

    /**
     * Get complete guest summary for an event
     * This is the main method - returns all guest-related data in one call
     */
    public function getGuestSummary(Event $event): array
    {
        $guests = $event->getGuests();
        $spaces = $this->getEventSpaces($event);

        // Build data by space
        $bySpace = [];
        foreach ($spaces as $index => $spaceName) {
            $isFirstSpace = ($index === 0);
            $spaceGuests = $this->filterGuestsBySpace($guests, $spaceName, $isFirstSpace);
            $bySpace[] = $this->buildSpaceData($spaceName, $spaceGuests);
        }

        // Build data by reservation
        $byReservation = $this->buildReservationData($guests);

        // Calculate aggregates
        $types = $this->aggregateTypes($bySpace);
        $presence = $this->aggregatePresence($bySpace);
        $payments = $this->calculatePaymentStatus($byReservation);

        return [
            'types' => $types,
            'presence' => $presence,
            'payments' => $payments,
            'bySpace' => $bySpace,
            'byReservation' => $byReservation,
        ];
    }

    /**
     * Build guest type breakdown
     */
    private function buildTypeBreakdown(iterable $guests): array
    {
        $adults = 0;
        $children = 0;
        $drivers = 0;
        $guides = 0;

        foreach ($guests as $guest) {
            $type = $guest->getType();
            match ($type) {
                'adult' => $adults++,
                'child' => $children++,
                'driver' => $drivers++,
                'guide' => $guides++,
                default => $adults++, // Default to adult if unknown
            };
        }

        $paying = $adults + $children;
        $free = $drivers + $guides;
        $total = $paying + $free;

        return [
            'total' => $total,
            'paying' => $paying,
            'free' => $free,
            'adults' => $adults,
            'children' => $children,
            'drivers' => $drivers,
            'guides' => $guides,
        ];
    }

    /**
     * Build presence status
     */
    private function buildPresenceStatus(iterable $guests): array
    {
        $total = 0;
        $present = 0;

        foreach ($guests as $guest) {
            $total++;
            if ($guest->isPresent()) {
                $present++;
            }
        }

        $absent = $total - $present;
        $percentage = $total > 0 ? round(($present / $total) * 100, 1) : 0;

        return [
            'total' => $total,
            'present' => $present,
            'absent' => $absent,
            'percentage' => $percentage,
        ];
    }

    /**
     * Build space data
     */
    private function buildSpaceData(string $spaceName, array $guests): array
    {
        return [
            'spaceName' => $spaceName,
            'types' => $this->buildTypeBreakdown($guests),
            'presence' => $this->buildPresenceStatus($guests),
            'nationalityBreakdown' => $this->getNationalityBreakdown($guests),
            'menuBreakdown' => $this->getMenuBreakdown($guests),
        ];
    }

    /**
     * Build reservation data with payment status and menu breakdown
     */
    private function buildReservationData(iterable $guests): array
    {
        // Group guests by reservation
        $byReservation = [];
        foreach ($guests as $guest) {
            $reservation = $guest->getReservation();
            if (!$reservation) {
                continue;
            }

            $resId = $reservation->getId();
            if (!isset($byReservation[$resId])) {
                $byReservation[$resId] = [
                    'reservation' => $reservation,
                    'guests' => [],
                ];
            }
            $byReservation[$resId]['guests'][] = $guest;
        }

        // Build result
        $result = [];
        foreach ($byReservation as $data) {
            $reservation = $data['reservation'];
            $resGuests = $data['guests'];

            $types = $this->buildTypeBreakdown($resGuests);
            $presence = $this->buildPresenceStatus($resGuests);
            $menuBreakdown = $this->getMenuBreakdownWithIds($resGuests);

            // Determine primary space (most common among guests)
            $spaceName = $this->getPrimarySpace($resGuests);

            $totalPrice = (float) ($reservation->getTotalPrice() ?? 0);
            $paidAmount = (float) ($reservation->getPaidAmount() ?? 0);
            $paidPercentage = $totalPrice > 0 ? $paidAmount / $totalPrice : 1.0;

            $result[] = [
                'reservationId' => $reservation->getId(),
                'contactName' => $reservation->getContactName(),
                'contactPhone' => $reservation->getContactPhone(),
                'contactEmail' => $reservation->getContactEmail(),
                'nationality' => $reservation->getContactNationality(),
                'types' => $types,
                'presence' => $presence,
                'paymentStatus' => $reservation->getPaymentStatus() ?? 'UNPAID',
                'paymentMethod' => $reservation->getPaymentMethod(),
                'totalPrice' => $totalPrice,
                'paidAmount' => $paidAmount,
                'paidPercentage' => round($paidPercentage, 2),
                'menuBreakdown' => $menuBreakdown,
                'spaceName' => $spaceName,
                'reservationType' => $reservation->getReservationType() ? [
                    'id' => $reservation->getReservationType()->getId(),
                    'name' => $reservation->getReservationType()->getName(),
                    'code' => $reservation->getReservationType()->getCode(),
                    'color' => $reservation->getReservationType()->getColor(),
                    'note' => $reservation->getReservationType()->getNote(),
                ] : null,
            ];
        }

        return $result;
    }

    /**
     * Get menu breakdown with IDs (for move operations)
     */
    private function getMenuBreakdownWithIds(array $guests): array
    {
        $breakdown = [];
        foreach ($guests as $guest) {
            $menuItem = $guest->getMenuItem();
            $menuId = $menuItem ? $menuItem->getId() : null;
            $menuName = $menuItem ? $menuItem->getMenuName() : 'Bez menu';
            $surcharge = $menuItem ? (float) ($menuItem->getPricePerUnit() ?? 0) : 0;

            $key = $menuId ?? 'none';
            if (!isset($breakdown[$key])) {
                $breakdown[$key] = [
                    'menuName' => $menuName,
                    'menuId' => $menuId,
                    'count' => 0,
                    'surcharge' => $surcharge,
                ];
            }
            $breakdown[$key]['count']++;
        }
        return array_values($breakdown);
    }

    /**
     * Get primary space for a group of guests
     */
    private function getPrimarySpace(array $guests): ?string
    {
        $spaceCounts = [];
        foreach ($guests as $guest) {
            $space = $guest->getSpace();
            if ($space) {
                $spaceCounts[$space] = ($spaceCounts[$space] ?? 0) + 1;
            }
        }

        if (empty($spaceCounts)) {
            return null;
        }

        arsort($spaceCounts);
        return array_key_first($spaceCounts);
    }

    /**
     * Calculate payment status from reservations
     */
    private function calculatePaymentStatus(array $byReservation): array
    {
        $totalExpected = 0;
        $totalPaid = 0;
        $guestsPaid = 0;
        $guestsPartial = 0;
        $guestsUnpaid = 0;
        $reservationsPaid = 0;
        $reservationsPartial = 0;
        $reservationsUnpaid = 0;

        foreach ($byReservation as $resData) {
            $totalExpected += $resData['totalPrice'];
            $totalPaid += $resData['paidAmount'];
            $payingGuests = $resData['types']['paying'];

            switch ($resData['paymentStatus']) {
                case 'PAID':
                    $guestsPaid += $payingGuests;
                    $reservationsPaid++;
                    break;
                case 'PARTIAL':
                    // Proportionally calculate paid guests
                    $paidGuests = (int) round($payingGuests * $resData['paidPercentage']);
                    $guestsPaid += $paidGuests;
                    $guestsPartial += ($payingGuests - $paidGuests);
                    $reservationsPartial++;
                    break;
                default: // UNPAID
                    $guestsUnpaid += $payingGuests;
                    $reservationsUnpaid++;
                    break;
            }
        }

        return [
            'totalExpected' => $totalExpected,
            'totalPaid' => $totalPaid,
            'totalRemaining' => max(0, $totalExpected - $totalPaid),
            'guestsPaid' => $guestsPaid,
            'guestsPartial' => $guestsPartial,
            'guestsUnpaid' => $guestsUnpaid,
            'reservationsPaid' => $reservationsPaid,
            'reservationsPartial' => $reservationsPartial,
            'reservationsUnpaid' => $reservationsUnpaid,
        ];
    }

    /**
     * Aggregate types from spaces
     */
    private function aggregateTypes(array $bySpace): array
    {
        $result = [
            'total' => 0,
            'paying' => 0,
            'free' => 0,
            'adults' => 0,
            'children' => 0,
            'drivers' => 0,
            'guides' => 0,
        ];

        foreach ($bySpace as $space) {
            foreach ($result as $key => $value) {
                $result[$key] += $space['types'][$key];
            }
        }

        return $result;
    }

    /**
     * Aggregate presence from spaces
     */
    private function aggregatePresence(array $bySpace): array
    {
        $total = 0;
        $present = 0;

        foreach ($bySpace as $space) {
            $total += $space['presence']['total'];
            $present += $space['presence']['present'];
        }

        $absent = $total - $present;
        $percentage = $total > 0 ? round(($present / $total) * 100, 1) : 0;

        return [
            'total' => $total,
            'present' => $present,
            'absent' => $absent,
            'percentage' => $percentage,
        ];
    }

    /**
     * Get event spaces
     */
    private function getEventSpaces(Event $event): array
    {
        $spaces = $event->getSpaces();
        $spaceNames = [];

        foreach ($spaces as $space) {
            $spaceNames[] = strtolower($space->getSpaceName());
        }

        if (empty($spaceNames)) {
            $spaceNames[] = strtolower($event->getVenue() ?? 'ROUBENKA');
        }

        return $spaceNames;
    }

    /**
     * Filter guests by space
     */
    private function filterGuestsBySpace(iterable $guests, string $spaceName, bool $isFirstSpace): array
    {
        $result = [];

        foreach ($guests as $guest) {
            $guestSpace = $guest->getSpace();

            if ($guestSpace !== null) {
                if (strcasecmp($guestSpace, $spaceName) === 0) {
                    $result[] = $guest;
                }
                continue;
            }

            // Fallback: guests without space go to first space
            if ($isFirstSpace) {
                $result[] = $guest;
            }
        }

        return $result;
    }

    /**
     * Get nationality breakdown
     */
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

    /**
     * Get menu breakdown
     */
    private function getMenuBreakdown(array $guests): array
    {
        $breakdown = [];
        foreach ($guests as $guest) {
            $menuItem = $guest->getMenuItem();
            $menuName = $menuItem ? $menuItem->getMenuName() : 'Bez menu';
            $surcharge = $menuItem ? (float) ($menuItem->getPricePerUnit() ?? 0) : 0;

            if (!isset($breakdown[$menuName])) {
                $breakdown[$menuName] = [
                    'menuName' => $menuName,
                    'count' => 0,
                    'surcharge' => $surcharge,
                ];
            }
            $breakdown[$menuName]['count']++;
        }
        return array_values($breakdown);
    }
}
