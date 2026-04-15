<?php

namespace App\Controller;

use App\Entity\Event;
use App\Entity\EventGuest;
use App\Repository\EventRepository;
use App\Repository\EventGuestRepository;
use App\Service\EventGuestSyncService;
use App\Service\EventGuestSummaryService;
use App\Service\SeatingAlgorithmService;
use App\Service\EventSerializer;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Annotation\Route;
use Symfony\Component\Security\Http\Attribute\IsGranted;

#[Route('/api/events')]
class EventGuestController extends AbstractController
{
    private EventGuestRepository $guestRepo;

    public function __construct(
        private readonly EntityManagerInterface $em,
        private readonly EventGuestSyncService $guestSync,
        private readonly EventGuestSummaryService $guestSummaryService,
        private readonly SeatingAlgorithmService $seatingService,
        private readonly EventSerializer $eventSerializer,
    ) {
        $this->guestRepo = $this->em->getRepository(EventGuest::class);
    }

    /**
     * Ensure EventGuest records are up-to-date with current reservations.
     * Idempotent: preserves IDs, eventTable assignments, presence, etc.
     * Call this once on dashboard mount (or after reservation changes).
     */
    #[Route('/{id}/guests/sync', name: 'event_guests_sync', methods: ['POST'])]
    #[IsGranted('events.update')]
    public function syncGuests(int $id, EventRepository $eventRepository): JsonResponse
    {
        $event = $eventRepository->find($id);
        if (!$event) {
            return $this->json(['error' => 'Not found'], 404);
        }
        $this->guestSync->syncForEvent($event);
        return $this->json(['success' => true, 'guestCount' => $event->getGuests()->count()]);
    }

    #[Route('/{id}/guests', name: 'event_guests_list', methods: ['GET'])]
    #[IsGranted('events.read')]
    public function listGuests(int $id, EventRepository $eventRepository): JsonResponse
    {
        $event = $eventRepository->find($id);
        if (!$event) {
            return $this->json(['error' => 'Not found'], 404);
        }

        $guests = [];
        foreach ($event->getGuests() as $g) {
            $menuItem = $g->getMenuItem();
            $guests[] = [
                'id' => $g->getId(),
                'firstName' => $g->getFirstName(),
                'lastName' => $g->getLastName(),
                'nationality' => $g->getNationality(),
                'type' => $g->getType(),
                'isPaid' => $g->isPaid(),
                'isPresent' => $g->isPresent(),
                'eventTableId' => $g->getEventTable()?->getId(),
                'personIndex' => $g->getPersonIndex(),
                'reservationId' => $g->getReservation()?->getId(),
                'menuItemId' => $menuItem?->getId(),
                'menuName' => $menuItem?->getMenuName(),
                'notes' => $g->getNotes(),
            ];
        }

        return $this->json($guests);
    }

    /**
     * Get unified guest summary - SINGLE SOURCE OF TRUTH
     */
    #[Route('/{id}/guest-summary', name: 'event_guest_summary', methods: ['GET'])]
    #[IsGranted('events.read')]
    public function getGuestSummary(int $id, EventRepository $eventRepository): JsonResponse
    {
        $event = $eventRepository->find($id);
        if (!$event) {
            return $this->json(['error' => 'Event not found'], 404);
        }

        $summary = $this->guestSummaryService->getGuestSummary($event);

        return $this->json($summary);
    }

