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
use App\Service\EventGuestSummaryService;
use App\Service\StaffRequirementService;
use App\Service\EventStockRequirementService;
use App\Service\CashboxService;
use App\Entity\User;
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
        private readonly SeatingAlgorithmService $seatingService,
        private readonly EventDashboardService $dashboardService,
        private readonly EventGuestSummaryService $guestSummaryService,
        private readonly StaffRequirementService $staffRequirementService,
        private readonly EventStockRequirementService $stockRequirementService,
        private readonly CashboxService $cashboxService,
    ) {
        // Obtain repository via EntityManager to avoid DI wiring issues
        $this->guestRepo = $this->em->getRepository(EventGuest::class);
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

        // NOTE: Removed automatic guestSync->syncForEvent() call here!
        // Sync should only be called explicitly when needed, otherwise it
        // destroys manual space assignments (the sync recreates all guests
        // from scratch without preserving the 'space' field).

        $dashboardData = $this->dashboardService->getDashboardData($event);

        return $this->json($dashboardData);
    }

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

    /**
     * Add expense to event (creates event cashbox if needed)
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

        $cashbox = $this->cashboxService->getOrCreateEventCashbox($event);

        $user = $this->getUser();

        try {
            $movement = $this->cashboxService->addMovement($cashbox, 'EXPENSE', (string) $amount, [
                'category' => $category,
                'description' => $description ?: $paidTo,
                'paymentMethod' => $paymentMethod,
                'user' => $user instanceof User ? $user : null,
            ]);
            $this->em->flush();
        } catch (\RuntimeException $e) {
            return $this->json(['error' => $e->getMessage()], 400);
        }

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
     * Add income to event (creates event cashbox if needed)
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

        $cashbox = $this->cashboxService->getOrCreateEventCashbox($event);

        $user = $this->getUser();

        try {
            $movement = $this->cashboxService->addMovement($cashbox, 'INCOME', (string) $amount, [
                'category' => $category,
                'description' => $description ?: $source,
                'paymentMethod' => $paymentMethod,
                'user' => $user instanceof User ? $user : null,
            ]);
            $this->em->flush();
        } catch (\RuntimeException $e) {
            return $this->json(['error' => $e->getMessage()], 400);
        }

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
     * Get payment overview for event - all reservations and their payment status
     */
    #[Route('/{id}/payments', name: 'event_payments_overview', methods: ['GET'])]
    #[IsGranted('events.read')]
    public function getPaymentsOverview(int $id, EventRepository $eventRepository): JsonResponse
    {
        $event = $eventRepository->find($id);
        if (!$event) {
            return $this->json(['error' => 'Event not found'], 404);
        }

        $payments = $this->dashboardService->getReservationPayments($event);
        return $this->json($payments);
    }

    /**
     * Update payment note for a reservation linked to this event
     *
     * @param int $id Event ID
     * @param int $reservationId Reservation ID
     */
    #[Route('/{id}/reservations/{reservationId}/payment-note', name: 'event_reservation_payment_note', methods: ['PUT', 'PATCH'])]
    #[IsGranted('events.update')]
    public function updateReservationPaymentNote(int $id, int $reservationId, Request $request, EventRepository $eventRepository): JsonResponse
    {
        $event = $eventRepository->find($id);
        if (!$event) {
            return $this->json(['error' => 'Event not found'], 404);
        }

        // Verify reservation is linked to this event via guests
        $isLinked = false;
        foreach ($event->getGuests() as $guest) {
            if ($guest->getReservation() && $guest->getReservation()->getId() === $reservationId) {
                $isLinked = true;
                break;
            }
        }

        if (!$isLinked) {
            return $this->json(['error' => 'Reservation is not linked to this event'], 400);
        }

        $reservation = $this->em->getRepository(\App\Entity\Reservation::class)->find($reservationId);
        if (!$reservation) {
            return $this->json(['error' => 'Reservation not found'], 404);
        }

        $data = json_decode($request->getContent(), true) ?? [];

        if (array_key_exists('paymentNote', $data)) {
            $reservation->setPaymentNote($data['paymentNote']);
        }

        $reservation->setUpdatedAt(new \DateTime());
        $this->em->flush();

        return $this->json([
            'success' => true,
            'reservationId' => $reservation->getId(),
            'paymentNote' => $reservation->getPaymentNote(),
            'paymentStatus' => $reservation->getPaymentStatus(),
        ]);
    }

    /**
     * Record a manual payment for a reservation linked to this event
     */
    #[Route('/{id}/reservations/{reservationId}/record-payment', name: 'event_reservation_record_payment', methods: ['POST'])]
    #[IsGranted('events.update')]
    public function recordReservationPayment(int $id, int $reservationId, Request $request, EventRepository $eventRepository): JsonResponse
    {
        $event = $eventRepository->find($id);
        if (!$event) {
            return $this->json(['error' => 'Event not found'], 404);
        }

        // Verify reservation is linked to this event
        $isLinked = false;
        foreach ($event->getGuests() as $guest) {
            if ($guest->getReservation() && $guest->getReservation()->getId() === $reservationId) {
                $isLinked = true;
                break;
            }
        }

        if (!$isLinked) {
            return $this->json(['error' => 'Reservation is not linked to this event'], 400);
        }

        $reservation = $this->em->getRepository(\App\Entity\Reservation::class)->find($reservationId);
        if (!$reservation) {
            return $this->json(['error' => 'Reservation not found'], 404);
        }

        $data = json_decode($request->getContent(), true) ?? [];
        $amount = $data['amount'] ?? null;
        $note = $data['note'] ?? null;
        $paymentMethod = $data['paymentMethod'] ?? 'CASH';

        if (!$amount || $amount <= 0) {
            return $this->json(['error' => 'Amount is required and must be positive'], 400);
        }

        // Update paid amount
        $currentPaid = (float) ($reservation->getPaidAmount() ?? 0);
        $newPaid = $currentPaid + $amount;
        $reservation->setPaidAmount((string) $newPaid);

        // Append to payment note
        $timestamp = (new \DateTime())->format('d.m.Y H:i');
        $noteEntry = "[{$timestamp}] Přijato {$amount} Kč ({$paymentMethod})";
        if ($note) {
            $noteEntry .= " - {$note}";
        }
        $existingNote = $reservation->getPaymentNote() ?? '';
        $reservation->setPaymentNote(trim($existingNote . "\n" . $noteEntry));

        // Update payment status
        $totalPrice = (float) ($reservation->getTotalPrice() ?? 0);
        if ($newPaid >= $totalPrice && $totalPrice > 0) {
            $reservation->setPaymentStatus('PAID');
        } elseif ($newPaid > 0) {
            $reservation->setPaymentStatus('PARTIAL');
        }

        $reservation->setUpdatedAt(new \DateTime());
        $this->em->flush();

        return $this->json([
            'success' => true,
            'reservationId' => $reservation->getId(),
            'paidAmount' => (float) $reservation->getPaidAmount(),
            'remainingAmount' => max(0, $totalPrice - $newPaid),
            'paymentStatus' => $reservation->getPaymentStatus(),
            'paymentNote' => $reservation->getPaymentNote(),
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
     * Get unified guest summary - SINGLE SOURCE OF TRUTH
     *
     * Returns:
     * - types: Guest breakdown by type (paying/free/adults/children/drivers/guides)
     * - presence: Check-in status (present/absent/percentage)
     * - payments: Payment status from reservations (paid/partial/unpaid amounts and counts)
     * - bySpace: Breakdown by venue space
     * - byReservation: Breakdown by reservation (for check-in UI)
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
     * Get stock requirements for an event
     * Returns required ingredients based on menu compositions (MenuRecipe → Recipe → RecipeIngredient)
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
     *
     * Supports multiple filter criteria:
     * - reservationId: Move all guests from a specific reservation
     * - nationality: Move all guests of a specific nationality
     * - menuId: Move all guests with a specific menu
     * - fromSpace: Move guests from a specific space
     * - count: Limit the number of guests to move (optional)
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
            // Guests with null space are considered part of the first space
            if (!empty($filter['fromSpace'])) {
                $guestSpace = $guest->getSpace();
                if ($guestSpace === null) {
                    // Null-space guests belong to first space only
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
     * Sets the first N guests as present, rest as not present
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
     * Sets the first N assignments of this role as PRESENT, rest as CONFIRMED
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

    #[Route('/{id}/menu', name: 'event_menu_list', methods: ['GET'])]
    #[IsGranted('events.read')]
    public function listMenu(int $id, EventRepository $eventRepository): JsonResponse
    {
        $event = $eventRepository->find($id);
        if (!$event) {
            return $this->json(['error' => 'Not found'], 404);
        }

        // Sync guests and menu from reservations before returning data
        $this->guestSync->syncForEvent($event);
        $this->em->refresh($event);

        $menu = [];
        foreach ($event->getMenus() as $m) {
            $menu[] = [
                'id' => $m->getId(),
                'menuName' => $m->getMenuName(),
                'quantity' => $m->getQuantity(),
                'pricePerUnit' => $m->getPricePerUnit() !== null ? (float) $m->getPricePerUnit() : null,
                'totalPrice' => $m->getTotalPrice() !== null ? (float) $m->getTotalPrice() : null,
                'servingTime' => $m->getServingTime()?->format('H:i'),
                'reservationFoodId' => $m->getReservationFood()?->getId(),
                'reservationId' => $m->getReservation()?->getId(),
                'notes' => $m->getNotes(),
            ];
        }

        return $this->json($menu);
    }

    #[Route('/{id}/menu', name: 'event_menu_create', methods: ['POST'])]
    #[IsGranted('events.update')]
    public function createMenu(int $id, Request $request, EventRepository $eventRepository): JsonResponse
    {
        $event = $eventRepository->find($id);
        if (!$event) {
            return $this->json(['error' => 'Event not found'], 404);
        }

        $data = json_decode($request->getContent(), true) ?? [];

        $menuItem = new EventMenu();
        $menuItem->setEvent($event);
        $menuItem->setMenuName($data['menuName'] ?? '');
        $menuItem->setQuantity($data['quantity'] ?? 1);
        $menuItem->setPricePerUnit(isset($data['pricePerUnit']) && $data['pricePerUnit'] !== null ? (string) $data['pricePerUnit'] : null);
        $menuItem->setTotalPrice(isset($data['totalPrice']) && $data['totalPrice'] !== null ? (string) $data['totalPrice'] : null);
        $menuItem->setNotes($data['notes'] ?? null);

        if (!empty($data['servingTime'])) {
            $menuItem->setServingTime(\DateTime::createFromFormat('H:i', $data['servingTime']) ?: null);
        }

        // Set reservation if provided
        if (!empty($data['reservationId'])) {
            $reservation = $this->em->getRepository(Reservation::class)->find($data['reservationId']);
            if ($reservation) {
                $menuItem->setReservation($reservation);
            }
        }

        $this->em->persist($menuItem);
        $this->em->flush();

        return $this->json([
            'id' => $menuItem->getId(),
            'menuName' => $menuItem->getMenuName(),
            'quantity' => $menuItem->getQuantity(),
            'pricePerUnit' => $menuItem->getPricePerUnit() !== null ? (float) $menuItem->getPricePerUnit() : null,
            'totalPrice' => $menuItem->getTotalPrice() !== null ? (float) $menuItem->getTotalPrice() : null,
            'servingTime' => $menuItem->getServingTime()?->format('H:i'),
            'reservationId' => $menuItem->getReservation()?->getId(),
            'notes' => $menuItem->getNotes(),
        ], 201);
    }

    #[Route('/{id}/menu/{menuId}', name: 'event_menu_update', methods: ['PUT'])]
    #[IsGranted('events.update')]
    public function updateMenu(int $id, int $menuId, Request $request, EventRepository $eventRepository): JsonResponse
    {
        $event = $eventRepository->find($id);
        if (!$event) {
            return $this->json(['error' => 'Event not found'], 404);
        }

        $menuItem = $this->em->getRepository(EventMenu::class)->find($menuId);
        if (!$menuItem || $menuItem->getEvent()->getId() !== $id) {
            return $this->json(['error' => 'Menu item not found'], 404);
        }

        $data = json_decode($request->getContent(), true) ?? [];

        if (isset($data['menuName'])) $menuItem->setMenuName($data['menuName']);
        if (isset($data['quantity'])) $menuItem->setQuantity($data['quantity']);
        if (array_key_exists('pricePerUnit', $data)) {
            $menuItem->setPricePerUnit($data['pricePerUnit'] !== null ? (string) $data['pricePerUnit'] : null);
        }
        if (array_key_exists('totalPrice', $data)) {
            $menuItem->setTotalPrice($data['totalPrice'] !== null ? (string) $data['totalPrice'] : null);
        }
        if (array_key_exists('notes', $data)) $menuItem->setNotes($data['notes']);
        if (isset($data['servingTime'])) {
            $menuItem->setServingTime(\DateTime::createFromFormat('H:i', $data['servingTime']) ?: null);
        }

        $this->em->flush();

        return $this->json([
            'id' => $menuItem->getId(),
            'menuName' => $menuItem->getMenuName(),
            'quantity' => $menuItem->getQuantity(),
            'pricePerUnit' => $menuItem->getPricePerUnit() !== null ? (float) $menuItem->getPricePerUnit() : null,
            'totalPrice' => $menuItem->getTotalPrice() !== null ? (float) $menuItem->getTotalPrice() : null,
            'servingTime' => $menuItem->getServingTime()?->format('H:i'),
            'notes' => $menuItem->getNotes(),
        ]);
    }

    #[Route('/{id}/menu/{menuId}', name: 'event_menu_delete', methods: ['DELETE'])]
    #[IsGranted('events.update')]
    public function deleteMenu(int $id, int $menuId, EventRepository $eventRepository): JsonResponse
    {
        $event = $eventRepository->find($id);
        if (!$event) {
            return $this->json(['error' => 'Event not found'], 404);
        }

        $menuItem = $this->em->getRepository(EventMenu::class)->find($menuId);
        if (!$menuItem || $menuItem->getEvent()->getId() !== $id) {
            return $this->json(['error' => 'Menu item not found'], 404);
        }

        $this->em->remove($menuItem);
        $this->em->flush();

        return $this->json(['status' => 'deleted']);
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

    #[Route('/{id}/beverages', name: 'event_beverage_create', methods: ['POST'])]
    #[IsGranted('events.update')]
    public function createBeverage(int $id, Request $request, EventRepository $eventRepository): JsonResponse
    {
        $event = $eventRepository->find($id);
        if (!$event) {
            return $this->json(['error' => 'Event not found'], 404);
        }

        $data = json_decode($request->getContent(), true) ?? [];

        $beverage = new \App\Entity\EventBeverage();
        $beverage->setEvent($event);
        $beverage->setBeverageName($data['beverageName'] ?? '');
        $beverage->setQuantity($data['quantity'] ?? 1);
        $beverage->setUnit($data['unit'] ?? 'ks');
        $beverage->setPricePerUnit($data['pricePerUnit'] !== null ? (string) $data['pricePerUnit'] : null);
        $beverage->setTotalPrice($data['totalPrice'] !== null ? (string) $data['totalPrice'] : null);
        $beverage->setNotes($data['notes'] ?? null);

        $this->em->persist($beverage);
        $this->em->flush();

        return $this->json([
            'id' => $beverage->getId(),
            'beverageName' => $beverage->getBeverageName(),
            'quantity' => $beverage->getQuantity(),
            'unit' => $beverage->getUnit(),
            'pricePerUnit' => $beverage->getPricePerUnit(),
            'totalPrice' => $beverage->getTotalPrice(),
            'notes' => $beverage->getNotes(),
        ], 201);
    }

    #[Route('/{id}/beverages/{beverageId}', name: 'event_beverage_update', methods: ['PUT'])]
    #[IsGranted('events.update')]
    public function updateBeverage(int $id, int $beverageId, Request $request, EventRepository $eventRepository): JsonResponse
    {
        $event = $eventRepository->find($id);
        if (!$event) {
            return $this->json(['error' => 'Event not found'], 404);
        }

        $beverage = $this->em->getRepository(\App\Entity\EventBeverage::class)->find($beverageId);
        if (!$beverage || $beverage->getEvent()->getId() !== $id) {
            return $this->json(['error' => 'Beverage not found'], 404);
        }

        $data = json_decode($request->getContent(), true) ?? [];

        if (isset($data['beverageName'])) $beverage->setBeverageName($data['beverageName']);
        if (isset($data['quantity'])) $beverage->setQuantity($data['quantity']);
        if (isset($data['unit'])) $beverage->setUnit($data['unit']);
        if (array_key_exists('pricePerUnit', $data)) {
            $beverage->setPricePerUnit($data['pricePerUnit'] !== null ? (string) $data['pricePerUnit'] : null);
        }
        if (array_key_exists('totalPrice', $data)) {
            $beverage->setTotalPrice($data['totalPrice'] !== null ? (string) $data['totalPrice'] : null);
        }
        if (array_key_exists('notes', $data)) $beverage->setNotes($data['notes']);

        $this->em->flush();

        return $this->json([
            'id' => $beverage->getId(),
            'beverageName' => $beverage->getBeverageName(),
            'quantity' => $beverage->getQuantity(),
            'unit' => $beverage->getUnit(),
            'pricePerUnit' => $beverage->getPricePerUnit(),
            'totalPrice' => $beverage->getTotalPrice(),
            'notes' => $beverage->getNotes(),
        ]);
    }

    #[Route('/{id}/beverages/{beverageId}', name: 'event_beverage_delete', methods: ['DELETE'])]
    #[IsGranted('events.update')]
    public function deleteBeverage(int $id, int $beverageId, EventRepository $eventRepository): JsonResponse
    {
        $event = $eventRepository->find($id);
        if (!$event) {
            return $this->json(['error' => 'Event not found'], 404);
        }

        $beverage = $this->em->getRepository(\App\Entity\EventBeverage::class)->find($beverageId);
        if (!$beverage || $beverage->getEvent()->getId() !== $id) {
            return $this->json(['error' => 'Beverage not found'], 404);
        }

        $this->em->remove($beverage);
        $this->em->flush();

        return $this->json(['status' => 'deleted']);
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
                'timeSlot' => $s->getTimeSlot()?->format('H:i'),
                'durationMinutes' => $s->getDurationMinutes(),
                'activity' => $s->getActivity(),
                'description' => $s->getDescription(),
                'responsibleStaffId' => $s->getResponsibleStaffId(),
                'notes' => $s->getNotes(),
            ];
        }

        return $this->json($schedule);
    }

    #[Route('/{id}/schedule', name: 'event_schedule_create', methods: ['POST'])]
    #[IsGranted('events.update')]
    public function createSchedule(int $id, Request $request, EventRepository $eventRepository): JsonResponse
    {
        $event = $eventRepository->find($id);
        if (!$event) {
            return $this->json(['error' => 'Event not found'], 404);
        }

        $data = json_decode($request->getContent(), true) ?? [];

        $scheduleItem = new \App\Entity\EventSchedule();
        $scheduleItem->setEvent($event);
        $scheduleItem->setActivity($data['activity'] ?? '');
        $scheduleItem->setDurationMinutes($data['durationMinutes'] ?? 60);
        $scheduleItem->setDescription($data['description'] ?? null);
        $scheduleItem->setResponsibleStaffId($data['responsibleStaffId'] ?? null);
        $scheduleItem->setNotes($data['notes'] ?? null);

        if (!empty($data['timeSlot'])) {
            $scheduleItem->setTimeSlot(\DateTime::createFromFormat('H:i', $data['timeSlot']) ?: new \DateTime());
        } else {
            $scheduleItem->setTimeSlot(new \DateTime());
        }

        $this->em->persist($scheduleItem);
        $this->em->flush();

        return $this->json([
            'id' => $scheduleItem->getId(),
            'timeSlot' => $scheduleItem->getTimeSlot()?->format('H:i'),
            'durationMinutes' => $scheduleItem->getDurationMinutes(),
            'activity' => $scheduleItem->getActivity(),
            'description' => $scheduleItem->getDescription(),
            'responsibleStaffId' => $scheduleItem->getResponsibleStaffId(),
            'notes' => $scheduleItem->getNotes(),
        ], 201);
    }

    #[Route('/{id}/schedule/{scheduleId}', name: 'event_schedule_update', methods: ['PUT'])]
    #[IsGranted('events.update')]
    public function updateSchedule(int $id, int $scheduleId, Request $request, EventRepository $eventRepository): JsonResponse
    {
        $event = $eventRepository->find($id);
        if (!$event) {
            return $this->json(['error' => 'Event not found'], 404);
        }

        $scheduleItem = $this->em->getRepository(\App\Entity\EventSchedule::class)->find($scheduleId);
        if (!$scheduleItem || $scheduleItem->getEvent()->getId() !== $id) {
            return $this->json(['error' => 'Schedule item not found'], 404);
        }

        $data = json_decode($request->getContent(), true) ?? [];

        if (isset($data['timeSlot'])) {
            $scheduleItem->setTimeSlot(\DateTime::createFromFormat('H:i', $data['timeSlot']) ?: $scheduleItem->getTimeSlot());
        }
        if (isset($data['durationMinutes'])) $scheduleItem->setDurationMinutes($data['durationMinutes']);
        if (isset($data['activity'])) $scheduleItem->setActivity($data['activity']);
        if (array_key_exists('description', $data)) $scheduleItem->setDescription($data['description']);
        if (array_key_exists('responsibleStaffId', $data)) $scheduleItem->setResponsibleStaffId($data['responsibleStaffId']);
        if (array_key_exists('notes', $data)) $scheduleItem->setNotes($data['notes']);

        $this->em->flush();

        return $this->json([
            'id' => $scheduleItem->getId(),
            'timeSlot' => $scheduleItem->getTimeSlot()?->format('H:i'),
            'durationMinutes' => $scheduleItem->getDurationMinutes(),
            'activity' => $scheduleItem->getActivity(),
            'description' => $scheduleItem->getDescription(),
            'responsibleStaffId' => $scheduleItem->getResponsibleStaffId(),
            'notes' => $scheduleItem->getNotes(),
        ]);
    }

    #[Route('/{id}/schedule/{scheduleId}', name: 'event_schedule_delete', methods: ['DELETE'])]
    #[IsGranted('events.update')]
    public function deleteSchedule(int $id, int $scheduleId, EventRepository $eventRepository): JsonResponse
    {
        $event = $eventRepository->find($id);
        if (!$event) {
            return $this->json(['error' => 'Event not found'], 404);
        }

        $scheduleItem = $this->em->getRepository(\App\Entity\EventSchedule::class)->find($scheduleId);
        if (!$scheduleItem || $scheduleItem->getEvent()->getId() !== $id) {
            return $this->json(['error' => 'Schedule item not found'], 404);
        }

        $this->em->remove($scheduleItem);
        $this->em->flush();

        return $this->json(['status' => 'deleted']);
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
                'tableName' => $t->getTableName(),
                'room' => $t->getRoom(),
                'capacity' => $t->getCapacity(),
                'positionX' => $t->getPositionX(),
                'positionY' => $t->getPositionY(),
            ];
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

        $table = new \App\Entity\EventTable();
        $table->setEvent($event);
        $table->setTableName($data['tableName'] ?? '');
        $table->setRoom($data['room'] ?? 'roubenka');
        $table->setCapacity($data['capacity'] ?? 4);
        $table->setPositionX($data['positionX'] ?? null);
        $table->setPositionY($data['positionY'] ?? null);

        $this->em->persist($table);
        $this->em->flush();

        return $this->json([
            'id' => $table->getId(),
            'tableName' => $table->getTableName(),
            'room' => $table->getRoom(),
            'capacity' => $table->getCapacity(),
            'positionX' => $table->getPositionX(),
            'positionY' => $table->getPositionY(),
        ], 201);
    }

    #[Route('/{id}/tables/{tableId}', name: 'event_table_update', methods: ['PUT'])]
    #[IsGranted('events.update')]
    public function updateTable(int $id, int $tableId, Request $request, EventRepository $eventRepository): JsonResponse
    {
        $event = $eventRepository->find($id);
        if (!$event) {
            return $this->json(['error' => 'Event not found'], 404);
        }

        $table = $this->em->getRepository(\App\Entity\EventTable::class)->find($tableId);
        if (!$table || $table->getEvent()->getId() !== $id) {
            return $this->json(['error' => 'Table not found'], 404);
        }

        $data = json_decode($request->getContent(), true) ?? [];

        if (isset($data['tableName'])) $table->setTableName($data['tableName']);
        if (isset($data['room'])) $table->setRoom($data['room']);
        if (isset($data['capacity'])) $table->setCapacity($data['capacity']);
        if (array_key_exists('positionX', $data)) $table->setPositionX($data['positionX']);
        if (array_key_exists('positionY', $data)) $table->setPositionY($data['positionY']);

        $this->em->flush();

        return $this->json([
            'id' => $table->getId(),
            'tableName' => $table->getTableName(),
            'room' => $table->getRoom(),
            'capacity' => $table->getCapacity(),
            'positionX' => $table->getPositionX(),
            'positionY' => $table->getPositionY(),
        ]);
    }

    #[Route('/{id}/tables/{tableId}', name: 'event_table_delete', methods: ['DELETE'])]
    #[IsGranted('events.update')]
    public function deleteTable(int $id, int $tableId, EventRepository $eventRepository): JsonResponse
    {
        $event = $eventRepository->find($id);
        if (!$event) {
            return $this->json(['error' => 'Event not found'], 404);
        }

        $table = $this->em->getRepository(\App\Entity\EventTable::class)->find($tableId);
        if (!$table || $table->getEvent()->getId() !== $id) {
            return $this->json(['error' => 'Table not found'], 404);
        }

        $this->em->remove($table);
        $this->em->flush();

        return $this->json(['status' => 'deleted']);
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

    /**
     * Move guests between spaces.
     * Supports filtering by: guestIds, nationality, reservationId, sourceSpace
     * Supports partial moves with: count (limit number of guests to move)
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
     * Allows setting how many guests from the group are present.
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
     * Get available menus for quick reservation.
     */
    #[Route('/{id}/available-menus', name: 'event_available_menus', methods: ['GET'])]
    #[IsGranted('events.read')]
    public function getAvailableMenus(int $id, EventRepository $eventRepository): JsonResponse
    {
        $event = $eventRepository->find($id);
        if (!$event) {
            return $this->json(['error' => 'Event not found'], 404);
        }

        $menus = [];
        foreach ($event->getMenus() as $menu) {
            $menus[] = [
                'id' => $menu->getId(),
                'menuName' => $menu->getMenuName(),
                'pricePerUnit' => $menu->getPricePerUnit() ? (float) $menu->getPricePerUnit() : null,
            ];
        }

        // If no event menus, return default menu options
        if (empty($menus)) {
            $menus = [
                ['id' => 0, 'menuName' => 'Standard menu', 'pricePerUnit' => null],
            ];
        }

        return $this->json($menus);
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
                $this->cashboxService->addMovement($eventCashbox, 'INCOME', (string) $totalPrice, [
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
