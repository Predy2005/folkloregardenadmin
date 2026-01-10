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
use App\Service\SeatingAlgorithmService;
use App\Service\EventDashboardService;
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

    public function __construct(
        private readonly EntityManagerInterface $em,
        private readonly \App\Service\EventGuestSyncService $guestSync,
        private readonly SeatingAlgorithmService $seatingService,
        private readonly EventDashboardService $dashboardService
    ) {
        // Obtain repository via EntityManager to avoid DI wiring issues
        $this->guestRepo = $this->em->getRepository(EventGuest::class);
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
                ];
            }

            return [
                'id' => $id,
                'name' => $e->getName(),
                'eventType' => $e->getEventType(),
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
            $spaces[] = $s->getSpaceName();
        }

        $data = [
            'id' => $event->getId(),
            'name' => $event->getName(),
            'eventType' => $event->getEventType(),
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

    /**
     * Manager Dashboard - comprehensive event data for tablet management
     */
    #[Route('/{id}/manager-dashboard', name: 'event_manager_dashboard', methods: ['GET'])]
    #[IsGranted('events.read')]
    public function managerDashboard(int $id, EventRepository $eventRepository): JsonResponse
    {
        $event = $eventRepository->find($id);
        if (!$event) {
            return $this->json(['error' => 'Event not found'], 404);
        }

        // Sync guests before getting dashboard data
        $this->guestSync->syncForEvent($event);
        $this->em->refresh($event);

        $dashboardData = $this->dashboardService->getDashboardData($event);

        return $this->json($dashboardData);
    }

    /**
     * Pay staff assignment - update payment and create cash movement
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
        $notes = $data['notes'] ?? null;

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

        // Update assignment
        if ($hoursWorked !== null) {
            $assignment->setHoursWorked((string) $hoursWorked);
        }
        if ($paymentAmount !== null) {
            $assignment->setPaymentAmount((string) $paymentAmount);
        }
        $assignment->setPaymentStatus('PAID');
        if ($notes) {
            $assignment->setNotes($notes);
        }

        $this->em->flush();

        return $this->json([
            'success' => true,
            'assignment' => [
                'id' => $assignment->getId(),
                'hoursWorked' => (float) $assignment->getHoursWorked(),
                'paymentAmount' => $assignment->getPaymentAmount() ? (float) $assignment->getPaymentAmount() : null,
                'paymentStatus' => $assignment->getPaymentStatus(),
            ],
        ]);
    }

    /**
     * Add expense to event
     */
    #[Route('/{id}/expenses', name: 'event_add_expense', methods: ['POST'])]
    #[IsGranted('events.update')]
    public function addExpense(int $id, Request $request, EventRepository $eventRepository): JsonResponse
    {
        $event = $eventRepository->find($id);
        if (!$event) {
            return $this->json(['error' => 'Event not found'], 404);
        }

        $data = json_decode($request->getContent(), true) ?? [];
        $category = $data['category'] ?? 'OTHER';
        $amount = $data['amount'] ?? null;
        $description = $data['description'] ?? '';
        $paidTo = $data['paidTo'] ?? '';
        $paymentMethod = $data['paymentMethod'] ?? 'CASH';

        if (!$amount || $amount <= 0) {
            return $this->json(['error' => 'Amount is required and must be positive'], 400);
        }

        // Find or create cashbox for this event date
        $cashboxRepo = $this->em->getRepository(\App\Entity\Cashbox::class);
        $eventDate = $event->getEventDate();

        // Look for active cashbox on this date
        $cashbox = null;
        $cashboxes = $cashboxRepo->findBy(['isActive' => true]);
        foreach ($cashboxes as $cb) {
            if ($cb->getOpenedAt()->format('Y-m-d') === $eventDate->format('Y-m-d')) {
                $cashbox = $cb;
                break;
            }
        }

        if (!$cashbox) {
            // Create new cashbox for this event
            $cashbox = new \App\Entity\Cashbox();
            $cashbox->setName('Kasa - ' . $event->getName());
            $cashbox->setOpenedAt(new \DateTime($eventDate->format('Y-m-d') . ' 00:00:00'));
            $cashbox->setIsActive(true);
            $this->em->persist($cashbox);
        }

        // Create cash movement
        $movement = new \App\Entity\CashMovement();
        $movement->setCashbox($cashbox);
        $movement->setMovementType('EXPENSE');
        $movement->setCategory($category);
        $movement->setAmount((string) $amount);
        $movement->setDescription($description ?: $paidTo);
        $movement->setPaymentMethod($paymentMethod);

        // Update cashbox balance
        $currentBalance = (float) $cashbox->getCurrentBalance();
        $cashbox->setCurrentBalance((string) ($currentBalance - $amount));

        $this->em->persist($movement);
        $this->em->flush();

        return $this->json([
            'success' => true,
            'movement' => [
                'id' => $movement->getId(),
                'category' => $movement->getCategory(),
                'amount' => (float) $movement->getAmount(),
                'description' => $movement->getDescription(),
            ],
            'cashboxBalance' => (float) $cashbox->getCurrentBalance(),
        ]);
    }

    /**
     * Add income to event
     */
    #[Route('/{id}/income', name: 'event_add_income', methods: ['POST'])]
    #[IsGranted('events.update')]
    public function addIncome(int $id, Request $request, EventRepository $eventRepository): JsonResponse
    {
        $event = $eventRepository->find($id);
        if (!$event) {
            return $this->json(['error' => 'Event not found'], 404);
        }

        $data = json_decode($request->getContent(), true) ?? [];
        $category = $data['category'] ?? 'OTHER';
        $amount = $data['amount'] ?? null;
        $description = $data['description'] ?? '';
        $source = $data['source'] ?? '';
        $paymentMethod = $data['paymentMethod'] ?? 'CASH';

        if (!$amount || $amount <= 0) {
            return $this->json(['error' => 'Amount is required and must be positive'], 400);
        }

        // Find or create cashbox for this event date
        $cashboxRepo = $this->em->getRepository(\App\Entity\Cashbox::class);
        $eventDate = $event->getEventDate();

        $cashbox = null;
        $cashboxes = $cashboxRepo->findBy(['isActive' => true]);
        foreach ($cashboxes as $cb) {
            if ($cb->getOpenedAt()->format('Y-m-d') === $eventDate->format('Y-m-d')) {
                $cashbox = $cb;
                break;
            }
        }

        if (!$cashbox) {
            $cashbox = new \App\Entity\Cashbox();
            $cashbox->setName('Kasa - ' . $event->getName());
            $cashbox->setOpenedAt(new \DateTime($eventDate->format('Y-m-d') . ' 00:00:00'));
            $cashbox->setIsActive(true);
            $this->em->persist($cashbox);
        }

        // Create cash movement
        $movement = new \App\Entity\CashMovement();
        $movement->setCashbox($cashbox);
        $movement->setMovementType('INCOME');
        $movement->setCategory($category);
        $movement->setAmount((string) $amount);
        $movement->setDescription($description ?: $source);
        $movement->setPaymentMethod($paymentMethod);

        // Update cashbox balance
        $currentBalance = (float) $cashbox->getCurrentBalance();
        $cashbox->setCurrentBalance((string) ($currentBalance + $amount));

        $this->em->persist($movement);
        $this->em->flush();

        return $this->json([
            'success' => true,
            'movement' => [
                'id' => $movement->getId(),
                'category' => $movement->getCategory(),
                'amount' => (float) $movement->getAmount(),
                'description' => $movement->getDescription(),
            ],
            'cashboxBalance' => (float) $cashbox->getCurrentBalance(),
        ]);
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

        // spaces (může přijít jako pole s názvy)
        if (!empty($data['spaces']) && is_array($data['spaces'])) {
            foreach ($data['spaces'] as $spaceName) {
                $space = new EventSpace();
                $space->setEvent($event)->setSpaceName(strtolower((string)$spaceName));
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
            // Add new spaces
            foreach ($data['spaces'] as $spaceName) {
                $space = new EventSpace();
                $space->setEvent($event)->setSpaceName(strtolower((string)$spaceName));
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

    #[Route('/{id}/menu', name: 'event_menu_list', methods: ['GET'])]
    #[IsGranted('events.read')]
    public function listMenu(int $id, EventRepository $eventRepository): JsonResponse
    {
        $event = $eventRepository->find($id);
        if (!$event) {
            return $this->json(['error' => 'Not found'], 404);
        }

        $menu = [];
        foreach ($event->getMenus() as $m) {
            $menu[] = [
                'id' => $m->getId(),
                'menuName' => $m->getMenuName(),
                'quantity' => $m->getQuantity(),
                'pricePerUnit' => $m->getPricePerUnit(),
                'totalPrice' => $m->getTotalPrice(),
                'reservationFoodId' => $m->getReservationFood()?->getId(),
                'notes' => $m->getNotes(),
            ];
        }

        return $this->json($menu);
    }

    #[Route('/{id}/beverages', name: 'event_beverages_list', methods: ['GET'])]
    #[IsGranted('events.read')]
    public function listBeverages(int $id, EventRepository $eventRepository): JsonResponse
    {
        $event = $eventRepository->find($id);
        if (!$event) {
            return $this->json(['error' => 'Not found'], 404);
        }

        $beverages = [];
        foreach ($event->getBeverages() as $b) {
            $beverages[] = [
                'id' => $b->getId(),
                'beverageName' => $b->getBeverageName(),
                'quantity' => $b->getQuantity(),
                'unit' => $b->getUnit(),
                'pricePerUnit' => $b->getPricePerUnit(),
                'totalPrice' => $b->getTotalPrice(),
                'notes' => $b->getNotes(),
            ];
        }

        return $this->json($beverages);
    }

    #[Route('/{id}/schedule', name: 'event_schedule_list', methods: ['GET'])]
    #[IsGranted('events.read')]
    public function listSchedule(int $id, EventRepository $eventRepository): JsonResponse
    {
        $event = $eventRepository->find($id);
        if (!$event) {
            return $this->json(['error' => 'Not found'], 404);
        }

        $schedule = [];
        foreach ($event->getSchedules() as $s) {
            $schedule[] = [
                'id' => $s->getId(),
                'startTime' => $s->getStartTime()?->format('H:i:s'),
                'endTime' => $s->getEndTime()?->format('H:i:s'),
                'activity' => $s->getActivity(),
                'description' => $s->getDescription(),
                'isCompleted' => $s->isCompleted(),
            ];
        }

        return $this->json($schedule);
    }

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
            $tables[] = [
                'id' => $t->getId(),
                'tableNumber' => $t->getTableNumber(),
                'spaceName' => $t->getSpaceName(),
                'capacity' => $t->getCapacity(),
                'positionX' => $t->getPositionX(),
                'positionY' => $t->getPositionY(),
            ];
        }

        return $this->json($tables);
    }

    #[Route('/{id}/staff-assignments', name: 'event_staff_assignments_list', methods: ['GET'])]
    #[IsGranted('events.read')]
    public function listStaffAssignments(int $id, EventRepository $eventRepository): JsonResponse
    {
        $event = $eventRepository->find($id);
        if (!$event) {
            return $this->json(['error' => 'Not found'], 404);
        }

        $assignments = [];
        foreach ($event->getStaffAssignments() as $a) {
            $assignments[] = [
                'id' => $a->getId(),
                'staffMemberId' => $a->getStaffMember()?->getId(),
                'staffRoleId' => $a->getStaffRole()?->getId(),
                'assignmentStatus' => $a->getAssignmentStatus(),
                'attendanceStatus' => $a->getAttendanceStatus(),
                'hoursWorked' => $a->getHoursWorked(),
                'paymentAmount' => $a->getPaymentAmount(),
                'paymentStatus' => $a->getPaymentStatus(),
                'notes' => $a->getNotes(),
            ];
        }

        return $this->json($assignments);
    }

    #[Route('/{id}/vouchers', name: 'event_vouchers_list', methods: ['GET'])]
    #[IsGranted('events.read')]
    public function listVouchers(int $id, EventRepository $eventRepository): JsonResponse
    {
        $event = $eventRepository->find($id);
        if (!$event) {
            return $this->json(['error' => 'Not found'], 404);
        }

        $vouchers = [];
        foreach ($event->getVouchers() as $v) {
            $vouchers[] = [
                'id' => $v->getId(),
                'voucherId' => $v->getVoucher()?->getId(),
                'quantity' => $v->getQuantity(),
                'validated' => $v->isValidated(),
                'validatedAt' => $v->getValidatedAt()?->format(DATE_ATOM),
                'notes' => $v->getNotes(),
            ];
        }

        return $this->json($vouchers);
    }

    #[Route('/{id}', name: 'event_delete', methods: ['DELETE'])]
    #[IsGranted('events.delete')]
    public function delete(int $id, EventRepository $eventRepository): JsonResponse
    {
        $event = $eventRepository->find($id);
        if (!$event) {
            return $this->json(['error' => 'Not found'], 404);
        }
        $this->em->remove($event);
        $this->em->flush();
        return $this->json(['status' => 'deleted']);
    }

    /**
     * Waiter View - tablet-optimized endpoint returning all data needed for waiter interface
     * Returns: event info, tables with guests (including nationality), schedule, menu summary
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
                'eventType' => $event->getEventType(),
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
}