    /**
     * Get guests grouped by reservation for efficient check-in
     */
    #[Route('/{id}/guests/by-reservation', name: 'event_guests_by_reservation', methods: ['GET'])]
    #[IsGranted('events.read')]
    public function getGuestsByReservation(int $id, EventRepository $eventRepository): JsonResponse
    {
        $event = $eventRepository->find($id);
        if (!$event) {
            return $this->json(['error' => 'Not found'], 404);
        }

        // Group guests by reservation
        $groups = [];
        $noReservationGuests = [];

        foreach ($event->getGuests() as $guest) {
            $reservation = $guest->getReservation();
            if ($reservation) {
                $resId = $reservation->getId();
                if (!isset($groups[$resId])) {
                    $groups[$resId] = [
                        'reservationId' => $resId,
                        'contactName' => $reservation->getContactName(),
                        'contactPhone' => $reservation->getContactPhone(),
                        'nationality' => $reservation->getContactNationality(),
                        'totalCount' => 0,
                        'presentCount' => 0,
                        'paidCount' => 0,
                        'adultCount' => 0,
                        'childCount' => 0,
                        'driverCount' => 0,
                        'guideCount' => 0,
                        'guestIds' => [],
                    ];
                }
                $groups[$resId]['totalCount']++;
                $groups[$resId]['guestIds'][] = $guest->getId();
                if ($guest->isPresent()) {
                    $groups[$resId]['presentCount']++;
                }
                if ($guest->isPaid()) {
                    $groups[$resId]['paidCount']++;
                }
                $guestType = $guest->getType();
                switch ($guestType) {
                    case 'adult':
                        $groups[$resId]['adultCount']++;
                        break;
                    case 'child':
                        $groups[$resId]['childCount']++;
                        break;
                    case 'driver':
                        $groups[$resId]['driverCount']++;
                        break;
                    case 'guide':
                        $groups[$resId]['guideCount']++;
                        break;
                    default:
                        $groups[$resId]['adultCount']++;
                }
            } else {
                $noReservationGuests[] = [
                    'id' => $guest->getId(),
                    'name' => trim($guest->getFirstName() . ' ' . $guest->getLastName()) ?: 'Host #' . $guest->getId(),
                    'isPresent' => $guest->isPresent(),
                    'type' => $guest->getType(),
                ];
            }
        }

        // Calculate totals
        $totalGuests = 0;
        $totalPresent = 0;
        foreach ($groups as $group) {
            $totalGuests += $group['totalCount'];
            $totalPresent += $group['presentCount'];
        }
        $totalGuests += count($noReservationGuests);
        $totalPresent += count(array_filter($noReservationGuests, fn($g) => $g['isPresent']));

        return $this->json([
            'groups' => array_values($groups),
            'ungroupedGuests' => $noReservationGuests,
            'summary' => [
                'totalGroups' => count($groups),
                'totalGuests' => $totalGuests,
                'totalPresent' => $totalPresent,
            ]
        ]);
    }

    /**
     * Update presence count for a reservation group
     */
    #[Route('/{id}/guests/reservation/{reservationId}/presence', name: 'event_guests_reservation_presence', methods: ['PUT'])]
    #[IsGranted('events.update')]
    public function updateReservationPresence(int $id, int $reservationId, Request $request, EventRepository $eventRepository): JsonResponse
    {
        $event = $eventRepository->find($id);
        if (!$event) {
            return $this->json(['error' => 'Event not found'], 404);
        }

        $data = json_decode($request->getContent(), true) ?? [];
        $presentCount = (int) ($data['presentCount'] ?? 0);

        // Get all guests from this reservation for this event
        $guests = [];
        foreach ($event->getGuests() as $guest) {
            if ($guest->getReservation()?->getId() === $reservationId) {
                $guests[] = $guest;
            }
        }

        if (empty($guests)) {
            return $this->json(['error' => 'No guests found for this reservation'], 404);
        }

        // Validate count
        $maxCount = count($guests);
        $presentCount = max(0, min($presentCount, $maxCount));

        // Update presence - first N are present, rest are not
        $updatedCount = 0;
        foreach ($guests as $index => $guest) {
            $shouldBePresent = $index < $presentCount;
            if ($guest->isPresent() !== $shouldBePresent) {
                $guest->setIsPresent($shouldBePresent);
                $updatedCount++;
            }
        }

        $this->em->flush();

        return $this->json([
            'status' => 'success',
            'reservationId' => $reservationId,
            'presentCount' => $presentCount,
            'totalCount' => $maxCount,
            'updatedCount' => $updatedCount,
        ]);
    }

    /**
     * Sync guests from reservations for folklorni_show events
     */
    #[Route('/{id}/guests/from-reservations', name: 'event_guests_sync_from_reservations', methods: ['POST'])]
    #[IsGranted('events.update')]
    public function syncGuestsFromReservations(int $id, EventRepository $eventRepository): JsonResponse
    {
        $event = $eventRepository->find($id);
        if (!$event) {
            return $this->json(['error' => 'Not found'], 404);
        }

        // Only allow sync for folklorni_show events
        if ($event->getEventType() !== 'folklorni_show') {
            return $this->json(['error' => 'Synchronizace z rezervací je možná pouze pro Folklorní show'], 400);
        }

        $this->guestSync->syncForEvent($event);
        $this->em->refresh($event);

        $count = count($event->getGuests());
        return $this->json(['status' => 'synced', 'guestsCount' => $count]);
    }

