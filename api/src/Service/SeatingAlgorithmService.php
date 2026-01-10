<?php

declare(strict_types=1);

namespace App\Service;

use App\Entity\Event;
use App\Entity\EventGuest;
use App\Entity\EventTable;
use Doctrine\ORM\EntityManagerInterface;

/**
 * Service for generating automatic seating suggestions.
 *
 * Algorithm:
 * 1. Group unassigned guests by nationality
 * 2. Sort tables by capacity (descending)
 * 3. Assign largest nationality groups to largest tables
 * 4. Split groups only if necessary
 * 5. Place mixed nationalities on remaining seats
 */
class SeatingAlgorithmService
{
    public function __construct(
        private readonly EntityManagerInterface $em
    ) {
    }

    /**
     * Generate a seating suggestion for an event.
     *
     * @return array{
     *   proposals: array<array{tableId: int, guestIds: int[], nationality: string, fillRate: float}>,
     *   unassigned: array<array{id: int, firstName: string|null, lastName: string|null, nationality: string|null}>
     * }
     */
    public function generateSuggestion(Event $event): array
    {
        // Get all unassigned guests (no table assigned)
        $unassignedGuests = [];
        foreach ($event->getGuests() as $guest) {
            if ($guest->getEventTable() === null) {
                $unassignedGuests[] = $guest;
            }
        }

        // Get all tables sorted by capacity (descending)
        $tables = $event->getTables()->toArray();
        usort($tables, fn(EventTable $a, EventTable $b) => $b->getCapacity() <=> $a->getCapacity());

        // Group guests by nationality
        $guestsByNationality = [];
        foreach ($unassignedGuests as $guest) {
            $nat = $guest->getNationality() ?? 'unknown';
            if (!isset($guestsByNationality[$nat])) {
                $guestsByNationality[$nat] = [];
            }
            $guestsByNationality[$nat][] = $guest;
        }

        // Sort nationality groups by size (descending)
        uasort($guestsByNationality, fn($a, $b) => count($b) <=> count($a));

        $proposals = [];
        $assignedGuestIds = [];

        // Track available capacity per table
        $tableCapacity = [];
        foreach ($tables as $table) {
            // Count already assigned guests
            $assignedCount = 0;
            foreach ($event->getGuests() as $guest) {
                if ($guest->getEventTable()?->getId() === $table->getId()) {
                    $assignedCount++;
                }
            }
            $tableCapacity[$table->getId()] = $table->getCapacity() - $assignedCount;
        }

        // Assign nationality groups to tables
        foreach ($guestsByNationality as $nationality => $guests) {
            $remainingGuests = $guests;

            while (!empty($remainingGuests)) {
                // Find best table for this group
                $bestTable = null;
                $bestFit = PHP_INT_MAX;

                foreach ($tables as $table) {
                    $availableCapacity = $tableCapacity[$table->getId()] ?? 0;
                    if ($availableCapacity <= 0) {
                        continue;
                    }

                    // Calculate how well this group fits
                    $groupSize = count($remainingGuests);
                    $diff = abs($availableCapacity - $groupSize);

                    // Prefer tables that fit the group exactly or have slightly more space
                    if ($availableCapacity >= $groupSize && $diff < $bestFit) {
                        $bestTable = $table;
                        $bestFit = $diff;
                    } elseif ($bestTable === null && $availableCapacity > 0) {
                        // If no perfect fit, use any available table
                        $bestTable = $table;
                        $bestFit = $diff;
                    }
                }

                if ($bestTable === null) {
                    // No more tables available
                    break;
                }

                // Assign guests to table
                $availableCapacity = $tableCapacity[$bestTable->getId()];
                $guestsToAssign = array_splice($remainingGuests, 0, $availableCapacity);
                $guestIds = array_map(fn(EventGuest $g) => $g->getId(), $guestsToAssign);

                $proposals[] = [
                    'tableId' => $bestTable->getId(),
                    'guestIds' => $guestIds,
                    'nationality' => $nationality,
                    'fillRate' => count($guestIds) / $bestTable->getCapacity(),
                ];

                $tableCapacity[$bestTable->getId()] -= count($guestIds);
                $assignedGuestIds = array_merge($assignedGuestIds, $guestIds);
            }
        }

        // Collect remaining unassigned guests
        $stillUnassigned = [];
        foreach ($unassignedGuests as $guest) {
            if (!in_array($guest->getId(), $assignedGuestIds, true)) {
                $stillUnassigned[] = [
                    'id' => $guest->getId(),
                    'firstName' => $guest->getFirstName(),
                    'lastName' => $guest->getLastName(),
                    'nationality' => $guest->getNationality(),
                ];
            }
        }

        return [
            'proposals' => $proposals,
            'unassigned' => $stillUnassigned,
        ];
    }

    /**
     * Apply a seating suggestion to the event.
     *
     * @param array<array{tableId: int, guestIds: int[]}> $assignments
     */
    public function applySuggestion(Event $event, array $assignments): void
    {
        $tableRepo = $this->em->getRepository(EventTable::class);
        $guestRepo = $this->em->getRepository(EventGuest::class);

        foreach ($assignments as $assignment) {
            $table = $tableRepo->find($assignment['tableId']);
            if (!$table || $table->getEvent()->getId() !== $event->getId()) {
                continue;
            }

            foreach ($assignment['guestIds'] as $guestId) {
                $guest = $guestRepo->find($guestId);
                if ($guest && $guest->getEvent()->getId() === $event->getId()) {
                    $guest->setEventTable($table);
                }
            }
        }

        $this->em->flush();
    }

    /**
     * Clear all seating assignments for an event.
     */
    public function clearSeating(Event $event): void
    {
        foreach ($event->getGuests() as $guest) {
            $guest->setEventTable(null);
        }

        $this->em->flush();
    }

    /**
     * Get seating statistics for an event.
     *
     * @return array{
     *   totalGuests: int,
     *   assignedGuests: int,
     *   unassignedGuests: int,
     *   tableUtilization: float,
     *   nationalityDistribution: array<string, int>
     * }
     */
    public function getSeatingStats(Event $event): array
    {
        $totalGuests = 0;
        $assignedGuests = 0;
        $nationalityDistribution = [];

        foreach ($event->getGuests() as $guest) {
            $totalGuests++;
            if ($guest->getEventTable() !== null) {
                $assignedGuests++;
            }
            $nat = $guest->getNationality() ?? 'unknown';
            $nationalityDistribution[$nat] = ($nationalityDistribution[$nat] ?? 0) + 1;
        }

        $totalCapacity = 0;
        foreach ($event->getTables() as $table) {
            $totalCapacity += $table->getCapacity();
        }

        return [
            'totalGuests' => $totalGuests,
            'assignedGuests' => $assignedGuests,
            'unassignedGuests' => $totalGuests - $assignedGuests,
            'tableUtilization' => $totalCapacity > 0 ? $assignedGuests / $totalCapacity : 0.0,
            'nationalityDistribution' => $nationalityDistribution,
        ];
    }
}
