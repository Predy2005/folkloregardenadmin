<?php

namespace App\Controller;

use App\Entity\Event;
use App\Entity\EventGuest;
use App\Entity\EventSpace;
use App\Entity\Reservation;
use App\Entity\EventMenu;
use App\Entity\ReservationFoods;
use App\Repository\EventRepository;
use App\Repository\ReservationPersonRepository;
use App\Repository\EventSpaceRepository;
use App\Repository\ReservationRepository;
use App\Repository\EventGuestRepository;
use App\Service\CashboxService;
use App\Service\CashMovementService;
use App\Service\EventStockRequirementService;
use App\Entity\User;
use App\Entity\Room;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Annotation\Route;
use Symfony\Component\Security\Http\Attribute\IsGranted;

#[Route('/api/events')]
class EventController extends AbstractController
{
    private EventGuestRepository $guestRepo;

    // Mapování backend event types na frontend formát
    private const EVENT_TYPE_TO_FRONTEND = [
        'FOLKLORE_SHOW' => 'folklorni_show',
        'WEDDING' => 'svatba',
        'CORPORATE' => 'event',
        'PRIVATE_EVENT' => 'privat',
        // Pokud už je ve frontend formátu, ponechej
        'folklorni_show' => 'folklorni_show',
        'svatba' => 'svatba',
        'event' => 'event',
        'privat' => 'privat',
    ];

    public function __construct(
        private readonly EntityManagerInterface $em,
        private readonly \App\Service\EventGuestSyncService $guestSync,
        private readonly EventStockRequirementService $stockRequirementService,
        private readonly CashboxService $cashboxService,
        private readonly CashMovementService $movementService,
    ) {
        // Obtain repository via EntityManager to avoid DI wiring issues
        $this->guestRepo = $this->em->getRepository(EventGuest::class);
    }

    /**
     * Validate whether an event can be safely deleted.
     * Returns array of blocking reasons, empty if deletion is safe.
     */
    private function getEventDeletionBlockers(Event $event): array
    {
        $eventId = $event->getId();
        $blockers = [];

        // 1. Check for cashbox transfers (RESTRICT FK - hard blocker)
        $transferCount = (int) $this->em->createQuery(
            'SELECT COUNT(ct.id) FROM App\Entity\CashboxTransfer ct WHERE ct.targetEvent = :eventId'
        )->setParameter('eventId', $eventId)->getSingleScalarResult();

        if ($transferCount > 0) {
            $blockers[] = [
                'type' => 'cashbox_transfer',
                'message' => "Akce má {$transferCount} převod(ů) z pokladny. Před smazáním je musíte zrušit nebo dokončit.",
            ];
        }

        // 2. Check for active cashbox with non-zero balance
        $cashbox = $this->em->createQueryBuilder()
            ->select('c')
            ->from(\App\Entity\Cashbox::class, 'c')
            ->where('c.event = :eventId')
            ->setParameter('eventId', $eventId)
            ->getQuery()
            ->getOneOrNullResult();

        if ($cashbox) {
            $balance = (float) $cashbox->getCurrentBalance();
            if ($balance != 0) {
                $blockers[] = [
                    'type' => 'cashbox_balance',
                    'message' => "Akce má pokladnu se zůstatkem " . number_format($balance, 2, ',', ' ') . " Kč. Nejprve převeďte zůstatek do hlavní pokladny a uzavřete ji.",
                ];
            } elseif ($cashbox->isActive()) {
                $blockers[] = [
                    'type' => 'cashbox_active',
                    'message' => "Akce má otevřenou pokladnu. Nejprve ji uzavřete.",
                ];
            }
        }

        return $blockers;
    }

    /**
     * Safely remove an event after all blockers are resolved.
     */
    private function removeEventSafe(Event $event): void
    {
        $eventId = $event->getId();

        $this->em->createQuery('DELETE FROM App\Entity\EventStaffRequirement sr WHERE sr.event = :eventId')
            ->setParameter('eventId', $eventId)
            ->execute();

        $this->em->createQuery('UPDATE App\Entity\Cashbox c SET c.event = NULL WHERE c.event = :eventId')
            ->setParameter('eventId', $eventId)
            ->execute();

        $this->em->remove($event);
    }