    /**
     * Create a new guest for an event
     */
    #[Route('/{id}/guests', name: 'event_guests_create', methods: ['POST'])]
    #[IsGranted('events.update')]
    public function createGuest(int $id, Request $request, EventRepository $eventRepository): JsonResponse
    {
        $event = $eventRepository->find($id);
        if (!$event) {
            return $this->json(['error' => 'Not found'], 404);
        }

        $data = json_decode($request->getContent(), true) ?? [];

        $guest = new EventGuest();
        $guest->setEvent($event);
        $guest->setFirstName($data['firstName'] ?? '');
        $guest->setLastName($data['lastName'] ?? null);
        $guest->setNationality($data['nationality'] ?? null);
        $guest->setType($data['type'] ?? 'adult');
        $guest->setIsPaid($data['isPaid'] ?? false);
        $guest->setIsPresent($data['isPresent'] ?? false);
        $guest->setNotes($data['notes'] ?? null);

        // Calculate next person index
        $maxIndex = 0;
        foreach ($event->getGuests() as $g) {
            if ($g->getPersonIndex() > $maxIndex) {
                $maxIndex = $g->getPersonIndex();
            }
        }
        $guest->setPersonIndex($maxIndex + 1);

        $this->em->persist($guest);
        $this->em->flush();

        return $this->json(['status' => 'created', 'id' => $guest->getId()], 201);
    }

    /**
     * Bulk create guests for an event
     */
    #[Route('/{id}/guests/bulk', name: 'event_guests_bulk_create', methods: ['POST'])]
    #[IsGranted('events.update')]
    public function bulkCreateGuests(int $id, Request $request, EventRepository $eventRepository): JsonResponse
    {
        $event = $eventRepository->find($id);
        if (!$event) {
            return $this->json(['error' => 'Not found'], 404);
        }

        $data = json_decode($request->getContent(), true) ?? [];
        $count = (int)($data['count'] ?? 0);
        $type = $data['type'] ?? 'adult';
        $isPaid = $data['isPaid'] ?? true;
        $nationality = $data['nationality'] ?? null;
        $notes = $data['notes'] ?? null;

        if ($count < 1 || $count > 500) {
            return $this->json(['error' => 'Count must be between 1 and 500'], 400);
        }

        // Calculate starting person index
        $maxIndex = 0;
        foreach ($event->getGuests() as $g) {
            if ($g->getPersonIndex() > $maxIndex) {
                $maxIndex = $g->getPersonIndex();
            }
        }

        $createdIds = [];
        for ($i = 0; $i < $count; $i++) {
            $guest = new EventGuest();
            $guest->setEvent($event);
            $guest->setFirstName($type === 'adult' ? 'Host' : ($type === 'child' ? 'Dítě' : ucfirst($type)));
            $guest->setType($type);
            $guest->setIsPaid($isPaid);
            $guest->setIsPresent(false);
            $guest->setNationality($nationality);
            $guest->setNotes($notes);
            $guest->setPersonIndex($maxIndex + $i + 1);
            $this->em->persist($guest);
            $createdIds[] = $guest;
        }

        $this->em->flush();

        return $this->json([
            'status' => 'created',
            'count' => $count,
            'ids' => array_map(fn($g) => $g->getId(), $createdIds)
        ], 201);
    }

    /**
     * Update a guest
     */
    #[Route('/{eventId}/guests/{guestId}', name: 'event_guests_update', methods: ['PUT', 'PATCH'])]
    #[IsGranted('events.update')]
    public function updateGuest(int $eventId, int $guestId, Request $request, EventRepository $eventRepository): JsonResponse
    {
        $event = $eventRepository->find($eventId);
        if (!$event) {
            return $this->json(['error' => 'Event not found'], 404);
        }

        $guest = $this->guestRepo->find($guestId);
        if (!$guest || $guest->getEvent()?->getId() !== $eventId) {
            return $this->json(['error' => 'Guest not found'], 404);
        }

        $data = json_decode($request->getContent(), true) ?? [];

        if (isset($data['firstName'])) $guest->setFirstName($data['firstName']);
        if (isset($data['lastName'])) $guest->setLastName($data['lastName']);
        if (isset($data['nationality'])) $guest->setNationality($data['nationality']);
        if (isset($data['type'])) $guest->setType($data['type']);
        if (array_key_exists('isPaid', $data)) $guest->setIsPaid((bool)$data['isPaid']);
        if (array_key_exists('isPresent', $data)) $guest->setIsPresent((bool)$data['isPresent']);
        if (array_key_exists('notes', $data)) $guest->setNotes($data['notes']);

        $this->em->flush();

        return $this->json(['status' => 'updated']);
    }

