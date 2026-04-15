<?php

namespace App\Controller;

use App\Entity\EventGuest;
use App\Entity\EventTable;
use App\Entity\FloorPlanElement;
use App\Entity\FloorPlanTemplate;
use App\Entity\Room;
use App\Entity\TableExpense;
use App\Repository\EventRepository;
use App\Service\SeatingAlgorithmService;
use App\Service\EventSerializer;
use App\Service\EventGuestSyncService;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Annotation\Route;
use Symfony\Component\Security\Http\Attribute\IsGranted;

#[Route('/api/events')]
class EventFloorPlanController extends AbstractController
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
        private readonly SeatingAlgorithmService $seatingService,
        private readonly EventSerializer $eventSerializer,
        private readonly EventGuestSyncService $guestSync,
    ) {
    }

    private function normalizeEventTypeForFrontend(?string $eventType): ?string
    {
        if ($eventType === null) {
            return null;
        }
        return self::EVENT_TYPE_TO_FRONTEND[$eventType] ?? $eventType;
    }

    // ═══════════════════════════════════════════════════════════════════
    // TABLES CRUD
    // ═══════════════════════════════════════════════════════════════════

    #[Route('/{id}/tables', name: 'event_tables_list', methods: ['GET'])]
    #[IsGranted('events.read')]
    public function listTables(int $id, EventRepository $eventRepository): JsonResponse
    {
        $event = $eventRepository->find($id);
        if (!$event) {
            return $this->json(['error' => 'Not found'], 404);
        }

        $tables = [];
        foreach ($event->getTables() as $t) {
            $tables[] = $this->eventSerializer->serializeTable($t);
        }

        return $this->json($tables);
    }

    #[Route('/{id}/tables', name: 'event_table_create', methods: ['POST'])]
    #[IsGranted('events.update')]
    public function createTable(int $id, Request $request, EventRepository $eventRepository): JsonResponse
    {
        $event = $eventRepository->find($id);
        if (!$event) {
            return $this->json(['error' => 'Event not found'], 404);
        }

        $data = json_decode($request->getContent(), true) ?? [];

        $table = new EventTable();
        $table->setEvent($event);
        $table->setTableName($data['tableName'] ?? '');
        $table->setRoom($data['room'] ?? 'cely_areal');
        $table->setCapacity($data['capacity'] ?? 4);
        $table->setPositionX(isset($data['positionX']) ? (float)$data['positionX'] : null);
        $table->setPositionY(isset($data['positionY']) ? (float)$data['positionY'] : null);
        $table->setShape($data['shape'] ?? 'round');
        if (isset($data['widthPx'])) $table->setWidthPx((float)$data['widthPx']);
        if (isset($data['heightPx'])) $table->setHeightPx((float)$data['heightPx']);
        $table->setRotation((float)($data['rotation'] ?? 0));
        if (isset($data['tableNumber'])) $table->setTableNumber((int)$data['tableNumber']);
        if (isset($data['color'])) $table->setColor($data['color']);
        if (isset($data['sortOrder'])) $table->setSortOrder((int)$data['sortOrder']);

        if (!empty($data['roomId'])) {
            $room = $this->em->getRepository(Room::class)->find($data['roomId']);
            $table->setRoomEntity($room);
        }

        $this->em->persist($table);
        $this->em->flush();

        return $this->json($this->eventSerializer->serializeTable($table), 201);
    }

    #[Route('/{id}/tables/{tableId}', name: 'event_table_update', methods: ['PUT'])]
    #[IsGranted('events.update')]
    public function updateTable(int $id, int $tableId, Request $request, EventRepository $eventRepository): JsonResponse
    {
        $event = $eventRepository->find($id);
        if (!$event) {
            return $this->json(['error' => 'Event not found'], 404);
        }

        $table = $this->em->getRepository(EventTable::class)->find($tableId);
        if (!$table || $table->getEvent()->getId() !== $id) {
            return $this->json(['error' => 'Table not found'], 404);
        }

        $data = json_decode($request->getContent(), true) ?? [];

        if (isset($data['tableName'])) $table->setTableName($data['tableName']);
        if (isset($data['room'])) $table->setRoom($data['room']);
        if (isset($data['capacity'])) $table->setCapacity($data['capacity']);
        if (array_key_exists('positionX', $data)) $table->setPositionX($data['positionX'] !== null ? (float)$data['positionX'] : null);
        if (array_key_exists('positionY', $data)) $table->setPositionY($data['positionY'] !== null ? (float)$data['positionY'] : null);
        if (isset($data['shape'])) $table->setShape($data['shape']);
        if (array_key_exists('widthPx', $data)) $table->setWidthPx($data['widthPx'] !== null ? (float)$data['widthPx'] : null);
        if (array_key_exists('heightPx', $data)) $table->setHeightPx($data['heightPx'] !== null ? (float)$data['heightPx'] : null);
        if (isset($data['rotation'])) $table->setRotation((float)$data['rotation']);
        if (array_key_exists('tableNumber', $data)) $table->setTableNumber($data['tableNumber'] !== null ? (int)$data['tableNumber'] : null);
        if (array_key_exists('color', $data)) $table->setColor($data['color']);
        if (isset($data['sortOrder'])) $table->setSortOrder((int)$data['sortOrder']);

        if (array_key_exists('roomId', $data)) {
            $room = $data['roomId'] ? $this->em->getRepository(Room::class)->find($data['roomId']) : null;
            $table->setRoomEntity($room);
        }

        $this->em->flush();

        return $this->json($this->eventSerializer->serializeTable($table));
    }

    #[Route('/{id}/tables/{tableId}', name: 'event_table_delete', methods: ['DELETE'])]
    #[IsGranted('events.update')]
    public function deleteTable(int $id, int $tableId, EventRepository $eventRepository): JsonResponse
    {
        $event = $eventRepository->find($id);
        if (!$event) {
            return $this->json(['error' => 'Event not found'], 404);
        }

        $table = $this->em->getRepository(EventTable::class)->find($tableId);
        if (!$table || $table->getEvent()->getId() !== $id) {
            return $this->json(['error' => 'Table not found'], 404);
        }

        $this->em->remove($table);
        $this->em->flush();

        return $this->json(['status' => 'deleted']);
    }

    // ═══════════════════════════════════════════════════════════════════
    // FLOOR PLAN - bulk save/load, templates, copy
    // ═══════════════════════════════════════════════════════════════════

    #[Route('/{id}/floor-plan', name: 'event_floor_plan_get', methods: ['GET'])]
    #[IsGranted('events.read')]
    public function getFloorPlan(int $id, EventRepository $eventRepository): JsonResponse
    {
        $event = $eventRepository->find($id);
        if (!$event) {
            return $this->json(['error' => 'Event not found'], 404);
        }

        $tables = [];
        foreach ($event->getTables() as $t) {
            $tableData = $this->eventSerializer->serializeTable($t);
            // Include guests assigned to this table
            $guests = $this->em->getRepository(EventGuest::class)->findBy(['eventTable' => $t->getId()]);
            $tableData['guests'] = array_map(fn(EventGuest $g) => [
                'id' => $g->getId(),
                'firstName' => $g->getFirstName(),
                'lastName' => $g->getLastName(),
                'nationality' => $g->getNationality(),
                'type' => $g->getType(),
                'isPaid' => $g->isPaid(),
                'isPresent' => $g->isPresent(),
                'menuItemId' => $g->getMenuItem()?->getId(),
                'eventTableId' => $g->getEventTable()?->getId(),
                'reservationId' => $g->getReservation()?->getId(),
            ], $guests);
            $tables[] = $tableData;
        }

        $elements = [];
        foreach ($event->getFloorPlanElements() as $el) {
            $elements[] = $this->eventSerializer->serializeFloorPlanElement($el);
        }

        return $this->json([
            'eventId' => $event->getId(),
            'tables' => $tables,
            'elements' => $elements,
        ]);
    }

    #[Route('/{id}/floor-plan', name: 'event_floor_plan_save', methods: ['PUT'])]
    #[IsGranted('events.update')]
    public function saveFloorPlan(int $id, Request $request, EventRepository $eventRepository): JsonResponse
    {
        $event = $eventRepository->find($id);
        if (!$event) {
            return $this->json(['error' => 'Event not found'], 404);
        }

        $data = json_decode($request->getContent(), true) ?? [];
        $roomRepo = $this->em->getRepository(Room::class);

        // ── Sync tables ──
        $incomingTables = $data['tables'] ?? [];
        $existingTablesById = [];
        foreach ($event->getTables() as $t) {
            $existingTablesById[$t->getId()] = $t;
        }

        $processedIds = [];
        $tempIdToTable = []; // Map temp IDs to new table entities
        foreach ($incomingTables as $td) {
            $incomingId = $td['id'] ?? null;
            if (!empty($incomingId) && $incomingId > 0 && isset($existingTablesById[$incomingId])) {
                // Update existing
                $table = $existingTablesById[$incomingId];
            } else {
                // Create new
                $table = new EventTable();
                $table->setEvent($event);
                $this->em->persist($table);
            }

            $table->setTableName($td['tableName'] ?? 'Stůl');
            $table->setRoom($td['room'] ?? 'cely_areal');
            $table->setCapacity($td['capacity'] ?? 4);
            $table->setPositionX(isset($td['positionX']) ? (float)$td['positionX'] : null);
            $table->setPositionY(isset($td['positionY']) ? (float)$td['positionY'] : null);
            $table->setShape($td['shape'] ?? 'round');
            $table->setWidthPx(isset($td['widthPx']) ? (float)$td['widthPx'] : null);
            $table->setHeightPx(isset($td['heightPx']) ? (float)$td['heightPx'] : null);
            $table->setRotation((float)($td['rotation'] ?? 0));
            $table->setTableNumber(isset($td['tableNumber']) ? (int)$td['tableNumber'] : null);
            $table->setColor($td['color'] ?? null);
            $table->setIsLocked($td['isLocked'] ?? false);
            $table->setSortOrder((int)($td['sortOrder'] ?? 0));

            // Per-table room FK
            $tableRoomId = $td['roomId'] ?? null;
            $table->setRoomEntity($tableRoomId ? $roomRepo->find($tableRoomId) : null);

            // Track temp ID → table entity mapping for guest assignments
            $tempId = $td['tempId'] ?? null;
            if ($tempId) {
                $tempIdToTable[$tempId] = $table;
            }
            if ($incomingId) {
                $tempIdToTable[$incomingId] = $table;
            }

            if ($table->getId()) {
                $processedIds[] = $table->getId();
            }
        }

        // Flush tables first so new tables get real IDs
        $this->em->flush();

        // Delete tables not in incoming data
        foreach ($existingTablesById as $existId => $existTable) {
            if (!in_array($existId, $processedIds)) {
                $this->em->remove($existTable);
            }
        }

        // ── Sync floor plan elements ──
        $incomingElements = $data['elements'] ?? [];
        $existingElementsById = [];
        foreach ($event->getFloorPlanElements() as $el) {
            $existingElementsById[$el->getId()] = $el;
        }

        $processedElIds = [];
        foreach ($incomingElements as $ed) {
            if (!empty($ed['id']) && isset($existingElementsById[$ed['id']])) {
                $element = $existingElementsById[$ed['id']];
            } else {
                $element = new FloorPlanElement();
                $element->setEvent($event);
                $this->em->persist($element);
            }

            $element->setElementType($ed['elementType'] ?? 'custom');
            $element->setLabel($ed['label'] ?? null);
            $element->setPositionX((float)($ed['positionX'] ?? 0));
            $element->setPositionY((float)($ed['positionY'] ?? 0));
            $element->setWidthPx((float)($ed['widthPx'] ?? 100));
            $element->setHeightPx((float)($ed['heightPx'] ?? 100));
            $element->setRotation((float)($ed['rotation'] ?? 0));
            $element->setShape($ed['shape'] ?? 'rectangle');
            $element->setShapeData($ed['shapeData'] ?? null);
            $element->setColor($ed['color'] ?? null);
            $element->setIsLocked($ed['isLocked'] ?? false);
            $element->setSortOrder((int)($ed['sortOrder'] ?? 0));

            // Per-element room FK
            $elRoomId = $ed['roomId'] ?? null;
            $element->setRoom($elRoomId ? $roomRepo->find($elRoomId) : null);

            if ($element->getId()) {
                $processedElIds[] = $element->getId();
            }
        }

        foreach ($existingElementsById as $existId => $existEl) {
            if (!in_array($existId, $processedElIds)) {
                $this->em->remove($existEl);
            }
        }

        // ── Sync guest assignments ──
        // First, unassign all guests from tables for this event
        $allGuests = $this->em->getRepository(EventGuest::class)->findBy(['event' => $event]);
        foreach ($allGuests as $g) {
            $g->setEventTable(null);
        }

        $assignments = $data['assignments'] ?? [];
        if (!empty($assignments)) {
            foreach ($assignments as $a) {
                $guest = $this->em->getRepository(EventGuest::class)->find($a['guestId'] ?? 0);
                if ($guest && $guest->getEvent()->getId() === $id) {
                    $tableId = $a['tableId'] ?? null;
                    $table = null;

                    if ($tableId) {
                        // Try temp ID mapping first (for newly created tables)
                        if (isset($tempIdToTable[$tableId])) {
                            $table = $tempIdToTable[$tableId];
                        } else {
                            // Try real ID
                            $table = $this->em->getRepository(EventTable::class)->find($tableId);
                        }
                    }

                    $guest->setEventTable($table);
                }
            }
        }

        $this->em->flush();

        return $this->json(['ok' => true, 'message' => 'Floor plan saved']);
    }

    #[Route('/{id}/floor-plan/from-template/{templateId}', name: 'event_floor_plan_from_template', methods: ['POST'])]
    #[IsGranted('events.update')]
    public function applyTemplate(int $id, int $templateId, Request $request, EventRepository $eventRepository): JsonResponse
    {
        $event = $eventRepository->find($id);
        if (!$event) {
            return $this->json(['error' => 'Event not found'], 404);
        }

        $template = $this->em->getRepository(FloorPlanTemplate::class)->find($templateId);
        if (!$template) {
            return $this->json(['error' => 'Template not found'], 404);
        }

        $layoutData = $template->getLayoutData();

        // Determine target room: from request body, template, or null
        $body = json_decode($request->getContent(), true) ?? [];
        $targetRoomId = $body['roomId'] ?? null;
        $roomRepo = $this->em->getRepository(Room::class);
        $targetRoom = $targetRoomId ? $roomRepo->find($targetRoomId) : $template->getRoom();

        // Remove existing tables and elements ONLY in target room (not other rooms)
        foreach ($event->getTables() as $existingTable) {
            $tableRoomId = $existingTable->getRoomEntity()?->getId();
            if ($targetRoom && $tableRoomId !== $targetRoom->getId()) {
                continue; // keep tables from other rooms
            }
            if (!$targetRoom && $tableRoomId !== null) {
                continue; // if no target room, only remove unassigned tables
            }
            $assignedGuests = $this->em->getRepository(EventGuest::class)->findBy(['eventTable' => $existingTable->getId()]);
            foreach ($assignedGuests as $guest) {
                $guest->setEventTable(null);
            }
            $this->em->remove($existingTable);
        }
        foreach ($event->getFloorPlanElements() as $existingElement) {
            $elRoomId = $existingElement->getRoom()?->getId();
            if ($targetRoom && $elRoomId !== $targetRoom->getId()) {
                continue;
            }
            if (!$targetRoom && $elRoomId !== null) {
                continue;
            }
            $this->em->remove($existingElement);
        }
        $this->em->flush();

        // Create tables from template — assign to target room
        foreach ($layoutData['tables'] ?? [] as $td) {
            $table = new EventTable();
            $table->setEvent($event);
            $table->setTableName($td['tableName'] ?? 'Stůl');
            $table->setRoom($targetRoom ? $targetRoom->getSlug() : 'cely_areal');
            $table->setRoomEntity($targetRoom);
            $table->setCapacity($td['capacity'] ?? 4);
            $table->setPositionX((float)($td['positionX'] ?? 0));
            $table->setPositionY((float)($td['positionY'] ?? 0));
            $table->setShape($td['shape'] ?? 'round');
            $table->setWidthPx(isset($td['widthPx']) ? (float)$td['widthPx'] : null);
            $table->setHeightPx(isset($td['heightPx']) ? (float)$td['heightPx'] : null);
            $table->setRotation((float)($td['rotation'] ?? 0));
            $table->setTableNumber(isset($td['tableNumber']) ? (int)$td['tableNumber'] : null);
            $table->setColor($td['color'] ?? null);
            $table->setIsLocked($td['isLocked'] ?? false);
            $table->setSortOrder((int)($td['sortOrder'] ?? 0));
            $this->em->persist($table);
        }

        // Create elements from template — assign to target room
        foreach ($layoutData['elements'] ?? [] as $ed) {
            $element = new FloorPlanElement();
            $element->setEvent($event);
            $element->setRoom($targetRoom);
            $element->setElementType($ed['elementType'] ?? 'custom');
            $element->setLabel($ed['label'] ?? null);
            $element->setPositionX((float)($ed['positionX'] ?? 0));
            $element->setPositionY((float)($ed['positionY'] ?? 0));
            $element->setWidthPx((float)($ed['widthPx'] ?? 100));
            $element->setHeightPx((float)($ed['heightPx'] ?? 100));
            $element->setRotation((float)($ed['rotation'] ?? 0));
            $element->setShape($ed['shape'] ?? 'rectangle');
            $element->setShapeData($ed['shapeData'] ?? null);
            $element->setColor($ed['color'] ?? null);
            $element->setIsLocked($ed['isLocked'] ?? false);
            $element->setSortOrder((int)($ed['sortOrder'] ?? 0));
            $this->em->persist($element);
        }

        $this->em->flush();

        return $this->json(['ok' => true, 'message' => 'Template applied']);
    }

    #[Route('/{id}/floor-plan/copy-from/{sourceId}', name: 'event_floor_plan_copy', methods: ['POST'])]
    #[IsGranted('events.update')]
    public function copyFloorPlan(int $id, int $sourceId, EventRepository $eventRepository): JsonResponse
    {
        $event = $eventRepository->find($id);
        $source = $eventRepository->find($sourceId);
        if (!$event || !$source) {
            return $this->json(['error' => 'Event not found'], 404);
        }

        // Copy tables
        foreach ($source->getTables() as $srcTable) {
            $table = new EventTable();
            $table->setEvent($event);
            $table->setTableName($srcTable->getTableName());
            $table->setRoom($srcTable->getRoom());
            $table->setRoomEntity($srcTable->getRoomEntity());
            $table->setCapacity($srcTable->getCapacity());
            $table->setPositionX($srcTable->getPositionX());
            $table->setPositionY($srcTable->getPositionY());
            $table->setShape($srcTable->getShape());
            $table->setWidthPx($srcTable->getWidthPx());
            $table->setHeightPx($srcTable->getHeightPx());
            $table->setRotation($srcTable->getRotation());
            $table->setTableNumber($srcTable->getTableNumber());
            $table->setColor($srcTable->getColor());
            $table->setIsLocked($srcTable->isLocked());
            $table->setSortOrder($srcTable->getSortOrder());
            $this->em->persist($table);
        }

        // Copy elements
        foreach ($source->getFloorPlanElements() as $srcEl) {
            $element = new FloorPlanElement();
            $element->setEvent($event);
            $element->setRoom($srcEl->getRoom());
            $element->setElementType($srcEl->getElementType());
            $element->setLabel($srcEl->getLabel());
            $element->setPositionX($srcEl->getPositionX());
            $element->setPositionY($srcEl->getPositionY());
            $element->setWidthPx($srcEl->getWidthPx());
            $element->setHeightPx($srcEl->getHeightPx());
            $element->setRotation($srcEl->getRotation());
            $element->setShape($srcEl->getShape());
            $element->setColor($srcEl->getColor());
            $element->setIsLocked($srcEl->isLocked());
            $element->setSortOrder($srcEl->getSortOrder());
            $this->em->persist($element);
        }

        $this->em->flush();

        return $this->json(['ok' => true, 'message' => 'Floor plan copied']);
    }

    #[Route('/{id}/floor-plan/save-as-template', name: 'event_floor_plan_save_template', methods: ['POST'])]
    #[IsGranted('events.update')]
    public function saveAsTemplate(int $id, Request $request, EventRepository $eventRepository): JsonResponse
    {
        $event = $eventRepository->find($id);
        if (!$event) {
            return $this->json(['error' => 'Event not found'], 404);
        }

        $data = json_decode($request->getContent(), true) ?? [];

        // Filter by room if specified
        $roomRepo = $this->em->getRepository(Room::class);
        $filterRoomId = $data['roomId'] ?? null;
        $filterRoom = $filterRoomId ? $roomRepo->find($filterRoomId) : null;

        $tables = [];
        foreach ($event->getTables() as $t) {
            // Only include tables from specified room
            if ($filterRoom && $t->getRoomEntity()?->getId() !== $filterRoom->getId()) {
                continue;
            }
            $tables[] = [
                'tableName' => $t->getTableName(),
                'capacity' => $t->getCapacity(),
                'shape' => $t->getShape(),
                'positionX' => $t->getPositionX(),
                'positionY' => $t->getPositionY(),
                'widthPx' => $t->getWidthPx(),
                'heightPx' => $t->getHeightPx(),
                'rotation' => $t->getRotation(),
                'tableNumber' => $t->getTableNumber(),
                'color' => $t->getColor(),
                'isLocked' => $t->isLocked(),
                'sortOrder' => $t->getSortOrder(),
            ];
        }

        $elements = [];
        foreach ($event->getFloorPlanElements() as $el) {
            if ($filterRoom && $el->getRoom()?->getId() !== $filterRoom->getId()) {
                continue;
            }
            $elements[] = [
                'elementType' => $el->getElementType(),
                'label' => $el->getLabel(),
                'positionX' => $el->getPositionX(),
                'positionY' => $el->getPositionY(),
                'widthPx' => $el->getWidthPx(),
                'heightPx' => $el->getHeightPx(),
                'rotation' => $el->getRotation(),
                'shape' => $el->getShape(),
                'shapeData' => $el->getShapeData(),
                'color' => $el->getColor(),
                'isLocked' => $el->isLocked(),
                'sortOrder' => $el->getSortOrder(),
            ];
        }

        $template = new FloorPlanTemplate();
        $templateName = $data['name'] ?? $event->getName() . ' - šablona';
        if ($filterRoom) {
            $templateName .= ' (' . $filterRoom->getName() . ')';
        }
        $template->setName($templateName);
        $template->setDescription($data['description'] ?? null);
        $template->setLayoutData(['tables' => $tables, 'elements' => $elements]);
        $template->setRoom($filterRoom);

        $user = $this->getUser();
        if ($user) {
            $template->setCreatedBy($user);
        }

        $this->em->persist($template);
        $this->em->flush();

        return $this->json([
            'id' => $template->getId(),
            'name' => $template->getName(),
        ], 201);
    }

    // ═══════════════════════════════════════════════════════════════════
    // SEATING
    // ═══════════════════════════════════════════════════════════════════

    /**
     * Generate seating suggestion based on guest nationalities.
     */
    #[Route('/{id}/seating-suggestion', name: 'event_seating_suggestion', methods: ['POST'])]
    #[IsGranted('events.update')]
    public function seatingGenerate(int $id, EventRepository $eventRepository): JsonResponse
    {
        $event = $eventRepository->find($id);
        if (!$event) {
            return $this->json(['error' => 'Not found'], 404);
        }

        $suggestion = $this->seatingService->generateSuggestion($event);

        return $this->json($suggestion);
    }

    /**
     * Apply approved seating arrangement.
     */
    #[Route('/{id}/seating-apply', name: 'event_seating_apply', methods: ['PUT'])]
    #[IsGranted('events.update')]
    public function seatingApply(int $id, Request $request, EventRepository $eventRepository): JsonResponse
    {
        $event = $eventRepository->find($id);
        if (!$event) {
            return $this->json(['error' => 'Not found'], 404);
        }

        $data = json_decode($request->getContent(), true) ?? [];
        $assignments = $data['assignments'] ?? [];

        if (!is_array($assignments)) {
            return $this->json(['error' => 'Invalid assignments format'], 400);
        }

        $this->seatingService->applySuggestion($event, $assignments);

        return $this->json(['status' => 'applied']);
    }

    /**
     * Clear all seating assignments.
     */
    #[Route('/{id}/seating-clear', name: 'event_seating_clear', methods: ['DELETE'])]
    #[IsGranted('events.update')]
    public function seatingClear(int $id, EventRepository $eventRepository): JsonResponse
    {
        $event = $eventRepository->find($id);
        if (!$event) {
            return $this->json(['error' => 'Not found'], 404);
        }

        $this->seatingService->clearSeating($event);

        return $this->json(['status' => 'cleared']);
    }

    /**
     * Get seating statistics for an event.
     */
    #[Route('/{id}/seating-stats', name: 'event_seating_stats', methods: ['GET'])]
    #[IsGranted('events.read')]
    public function seatingStats(int $id, EventRepository $eventRepository): JsonResponse
    {
        $event = $eventRepository->find($id);
        if (!$event) {
            return $this->json(['error' => 'Not found'], 404);
        }

        $stats = $this->seatingService->getSeatingStats($event);

        return $this->json($stats);
    }

    // ═══════════════════════════════════════════════════════════════════
    // WAITER VIEW
    // ═══════════════════════════════════════════════════════════════════

    /**
     * Waiter View - tablet-optimized endpoint returning all data needed for waiter interface
     */
    #[Route('/{id}/waiter-view', name: 'event_waiter_view', methods: ['GET'])]
    #[IsGranted('events.read')]
    public function waiterView(int $id, EventRepository $eventRepository): JsonResponse
    {
        $event = $eventRepository->find($id);
        if (!$event) {
            return $this->json(['error' => 'Not found'], 404);
        }

        // Sync guests from reservations first
        $this->guestSync->syncForEvent($event);
        $this->em->refresh($event);

        // Build tables with nested guests
        $tablesWithGuests = [];
        foreach ($event->getTables() as $table) {
            $tableGuests = [];
            foreach ($event->getGuests() as $guest) {
                if ($guest->getEventTable()?->getId() === $table->getId()) {
                    $menuItem = $guest->getMenuItem();
                    $tableGuests[] = [
                        'id' => $guest->getId(),
                        'firstName' => $guest->getFirstName(),
                        'lastName' => $guest->getLastName(),
                        'nationality' => $guest->getNationality(),
                        'type' => $guest->getType(),
                        'isPresent' => $guest->isPresent(),
                        'isPaid' => $guest->isPaid(),
                        'menuName' => $menuItem?->getMenuName(),
                        'notes' => $guest->getNotes(),
                    ];
                }
            }
            $tablesWithGuests[] = [
                'id' => $table->getId(),
                'tableNumber' => $table->getTableNumber(),
                'spaceName' => $table->getSpaceName(),
                'capacity' => $table->getCapacity(),
                'positionX' => $table->getPositionX(),
                'positionY' => $table->getPositionY(),
                'guests' => $tableGuests,
            ];
        }

        // Unassigned guests (not assigned to any table)
        $unassignedGuests = [];
        foreach ($event->getGuests() as $guest) {
            if ($guest->getEventTable() === null) {
                $menuItem = $guest->getMenuItem();
                $unassignedGuests[] = [
                    'id' => $guest->getId(),
                    'firstName' => $guest->getFirstName(),
                    'lastName' => $guest->getLastName(),
                    'nationality' => $guest->getNationality(),
                    'type' => $guest->getType(),
                    'isPresent' => $guest->isPresent(),
                    'isPaid' => $guest->isPaid(),
                    'menuName' => $menuItem?->getMenuName(),
                    'notes' => $guest->getNotes(),
                ];
            }
        }

        // Build schedule
        $schedule = [];
        foreach ($event->getSchedules() as $s) {
            $schedule[] = [
                'id' => $s->getId(),
                'startTime' => $s->getStartTime()?->format('H:i'),
                'endTime' => $s->getEndTime()?->format('H:i'),
                'activity' => $s->getActivity(),
                'description' => $s->getDescription(),
                'isCompleted' => $s->isCompleted(),
            ];
        }

        // Build menu summary (aggregated by menu name)
        $menuSummary = [];
        foreach ($event->getMenus() as $menu) {
            $menuSummary[] = [
                'menuName' => $menu->getMenuName(),
                'quantity' => $menu->getQuantity(),
                'pricePerUnit' => $menu->getPricePerUnit(),
                'totalPrice' => $menu->getTotalPrice(),
            ];
        }

        // Nationality distribution for floor plan coloring
        $nationalityDistribution = [];
        foreach ($event->getGuests() as $guest) {
            $nat = $guest->getNationality() ?? 'unknown';
            if (!isset($nationalityDistribution[$nat])) {
                $nationalityDistribution[$nat] = 0;
            }
            $nationalityDistribution[$nat]++;
        }

        return $this->json([
            'event' => [
                'id' => $event->getId(),
                'name' => $event->getName(),
                'eventType' => $this->normalizeEventTypeForFrontend($event->getEventType()),
                'eventDate' => $event->getEventDate()->format('Y-m-d'),
                'eventTime' => $event->getEventTime()->format('H:i'),
                'durationMinutes' => $event->getDurationMinutes(),
                'status' => $event->getStatus(),
                'venue' => $event->getVenue(),
                'language' => $event->getLanguage(),
                'notesStaff' => $event->getNotesStaff(),
                'specialRequirements' => $event->getSpecialRequirements(),
                'guestsTotal' => $event->getGuestsTotal(),
            ],
            'tables' => $tablesWithGuests,
            'unassignedGuests' => $unassignedGuests,
            'schedule' => $schedule,
            'menuSummary' => $menuSummary,
            'nationalityDistribution' => $nationalityDistribution,
        ]);
    }

    /**
     * Reassign a guest to a different table (lightweight endpoint for dashboard/tablet use).
     */
    #[Route('/{id}/reassign-guest', name: 'event_reassign_guest', methods: ['POST'])]
    #[IsGranted('events.update')]
    public function reassignGuest(int $id, Request $request, EventRepository $eventRepository): JsonResponse
    {
        $event = $eventRepository->find($id);
        if (!$event) {
            return $this->json(['error' => 'Not found'], 404);
        }

        $data = json_decode($request->getContent(), true) ?? [];
        $guestId = $data['guestId'] ?? null;
        $targetTableId = $data['targetTableId'] ?? null;

        if (!$guestId || !$targetTableId) {
            return $this->json(['error' => 'guestId and targetTableId are required'], 400);
        }

        $guest = $this->em->getRepository(EventGuest::class)->find($guestId);
        if (!$guest || $guest->getEvent()?->getId() !== $id) {
            return $this->json(['error' => 'Guest not found in this event'], 404);
        }

        $targetTable = $this->em->getRepository(EventTable::class)->find($targetTableId);
        if (!$targetTable || $targetTable->getEvent()?->getId() !== $id) {
            return $this->json(['error' => 'Target table not found in this event'], 404);
        }

        // Check capacity
        $currentCount = 0;
        foreach ($event->getGuests() as $g) {
            if ($g->getEventTable()?->getId() === $targetTableId) {
                $currentCount++;
            }
        }
        if ($currentCount >= $targetTable->getCapacity()) {
            return $this->json(['error' => 'Target table is full'], 422);
        }

        $guest->setEventTable($targetTable);
        $this->em->flush();

        return $this->json([
            'success' => true,
            'guestId' => $guest->getId(),
            'targetTableId' => $targetTable->getId(),
            'targetTableName' => $targetTable->getTableName(),
        ]);
    }

    /**
     * Batch re-assign many guests in a single round-trip + single DB transaction.
     *
     * Body: { "assignments": [ { "guestId": int, "targetTableId": int|null }, ... ] }
     * - targetTableId=null → unseat the guest.
     * - Validates: all guests belong to this event; all tables belong to this event;
     *   final occupancy per target table ≤ capacity (capacity checked AFTER applying
     *   all unseats + all moves, so swapping guests between tables works correctly).
     *
     * Returns { appliedCount, skippedCount, errors: [...] }.
     */
    #[Route('/{id}/assign-guests-batch', name: 'event_assign_guests_batch', methods: ['POST'])]
    #[IsGranted('events.update')]
    public function assignGuestsBatch(int $id, Request $request, EventRepository $eventRepository): JsonResponse
    {
        $event = $eventRepository->find($id);
        if (!$event) {
            return $this->json(['error' => 'Not found'], 404);
        }

        $data = json_decode($request->getContent(), true) ?? [];
        $assignments = $data['assignments'] ?? [];
        if (!is_array($assignments) || empty($assignments)) {
            return $this->json(['error' => 'assignments is required and must be a non-empty array'], 400);
        }

        // ── 1) Index current guests + tables ────────────────────────────────
        $guestRepo = $this->em->getRepository(EventGuest::class);
        $tableRepo = $this->em->getRepository(EventTable::class);

        /** @var array<int, EventGuest> $guestsById */
        $guestsById = [];
        foreach ($event->getGuests() as $g) {
            $guestsById[$g->getId()] = $g;
        }

        // Collect target table IDs in one go
        $targetTableIds = [];
        foreach ($assignments as $a) {
            if (!empty($a['targetTableId'])) {
                $targetTableIds[(int) $a['targetTableId']] = true;
            }
        }
        /** @var array<int, EventTable> $tablesById */
        $tablesById = [];
        if ($targetTableIds) {
            foreach ($tableRepo->findBy(['id' => array_keys($targetTableIds)]) as $t) {
                if ($t->getEvent()?->getId() === $id) {
                    $tablesById[$t->getId()] = $t;
                }
            }
        }

        // ── 2) Build planned final assignment map (guestId → tableId|null) ──
        // Start from current state, then overlay the requested moves.
        /** @var array<int, int|null> $planned */
        $planned = [];
        foreach ($event->getGuests() as $g) {
            $planned[$g->getId()] = $g->getEventTable()?->getId();
        }

        $errors = [];
        foreach ($assignments as $a) {
            $guestId = (int) ($a['guestId'] ?? 0);
            if (!$guestId || !isset($guestsById[$guestId])) {
                $errors[] = ['guestId' => $guestId, 'error' => 'guest not in event'];
                continue;
            }
            $targetRaw = $a['targetTableId'] ?? null;
            if ($targetRaw === null) {
                $planned[$guestId] = null;
                continue;
            }
            $targetId = (int) $targetRaw;
            if (!isset($tablesById[$targetId])) {
                $errors[] = ['guestId' => $guestId, 'error' => 'target table not in event'];
                continue;
            }
            $planned[$guestId] = $targetId;
        }

        // ── 3) Count planned occupancy per table, enforce capacity ──────────
        /** @var array<int, int> $occupancy */
        $occupancy = [];
        foreach ($planned as $guestId => $tableId) {
            if ($tableId !== null) {
                $occupancy[$tableId] = ($occupancy[$tableId] ?? 0) + 1;
            }
        }
        foreach ($occupancy as $tableId => $count) {
            // Only enforce capacity on tables we actually touched (targets of this batch);
            // pre-existing overflows on untouched tables are left alone.
            if (!isset($tablesById[$tableId])) continue;
            $cap = $tablesById[$tableId]->getCapacity();
            if ($count > $cap) {
                return $this->json([
                    'error' => 'Target table would exceed capacity',
                    'tableId' => $tableId,
                    'tableName' => $tablesById[$tableId]->getTableName(),
                    'capacity' => $cap,
                    'planned' => $count,
                ], 422);
            }
        }

        // ── 4) Apply: only touch guests whose assignment actually changed ───
        $applied = 0;
        foreach ($assignments as $a) {
            $guestId = (int) ($a['guestId'] ?? 0);
            if (!isset($guestsById[$guestId])) continue;
            $guest = $guestsById[$guestId];
            $targetRaw = $a['targetTableId'] ?? null;
            $newTable = $targetRaw === null ? null : ($tablesById[(int) $targetRaw] ?? null);
            $currentId = $guest->getEventTable()?->getId();
            $newId = $newTable?->getId();
            if ($currentId !== $newId) {
                $guest->setEventTable($newTable);
                $applied++;
            }
        }

        $this->em->flush();

        return $this->json([
            'success' => true,
            'appliedCount' => $applied,
            'skippedCount' => count($assignments) - $applied - count($errors),
            'errors' => $errors,
        ]);
    }

    /**
     * Remove a guest from their currently assigned table (unseat).
     */
    #[Route('/{id}/unseat-guest', name: 'event_unseat_guest', methods: ['POST'])]
    #[IsGranted('events.update')]
    public function unseatGuest(int $id, Request $request, EventRepository $eventRepository): JsonResponse
    {
        $event = $eventRepository->find($id);
        if (!$event) {
            return $this->json(['error' => 'Not found'], 404);
        }

        $data = json_decode($request->getContent(), true) ?? [];
        $guestId = $data['guestId'] ?? null;
        if (!$guestId) {
            return $this->json(['error' => 'guestId is required'], 400);
        }

        $guest = $this->em->getRepository(EventGuest::class)->find($guestId);
        if (!$guest || $guest->getEvent()?->getId() !== $id) {
            return $this->json(['error' => 'Guest not found in this event'], 404);
        }

        $guest->setEventTable(null);
        $this->em->flush();

        return $this->json(['success' => true, 'guestId' => $guest->getId()]);
    }

    /**
     * Unseat every guest currently assigned to a given table.
     * Useful for "Clear table" / "Move everyone elsewhere" flows.
     */
    #[Route('/{id}/tables/{tableId}/unseat-all', name: 'event_unseat_table', methods: ['POST'])]
    #[IsGranted('events.update')]
    public function unseatTable(int $id, int $tableId, EventRepository $eventRepository): JsonResponse
    {
        $event = $eventRepository->find($id);
        if (!$event) {
            return $this->json(['error' => 'Not found'], 404);
        }
        $table = $this->em->getRepository(EventTable::class)->find($tableId);
        if (!$table || $table->getEvent()?->getId() !== $id) {
            return $this->json(['error' => 'Table not found in this event'], 404);
        }

        $count = 0;
        foreach ($event->getGuests() as $g) {
            if ($g->getEventTable()?->getId() === $tableId) {
                $g->setEventTable(null);
                $count++;
            }
        }
        $this->em->flush();

        return $this->json(['success' => true, 'tableId' => $tableId, 'unseatedCount' => $count]);
    }

    /**
     * Move every guest from one table to another (atomic: checks target capacity first).
     *
     * Optional body: { "includeMovements": true } — also re-links all cash movements
     * attached to the source table onto the target table (keeps the POS history with the guests).
     */
    #[Route('/{id}/tables/{fromTableId}/move-to/{toTableId}', name: 'event_move_table', methods: ['POST'])]
    #[IsGranted('events.update')]
    public function moveTable(int $id, int $fromTableId, int $toTableId, Request $request, EventRepository $eventRepository): JsonResponse
    {
        if ($fromTableId === $toTableId) {
            return $this->json(['error' => 'Source and target table must differ'], 400);
        }
        $event = $eventRepository->find($id);
        if (!$event) {
            return $this->json(['error' => 'Not found'], 404);
        }
        $target = $this->em->getRepository(EventTable::class)->find($toTableId);
        if (!$target || $target->getEvent()?->getId() !== $id) {
            return $this->json(['error' => 'Target table not found in this event'], 404);
        }

        $data = json_decode($request->getContent(), true) ?? [];
        $includeMovements = !empty($data['includeMovements']);

        // Collect source guests and count target occupancy in a single pass
        $sourceGuests = [];
        $targetOccupancy = 0;
        foreach ($event->getGuests() as $g) {
            $currentTableId = $g->getEventTable()?->getId();
            if ($currentTableId === $fromTableId) {
                $sourceGuests[] = $g;
            } elseif ($currentTableId === $toTableId) {
                $targetOccupancy++;
            }
        }

        $free = $target->getCapacity() - $targetOccupancy;
        if ($free < count($sourceGuests)) {
            return $this->json([
                'error' => 'Target table does not have enough free seats',
                'needed' => count($sourceGuests),
                'free' => $free,
            ], 422);
        }

        foreach ($sourceGuests as $g) {
            $g->setEventTable($target);
        }

        // Optionally carry the table's cash movements (POS income/expense) along.
        $movedMovements = 0;
        if ($includeMovements) {
            $movements = $this->em->getRepository(\App\Entity\CashMovement::class)
                ->findBy(['eventTableId' => $fromTableId]);
            foreach ($movements as $m) {
                if ($m->getEventId() !== null && $m->getEventId() !== $id) {
                    continue;
                }
                $m->setEventTableId($toTableId);
                $m->setEventId($id);
                $movedMovements++;
            }
        }

        $this->em->flush();

        return $this->json([
            'success' => true,
            'fromTableId' => $fromTableId,
            'toTableId' => $toTableId,
            'movedCount' => count($sourceGuests),
            'movedMovements' => $movedMovements,
        ]);
    }

    // ═══════════════════════════════════════════════════════════════════
    // TABLE EXPENSES (POS)
    // ═══════════════════════════════════════════════════════════════════

    #[Route('/{eventId}/tables/{tableId}/expenses', name: 'table_expenses_list', methods: ['GET'])]
    #[IsGranted('events.read')]
    public function listTableExpenses(int $eventId, int $tableId): JsonResponse
    {
        $expenses = $this->em->getRepository(TableExpense::class)
            ->findBy(['eventTable' => $tableId, 'event' => $eventId], ['createdAt' => 'DESC']);

        return $this->json(array_map(fn(TableExpense $e) => $this->eventSerializer->serializeExpense($e), $expenses));
    }

    #[Route('/{eventId}/tables/{tableId}/expenses', name: 'table_expense_create', methods: ['POST'])]
    #[IsGranted('events.update')]
    public function createTableExpense(int $eventId, int $tableId, Request $request, EventRepository $eventRepository): JsonResponse
    {
        $event = $eventRepository->find($eventId);
        $table = $this->em->getRepository(EventTable::class)->find($tableId);
        if (!$event || !$table || $table->getEvent()->getId() !== $eventId) {
            return $this->json(['error' => 'Not found'], 404);
        }

        $data = json_decode($request->getContent(), true) ?? [];

        $expense = new TableExpense();
        $expense->setEventTable($table);
        $expense->setEvent($event);
        $expense->setDescription($data['description'] ?? '');
        $expense->setCategory($data['category'] ?? 'other');
        $expense->setQuantity((int)($data['quantity'] ?? 1));
        $expense->setUnitPrice((string)($data['unitPrice'] ?? '0.00'));
        if (isset($data['currency'])) $expense->setCurrency($data['currency']);

        $user = $this->getUser();
        if ($user) {
            $expense->setCreatedBy($user);
        }

        $this->em->persist($expense);
        $this->em->flush();

        return $this->json($this->eventSerializer->serializeExpense($expense), 201);
    }

    #[Route('/{eventId}/expenses/{expenseId}', name: 'table_expense_update', methods: ['PUT'])]
    #[IsGranted('events.update')]
    public function updateTableExpense(int $eventId, int $expenseId, Request $request): JsonResponse
    {
        $expense = $this->em->getRepository(TableExpense::class)->find($expenseId);
        if (!$expense || $expense->getEvent()->getId() !== $eventId) {
            return $this->json(['error' => 'Not found'], 404);
        }

        $data = json_decode($request->getContent(), true) ?? [];

        if (isset($data['description'])) $expense->setDescription($data['description']);
        if (isset($data['category'])) $expense->setCategory($data['category']);
        if (isset($data['quantity'])) $expense->setQuantity((int)$data['quantity']);
        if (isset($data['unitPrice'])) $expense->setUnitPrice((string)$data['unitPrice']);
        if (isset($data['isPaid'])) {
            $expense->setIsPaid($data['isPaid']);
            if ($data['isPaid']) {
                $expense->setPaidAt(new \DateTime());
            }
        }

        $this->em->flush();

        return $this->json($this->eventSerializer->serializeExpense($expense));
    }

    #[Route('/{eventId}/expenses/{expenseId}', name: 'table_expense_delete', methods: ['DELETE'])]
    #[IsGranted('events.update')]
    public function deleteTableExpense(int $eventId, int $expenseId): JsonResponse
    {
        $expense = $this->em->getRepository(TableExpense::class)->find($expenseId);
        if (!$expense || $expense->getEvent()->getId() !== $eventId) {
            return $this->json(['error' => 'Not found'], 404);
        }

        $this->em->remove($expense);
        $this->em->flush();

        return $this->json(['ok' => true]);
    }

    #[Route('/{eventId}/tables/{tableId}/expenses/settle', name: 'table_expenses_settle', methods: ['POST'])]
    #[IsGranted('events.update')]
    public function settleTableExpenses(int $eventId, int $tableId): JsonResponse
    {
        $expenses = $this->em->getRepository(TableExpense::class)
            ->findBy(['eventTable' => $tableId, 'event' => $eventId, 'isPaid' => false]);

        $now = new \DateTime();
        foreach ($expenses as $expense) {
            $expense->setIsPaid(true);
            $expense->setPaidAt($now);
        }

        $this->em->flush();

        return $this->json(['ok' => true, 'settled' => count($expenses)]);
    }

    #[Route('/{eventId}/expenses/summary', name: 'table_expenses_summary', methods: ['GET'])]
    #[IsGranted('events.read')]
    public function expensesSummary(int $eventId): JsonResponse
    {
        $summary = $this->em->getRepository(TableExpense::class)->getExpenseSummaryByEvent($eventId);
        return $this->json($summary);
    }
}