    /**
     * Force-remove an event (super admin only).
     */
    private function forceRemoveEvent(Event $event): array
    {
        $eventId = $event->getId();
        $actions = [];

        $deletedTransfers = (int) $this->em->createQuery(
            'DELETE FROM App\Entity\CashboxTransfer ct WHERE ct.targetEvent = :eventId'
        )->setParameter('eventId', $eventId)->execute();

        if ($deletedTransfers > 0) {
            $actions[] = "Smazáno {$deletedTransfers} převod(ů) z pokladny";
        }

        $cashbox = $this->em->createQueryBuilder()
            ->select('c')
            ->from(\App\Entity\Cashbox::class, 'c')
            ->where('c.event = :eventId')
            ->setParameter('eventId', $eventId)
            ->getQuery()
            ->getOneOrNullResult();

        if ($cashbox) {
            $balance = (float) $cashbox->getCurrentBalance();
            if ($balance != 0) {
                $mainCashbox = $this->cashboxService->getOrCreateMainCashbox();
                $newBalance = (float) $mainCashbox->getCurrentBalance() + $balance;
                $mainCashbox->setCurrentBalance(number_format($newBalance, 2, '.', ''));

                $this->movementService->addMovement($mainCashbox, 'INCOME', number_format(abs($balance), 2, '.', ''), [
                    'category' => 'Převod z mazané akce',
                    'description' => "Automatický převod zůstatku ze smazané akce \"{$event->getName()}\" (ID: {$eventId})",
                ]);

                $actions[] = "Převedeno " . number_format($balance, 2, ',', ' ') . " Kč do hlavní pokladny";
            }

            $cashbox->setIsActive(false);
            if (!$cashbox->getClosedAt()) {
                $cashbox->setClosedAt(new \DateTime());
            }
            $cashbox->setEvent(null);
            $actions[] = "Pokladna uzavřena a odpojena";
        }

        $this->em->createQuery('DELETE FROM App\Entity\EventStaffRequirement sr WHERE sr.event = :eventId')
            ->setParameter('eventId', $eventId)
            ->execute();

        $this->em->remove($event);
        $actions[] = "Akce smazána";

        return $actions;
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

    #[Route('', name: 'event_list', methods: ['GET'])]
    #[IsGranted('events.read')]
    public function list(EventRepository $eventRepository): JsonResponse
    {
        $events = $eventRepository->findBy([], ['eventDate' => 'DESC']);
        $ids = array_map(fn(Event $e) => (int)$e->getId(), $events);
        $counts = $this->guestRepo->getCountsForEvents($ids);

        $data = array_map(function (Event $e) use ($counts) {
            $id = (int)$e->getId();
            $cnt = $counts[$id] ?? ['paid' => 0, 'free' => 0, 'total' => 0];

            // Build spaces array from event_space table
            $spaces = [];
            foreach ($e->getSpaces() as $s) {
                $spaces[] = [
                    'id' => $s->getId(),
                    'spaceName' => $s->getSpaceName(),
                    'roomId' => $s->getRoomEntity()?->getId(),
                    'roomName' => $s->getRoomEntity()?->getName(),
                    'buildingName' => $s->getRoomEntity()?->getBuilding()?->getName(),
                ];
            }

            return [
                'id' => $id,
                'name' => $e->getName(),
                'eventType' => $this->normalizeEventTypeForFrontend($e->getEventType()),
                'eventDate' => $e->getEventDate()->format('Y-m-d'),
                'eventTime' => $e->getEventTime()->format('H:i:s'),
                'status' => $e->getStatus(),
                'organizerPerson' => $e->getOrganizerPerson(),
                'guestsPaid' => $cnt['paid'],
                'guestsFree' => $cnt['free'],
                'guestsTotal' => $cnt['total'],
                'notesInternal' => $e->getNotesInternal(),
                'notesStaff' => $e->getNotesStaff(),
                'specialRequirements' => $e->getSpecialRequirements(),
                'spaces' => $spaces,
            ];
        }, $events);

        return $this->json($data);
    }

    #[Route('/bulk-update', name: 'api_events_bulk_update', methods: ['PUT', 'PATCH'])]
    #[IsGranted('ROLE_SUPER_ADMIN')]
    public function bulkUpdate(Request $request, EventRepository $eventRepository): JsonResponse
    {
        $data = json_decode($request->getContent(), true) ?? [];
        $ids = $data['ids'] ?? [];
        $updates = $data['updates'] ?? [];

        if (empty($ids) || !is_array($ids)) {
            return $this->json(['error' => 'Missing or invalid "ids" array'], 400);
        }
        if (empty($updates) || !is_array($updates)) {
            return $this->json(['error' => 'Missing or invalid "updates" object'], 400);
        }

        $allowedStatuses = ['DRAFT', 'PLANNED', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'];
        $allowedEventTypes = ['folklorni_show', 'svatba', 'event', 'privat'];
        $count = 0;

        foreach ($ids as $id) {
            $event = $eventRepository->find($id);
            if (!$event) {
                continue;
            }

            if (isset($updates['status'])) {
                $status = (string)$updates['status'];
                if (!in_array($status, $allowedStatuses, true)) {
                    return $this->json(['error' => 'Invalid status value: ' . $status . '. Allowed: ' . implode(', ', $allowedStatuses)], 400);
                }
                $event->setStatus($status);
            }

            if (isset($updates['eventType'])) {
                $eventType = (string)$updates['eventType'];
                if (!in_array($eventType, $allowedEventTypes, true)) {
                    return $this->json(['error' => 'Invalid eventType value: ' . $eventType . '. Allowed: ' . implode(', ', $allowedEventTypes)], 400);
                }
                $event->setEventType($eventType);
            }

            $count++;
        }

        $this->em->flush();

        return $this->json(['status' => 'updated', 'count' => $count]);
    }

    #[Route('/bulk-delete', name: 'api_events_bulk_delete', methods: ['DELETE'])]
    #[IsGranted('ROLE_SUPER_ADMIN')]
    public function bulkDelete(Request $request, EventRepository $eventRepository): JsonResponse
    {
        $data = json_decode($request->getContent(), true) ?? [];
        $ids = $data['ids'] ?? [];
        $force = $data['force'] ?? false;

        if (empty($ids) || !is_array($ids)) {
            return $this->json(['error' => 'Missing or invalid "ids" array'], 400);
        }

        // First pass: check all events for blockers
        $allBlockers = [];
        $eventsToDelete = [];
        foreach ($ids as $id) {
            $event = $eventRepository->find($id);
            if (!$event) {
                continue;
            }
            $blockers = $this->getEventDeletionBlockers($event);
            if (!empty($blockers)) {
                $allBlockers[] = [
                    'eventId' => $event->getId(),
                    'eventName' => $event->getName(),
                    'blockers' => $blockers,
                ];
            }
            $eventsToDelete[] = $event;
        }

        // If blockers exist and force not set, return error with details
        if (!empty($allBlockers) && !$force) {
            return $this->json([
                'error' => 'Některé akce nelze smazat',
                'blocked' => $allBlockers,
                'deletableCount' => count($eventsToDelete) - count($allBlockers),
            ], 409);
        }

        // Delete all events (force mode handles blockers automatically)
        $count = 0;
        $allActions = [];
        foreach ($eventsToDelete as $event) {
            $blockers = $this->getEventDeletionBlockers($event);
            if (!empty($blockers) && $force) {
                $actions = $this->forceRemoveEvent($event);
                $allActions[$event->getName()] = $actions;
            } else {
                $this->removeEventSafe($event);
            }
            $count++;
        }

        $this->em->flush();

        $response = ['status' => 'deleted', 'count' => $count];
        if (!empty($allActions)) {
            $response['actions'] = $allActions;
        }
        return $this->json($response);
    }

    #[Route('/{id}', name: 'event_detail', methods: ['GET'])]
    #[IsGranted('events.read')]
    public function detail(int $id, EventRepository $eventRepository): JsonResponse
    {
        $event = $eventRepository->find($id);
        if (!$event) {
            return $this->json(['error' => 'Not found'], 404);
        }

        // Při načtení ověř a dosynchronizuj hosty dle rezervací na datum akce
        $this->guestSync->syncForEvent($event);
        $this->em->refresh($event);

        // Přepočti počty hostů z tabulky event_guest (isPaid)
        $counts = $this->guestRepo->getCountsForEvent((int)$event->getId());

        $guests = [];
        foreach ($event->getGuests() as $g) {
            $menuItem = $g->getMenuItem();
            $reservationFood = $menuItem?->getReservationFood();
            $guests[] = [
                'id' => $g->getId(),
                'firstName' => $g->getFirstName(),
                'lastName' => $g->getLastName(),
                'nationality' => $g->getNationality(),
                'isPaid' => $g->isPaid(),
                'eventTableId' => $g->getEventTable()?->getId(),
                'personIndex' => $g->getPersonIndex(),
                'type' => $g->getType(),
                'isPresent' => $g->isPresent(),
                'reservationId' => $g->getReservation()?->getId(),
                'menuItemId' => $menuItem?->getId(),
                'menuName' => $menuItem?->getMenuName(),
                'menuPrice' => $menuItem?->getPricePerUnit(),
                'reservationFood' => $reservationFood ? [
                    'id' => $reservationFood->getId(),
                    'name' => $reservationFood->getName(),
                    'price' => $reservationFood->getPrice(),
                ] : null,
                'notes' => $g->getNotes(),
            ];
        }

        $spaces = [];
        foreach ($event->getSpaces() as $s) {
            $spaces[] = [
                'id' => $s->getId(),
                'spaceName' => $s->getSpaceName(),
                'roomId' => $s->getRoomEntity()?->getId(),
                'roomName' => $s->getRoomEntity()?->getName(),
                'buildingName' => $s->getRoomEntity()?->getBuilding()?->getName(),
            ];
        }

        $data = [
            'id' => $event->getId(),
            'name' => $event->getName(),
            'eventType' => $this->normalizeEventTypeForFrontend($event->getEventType()),
            'reservationId' => $event->getReservation()?->getId(),
            'eventDate' => $event->getEventDate()->format('Y-m-d'),
            'eventTime' => $event->getEventTime()->format('H:i:s'),
            'durationMinutes' => $event->getDurationMinutes(),
            'guestsPaid' => $counts['paid'] ?? 0,
            'guestsFree' => $counts['free'] ?? 0,
            'guestsTotal' => $counts['total'] ?? 0,
            'venue' => $event->getVenue(),
            'spaces' => $spaces,
            // Subkategorie a tagy
            'eventSubcategory' => $event->getEventSubcategory(),
            'eventTags' => $event->getEventTags(),
            // Organizátor
            'organizerCompany' => $event->getOrganizerCompany(),
            'organizerPerson' => $event->getOrganizerPerson(),
            'organizerEmail' => $event->getOrganizerEmail(),
            'organizerPhone' => $event->getOrganizerPhone(),
            // Koordinátor
            'coordinatorId' => $event->getCoordinatorId(),
            'isExternalCoordinator' => $event->isExternalCoordinator(),
            'externalCoordinatorName' => $event->getExternalCoordinatorName(),
            'externalCoordinatorEmail' => $event->getExternalCoordinatorEmail(),
            'externalCoordinatorPhone' => $event->getExternalCoordinatorPhone(),
            'externalCoordinatorNote' => $event->getExternalCoordinatorNote(),
            'language' => $event->getLanguage(),
            'status' => $event->getStatus(),
            // Finance
            'totalPrice' => $event->getTotalPrice() !== null ? (float)$event->getTotalPrice() : null,
            'depositAmount' => $event->getDepositAmount() !== null ? (float)$event->getDepositAmount() : null,
            'depositPaid' => $event->isDepositPaid(),
            'paymentMethod' => $event->getPaymentMethod(),
            // Fakturační údaje
            'invoiceCompany' => $event->getInvoiceCompany(),
            'invoiceIc' => $event->getInvoiceIc(),
            'invoiceDic' => $event->getInvoiceDic(),
            'invoiceAddress' => $event->getInvoiceAddress(),
            // Catering
            'cateringType' => $event->getCateringType(),
            'cateringCommissionPercent' => $event->getCateringCommissionPercent() !== null ? (float)$event->getCateringCommissionPercent() : null,
            'cateringCommissionAmount' => $event->getCateringCommissionAmount() !== null ? (float)$event->getCateringCommissionAmount() : null,
            // Poznámky
            'notesStaff' => $event->getNotesStaff(),
            'notesInternal' => $event->getNotesInternal(),
            'specialRequirements' => $event->getSpecialRequirements(),
            // Metadata
            'createdAt' => $event->getCreatedAt()->format(DATE_ATOM),
            'updatedAt' => $event->getUpdatedAt()->format(DATE_ATOM),
            'guests' => $guests,
        ];

        return $this->json($data);
    }

    #[Route('', name: 'event_create', methods: ['POST'])]
    #[IsGranted('events.create')]
    public function create(Request $request): JsonResponse
    {
        $data = json_decode($request->getContent(), true) ?? [];

        // mapování aliasů z klienta na očekávaná pole
        $eventType = $data['eventType'] ?? $data['type'] ?? null;
        $name = $data['name'] ?? null;
        $eventDateStr = $data['eventDate'] ?? $data['date'] ?? null;
        $eventTimeStr = $data['eventTime'] ?? $data['time'] ?? '18:00:00'; // defaultní čas pokud chybí
        $status = $data['status'] ?? 'PLANNED';
        $language = $data['language'] ?? 'CZ';

        if (!isset($name, $eventType, $eventDateStr)) {
            return $this->json(['error' => 'Missing required fields: name, eventType, eventDate (Y-m-d). eventTime can be omitted (defaults to 18:00:00)'], 400);
        }

        try {
            $eventDate = new \DateTime($eventDateStr);
        } catch (\Exception $e) {
            return $this->json(['error' => 'Invalid eventDate format, expected Y-m-d'], 400);
        }
        try {
            $eventTime = new \DateTime($eventTimeStr);
        } catch (\Exception $e) {
            return $this->json(['error' => 'Invalid eventTime format, expected H:i:s'], 400);
        }

        $event = new Event();
        $event
            ->setName($name)
            ->setEventType($eventType)
            ->setEventDate($eventDate)
            ->setEventTime($eventTime)
            ->setStatus($status)
            ->setLanguage($language);

        // volitelné mapování dalších aliasů
        if (isset($data['reservationId'])) {
            $reservation = $this->em->getRepository(Reservation::class)->find((int)$data['reservationId']);
            if ($reservation) {
                $event->setReservation($reservation);
            }
        }
        if (isset($data['guestsPaid'])) $event->setGuestsPaid((int)$data['guestsPaid']);
        if (isset($data['paidCount'])) $event->setGuestsPaid((int)$data['paidCount']);
        if (isset($data['guestsFree'])) $event->setGuestsFree((int)$data['guestsFree']);
        if (isset($data['freeCount'])) $event->setGuestsFree((int)$data['freeCount']);
        if (isset($data['venue'])) $event->setVenue($data['venue']);
        // různé aliasy pro organizátora/kontakt
        $organizer = $data['organizerPerson'] ?? $data['organizerName'] ?? $data['contactPerson'] ?? $data['coordinator'] ?? null;
        if ($organizer) $event->setOrganizerPerson($organizer);
        if (isset($data['organizerEmail'])) $event->setOrganizerEmail($data['organizerEmail']);
        if (isset($data['organizerPhone'])) $event->setOrganizerPhone($data['organizerPhone']);
        if (isset($data['specialRequirements'])) $event->setSpecialRequirements((string)$data['specialRequirements']);
        if (isset($data['notesStaff'])) $event->setNotesStaff((string)$data['notesStaff']);
        if (isset($data['notesInternal'])) $event->setNotesInternal((string)$data['notesInternal']);

        $this->em->persist($event);
        $this->em->flush();

        // spaces (může přijít jako pole s názvy — napojení na Room entity)
        if (!empty($data['spaces']) && is_array($data['spaces'])) {
            $roomRepo = $this->em->getRepository(Room::class);
            foreach ($data['spaces'] as $spaceName) {
                $space = new EventSpace();
                $space->setEvent($event)->setSpaceName(strtolower((string)$spaceName));
                $room = $roomRepo->findOneBy(['slug' => strtolower((string)$spaceName)]);
                if ($room) {
                    $space->setRoomEntity($room);
                }
                $this->em->persist($space);
            }
            $this->em->flush();
        }

        // Centralizovaná synchronizace hostů a menu dle datumu akce
        $this->guestSync->syncForEvent($event);

        return $this->json(['status' => 'created', 'id' => $event->getId()], 201);
    }

    #[Route('/from-reservation/{id}', name: 'event_create_from_reservation', methods: ['POST'])]
    #[IsGranted('events.create')]
    public function createFromReservation(int $id, ReservationRepository $reservationRepository, ReservationPersonRepository $personRepository): JsonResponse
    {
        $reservation = $reservationRepository->find($id);
        if (!$reservation) {
            return $this->json(['error' => 'Rezervace s daným ID neexistuje'], 404);
        }

        $event = new Event();
        $event->setName('Akce z rezervace #' . $id)
            ->setEventType('FOLKLORE_SHOW')
            ->setReservation($reservation)
            ->setEventDate($reservation->getDate())
            ->setEventTime(new \DateTime('18:00:00'))
            ->setOrganizerPerson($reservation->getContactName())
            ->setOrganizerEmail($reservation->getContactEmail())
            ->setOrganizerPhone($reservation->getContactPhone())
            ->setLanguage($reservation->getContactNationality() ?? 'CZ')
            ->setStatus('PLANNED');

        $this->em->persist($event);
        $this->em->flush();

        // Centralizovaná synchronizace hostů a menu dle datumu akce
        $this->guestSync->syncForEvent($event);

        return $this->json(['status' => 'created', 'id' => $event->getId()], 201);
    }

    #[Route('/{id}', name: 'event_update', methods: ['PUT','PATCH'])]
    #[IsGranted('events.update')]
    public function update(int $id, Request $request, EventRepository $eventRepository): JsonResponse
    {
        $event = $eventRepository->find($id);
        if (!$event) {
            return $this->json(['error' => 'Not found'], 404);
        }
        $data = json_decode($request->getContent(), true) ?? [];

        // Základní údaje
        if (isset($data['name'])) $event->setName((string)$data['name']);
        if (isset($data['eventType'])) $event->setEventType((string)$data['eventType']);
        if (isset($data['status'])) $event->setStatus((string)$data['status']);
        if (isset($data['language'])) $event->setLanguage((string)$data['language']);
        if (isset($data['venue'])) $event->setVenue((string)$data['venue']);
        if (isset($data['durationMinutes'])) $event->setDurationMinutes((int)$data['durationMinutes']);

        // Subkategorie a tagy
        if (array_key_exists('eventSubcategory', $data)) $event->setEventSubcategory($data['eventSubcategory'] ?: null);
        if (array_key_exists('eventTags', $data)) {
            $event->setEventTags(is_array($data['eventTags']) ? $data['eventTags'] : null);
            // Synchronizace tagů do databáze pro našeptávání
            if (!empty($data['eventTags'])) {
                $tagRepo = $this->em->getRepository(\App\Entity\EventTag::class);
                foreach ($data['eventTags'] as $tagName) {
                    $trimmed = trim($tagName);
                    if (!empty($trimmed)) {
                        $existingTag = $tagRepo->findOneBy(['name' => $trimmed]);
                        if ($existingTag) {
                            $existingTag->incrementUsageCount();
                        } else {
                            $newTag = new \App\Entity\EventTag();
                            $newTag->setName($trimmed);
                            $this->em->persist($newTag);
                        }
                    }
                }
            }
        }

        // Organizátor
        if (array_key_exists('organizerCompany', $data)) $event->setOrganizerCompany($data['organizerCompany'] ?: null);
        if (array_key_exists('organizerPerson', $data)) $event->setOrganizerPerson($data['organizerPerson'] ?: null);
        if (array_key_exists('organizerEmail', $data)) $event->setOrganizerEmail($data['organizerEmail'] ?: null);
        if (array_key_exists('organizerPhone', $data)) $event->setOrganizerPhone($data['organizerPhone'] ?: null);

        // Koordinátor
        if (array_key_exists('coordinatorId', $data)) $event->setCoordinatorId($data['coordinatorId'] ? (int)$data['coordinatorId'] : null);
        if (array_key_exists('isExternalCoordinator', $data)) $event->setIsExternalCoordinator((bool)$data['isExternalCoordinator']);
        if (array_key_exists('externalCoordinatorName', $data)) $event->setExternalCoordinatorName($data['externalCoordinatorName'] ?: null);
        if (array_key_exists('externalCoordinatorEmail', $data)) $event->setExternalCoordinatorEmail($data['externalCoordinatorEmail'] ?: null);
        if (array_key_exists('externalCoordinatorPhone', $data)) $event->setExternalCoordinatorPhone($data['externalCoordinatorPhone'] ?: null);
        if (array_key_exists('externalCoordinatorNote', $data)) $event->setExternalCoordinatorNote($data['externalCoordinatorNote'] ?: null);

        // Finance
        if (array_key_exists('totalPrice', $data)) $event->setTotalPrice($data['totalPrice'] !== null ? (string)$data['totalPrice'] : null);
        if (array_key_exists('depositAmount', $data)) $event->setDepositAmount($data['depositAmount'] !== null ? (string)$data['depositAmount'] : null);
        if (array_key_exists('depositPaid', $data)) $event->setDepositPaid((bool)$data['depositPaid']);
        if (array_key_exists('paymentMethod', $data)) $event->setPaymentMethod($data['paymentMethod'] ?: null);

        // Fakturační údaje
        if (array_key_exists('invoiceCompany', $data)) $event->setInvoiceCompany($data['invoiceCompany'] ?: null);
        if (array_key_exists('invoiceIc', $data)) $event->setInvoiceIc($data['invoiceIc'] ?: null);
        if (array_key_exists('invoiceDic', $data)) $event->setInvoiceDic($data['invoiceDic'] ?: null);
        if (array_key_exists('invoiceAddress', $data)) $event->setInvoiceAddress($data['invoiceAddress'] ?: null);

        // Catering
        if (array_key_exists('cateringType', $data)) $event->setCateringType($data['cateringType'] ?: null);
        if (array_key_exists('cateringCommissionPercent', $data)) $event->setCateringCommissionPercent($data['cateringCommissionPercent'] !== null ? (string)$data['cateringCommissionPercent'] : null);
        if (array_key_exists('cateringCommissionAmount', $data)) $event->setCateringCommissionAmount($data['cateringCommissionAmount'] !== null ? (string)$data['cateringCommissionAmount'] : null);

        // Poznámky
        if (array_key_exists('specialRequirements', $data)) $event->setSpecialRequirements($data['specialRequirements'] ?: null);
        if (array_key_exists('notesStaff', $data)) $event->setNotesStaff($data['notesStaff'] ?: null);
        if (array_key_exists('notesInternal', $data)) $event->setNotesInternal($data['notesInternal'] ?: null);

        // Počet hostů
        if (isset($data['guestsPaid'])) $event->setGuestsPaid((int)$data['guestsPaid']);
        if (array_key_exists('guestsFree', $data)) $event->setGuestsFree($data['guestsFree'] !== null ? (int)$data['guestsFree'] : null);

        // Date/time updates
        if (isset($data['eventDate'])) {
            try { $event->setEventDate(new \DateTime((string)$data['eventDate'])); } catch (\Exception $e) { return $this->json(['error' => 'Invalid eventDate'], 400); }
        }
        if (isset($data['eventTime'])) {
            try { $event->setEventTime(new \DateTime((string)$data['eventTime'])); } catch (\Exception $e) { return $this->json(['error' => 'Invalid eventTime'], 400); }
        }

        // Optionally re-link reservation
        if (isset($data['reservationId'])) {
            $reservation = $this->em->getRepository(Reservation::class)->find((int)$data['reservationId']);
            $event->setReservation($reservation);
        }

        // Spaces - pokud jsou v datech, aktualizuj je
        if (isset($data['spaces']) && is_array($data['spaces'])) {
            // Remove existing spaces
            foreach ($event->getSpaces() as $s) {
                $this->em->remove($s);
            }
            // Add new spaces — try to link to Room entity by slug
            $roomRepo = $this->em->getRepository(Room::class);
            foreach ($data['spaces'] as $spaceName) {
                $space = new EventSpace();
                $space->setEvent($event)->setSpaceName(strtolower((string)$spaceName));
                // Try to find matching Room by slug
                $room = $roomRepo->findOneBy(['slug' => strtolower((string)$spaceName)]);
                if ($room) {
                    $space->setRoomEntity($room);
                }
                $this->em->persist($space);
            }
        }

        $this->em->flush();

        // After any update (especially date change), re-sync event guests vs reservations
        $this->guestSync->syncForEvent($event);

        return $this->json(['status' => 'updated']);
    }

    #[Route('/{id}/spaces', name: 'event_spaces_get', methods: ['GET'])]
    #[IsGranted('events.read')]
    public function getSpaces(int $id, EventRepository $eventRepository): JsonResponse
    {
        $event = $eventRepository->find($id);
        if (!$event) {
            return $this->json(['error' => 'Not found'], 404);
        }
        $spaces = [];
        foreach ($event->getSpaces() as $s) {
            $spaces[] = $s->getSpaceName();
        }
        return $this->json(['eventId' => $event->getId(), 'spaces' => $spaces]);
    }

    #[Route('/{id}/spaces', name: 'event_spaces_put', methods: ['PUT', 'PATCH'])]
    #[IsGranted('events.update')]
    public function setSpaces(int $id, Request $request, EventRepository $eventRepository, EventSpaceRepository $spaceRepo): JsonResponse
    {
        $event = $eventRepository->find($id);
        if (!$event) {
            return $this->json(['error' => 'Not found'], 404);
        }
        $data = json_decode($request->getContent(), true) ?? [];
        if (!isset($data['spaces']) || !is_array($data['spaces'])) {
            return $this->json(['error' => 'Missing spaces array'], 400);
        }
        // Remove existing
        foreach ($event->getSpaces() as $s) {
            $this->em->remove($s);
        }
        $this->em->flush();
        // Add new
        foreach ($data['spaces'] as $name) {
            $space = new EventSpace();
            $space->setEvent($event)->setSpaceName(strtolower((string)$name));
            $this->em->persist($space);
        }
        $this->em->flush();
        return $this->json(['status' => 'updated']);
    }

    /**
     * Get stock requirements for an event
     */
    #[Route('/{id}/stock-requirements', name: 'event_stock_requirements', methods: ['GET'])]
    #[IsGranted('events.read')]
    public function getStockRequirements(int $id, EventRepository $eventRepository): JsonResponse
    {
        $event = $eventRepository->find($id);
        if (!$event) {
            return $this->json(['error' => 'Event not found'], 404);
        }

        $requirements = $this->stockRequirementService->getEventRequirements($event);

        return $this->json($requirements);
    }

    /**
     * Move guests to a different space
     */
    #[Route('/{id}/move-guests', name: 'event_move_guests', methods: ['POST'])]
    #[IsGranted('events.update')]
    public function moveGuests(int $id, Request $request, EventRepository $eventRepository): JsonResponse
    {
        try {
            $event = $eventRepository->find($id);
            if (!$event) {
                return $this->json(['error' => 'Event not found'], 404);
            }

            $data = json_decode($request->getContent(), true);
            $targetSpace = $data['targetSpace'] ?? null;
            $filter = $data['filter'] ?? [];

            if (!$targetSpace) {
                return $this->json(['error' => 'Target space is required'], 400);
            }

            // Get all guests for this event
            $guests = $event->getGuests()->toArray();

            // Determine if fromSpace is the "first space" (for null-space guest handling)
            $isFirstSpace = false;
            if (!empty($filter['fromSpace'])) {
                $eventSpaces = $this->getEventSpaceNames($event);
                $isFirstSpace = !empty($eventSpaces) && strcasecmp($eventSpaces[0], $filter['fromSpace']) === 0;
            }

            // Apply filters to select guests to move
            $guestsToMove = $this->filterGuestsForMove($guests, $filter, $isFirstSpace);

            // Apply count limit if specified
            if (!empty($filter['count']) && $filter['count'] > 0) {
                $guestsToMove = array_slice($guestsToMove, 0, (int) $filter['count']);
            }

            // Move the guests
            $movedCount = 0;
            foreach ($guestsToMove as $guest) {
                $guest->setSpace(strtolower($targetSpace));
                $movedCount++;
            }

            $this->em->flush();

            return $this->json([
                'success' => true,
                'movedCount' => $movedCount,
                'targetSpace' => $targetSpace,
            ]);
        } catch (\Exception $e) {
            return $this->json([
                'error' => 'Failed to move guests',
                'message' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Get event space names
     */
    private function getEventSpaceNames(Event $event): array
    {
        $spaces = $event->getSpaces();
        $spaceNames = [];

        foreach ($spaces as $space) {
            $spaceNames[] = strtolower($space->getSpaceName());
        }

        if (empty($spaceNames)) {
            $spaceNames[] = strtolower($event->getVenue() ?? 'roubenka');
        }

        return $spaceNames;
    }

    /**
     * Filter guests based on move criteria
     */
    private function filterGuestsForMove(array $guests, array $filter, bool $isFirstSpace = false): array
    {
        return array_filter($guests, function (EventGuest $guest) use ($filter, $isFirstSpace) {
            // Filter by reservation
            if (!empty($filter['reservationId'])) {
                $reservation = $guest->getReservation();
                if (!$reservation || $reservation->getId() !== (int) $filter['reservationId']) {
                    return false;
                }
            }

            // Filter by nationality
            if (!empty($filter['nationality'])) {
                if (strcasecmp($guest->getNationality() ?? '', $filter['nationality']) !== 0) {
                    return false;
                }
            }

            // Filter by menu (supports both menuId and menuName)
            if (!empty($filter['menuId'])) {
                $menuItem = $guest->getMenuItem();
                if (!$menuItem || $menuItem->getId() !== (int) $filter['menuId']) {
                    return false;
                }
            }
            if (!empty($filter['menuName'])) {
                $menuItem = $guest->getMenuItem();
                if (!$menuItem || strcasecmp($menuItem->getMenuName() ?? '', $filter['menuName']) !== 0) {
                    return false;
                }
            }

            // Filter by source space
            if (!empty($filter['fromSpace'])) {
                $guestSpace = $guest->getSpace();
                if ($guestSpace === null) {
                    if (!$isFirstSpace) {
                        return false;
                    }
                } else {
                    if (strcasecmp($guestSpace, $filter['fromSpace']) !== 0) {
                        return false;
                    }
                }
            }

            return true;
        });
    }

    // ========================================================================
    // VOUCHERS
    // ========================================================================

    #[Route('/{id}/vouchers', name: 'event_vouchers_list', methods: ['GET'])]
    #[IsGranted('events.read')]
    public function listVouchers(int $id, EventRepository $eventRepository): JsonResponse
    {
        $event = $eventRepository->find($id);
        if (!$event) {
            return $this->json(['error' => 'Not found'], 404);
        }

        $voucherRepo = $this->em->getRepository(\App\Entity\Voucher::class);

        $vouchers = [];
        foreach ($event->getVouchers() as $v) {
            $voucher = $voucherRepo->find($v->getVoucherId());
            $vouchers[] = [
                'id' => $v->getId(),
                'voucherId' => $v->getVoucherId(),
                'voucherCode' => $voucher?->getCode(),
                'partnerName' => $voucher?->getPartner()?->getName(),
                'quantity' => $v->getQuantity(),
                'validated' => $v->isValidated(),
                'validatedAt' => $v->getValidatedAt()?->format(DATE_ATOM),
                'notes' => $v->getNotes(),
            ];
        }

        return $this->json($vouchers);
    }

    #[Route('/{id}/vouchers', name: 'event_voucher_create', methods: ['POST'])]
    #[IsGranted('events.update')]
    public function createVoucher(int $id, Request $request, EventRepository $eventRepository): JsonResponse
    {
        $event = $eventRepository->find($id);
        if (!$event) {
            return $this->json(['error' => 'Event not found'], 404);
        }

        $data = json_decode($request->getContent(), true) ?? [];

        if (empty($data['voucherId'])) {
            return $this->json(['error' => 'voucherId is required'], 400);
        }

        $eventVoucher = new \App\Entity\EventVoucher();
        $eventVoucher->setEvent($event);
        $eventVoucher->setVoucherId($data['voucherId']);
        $eventVoucher->setQuantity($data['quantity'] ?? 1);
        $eventVoucher->setValidated($data['validated'] ?? false);
        $eventVoucher->setNotes($data['notes'] ?? null);

        $this->em->persist($eventVoucher);
        $this->em->flush();

        $voucherRepo = $this->em->getRepository(\App\Entity\Voucher::class);
        $voucher = $voucherRepo->find($eventVoucher->getVoucherId());

        return $this->json([
            'id' => $eventVoucher->getId(),
            'voucherId' => $eventVoucher->getVoucherId(),
            'voucherCode' => $voucher?->getCode(),
            'partnerName' => $voucher?->getPartner()?->getName(),
            'quantity' => $eventVoucher->getQuantity(),
            'validated' => $eventVoucher->isValidated(),
            'validatedAt' => $eventVoucher->getValidatedAt()?->format(DATE_ATOM),
            'notes' => $eventVoucher->getNotes(),
        ], 201);
    }

    #[Route('/{id}/vouchers/{eventVoucherId}', name: 'event_voucher_update', methods: ['PUT'])]
    #[IsGranted('events.update')]
    public function updateVoucher(int $id, int $eventVoucherId, Request $request, EventRepository $eventRepository): JsonResponse
    {
        $event = $eventRepository->find($id);
        if (!$event) {
            return $this->json(['error' => 'Event not found'], 404);
        }

        $eventVoucher = $this->em->getRepository(\App\Entity\EventVoucher::class)->find($eventVoucherId);
        if (!$eventVoucher || $eventVoucher->getEvent()->getId() !== $id) {
            return $this->json(['error' => 'Event voucher not found'], 404);
        }

        $data = json_decode($request->getContent(), true) ?? [];

        if (isset($data['voucherId'])) $eventVoucher->setVoucherId($data['voucherId']);
        if (isset($data['quantity'])) $eventVoucher->setQuantity($data['quantity']);
        if (isset($data['validated'])) {
            $eventVoucher->setValidated($data['validated']);
            if ($data['validated'] && !$eventVoucher->getValidatedAt()) {
                $eventVoucher->setValidatedAt(new \DateTime());
            }
        }
        if (array_key_exists('notes', $data)) $eventVoucher->setNotes($data['notes']);

        $this->em->flush();

        $voucherRepo = $this->em->getRepository(\App\Entity\Voucher::class);
        $voucher = $voucherRepo->find($eventVoucher->getVoucherId());

        return $this->json([
            'id' => $eventVoucher->getId(),
            'voucherId' => $eventVoucher->getVoucherId(),
            'voucherCode' => $voucher?->getCode(),
            'partnerName' => $voucher?->getPartner()?->getName(),
            'quantity' => $eventVoucher->getQuantity(),
            'validated' => $eventVoucher->isValidated(),
            'validatedAt' => $eventVoucher->getValidatedAt()?->format(DATE_ATOM),
            'notes' => $eventVoucher->getNotes(),
        ]);
    }

    #[Route('/{id}/vouchers/{eventVoucherId}', name: 'event_voucher_delete', methods: ['DELETE'])]
    #[IsGranted('events.update')]
    public function deleteVoucher(int $id, int $eventVoucherId, EventRepository $eventRepository): JsonResponse
    {
        $event = $eventRepository->find($id);
        if (!$event) {
            return $this->json(['error' => 'Event not found'], 404);
        }

        $eventVoucher = $this->em->getRepository(\App\Entity\EventVoucher::class)->find($eventVoucherId);
        if (!$eventVoucher || $eventVoucher->getEvent()->getId() !== $id) {
            return $this->json(['error' => 'Event voucher not found'], 404);
        }

        $this->em->remove($eventVoucher);
        $this->em->flush();

        return $this->json(['status' => 'deleted']);
    }

    /**
     * Scan/validate a voucher by code
     */
    #[Route('/{id}/vouchers/scan', name: 'event_voucher_scan', methods: ['POST'])]
    #[IsGranted('events.update')]
    public function scanVoucher(int $id, Request $request, EventRepository $eventRepository): JsonResponse
    {
        $event = $eventRepository->find($id);
        if (!$event) {
            return $this->json(['error' => 'Event not found'], 404);
        }

        $data = json_decode($request->getContent(), true) ?? [];
        $code = $data['code'] ?? null;

        if (!$code) {
            return $this->json(['error' => 'Voucher code is required'], 400);
        }

        // Find voucher by code
        $voucherRepo = $this->em->getRepository(\App\Entity\Voucher::class);
        $voucher = $voucherRepo->findOneBy(['code' => strtoupper($code)]);

        if (!$voucher) {
            return $this->json(['error' => 'Voucher nenalezen'], 404);
        }

        // Check if voucher is already linked to this event
        $existingEventVoucher = null;
        foreach ($event->getVouchers() as $ev) {
            if ($ev->getVoucherId() === $voucher->getId()) {
                $existingEventVoucher = $ev;
                break;
            }
        }

        if ($existingEventVoucher) {
            if ($existingEventVoucher->isValidated()) {
                return $this->json([
                    'error' => 'Voucher již byl ověřen',
                    'validatedAt' => $existingEventVoucher->getValidatedAt()?->format('Y-m-d H:i:s'),
                ], 400);
            }
            // Validate existing voucher
            $existingEventVoucher->setValidated(true);
            $existingEventVoucher->setValidatedAt(new \DateTime());
            $this->em->flush();

            return $this->json([
                'message' => 'Voucher úspěšně ověřen',
                'voucherId' => $voucher->getId(),
                'code' => $voucher->getCode(),
                'quantity' => $existingEventVoucher->getQuantity(),
            ]);
        }

        // Create new event voucher and validate it
        $eventVoucher = new \App\Entity\EventVoucher();
        $eventVoucher->setEvent($event);
        $eventVoucher->setVoucherId($voucher->getId());
        $eventVoucher->setQuantity($voucher->getQuantity() ?? 1);
        $eventVoucher->setValidated(true);
        $eventVoucher->setValidatedAt(new \DateTime());

        $this->em->persist($eventVoucher);
        $this->em->flush();

        return $this->json([
            'message' => 'Voucher přidán a ověřen',
            'voucherId' => $voucher->getId(),
            'code' => $voucher->getCode(),
            'quantity' => $eventVoucher->getQuantity(),
        ]);
    }

    /**
     * Validate an existing event voucher by its ID
     */
    #[Route('/{id}/vouchers/{voucherId}/validate', name: 'event_voucher_validate', methods: ['POST'])]
    #[IsGranted('events.update')]
    public function validateVoucher(int $id, int $voucherId, EventRepository $eventRepository): JsonResponse
    {
        $event = $eventRepository->find($id);
        if (!$event) {
            return $this->json(['error' => 'Event not found'], 404);
        }

        // Find the event voucher
        $eventVoucher = null;
        foreach ($event->getVouchers() as $ev) {
            if ($ev->getId() === $voucherId) {
                $eventVoucher = $ev;
                break;
            }
        }

        if (!$eventVoucher) {
            return $this->json(['error' => 'Event voucher not found'], 404);
        }

        if ($eventVoucher->isValidated()) {
            return $this->json([
                'error' => 'Voucher již byl ověřen',
                'validatedAt' => $eventVoucher->getValidatedAt()?->format('Y-m-d H:i:s'),
            ], 400);
        }

        $eventVoucher->setValidated(true);
        $eventVoucher->setValidatedAt(new \DateTime());
        $this->em->flush();

        return $this->json([
            'message' => 'Voucher úspěšně ověřen',
            'id' => $eventVoucher->getId(),
            'quantity' => $eventVoucher->getQuantity(),
        ]);
    }

    #[Route('/{id}', name: 'event_delete', methods: ['DELETE'])]
    #[IsGranted('events.delete')]
    public function delete(int $id, Request $request, EventRepository $eventRepository): JsonResponse
    {
        $event = $eventRepository->find($id);
        if (!$event) {
            return $this->json(['error' => 'Not found'], 404);
        }

        $data = json_decode($request->getContent(), true) ?? [];
        $force = $data['force'] ?? false;

        $blockers = $this->getEventDeletionBlockers($event);
        if (!empty($blockers) && !$force) {
            return $this->json([
                'error' => 'Akci nelze smazat',
                'blockers' => $blockers,
            ], 409);
        }

        $actions = [];
        if (!empty($blockers) && $force) {
            $actions = $this->forceRemoveEvent($event);
        } else {
            $this->removeEventSafe($event);
        }

        $this->em->flush();

        $response = ['status' => 'deleted'];
        if (!empty($actions)) {
            $response['actions'] = $actions;
        }
        return $this->json($response);
    }

    /**
     * Create a quick walk-in reservation with guests.
     */
    #[Route('/{id}/quick-reservation', name: 'event_quick_reservation', methods: ['POST'])]
    #[IsGranted('events.update')]
    public function createQuickReservation(int $id, Request $request, EventRepository $eventRepository): JsonResponse
    {
        $event = $eventRepository->find($id);
        if (!$event) {
            return $this->json(['error' => 'Event not found'], 404);
        }

        $data = json_decode($request->getContent(), true) ?? [];
        $contactName = $data['contactName'] ?? 'Walk-in';
        $nationality = $data['nationality'] ?? 'CZ';
        $adultCount = (int) ($data['adultCount'] ?? 0);
        $childCount = (int) ($data['childCount'] ?? 0);
        $menuId = isset($data['menuId']) ? (int) $data['menuId'] : null;
        $pricePerAdult = (float) ($data['pricePerAdult'] ?? 0);
        $pricePerChild = (float) ($data['pricePerChild'] ?? 0);
        $totalPrice = (float) ($data['totalPrice'] ?? 0);
        $paymentMethod = $data['paymentMethod'] ?? 'CASH';
        $isPaid = $data['isPaid'] ?? true;

        $totalGuests = $adultCount + $childCount;
        if ($totalGuests === 0) {
            return $this->json(['error' => 'At least one guest is required'], 400);
        }

        // Create reservation
        $reservation = new \App\Entity\Reservation();
        $reservation->setContactName($contactName);
        $reservation->setContactEmail('');
        $reservation->setContactPhone('');
        $reservation->setContactNationality($nationality);
        $reservation->setClientComeFrom('walk-in');
        $reservation->setDate($event->getEventDate());
        $reservation->setTotalPrice((string) $totalPrice);
        $reservation->setPaidAmount($isPaid ? (string) $totalPrice : '0.00');
        $reservation->setPaymentStatus($isPaid ? 'PAID' : 'UNPAID');
        $reservation->setPaymentMethod($paymentMethod);
        $reservation->setStatus('CONFIRMED');
        $reservation->setSource('WALK_IN');
        $reservation->setCreatedAt(new \DateTime());

        $this->em->persist($reservation);
        $this->em->flush(); // Get reservation ID

        // Get menu item if specified
        $eventMenu = $menuId ? $this->em->getRepository(\App\Entity\EventMenu::class)->find($menuId) : null;

        // Determine default space
        $defaultSpace = null;
        foreach ($event->getSpaces() as $sp) {
            $defaultSpace = strtolower($sp->getSpaceName());
            break;
        }
        if (!$defaultSpace) {
            $defaultSpace = strtolower($event->getVenue() ?? 'roubenka');
        }

        // Create EventGuest records
        $guestsCreated = 0;
        $personIndex = count($event->getGuests()); // Start after existing guests

        // Add adults
        for ($i = 0; $i < $adultCount; $i++) {
            $guest = new \App\Entity\EventGuest();
            $guest->setEvent($event);
            $guest->setReservation($reservation);
            $guest->setType('adult');
            $guest->setFirstName($contactName);
            $guest->setNationality($nationality);
            $guest->setIsPaid(true);
            $guest->setIsPresent(true); // Walk-ins are present by default
            $guest->setPersonIndex(++$personIndex);
            $guest->setSpace($defaultSpace);
            if ($eventMenu) {
                $guest->setMenuItem($eventMenu);
            }
            $this->em->persist($guest);
            $guestsCreated++;
        }

        // Add children
        for ($i = 0; $i < $childCount; $i++) {
            $guest = new \App\Entity\EventGuest();
            $guest->setEvent($event);
            $guest->setReservation($reservation);
            $guest->setType('child');
            $guest->setFirstName($contactName);
            $guest->setNationality($nationality);
            $guest->setIsPaid(true);
            $guest->setIsPresent(true);
            $guest->setPersonIndex(++$personIndex);
            $guest->setSpace($defaultSpace);
            if ($eventMenu) {
                $guest->setMenuItem($eventMenu);
            }
            $this->em->persist($guest);
            $guestsCreated++;
        }

        $this->em->flush();

        // Record cash payment in event cashbox
        if ($isPaid && $totalPrice > 0 && $paymentMethod === 'CASH') {
            $eventCashbox = $this->cashboxService->getEventCashbox($event);
            if ($eventCashbox && $eventCashbox->isActive() && $eventCashbox->getLockedBy() === null) {
                $this->movementService->addMovement($eventCashbox, 'INCOME', (string) $totalPrice, [
                    'category' => 'Hotovostní platba',
                    'description' => "Walk-in: {$contactName} ({$totalGuests} hostů)",
                    'paymentMethod' => 'CASH',
                    'referenceId' => 'reservation_' . $reservation->getId(),
                    'user' => $this->getUser(),
                ]);
                $this->em->flush();
            }
        }

        return $this->json([
            'status' => 'success',
            'reservationId' => $reservation->getId(),
            'guestsCreated' => $guestsCreated,
        ]);
    }
}