    /**
     * Bulk update guests
     */
    #[Route('/{id}/guests/bulk-update', name: 'event_guests_bulk_update', methods: ['PUT', 'PATCH'])]
    #[IsGranted('events.update')]
    public function bulkUpdateGuests(int $id, Request $request, EventRepository $eventRepository): JsonResponse
    {
        $event = $eventRepository->find($id);
        if (!$event) {
            return $this->json(['error' => 'Event not found'], 404);
        }

        $data = json_decode($request->getContent(), true) ?? [];
        $guestIds = $data['guestIds'] ?? [];
        $updates = $data['updates'] ?? [];

        if (empty($guestIds) || !is_array($guestIds)) {
            return $this->json(['error' => 'Missing guestIds array'], 400);
        }

        $updatedCount = 0;
        foreach ($guestIds as $guestId) {
            $guest = $this->guestRepo->find($guestId);
            if (!$guest || $guest->getEvent()?->getId() !== $id) {
                continue;
            }

            if (isset($updates['nationality'])) $guest->setNationality($updates['nationality']);
            if (isset($updates['type'])) $guest->setType($updates['type']);
            if (array_key_exists('isPaid', $updates)) $guest->setIsPaid((bool)$updates['isPaid']);
            if (array_key_exists('isPresent', $updates)) $guest->setIsPresent((bool)$updates['isPresent']);
            if (array_key_exists('notes', $updates)) $guest->setNotes($updates['notes']);
            $updatedCount++;
        }

        $this->em->flush();

        return $this->json(['status' => 'updated', 'count' => $updatedCount]);
    }

    /**
     * Delete a guest
     */
    #[Route('/{eventId}/guests/{guestId}', name: 'event_guests_delete', methods: ['DELETE'])]
    #[IsGranted('events.update')]
    public function deleteGuest(int $eventId, int $guestId, EventRepository $eventRepository): JsonResponse
    {
        $event = $eventRepository->find($eventId);
        if (!$event) {
            return $this->json(['error' => 'Event not found'], 404);
        }

        $guest = $this->guestRepo->find($guestId);
        if (!$guest || $guest->getEvent()?->getId() !== $eventId) {
            return $this->json(['error' => 'Guest not found'], 404);
        }

        $this->em->remove($guest);
        $this->em->flush();

        return $this->json(['status' => 'deleted']);
    }

    /**
     * Bulk delete guests
     */
    #[Route('/{id}/guests/bulk-delete', name: 'event_guests_bulk_delete', methods: ['DELETE'])]
    #[IsGranted('events.update')]
    public function bulkDeleteGuests(int $id, Request $request, EventRepository $eventRepository): JsonResponse
    {
        $event = $eventRepository->find($id);
        if (!$event) {
            return $this->json(['error' => 'Event not found'], 404);
        }

        $data = json_decode($request->getContent(), true) ?? [];
        $guestIds = $data['guestIds'] ?? [];

        if (empty($guestIds) || !is_array($guestIds)) {
            return $this->json(['error' => 'Missing guestIds array'], 400);
        }

        $deletedCount = 0;
        foreach ($guestIds as $guestId) {
            $guest = $this->guestRepo->find($guestId);
            if (!$guest || $guest->getEvent()?->getId() !== $id) {
                continue;
            }
            $this->em->remove($guest);
            $deletedCount++;
        }

        $this->em->flush();

        return $this->json(['status' => 'deleted', 'count' => $deletedCount]);
    }

    /**
     * Mark all guests as present (quick check-in)
     */
    #[Route('/{id}/guests/mark-all-present', name: 'event_guests_mark_all_present', methods: ['POST'])]
    #[IsGranted('events.update')]
    public function markAllGuestsPresent(int $id, EventRepository $eventRepository): JsonResponse
    {
        $event = $eventRepository->find($id);
        if (!$event) {
            return $this->json(['error' => 'Event not found'], 404);
        }

        $updatedCount = 0;
        foreach ($event->getGuests() as $guest) {
            if (!$guest->isPresent()) {
                $guest->setIsPresent(true);
                $updatedCount++;
            }
        }

        $this->em->flush();

        return $this->json([
            'status' => 'success',
            'updatedCount' => $updatedCount,
            'totalGuests' => count($event->getGuests())
        ]);
    }

    /**
     * Move guests between spaces.
     */
    #[Route('/{id}/guests/move-to-space', name: 'event_guests_move_space', methods: ['POST'])]
    #[IsGranted('events.update')]
    public function moveGuestsToSpace(int $id, Request $request, EventRepository $eventRepository): JsonResponse
    {
        $event = $eventRepository->find($id);
        if (!$event) {
            return $this->json(['error' => 'Event not found'], 404);
        }

        $data = json_decode($request->getContent(), true) ?? [];
        $targetSpace = $data['targetSpace'] ?? null;

        if (empty($targetSpace)) {
            return $this->json(['error' => 'Target space is required'], 400);
        }

        // Normalize space names to lowercase for consistency
        $targetSpace = strtolower($targetSpace);

        // Filter options
        $guestIds = $data['guestIds'] ?? null;
        $nationality = $data['nationality'] ?? null;
        $reservationId = $data['reservationId'] ?? null;
        $sourceSpace = isset($data['sourceSpace']) ? strtolower($data['sourceSpace']) : null;
        // Limit how many guests to move (null = all matching)
        $countLimit = isset($data['count']) ? (int) $data['count'] : null;

        // Determine the "default" space (first configured space) for guests without explicit assignment
        $eventSpaces = $event->getSpaces();
        $defaultSpace = null;
        $allSpaceNames = [];
        foreach ($eventSpaces as $sp) {
            $allSpaceNames[] = strtolower($sp->getSpaceName());
            if ($defaultSpace === null) {
                $defaultSpace = strtolower($sp->getSpaceName());
            }
        }
        if ($defaultSpace === null) {
            $defaultSpace = strtolower($event->getVenue() ?? 'ROUBENKA');
        }

        $movedCount = 0;
        $guests = $event->getGuests();

        // First, collect all guests that match the criteria
        $matchingGuests = [];
        foreach ($guests as $guest) {
            // Determine current space: explicit space > table room > default space (normalized to lowercase)
            $explicitSpace = $guest->getSpace() ? strtolower($guest->getSpace()) : null;
            $tableRoom = $guest->getEventTable()?->getRoom() ? strtolower($guest->getEventTable()->getRoom()) : null;
            $currentSpace = $explicitSpace ?? $tableRoom ?? $defaultSpace;

            // Skip if guest is already in target space (case-insensitive)
            if (strcasecmp($currentSpace, $targetSpace) === 0) {
                continue;
            }

            $shouldMove = false;

            // Helper for case-insensitive space comparison
            $spaceMatches = fn($a, $b) => $a !== null && $b !== null && strcasecmp($a, $b) === 0;

            // If specific guest IDs provided, use those
            if ($guestIds !== null && is_array($guestIds)) {
                $shouldMove = in_array($guest->getId(), $guestIds);
            }
            // If filtering by nationality
            elseif ($nationality !== null) {
                $guestNat = $guest->getNationality();
                $shouldMove = ($guestNat === $nationality);
                // Also check source space if specified (case-insensitive)
                if ($shouldMove && $sourceSpace !== null) {
                    $shouldMove = $spaceMatches($currentSpace, $sourceSpace);
                }
            }
            // If filtering by reservation
            elseif ($reservationId !== null) {
                $guestResId = $guest->getReservation()?->getId();
                $shouldMove = ($guestResId === (int) $reservationId);
                // Also check source space if specified (case-insensitive)
                if ($shouldMove && $sourceSpace !== null) {
                    $shouldMove = $spaceMatches($currentSpace, $sourceSpace);
                }
            }
            // If source space provided, move all from that space (case-insensitive)
            elseif ($sourceSpace !== null) {
                $shouldMove = $spaceMatches($currentSpace, $sourceSpace);
            }

            if ($shouldMove) {
                $matchingGuests[] = $guest;
            }
        }

        // Apply count limit if specified
        $guestsToMove = $matchingGuests;
        if ($countLimit !== null && $countLimit > 0 && $countLimit < count($matchingGuests)) {
            $guestsToMove = array_slice($matchingGuests, 0, $countLimit);
        }

        // Move the guests
        foreach ($guestsToMove as $guest) {
            $guest->setSpace($targetSpace);
            $this->em->persist($guest);
            $movedCount++;
        }

        $this->em->flush();

        return $this->json([
            'status' => 'success',
            'movedCount' => $movedCount,
            'totalMatching' => count($matchingGuests),
            'targetSpace' => $targetSpace,
        ]);
    }

    /**
     * Get presence info grouped by reservation and nationality.
     */
    #[Route('/{id}/guests/presence-grouping', name: 'event_guests_presence_grouping', methods: ['GET'])]
    #[IsGranted('events.read')]
    public function getPresenceGrouping(int $id, EventRepository $eventRepository): JsonResponse
    {
        $event = $eventRepository->find($id);
        if (!$event) {
            return $this->json(['error' => 'Event not found'], 404);
        }

        $byReservation = [];
        $byNationality = [];

        foreach ($event->getGuests() as $guest) {
            $isPresent = $guest->isPresent();

            // Group by reservation
            $res = $guest->getReservation();
            if ($res) {
                $resId = $res->getId();
                if (!isset($byReservation[$resId])) {
                    $byReservation[$resId] = [
                        'reservationId' => $resId,
                        'contactName' => $res->getContactName() ?? 'Neznama rezervace',
                        'totalCount' => 0,
                        'presentCount' => 0,
                    ];
                }
                $byReservation[$resId]['totalCount']++;
                if ($isPresent) {
                    $byReservation[$resId]['presentCount']++;
                }
            }

            // Group by nationality
            $nat = $guest->getNationality() ?? 'unknown';
            if (!isset($byNationality[$nat])) {
                $byNationality[$nat] = [
                    'nationality' => $nat,
                    'totalCount' => 0,
                    'presentCount' => 0,
                ];
            }
            $byNationality[$nat]['totalCount']++;
            if ($isPresent) {
                $byNationality[$nat]['presentCount']++;
            }
        }

        // Sort by totalCount descending
        $reservationValues = array_values($byReservation);
        usort($reservationValues, fn($a, $b) => $b['totalCount'] - $a['totalCount']);

        $nationalityValues = array_values($byNationality);
        usort($nationalityValues, fn($a, $b) => $b['totalCount'] - $a['totalCount']);

        return $this->json([
            'byReservation' => $reservationValues,
            'byNationality' => $nationalityValues,
        ]);
    }

    /**
     * Mark presence for a specific group (by reservation or nationality).
     */
    #[Route('/{id}/guests/mark-present-by-group', name: 'event_guests_mark_present_group', methods: ['POST'])]
    #[IsGranted('events.update')]
    public function markPresentByGroup(int $id, Request $request, EventRepository $eventRepository): JsonResponse
    {
        $event = $eventRepository->find($id);
        if (!$event) {
            return $this->json(['error' => 'Event not found'], 404);
        }

        $data = json_decode($request->getContent(), true) ?? [];
        $type = $data['type'] ?? null; // 'reservation', 'nationality', or 'space'
        $reservationId = $data['reservationId'] ?? null;
        $nationality = $data['nationality'] ?? null;
        $space = $data['space'] ?? null;
        $presentCount = isset($data['presentCount']) ? (int) $data['presentCount'] : null;

        if (!$type || ($type === 'reservation' && !$reservationId) || ($type === 'nationality' && !$nationality) || ($type === 'space' && !$space)) {
            return $this->json(['error' => 'Invalid parameters'], 400);
        }

        if ($presentCount === null || $presentCount < 0) {
            return $this->json(['error' => 'presentCount is required and must be >= 0'], 400);
        }

        // Collect matching guests
        $matchingGuests = [];
        foreach ($event->getGuests() as $guest) {
            $matches = false;
            if ($type === 'reservation') {
                $matches = $guest->getReservation()?->getId() === (int) $reservationId;
            } elseif ($type === 'nationality') {
                $guestNat = $guest->getNationality() ?? 'unknown';
                $matches = ($guestNat === $nationality);
            } elseif ($type === 'space') {
                $guestSpace = $guest->getSpace() ?? 'unassigned';
                $matches = ($guestSpace === $space);
            }

            if ($matches) {
                $matchingGuests[] = $guest;
            }
        }

        // Sort guests to have a consistent order (e.g., by ID)
        usort($matchingGuests, fn($a, $b) => $a->getId() - $b->getId());

        // Mark first N as present, rest as not present
        $markedPresent = 0;
        $markedAbsent = 0;
        foreach ($matchingGuests as $index => $guest) {
            if ($index < $presentCount) {
                if (!$guest->isPresent()) {
                    $guest->setIsPresent(true);
                    $markedPresent++;
                }
            } else {
                if ($guest->isPresent()) {
                    $guest->setIsPresent(false);
                    $markedAbsent++;
                }
            }
            $this->em->persist($guest);
        }

        $this->em->flush();

        return $this->json([
            'status' => 'success',
            'updatedCount' => $markedPresent + $markedAbsent,
            'markedPresent' => $markedPresent,
            'markedAbsent' => $markedAbsent,
            'totalInGroup' => count($matchingGuests),
        ]);
    }

    /**
     * Get guest details grouped by nationality and reservation for space assignment UI.
     */
    #[Route('/{id}/guests/grouping-info', name: 'event_guests_grouping_info', methods: ['GET'])]
    #[IsGranted('events.read')]
    public function getGuestGroupingInfo(int $id, EventRepository $eventRepository): JsonResponse
    {
        $event = $eventRepository->find($id);
        if (!$event) {
            return $this->json(['error' => 'Event not found'], 404);
        }

        // Determine the default space (first configured space)
        $eventSpaces = $event->getSpaces();
        $defaultSpace = null;
        foreach ($eventSpaces as $sp) {
            $defaultSpace = $sp->getSpaceName();
            break;
        }
        if ($defaultSpace === null) {
            $defaultSpace = $event->getVenue() ?? 'ROUBENKA';
        }

        $byNationality = [];
        $byReservation = [];

        foreach ($event->getGuests() as $guest) {
            // Determine current space using same logic as move endpoint
            $rawSpace = $guest->getSpace() ?? $guest->getEventTable()?->getRoom() ?? $defaultSpace;
            // Normalize space name to lowercase for consistent grouping
            $space = strtolower($rawSpace);

            // Group by nationality
            $nat = $guest->getNationality() ?? 'unknown';
            if (!isset($byNationality[$nat])) {
                $byNationality[$nat] = [
                    'nationality' => $nat,
                    'count' => 0,
                    'guestIds' => [],
                    'spaces' => [],
                ];
            }
            $byNationality[$nat]['count']++;
            $byNationality[$nat]['guestIds'][] = $guest->getId();
            $byNationality[$nat]['spaces'][$space] = ($byNationality[$nat]['spaces'][$space] ?? 0) + 1;

            // Group by reservation
            $res = $guest->getReservation();
            if ($res) {
                $resId = $res->getId();
                if (!isset($byReservation[$resId])) {
                    $byReservation[$resId] = [
                        'reservationId' => $resId,
                        'contactName' => $res->getContactName(),
                        'nationality' => $res->getContactNationality(),
                        'count' => 0,
                        'guestIds' => [],
                        'spaces' => [],
                    ];
                }
                $byReservation[$resId]['count']++;
                $byReservation[$resId]['guestIds'][] = $guest->getId();
                $byReservation[$resId]['spaces'][$space] = ($byReservation[$resId]['spaces'][$space] ?? 0) + 1;
            }
        }

        // Get available spaces (normalized to lowercase)
        $spaces = [];
        foreach ($event->getSpaces() as $sp) {
            $spaces[] = strtolower($sp->getSpaceName());
        }
        if (empty($spaces)) {
            $spaces[] = strtolower($event->getVenue() ?? 'ROUBENKA');
        }

        return $this->json([
            'byNationality' => array_values($byNationality),
            'byReservation' => array_values($byReservation),
            'availableSpaces' => $spaces,
        ]);
    }
}
