<?php

namespace App\Controller;

use App\Entity\Reservation;
use App\Entity\Contact;
use App\Entity\ReservationPerson;
use App\Enum\FoodMenu;
use App\Repository\ReservationFoodsRepository;
use App\Repository\ContactRepository;
use App\Repository\ReservationPersonRepository;
use App\Repository\ReservationRepository;
use App\Config\SpecialDateRules;
use App\Repository\ReservationTypeRepository;
use App\Entity\Event;
use App\Service\AutoEventService;
use App\Service\CashboxService;
use App\Service\ReservationPaymentService;
use App\Service\InvoiceService;
use Doctrine\ORM\EntityManagerInterface;
use Doctrine\Persistence\ManagerRegistry;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\RedirectResponse;
use Symfony\Component\HttpFoundation\Request;
use App\Service\SafeMailerService;
use Symfony\Component\Mailer\Exception\TransportExceptionInterface;
use Symfony\Component\Mime\Email;
use Symfony\Component\Routing\Annotation\Route;
use Symfony\Component\Intl\Countries;
use Symfony\Component\Security\Http\Attribute\IsGranted;

class ReservationController extends AbstractController
{
    private SafeMailerService $mailer;
    private EntityManagerInterface $entityManager;
    private ReservationFoodsRepository $foodsRepository;
    private AutoEventService $autoEventService;
    private ReservationPaymentService $paymentService;
    private InvoiceService $invoiceService;
    private ReservationTypeRepository $reservationTypeRepository;
    private CashboxService $cashboxService;

    public function __construct(
        EntityManagerInterface $entityManager,
        SafeMailerService $mailer,
        ReservationFoodsRepository $foodsRepository,
        AutoEventService $autoEventService,
        ReservationPaymentService $paymentService,
        InvoiceService $invoiceService,
        ReservationTypeRepository $reservationTypeRepository,
        CashboxService $cashboxService
    ) {
        $this->entityManager = $entityManager;
        $this->mailer = $mailer;
        $this->foodsRepository = $foodsRepository;
        $this->autoEventService = $autoEventService;
        $this->paymentService = $paymentService;
        $this->invoiceService = $invoiceService;
        $this->reservationTypeRepository = $reservationTypeRepository;
        $this->cashboxService = $cashboxService;
    }

    /**
     * Get food name by external ID (menu code from external reservation system)
     */
    private function getFoodNameByExternalId(?string $externalId): ?string
    {
        if ($externalId === null || $externalId === '') {
            return 'Bez jídla';
        }

        $food = $this->foodsRepository->findByExternalId($externalId);
        return $food?->getName();
    }

    /**
     * Build a map of external_id => food name for efficient lookups
     */
    private function getFoodNameMap(): array
    {
        $foods = $this->foodsRepository->findAll();
        $map = ['' => 'Bez jídla'];
        foreach ($foods as $food) {
            if ($food->getExternalId() !== null) {
                $map[$food->getExternalId()] = $food->getName();
            }
        }
        return $map;
    }

    #[Route('/api/reservations', name: 'api_reservations_list', methods: ['GET'])]
    #[IsGranted('reservations.read')]
    public function list(ManagerRegistry $doctrine): JsonResponse
    {
        $reservations = $doctrine->getRepository(Reservation::class)->findBy([], ['createdAt' => 'DESC']);
        $foodNameMap = $this->getFoodNameMap();
        $data = [];
        foreach ($reservations as $reservation) {
            $personsData = [];
            foreach ($reservation->getPersons() as $person) {
                $menuCode = $person->getMenu() ?? '';
                $personsData[] = [
                    'id' => $person->getId(),
                    'reservationId' => $reservation->getId(),
                    'type' => $person->getType(),
                    'menu' => $menuCode,
                    'menuName' => $foodNameMap[$menuCode] ?? $this->getFoodNameByExternalId($menuCode) ?? 'Neznámé jídlo',
                    'price' => $person->getPrice(),
                    'nationality' => $person->getNationality(),
                'drinkOption' => $person->getDrinkOption(),
                'drinkName' => $person->getDrinkName(),
                'drinkPrice' => $person->getDrinkPrice(),
                ];
            }

            $paymentsData = [];
            foreach ($reservation->getPayments() as $payment) {
                $paymentsData[] = [
                    'id' => $payment->getId(),
                    'transactionId' => $payment->getTransactionId(),
                    'status' => $payment->getStatus(),
                    'amount' => $payment->getAmount(),
                ];
            }

            $transfersData = [];
            foreach ($reservation->getTransfers() as $transfer) {
                $transfersData[] = [
                    'id' => $transfer->getId(),
                    'personCount' => $transfer->getPersonCount(),
                    'address' => $transfer->getAddress(),
                    'transportCompanyId' => $transfer->getTransportCompany()?->getId(),
                    'transportCompanyName' => $transfer->getTransportCompany()?->getName(),
                    'transportVehicleId' => $transfer->getTransportVehicle()?->getId(),
                    'transportVehiclePlate' => $transfer->getTransportVehicle()?->getLicensePlate(),
                    'transportDriverId' => $transfer->getTransportDriver()?->getId(),
                    'transportDriverName' => $transfer->getTransportDriver()?->getFullName(),
                ];
            }

            $data[] = [
                'id' => $reservation->getId(),
                'date' => $reservation->getDate(),
                'contactName' => $reservation->getContactName(),
                'contactEmail' => $reservation->getContactEmail(),
                'contactPhone' => $reservation->getContactPhone(),
                'contactNationality' => $reservation->getContactNationality(),
                'contactNote' => $reservation->getContactNote(),
                'invoiceSameAsContact' => $reservation->isInvoiceSameAsContact(),
                'invoiceName' => $reservation->getInvoiceName(),
                'invoiceCompany' => $reservation->getInvoiceCompany(),
                'invoiceIc' => $reservation->getInvoiceIc(),
                'invoiceDic' => $reservation->getInvoiceDic(),
                'invoiceEmail' => $reservation->getInvoiceEmail(),
                'invoicePhone' => $reservation->getInvoicePhone(),
                'invoiceStreet' => $reservation->getInvoiceStreet(),
                'invoiceCity' => $reservation->getInvoiceCity(),
                'invoiceZipcode' => $reservation->getInvoiceZipcode(),
                'invoiceCountry' => $reservation->getInvoiceCountry(),
                'transferSelected' => $reservation->isTransferSelected(),
                'transferCount' => $reservation->getTransferCount(),
                'transferAddress' => $reservation->getTransferAddress(),
                'agreement' => $reservation->isAgreement(),
                'createdAt' => $reservation->getCreatedAt()?->format('Y-m-d H:i:s'),
                'updatedAt' => $reservation->getUpdatedAt()?->format('Y-m-d H:i:s'),
                'status' => $reservation->getStatus(),
                'contact' => [
                    'name' => $reservation->getContactName(),
                    'email' => $reservation->getContactEmail(),
                    'phone' => $reservation->getContactPhone(),
                    'clientComeFrom' => $reservation->getClientComeFrom(),
                ],
                'reservationTypeId' => $reservation->getReservationType()?->getId(),
                'reservationType' => $reservation->getReservationType() ? [
                    'id' => $reservation->getReservationType()->getId(),
                    'name' => $reservation->getReservationType()->getName(),
                    'code' => $reservation->getReservationType()->getCode(),
                    'color' => $reservation->getReservationType()->getColor(),
                ] : null,
                'persons' => $personsData,
                'payments' => $paymentsData,
                'transfers' => $transfersData,
            ];
        }
        return $this->json($data);
    }

    #[Route('/api/reservation/{id}', name: 'reservation_detail', methods: ['GET'])]
    #[IsGranted('reservations.read')]
    public function reservationDetail(int $id, ReservationRepository $reservationRepository, ReservationPersonRepository $personRepository): JsonResponse
    {
        $reservation = $reservationRepository->find($id);

        if (!$reservation) {
            return $this->json(['error' => 'Reservation not found'], 404);
        }

        $persons = $personRepository->findBy(['reservation' => $reservation]);
        $foodNameMap = $this->getFoodNameMap();

        $personData = [];
        foreach ($persons as $person) {
            $menuCode = $person->getMenu() ?? '';
            $food = $this->foodsRepository->findByExternalId($menuCode);

            $personData[] = [
                'id' => $person->getId(),
                'type' => $person->getType(),
                'menu' => $menuCode,
                'menuName' => $foodNameMap[$menuCode] ?? $food?->getName() ?? 'Neznámé jídlo',
                'price' => $person->getPrice(),
                'nationality' => $person->getNationality(),
                'drinkOption' => $person->getDrinkOption(),
                'drinkName' => $person->getDrinkName(),
                'drinkPrice' => $person->getDrinkPrice(),
                'food' => $food ? [
                    'id' => $food->getId(),
                    'name' => $food->getName(),
                    'price' => $food->getPrice(),
                    'externalId' => $food->getExternalId(),
                ] : null,
            ];
        }

        $paymentsData = [];
        foreach ($reservation->getPayments() as $payment) {
            $paymentsData[] = [
                'id' => $payment->getId(),
                'transactionId' => $payment->getTransactionId(),
                'status' => $payment->getStatus(),
                'amount' => $payment->getAmount(),
            ];
        }

        // Get all available foods for dropdown
        $allFoods = array_map(fn($f) => [
            'id' => $f->getId(),
            'name' => $f->getName(),
            'price' => $f->getPrice(),
            'externalId' => $f->getExternalId(),
        ], $this->foodsRepository->findAll());

        $transfersData = [];
        foreach ($reservation->getTransfers() as $transfer) {
            $transfersData[] = [
                'id' => $transfer->getId(),
                'personCount' => $transfer->getPersonCount(),
                'address' => $transfer->getAddress(),
                'transportCompanyId' => $transfer->getTransportCompany()?->getId(),
                'transportCompanyName' => $transfer->getTransportCompany()?->getName(),
                'transportVehicleId' => $transfer->getTransportVehicle()?->getId(),
                'transportVehiclePlate' => $transfer->getTransportVehicle()?->getLicensePlate(),
                'transportDriverId' => $transfer->getTransportDriver()?->getId(),
                'transportDriverName' => $transfer->getTransportDriver()?->getFullName(),
            ];
        }

        return $this->json([
            'foods' => $allFoods,
            'reservation' => [
                'id' => $reservation->getId(),
                'date' => $reservation->getDate(),
                'contactName' => $reservation->getContactName(),
                'contactEmail' => $reservation->getContactEmail(),
                'contactPhone' => $reservation->getContactPhone(),
                'contactNationality' => $reservation->getContactNationality(),
                'contactNote' => $reservation->getContactNote(),
                'invoiceSameAsContact' => $reservation->isInvoiceSameAsContact(),
                'invoiceName' => $reservation->getInvoiceName(),
                'invoiceCompany' => $reservation->getInvoiceCompany(),
                'invoiceIc' => $reservation->getInvoiceIc(),
                'invoiceDic' => $reservation->getInvoiceDic(),
                'invoiceEmail' => $reservation->getInvoiceEmail(),
                'invoicePhone' => $reservation->getInvoicePhone(),
                'invoiceStreet' => $reservation->getInvoiceStreet(),
                'invoiceCity' => $reservation->getInvoiceCity(),
                'invoiceZipcode' => $reservation->getInvoiceZipcode(),
                'invoiceCountry' => $reservation->getInvoiceCountry(),
                'transferSelected' => $reservation->isTransferSelected(),
                'transferCount' => $reservation->getTransferCount(),
                'transferAddress' => $reservation->getTransferAddress(),
                'agreement' => $reservation->isAgreement(),
                'createdAt' => $reservation->getCreatedAt()?->format('Y-m-d H:i:s'),
                'updatedAt' => $reservation->getUpdatedAt()?->format('Y-m-d H:i:s'),
                'status' => $reservation->getStatus(),
            ],
            'persons' => $personData,
            'payments' => $paymentsData,
            'transfers' => $transfersData,
        ]);
    }

    #[Route('/api/reservations', name: 'api_reservations_create', methods: ['POST'])]
    #[IsGranted('reservations.create')]
    public function create(Request $request, ManagerRegistry $doctrine, ContactRepository $contactRepository): JsonResponse|RedirectResponse
    {
        $data = json_decode($request->getContent(), true);
        if (!$data) {
            return $this->json(['error' => 'Neplatný JSON'], JsonResponse::HTTP_BAD_REQUEST);
        }

        $reservation = new Reservation();
        try {
            $reservation->setDate(new \DateTime($data['date'] ?? 'now'));
        } catch (\Exception $e) {
            return $this->json(['error' => 'Neplatné datum'], JsonResponse::HTTP_BAD_REQUEST);
        }

        // Block reservations for today after 18:00 (Europe/Prague)
        try {
            $tz = new \DateTimeZone('Europe/Prague');
        } catch (\Exception $e) {
            $tz = null; // fallback to server default timezone
        }
        $now = $tz ? new \DateTime('now', $tz) : new \DateTime('now');
        $reservationDate = (clone $reservation->getDate());
        if ($tz) { $reservationDate->setTimezone($tz); }
        if ($reservationDate->format('Y-m-d') === $now->format('Y-m-d') && (int)$now->format('H') >= 18) {
            return $this->json(['error' => 'Rezervace na dnešní den po 18:00 není možná'], JsonResponse::HTTP_BAD_REQUEST);
        }

        // Helpery pro čtení hodnot z plochého i vnořeného tvaru
        $flat = fn(string $k, $def = null) => $data[$k] ?? $def;
        $nested = fn(string $sec, string $k, $def = null) => (is_array($data[$sec] ?? null) ? ($data[$sec][$k] ?? $def) : $def);

        // Přečtení vstupu kontaktu a fakturace (kompatibilně)
        $inputContactId = $flat('contactId', $nested('contact', 'id'));
        $inContactName = (string)$flat('contactName', (string)$nested('contact', 'name', ''));
        $inContactEmail = $flat('contactEmail', $nested('contact', 'email'));
        $inContactPhone = $flat('contactPhone', $nested('contact', 'phone'));
        $inNationality = (string)$flat('contactNationality', (string)$nested('contact', 'nationality', ''));
        $inContactNote = $flat('contactNote', $nested('contact', 'note'));
        $inClientComeFrom = (string)$flat('clientComeFrom', (string)$nested('contact', 'clientComeFrom', 'jiné'));

        $inInvoiceSameAs = (bool)$flat('invoiceSameAsContact', (bool)$nested('invoice', 'sameAsContact', true));
        $inInvoiceName = $flat('invoiceName', $nested('invoice', 'name'));
        $inInvoiceCompany = $flat('invoiceCompany', $nested('invoice', 'company'));
        $inInvoiceIc = $flat('invoiceIc', $nested('invoice', 'ico'));
        $inInvoiceDic = $flat('invoiceDic', $nested('invoice', 'dic'));
        $inInvoiceEmail = $flat('invoiceEmail', $nested('invoice', 'email'));
        $inInvoicePhone = $flat('invoicePhone', $nested('invoice', 'phone'));
        $inInvoiceStreet = $flat('invoiceStreet', $nested('invoice', 'street'));
        $inInvoiceCity = $flat('invoiceCity', $nested('invoice', 'city'));
        $inInvoiceZipcode = $flat('invoiceZipcode', $nested('invoice', 'zipcode'));
        $inInvoiceCountry = $flat('invoiceCountry', $nested('invoice', 'country'));

        // Vyhledání/volitelné vytvoření kontaktu
        $contact = null;
        if (!empty($inputContactId)) {
            $contact = $contactRepository->find((int)$inputContactId);
        }
        if (!$contact) {
            // Priorita: email -> telefon
            $contact = $contactRepository->findOneByNormalizedEmail(is_string($inContactEmail) ? $inContactEmail : null)
                ?: $contactRepository->findOneByNormalizedPhone(is_string($inContactPhone) ? $inContactPhone : null);
        }
        if (!$contact) {
            // Není-li nalezen, založíme nový pouze pokud máme aspoň minimální data (jméno/e-mail/telefon/firma něco z toho)
            $hasAny = (trim($inContactName) !== '') || !empty($inContactEmail) || !empty($inContactPhone) || !empty($inInvoiceCompany);
            if ($hasAny) {
                $em = $doctrine->getManager();
                $contact = new Contact();
                $contact->setName($inContactName);
                $contact->setEmail(is_string($inContactEmail) ? $inContactEmail : null);
                $contact->setPhone(is_string($inContactPhone) ? $inContactPhone : null);
                $contact->setCompany(is_string($inInvoiceCompany) ? $inInvoiceCompany : null);
                // Předvyplnit i fakturační informace, pokud jsou zadány
                $contact->setInvoiceName(is_string($inInvoiceName) ? $inInvoiceName : null);
                $contact->setInvoiceEmail(is_string($inInvoiceEmail) ? $inInvoiceEmail : null);
                $contact->setInvoicePhone(is_string($inInvoicePhone) ? $inInvoicePhone : null);
                $contact->setInvoiceIc(is_string($inInvoiceIc) ? $inInvoiceIc : null);
                $contact->setInvoiceDic(is_string($inInvoiceDic) ? $inInvoiceDic : null);
                $contact->setClientComeFrom($inClientComeFrom !== '' ? $inClientComeFrom : null);
                $em->persist($contact);
                $em->flush(); // pro získání ID a normalizaci polí
            }
        }

        // Snapshot kontaktních údajů do rezervace (preferuj kontakt, pokud existuje)
        $reservation->setContactName($contact?->getName() ?? $inContactName);
        $reservation->setContactEmail($contact?->getEmail() ?? (is_string($inContactEmail) ? $inContactEmail : ''));
        $reservation->setContactPhone($contact?->getPhone() ?? (is_string($inContactPhone) ? $inContactPhone : ''));
        $reservation->setContactNationality($inNationality);
        $reservation->setContactNote(is_string($inContactNote ?? null) ? $inContactNote : null);
        $reservation->setClientComeFrom($inClientComeFrom);

        if (!filter_var($reservation->getContactEmail(), FILTER_VALIDATE_EMAIL)) {
            return $this->json(['error' => 'Neplatný e-mail'], JsonResponse::HTTP_BAD_REQUEST);
        }

        // Set invoice details
        $reservation->setInvoiceSameAsContact($inInvoiceSameAs);
        $reservation->setInvoiceName(is_string($inInvoiceName) ? $inInvoiceName : null);
        $reservation->setInvoiceCompany(is_string($inInvoiceCompany) ? $inInvoiceCompany : null);
        $reservation->setInvoiceIc(is_string($inInvoiceIc) ? $inInvoiceIc : null);
        $reservation->setInvoiceDic(is_string($inInvoiceDic) ? $inInvoiceDic : null);
        $reservation->setInvoiceEmail(is_string($inInvoiceEmail) ? $inInvoiceEmail : null);
        $reservation->setInvoicePhone(is_string($inInvoicePhone) ? $inInvoicePhone : null);
        $reservation->setInvoiceStreet(is_string($inInvoiceStreet) ? $inInvoiceStreet : null);
        $reservation->setInvoiceCity(is_string($inInvoiceCity) ? $inInvoiceCity : null);
        $reservation->setInvoiceZipcode(is_string($inInvoiceZipcode) ? $inInvoiceZipcode : null);
        $reservation->setInvoiceCountry(is_string($inInvoiceCountry) ? $inInvoiceCountry : null);

        // Set transfer details
        $reservation->setTransferSelected((bool)$flat('transferSelected', (bool)$nested('transfer', 'selected', false)));
        $reservation->setTransferCount($flat('transferCount', $nested('transfer', 'count')));
        $reservation->setTransferAddress($flat('transferAddress', $nested('transfer', 'address')));
        $reservation->setAgreement((bool)$flat('agreement', false));

        // Set timestamps
        $reservation->setCreatedAt(new \DateTime());
        $reservation->setUpdatedAt(new \DateTime());

        // Set initial status - use provided status, or derive from withPayment flag
        $withPayment = $data['withPayment'] ?? false;
        $reservation->setStatus($data['status'] ?? ($withPayment ? 'WAITING_PAYMENT' : 'CONFIRMED'));

        // Set reservation type
        if (!empty($data['reservationTypeId'])) {
            $resType = $this->reservationTypeRepository->find((int)$data['reservationTypeId']);
            $reservation->setReservationType($resType);
        } else {
            // Default to "standard" type
            $defaultType = $this->reservationTypeRepository->findDefault();
            $reservation->setReservationType($defaultType);
        }

        // Process persons and calculate price
        $price = 0;
        $allowedMenus = SpecialDateRules::getAllowedMenus($reservation->getDate());
        if (isset($data['persons']) && is_array($data['persons'])) {
            foreach ($data['persons'] as $personData) {
                $person = new ReservationPerson();
                $type = $personData['type'] ?? '';
                $person->setType($type);
                $menuCode = $personData['menu'] ?? '';

                // Validate allowed menus for adult/child on special dates
                if (in_array($type, ['adult', 'child'], true) && $allowedMenus !== null) {
                    if (!in_array($menuCode, $allowedMenus, true)) {
                        return $this->json(['error' => 'V tento den je možné vybrat pouze povolená menu.'], JsonResponse::HTTP_BAD_REQUEST);
                    }
                }

                $person->setMenu($menuCode);
                $person->setNationality($personData['nationality'] ?? null);
                $person->setDrinkOption($personData['drinkOption'] ?? 'none');
                $person->setDrinkName($personData['drinkName'] ?? null);
                $person->setDrinkPrice(isset($personData['drinkPrice']) ? (string)$personData['drinkPrice'] : null);

                // Compute base price by type, ignore client provided price
                $basePrice = SpecialDateRules::getBasePrice($type, $reservation->getDate());
                $person->setPrice($basePrice);
                $price += $basePrice;

                // Add additional price for special menu items
                $menu = FoodMenu::tryFrom($menuCode) ?? FoodMenu::NONE;
                $foodPrice = $menu->getPrice();
                $price += $foodPrice;
                $person->setReservation($reservation);
                $reservation->getPersons()->add($person);
            }
        }

        // Add transfer cost if applicable
        if (!empty($data['transfer']['selected']) && !empty($data['transfer']['count'])) {
            $perPerson = SpecialDateRules::getTransferPricePerPerson($reservation->getDate());
            $transferCost = ((int)$data['transfer']['count']) * $perPerson;
            $price += $transferCost;
        }

        // Persist reservation to database
        $em = $doctrine->getManager();
        $em->persist($reservation);
        $em->flush();

        // Create transfer entities if provided
        if (isset($data['transfers']) && is_array($data['transfers'])) {
            $transportCompanyRepo = $em->getRepository(\App\Entity\TransportCompany::class);
            $transportVehicleRepo = $em->getRepository(\App\Entity\TransportVehicle::class);
            $transportDriverRepo = $em->getRepository(\App\Entity\TransportDriver::class);

            foreach ($data['transfers'] as $transferData) {
                $transfer = new \App\Entity\ReservationTransfer();
                $transfer->setReservation($reservation);
                $transfer->setPersonCount((int)($transferData['personCount'] ?? 1));
                $transfer->setAddress($transferData['address'] ?? '');

                if (!empty($transferData['transportCompanyId'])) {
                    $transfer->setTransportCompany($transportCompanyRepo->find($transferData['transportCompanyId']));
                }
                if (!empty($transferData['transportVehicleId'])) {
                    $transfer->setTransportVehicle($transportVehicleRepo->find($transferData['transportVehicleId']));
                }
                if (!empty($transferData['transportDriverId'])) {
                    $transfer->setTransportDriver($transportDriverRepo->find($transferData['transportDriverId']));
                }

                $em->persist($transfer);
            }

            $reservation->setTransferSelected(true);
            $em->flush();
        }

        // Auto-create/sync event for this reservation date
        try {
            $this->autoEventService->syncReservationToEvent($reservation);
        } catch (\Exception $e) {
            // Log error but don't fail the reservation creation
            error_log('AutoEvent sync failed: ' . $e->getMessage());
        }

        // Handle payment if required
        if ($withPayment) {
            $payload = [
                'refId' => $reservation->getId(),
                'price' => (int)$price,
                'label' => 'Rezervace č. ' . $reservation->getId(),
                'email' => $reservation->getContactEmail(),
                'method' => $data['paymentMethod'] ?? 'ALL',
            ];

            $subRequest = Request::create(
                '/api/payment/create',
                'POST',
                [],
                [],
                [],
                [],
                json_encode($payload)
            );

            $forwardResponse = $this->forward(
                PaymentController::class . '::create',
                ['request' => $subRequest]
            );

            $paymentResult = json_decode($forwardResponse->getContent(), true);
            $redirect = $paymentResult['redirect'] ?? $paymentResult['data']['redirect'] ?? null;

            if (!$redirect) {
                return $this->json(
                    ['error' => 'Chybí URL pro přesměrování na platební bránu'],
                    JsonResponse::HTTP_BAD_REQUEST
                );
            }
            $html = $this->generateConfirmationEmail($reservation, $data, $price);
//            $email = (new Email())
//                ->from('info@folkloregarden.cz')
//                ->to('info@folkloregarden.cz')
//                ->cc($reservation->getContactEmail())
//                ->subject('Potvrzení rezervace č. ' . $reservation->getId())
//                ->html($html);

            try {
             //   $this->mailer->send($email);
            } catch (TransportExceptionInterface $e) {
                error_log('Chyba při odesílání emailu: ' . $e->getMessage());
                return $this->json(['error' => 'Chyba při odesílání emailu.'], JsonResponse::HTTP_INTERNAL_SERVER_ERROR);
            }

            return new JsonResponse(['redirect' => $redirect], JsonResponse::HTTP_OK);
        }

        // Generate and send confirmation email
//        $html = $this->generateConfirmationEmail($reservation, $data, $price);
//        $email = (new Email())
//            ->from('info@folkloregarden.cz')
//            ->to('info@folkloregarden.cz')
//            ->cc($reservation->getContactEmail())
//            ->subject('Potvrzení rezervace č. ' . $reservation->getId())
//            ->html($html);

        try {
           // $this->mailer->send($email);
        } catch (TransportExceptionInterface $e) {
            error_log('Chyba při odesílání emailu: ' . $e->getMessage());
            return $this->json(['error' => 'Chyba při odesílání emailu.'], JsonResponse::HTTP_INTERNAL_SERVER_ERROR);
        }

        return new JsonResponse(
            ['status' => 'Rezervace vytvořena', 'id' => $reservation->getId()],
            JsonResponse::HTTP_CREATED
        );
    }


    private function translateClientComeFrom(string $value, string $lang = 'cs'): string
    {
        $translations = [
            'cs' => [
                'jiné' => 'jiné',
                'Hotelová recepce / Leták' => 'Hotelová recepce / Leták',
            ],
            'en' => [
                'jiné' => 'Other',
                'Hotelová recepce / Leták' => 'Hotel reception / Leaflet',
            ],
        ];
        return $translations[$lang][$value] ?? $value;
    }


    private function generateConfirmationEmail(Reservation $reservation, array $data, int $price): string
    {
        $resId = $reservation->getId();
        $dateObj = $reservation->getDate();
        $date = $dateObj->format('d.m.Y');

        // Support both flat (contactName) and nested (contact.name) data formats
        $contactName = $data['contactName'] ?? $data['contact']['name'] ?? $reservation->getContactName();
        $contactEmail = $data['contactEmail'] ?? $data['contact']['email'] ?? $reservation->getContactEmail();
        $contactPhone = $data['contactPhone'] ?? $data['contact']['phone'] ?? $reservation->getContactPhone();
        $contactNote = $data['contactNote'] ?? $data['contact']['note'] ?? $reservation->getContactNote() ?? '';
        $nationalityCode = $data['contactNationality'] ?? $data['contact']['nationality'] ?? $reservation->getContactNationality() ?? '';
        $contactNationality = Countries::getName($nationalityCode, 'cs') ?: $nationalityCode;
        $isCzech = strtoupper($nationalityCode) === 'CZ';
        $invoiceSame = $data['invoiceSameAsContact'] ?? $data['invoice']['sameAsContact'] ?? $reservation->isInvoiceSameAsContact() ?? false;
        $invoiceLabel = $invoiceSame ? ($isCzech ? 'Ano' : 'Yes') : ($isCzech ? 'Ne' : 'No');
        $invoiceCompany = $data['invoiceCompany'] ?? $data['invoice']['company'] ?? $reservation->getInvoiceCompany() ?? '';
        $invoiceName = $invoiceSame ? $contactName : $invoiceCompany;
        $invoiceIco = $data['invoiceIc'] ?? $data['invoice']['ico'] ?? $reservation->getInvoiceIc() ?? '';
        $invoiceDic = $data['invoiceDic'] ?? $data['invoice']['dic'] ?? $reservation->getInvoiceDic() ?? '';
        $clientComeFrom = $data['clientComeFrom'] ?? $data['contact']['clientComeFrom'] ?? $reservation->getClientComeFrom() ?? 'jiné';

        // Dynamic pricing for special dates
        $adultBase = \App\Config\SpecialDateRules::getBasePrice('adult', $dateObj);
        $childBase = \App\Config\SpecialDateRules::getBasePrice('child', $dateObj);
        $infantBase = \App\Config\SpecialDateRules::getBasePrice('infant', $dateObj);
        $transferPerPerson = \App\Config\SpecialDateRules::getTransferPricePerPerson($dateObj);
        // Generate rows for persons
        $personsRows = '';
        foreach ($data['persons'] as $i => $person) {
            $idx = $i + 1;
            $menuCode = (string)$person['menu'];
            $menu = FoodMenu::tryFrom($menuCode) ?? FoodMenu::NONE;
            $foodLabel = $menu->getLabel();
            $foodPrice = $menu->getPrice();
            $personLabels = $isCzech
                ? [
                    'adult' => 'Dospělých osob - ' . $adultBase . ' Kč / osoba',
                    'child' => 'Dětí 3 – 12 let - ' . $childBase . ' Kč / osoba',
                    'infant' => 'Dětí 0 – 2 roky - ' . $infantBase . ' Kč / osoba',
                ]
                : [
                    'adult' => 'Adults - ' . $adultBase . ' CZK / person',
                    'child' => 'Children 3–12 years - ' . $childBase . ' CZK / person',
                    'infant' => 'Children 0–2 years - ' . $infantBase . ' CZK / person',
                ];
            $personLabel = $personLabels[$person['type']] ?? $person['type'];
            $personsRows .= <<<ROW
                <tr>
                    <td>{$idx}</td>
                    <td>{$personLabel}</td>
                    <td>{$foodLabel}</td>
                    <td style="text-align:right;">{$foodPrice} Kč</td>
                </tr>
                ROW;
        }

        // Generate transfer row if applicable
        $transferRow = '';
        $transferPrice = 0;
        $transferSelected = $data['transferSelected'] ?? $data['transfer']['selected'] ?? $reservation->isTransferSelected() ?? false;
        $transferCount = $data['transferCount'] ?? $data['transfer']['count'] ?? $reservation->getTransferCount() ?? 0;
        $transferAddress = $data['transferAddress'] ?? $data['transfer']['address'] ?? $reservation->getTransferAddress() ?? '';
        if ($transferSelected && $transferCount > 0) {
            $transferPrice = ((int)$transferCount) * $transferPerPerson;
            $transferLabel = $isCzech ? 'Transfer' : 'Transfer';
            $addressLabel = $isCzech ? 'Adresa:' : 'Address:';
            $transferRow = <<<TRF
                <tr>
                    <td colspan="3" style="padding:8px;border:1px solid #ddd;text-align:right;">
                       <strong>{$transferLabel} ({$transferCount}×{$transferPerPerson} Kč):</strong>
                    </td>
                    <td style="padding:8px;border:1px solid #ddd;text-align:right;">{$transferPrice} Kč</td>
                </tr>
                <tr><td>{$addressLabel}</td><td colspan="3">{$transferAddress}</td></tr>
                TRF;
        }

        // Calculate total price using server-computed value to ensure consistency with special-date rules
        $total = (int)$price;

        // Labels for language
        $titleLabel = $isCzech ? 'Potvrzení rezervace č.' : 'Reservation confirmation no.';
        $performanceDateLabel = $isCzech ? 'Datum představení' : 'Performance date';
        $contactDetailsLabel = $isCzech ? 'Kontaktní údaje' : 'Contact details';
        $nameLabel = $isCzech ? 'Jméno' : 'Name';
        $emailLabel = 'E-mail';
        $phoneLabel = $isCzech ? 'Telefon' : 'Phone';
        $noteLabel = $isCzech ? 'Poznámka' : 'Note';
        $nationalityLabel = $isCzech ? 'Národnost' : 'Nationality';
        $billingDetailsLabel = $isCzech ? 'Fakturační údaje' : 'Billing details';
        $sameAsContactLabel = $isCzech ? 'Stejné jako kontakt' : 'Same as contact';
        $nameCompanyLabel = $isCzech ? 'Jméno / Společnost' : 'Name / Company';
        $icoLabel = $isCzech ? 'IČO' : 'Company ID';
        $dicLabel = $isCzech ? 'DIČ' : 'VAT ID';
        $guestsMealsLabel = $isCzech ? 'Osoby a jídla' : 'Guests and meals';
        $typeLabel = $isCzech ? 'Typ' : 'Type';
        $foodLabelTable = $isCzech ? 'Jídlo' : 'Meal';
        $priceLabel = $isCzech ? 'Cena (Kč)' : 'Price (CZK)';
        $totalPriceLabel = $isCzech ? 'Celková cena' : 'Total price';
        $clientComeFromLabe = $isCzech ? 'Odkud jste se o nás dozvěděli?' : 'How did you hear about us?';
        $thankYouMsg = $isCzech ? 'Děkujeme za vaši rezervaci. Těšíme se na vás!' : 'Thank you for your reservation. We look forward to seeing you!';
        $payOnSpotMsg = $isCzech
            ? 'Pokud rezervace nebyla uhrazena online, prosíme o úhradu na místě konání akce.'
            : 'If the reservation has not been paid online, please pay at the venue.';
        $lang = $isCzech ? 'cs' : 'en';


        return <<<HTML
        <!DOCTYPE html>
        <html lang="cs">
        <head>
            <meta charset="UTF-8">
            <title>{$titleLabel} {$resId}</title>
        </head>
        <body style="font-family:Arial,sans-serif;color:#333;line-height:1.4;">
            <h2 style="color:#2a7fd4;">{$titleLabel} {$resId}</h2>
            <p><strong>{$performanceDateLabel}:</strong> {$date}</p>
            <h3>{$contactDetailsLabel}</h3>
            <table style="width:100%;border-collapse:collapse;margin-bottom:20px;">
                <tr><td><strong>{$nameLabel}:</strong></td><td>{$contactName}</td></tr>
                <tr><td><strong>{$emailLabel}:</strong></td><td>{$contactEmail}</td></tr>
                <tr><td><strong>{$phoneLabel}:</strong></td><td>{$contactPhone}</td></tr>
                <tr><td><strong>{$nationalityLabel}:</strong></td><td>{$contactNationality} | {$contactNationality}</td></tr>
                <tr><td><strong>{$noteLabel}:</strong></td><td>{$contactNote}</td></tr>
                <tr><td><strong>{$clientComeFromLabe}:</strong></td><td>{$this->translateClientComeFrom($clientComeFrom, $lang)}</td></tr>
            </table>
            <h3>{$billingDetailsLabel}</h3>
            <table style="width:100%;border-collapse:collapse;margin-bottom:20px;">
                <tr><td><strong>{$sameAsContactLabel}:</strong></td><td>{$invoiceLabel}</td></tr>
                <tr><td><strong>{$nameCompanyLabel}:</strong></td><td>{$invoiceName}</td></tr>
                <tr><td><strong>{$icoLabel}:</strong></td><td>{$invoiceIco}</td></tr>
                <tr><td><strong>{$dicLabel}:</strong></td><td>{$invoiceDic}</td></tr>
            </table>
            <h3>{$guestsMealsLabel}</h3>
            <table style="width:100%;border:1px solid #ddd;border-collapse:collapse;margin-bottom:20px;">
                <thead>
                    <tr style="background:#f0f0f0;">
                        <th style="padding:8px;border:1px solid #ddd;">#</th>
                        <th style="padding:8px;border:1px solid #ddd;">{$typeLabel}</th>
                        <th style="padding:8px;border:1px solid #ddd;">{$foodLabelTable}</th>
                        <th style="padding:8px;border:1px solid #ddd;">{$priceLabel}</th>
                    </tr>
                </thead>
                <tbody>
                    {$personsRows}
                    {$transferRow}
                </tbody>
            </table>
            <h3>{$totalPriceLabel}: <span style="color:#2a7fd4;">{$total} Kč</span></h3>

            <p>{$thankYouMsg}</p>
            <p style="color:red;padding:12px 0;">{$payOnSpotMsg}</p>
        </body>
        </html>
        HTML;
    }

    #[Route('/api/reservations/bulk-update', name: 'api_reservations_bulk_update', methods: ['PUT', 'PATCH'])]
    #[IsGranted('ROLE_SUPER_ADMIN')]
    public function bulkUpdate(Request $request, ReservationRepository $reservationRepository): JsonResponse
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

        $allowedStatuses = ['RECEIVED', 'WAITING_PAYMENT', 'PAID', 'CANCELLED', 'AUTHORIZED', 'CONFIRMED'];
        $count = 0;

        foreach ($ids as $id) {
            $reservation = $reservationRepository->find($id);
            if (!$reservation) {
                continue;
            }

            if (isset($updates['status'])) {
                $status = (string)$updates['status'];
                if (!in_array($status, $allowedStatuses, true)) {
                    return $this->json(['error' => 'Invalid status value: ' . $status . '. Allowed: ' . implode(', ', $allowedStatuses)], 400);
                }
                $reservation->setStatus($status);
            }

            if (isset($updates['reservationTypeId'])) {
                $reservationType = $this->reservationTypeRepository->find((int)$updates['reservationTypeId']);
                if (!$reservationType) {
                    return $this->json(['error' => 'ReservationType not found: ' . $updates['reservationTypeId']], 404);
                }
                $reservation->setReservationType($reservationType);
            }

            $count++;
        }

        $this->entityManager->flush();

        return $this->json(['status' => 'updated', 'count' => $count]);
    }

    #[Route('/api/reservations/bulk-check', name: 'api_reservations_bulk_check', methods: ['POST'])]
    #[IsGranted('ROLE_SUPER_ADMIN')]
    public function bulkCheck(Request $request, ReservationRepository $reservationRepository): JsonResponse
    {
        $data = json_decode($request->getContent(), true) ?? [];
        $ids = $data['ids'] ?? [];

        if (empty($ids) || !is_array($ids)) {
            return $this->json(['error' => 'Missing or invalid "ids" array'], 400);
        }

        $allWarnings = [];
        foreach ($ids as $id) {
            $reservation = $reservationRepository->find($id);
            if (!$reservation) {
                continue;
            }
            $warnings = $this->getReservationDeletionInfo($reservation);
            if (!empty($warnings)) {
                $allWarnings[] = [
                    'reservationId' => $reservation->getId(),
                    'contactName' => $reservation->getContactName(),
                    'date' => $reservation->getDate()->format('d.m.Y'),
                    'warnings' => $warnings,
                ];
            }
        }

        return $this->json([
            'reservations' => $allWarnings,
            'totalWithWarnings' => count($allWarnings),
        ]);
    }

    #[Route('/api/reservations/bulk-delete', name: 'api_reservations_bulk_delete', methods: ['DELETE'])]
    #[IsGranted('ROLE_SUPER_ADMIN')]
    public function bulkDelete(Request $request, ReservationRepository $reservationRepository): JsonResponse
    {
        $data = json_decode($request->getContent(), true) ?? [];
        $ids = $data['ids'] ?? [];

        if (empty($ids) || !is_array($ids)) {
            return $this->json(['error' => 'Missing or invalid "ids" array'], 400);
        }

        // Collect dates and linked events before deleting
        $dates = [];
        $reservations = [];
        $affectedEvents = [];
        foreach ($ids as $id) {
            $reservation = $reservationRepository->find($id);
            if ($reservation) {
                $dates[] = $reservation->getDate();
                $reservations[] = $reservation;
                $event = $this->findEventByReservationDate($reservation);
                if ($event && !isset($affectedEvents[$event->getId()])) {
                    $affectedEvents[$event->getId()] = $event->getName();
                }
            }
        }

        $count = 0;
        foreach ($reservations as $reservation) {
            $this->entityManager->remove($reservation);
            $count++;
        }

        $this->entityManager->flush();

        // Re-sync events for affected dates
        $uniqueDates = [];
        foreach ($dates as $date) {
            $key = $date->format('Y-m-d');
            if (!isset($uniqueDates[$key])) {
                $uniqueDates[$key] = $date;
            }
        }
        foreach ($uniqueDates as $date) {
            try {
                $this->autoEventService->handleReservationDeleted($date);
            } catch (\Exception $e) {
                error_log('AutoEvent sync on bulk delete failed: ' . $e->getMessage());
            }
        }

        return $this->json([
            'status' => 'deleted',
            'count' => $count,
            'affectedEvents' => array_values($affectedEvents),
        ]);
    }

    #[Route('/api/reservations/{id}', name: 'api_reservations_get', methods: ['GET'])]
    #[IsGranted('reservations.read')]
    public function get(int $id, ReservationRepository $reservationRepository): JsonResponse
    {
        $reservation = $reservationRepository->find($id);
        if (!$reservation) {
            return $this->json(['error' => 'Reservation not found'], JsonResponse::HTTP_NOT_FOUND);
        }

        $foodNameMap = $this->getFoodNameMap();
        $personsData = [];
        foreach ($reservation->getPersons() as $person) {
            $menuCode = $person->getMenu() ?? '';
            $personsData[] = [
                'id' => $person->getId(),
                'reservationId' => $reservation->getId(),
                'type' => $person->getType(),
                'menu' => $menuCode,
                'menuName' => $foodNameMap[$menuCode] ?? $this->getFoodNameByExternalId($menuCode) ?? 'Neznámé jídlo',
                'price' => $person->getPrice(),
                'nationality' => $person->getNationality(),
                'drinkOption' => $person->getDrinkOption(),
                'drinkName' => $person->getDrinkName(),
                'drinkPrice' => $person->getDrinkPrice(),
            ];
        }

        $paymentsData = [];
        foreach ($reservation->getPayments() as $payment) {
            $paymentsData[] = [
                'id' => $payment->getId(),
                'transactionId' => $payment->getTransactionId(),
                'status' => $payment->getStatus(),
                'amount' => $payment->getAmount(),
                'createdAt' => $payment->getCreatedAt()?->format('Y-m-d H:i:s'),
            ];
        }

        $transfersData = [];
        foreach ($reservation->getTransfers() as $transfer) {
            $transfersData[] = [
                'id' => $transfer->getId(),
                'personCount' => $transfer->getPersonCount(),
                'address' => $transfer->getAddress(),
                'transportCompanyId' => $transfer->getTransportCompany()?->getId(),
                'transportCompanyName' => $transfer->getTransportCompany()?->getName(),
                'transportVehicleId' => $transfer->getTransportVehicle()?->getId(),
                'transportVehiclePlate' => $transfer->getTransportVehicle()?->getLicensePlate(),
                'transportDriverId' => $transfer->getTransportDriver()?->getId(),
                'transportDriverName' => $transfer->getTransportDriver()?->getFullName(),
            ];
        }

        return $this->json([
            'id' => $reservation->getId(),
            'date' => $reservation->getDate(),
            'contactName' => $reservation->getContactName(),
            'contactEmail' => $reservation->getContactEmail(),
            'contactPhone' => $reservation->getContactPhone(),
            'contactNationality' => $reservation->getContactNationality(),
            'clientComeFrom' => $reservation->getClientComeFrom(),
            'contactNote' => $reservation->getContactNote(),
            'invoiceSameAsContact' => $reservation->isInvoiceSameAsContact(),
            'invoiceName' => $reservation->getInvoiceName(),
            'invoiceCompany' => $reservation->getInvoiceCompany(),
            'invoiceIc' => $reservation->getInvoiceIc(),
            'invoiceDic' => $reservation->getInvoiceDic(),
            'invoiceEmail' => $reservation->getInvoiceEmail(),
            'invoicePhone' => $reservation->getInvoicePhone(),
            'transferSelected' => $reservation->isTransferSelected(),
            'transferCount' => $reservation->getTransferCount(),
            'transferAddress' => $reservation->getTransferAddress(),
            'transfers' => $transfersData,
            'agreement' => $reservation->isAgreement(),
            'createdAt' => $reservation->getCreatedAt()?->format('Y-m-d H:i:s'),
            'updatedAt' => $reservation->getUpdatedAt()?->format('Y-m-d H:i:s'),
            'status' => $reservation->getStatus(),
            'reservationTypeId' => $reservation->getReservationType()?->getId(),
            'reservationType' => $reservation->getReservationType() ? [
                'id' => $reservation->getReservationType()->getId(),
                'name' => $reservation->getReservationType()->getName(),
                'code' => $reservation->getReservationType()->getCode(),
                'color' => $reservation->getReservationType()->getColor(),
            ] : null,
            'persons' => $personsData,
            'payments' => $paymentsData,
        ]);
    }

    #[Route('/api/reservations/{id}', name: 'api_reservations_update', methods: ['PUT'])]
    #[IsGranted('reservations.update')]
    public function update(int $id, Request $request, ReservationRepository $reservationRepository): JsonResponse
    {
        $reservation = $reservationRepository->find($id);
        if (!$reservation) {
            return $this->json(['error' => 'Reservation not found'], JsonResponse::HTTP_NOT_FOUND);
        }

        $data = json_decode($request->getContent(), true);
        if (!$data) {
            return $this->json(['error' => 'Invalid JSON'], JsonResponse::HTTP_BAD_REQUEST);
        }

        // Track old date for event sync if date is being changed
        $oldDate = $reservation->getDate();
        $dateChanged = false;

        // Aktualizace kontaktnich udaju
        if (isset($data['date'])) {
            $newDate = new \DateTime($data['date']);
            if ($oldDate->format('Y-m-d') !== $newDate->format('Y-m-d')) {
                $dateChanged = true;
            }
            $reservation->setDate($newDate);
        }
        if (isset($data['status'])) {
            $reservation->setStatus($data['status']);
        }
        if (array_key_exists('reservationTypeId', $data)) {
            if ($data['reservationTypeId']) {
                $type = $this->reservationTypeRepository->find((int)$data['reservationTypeId']);
                $reservation->setReservationType($type);
            } else {
                $reservation->setReservationType(null);
            }
        }
        if (isset($data['contactName'])) {
            $reservation->setContactName($data['contactName']);
        }
        if (isset($data['contactEmail'])) {
            $reservation->setContactEmail($data['contactEmail']);
        }
        if (isset($data['contactPhone'])) {
            $reservation->setContactPhone($data['contactPhone']);
        }
        if (isset($data['contactNationality'])) {
            $reservation->setContactNationality($data['contactNationality']);
        }
        if (isset($data['clientComeFrom'])) {
            $reservation->setClientComeFrom($data['clientComeFrom']);
        }
        if (array_key_exists('contactNote', $data)) {
            $reservation->setContactNote($data['contactNote']);
        }

        // Fakturacni udaje
        if (isset($data['invoiceSameAsContact'])) {
            $reservation->setInvoiceSameAsContact($data['invoiceSameAsContact']);
        }
        if (array_key_exists('invoiceName', $data)) {
            $reservation->setInvoiceName($data['invoiceName']);
        }
        if (array_key_exists('invoiceCompany', $data)) {
            $reservation->setInvoiceCompany($data['invoiceCompany']);
        }
        if (array_key_exists('invoiceIc', $data)) {
            $reservation->setInvoiceIc($data['invoiceIc']);
        }
        if (array_key_exists('invoiceDic', $data)) {
            $reservation->setInvoiceDic($data['invoiceDic']);
        }
        if (array_key_exists('invoiceEmail', $data)) {
            $reservation->setInvoiceEmail($data['invoiceEmail']);
        }
        if (array_key_exists('invoicePhone', $data)) {
            $reservation->setInvoicePhone($data['invoicePhone']);
        }
        if (array_key_exists('invoiceStreet', $data)) {
            $reservation->setInvoiceStreet($data['invoiceStreet']);
        }
        if (array_key_exists('invoiceCity', $data)) {
            $reservation->setInvoiceCity($data['invoiceCity']);
        }
        if (array_key_exists('invoiceZipcode', $data)) {
            $reservation->setInvoiceZipcode($data['invoiceZipcode']);
        }
        if (array_key_exists('invoiceCountry', $data)) {
            $reservation->setInvoiceCountry($data['invoiceCountry']);
        }

        // Transfer
        if (isset($data['transferSelected'])) {
            $reservation->setTransferSelected($data['transferSelected']);
        }
        if (array_key_exists('transferCount', $data)) {
            $reservation->setTransferCount($data['transferCount']);
        }
        if (array_key_exists('transferAddress', $data)) {
            $reservation->setTransferAddress($data['transferAddress']);
        }

        // Platebni udaje
        if (array_key_exists('paymentMethod', $data)) {
            $reservation->setPaymentMethod($data['paymentMethod']);
        }
        if (array_key_exists('paymentStatus', $data)) {
            $reservation->setPaymentStatus($data['paymentStatus']);
        }
        if (array_key_exists('depositPercent', $data)) {
            $reservation->setDepositPercent($data['depositPercent']);
        }
        if (array_key_exists('depositAmount', $data)) {
            $reservation->setDepositAmount($data['depositAmount']);
        }
        if (array_key_exists('totalPrice', $data)) {
            $reservation->setTotalPrice($data['totalPrice']);
        }
        if (array_key_exists('paidAmount', $data)) {
            $reservation->setPaidAmount($data['paidAmount']);
        }
        if (array_key_exists('paymentNote', $data)) {
            $reservation->setPaymentNote($data['paymentNote']);
        }

        $reservation->setUpdatedAt(new \DateTime());

        // Update persons if provided
        if (isset($data['persons']) && is_array($data['persons'])) {
            // Remove existing persons
            foreach ($reservation->getPersons() as $existingPerson) {
                $this->entityManager->remove($existingPerson);
            }
            $reservation->getPersons()->clear();

            // Add new persons
            $totalPrice = 0;
            foreach ($data['persons'] as $personData) {
                $person = new ReservationPerson();
                $person->setReservation($reservation);
                $person->setType($personData['type'] ?? 'adult');
                $person->setMenu($personData['menu'] ?? '');
                $person->setNationality($personData['nationality'] ?? null);
                $person->setDrinkOption($personData['drinkOption'] ?? 'none');
                $person->setDrinkName($personData['drinkName'] ?? null);
                $person->setDrinkPrice(isset($personData['drinkPrice']) ? (string)$personData['drinkPrice'] : null);
                $personPrice = (float) ($personData['price'] ?? 0);
                $drinkPrice = (float) ($personData['drinkPrice'] ?? 0);
                $person->setPrice((string) $personPrice);
                $totalPrice += $personPrice + $drinkPrice;

                $this->entityManager->persist($person);
                $reservation->addPerson($person);
            }

            // Update total price
            $reservation->setTotalPrice((string) $totalPrice);
        }

        // Update transfers if provided
        if (isset($data['transfers']) && is_array($data['transfers'])) {
            // Remove existing transfers
            foreach ($reservation->getTransfers() as $existingTransfer) {
                $this->entityManager->remove($existingTransfer);
            }
            $reservation->getTransfers()->clear();

            // Add new transfers
            $transportCompanyRepo = $this->entityManager->getRepository(\App\Entity\TransportCompany::class);
            $transportVehicleRepo = $this->entityManager->getRepository(\App\Entity\TransportVehicle::class);
            $transportDriverRepo = $this->entityManager->getRepository(\App\Entity\TransportDriver::class);

            foreach ($data['transfers'] as $transferData) {
                $transfer = new \App\Entity\ReservationTransfer();
                $transfer->setReservation($reservation);
                $transfer->setPersonCount((int) ($transferData['personCount'] ?? 1));
                $transfer->setAddress($transferData['address'] ?? '');

                if (!empty($transferData['transportCompanyId'])) {
                    $transfer->setTransportCompany($transportCompanyRepo->find($transferData['transportCompanyId']));
                }
                if (!empty($transferData['transportVehicleId'])) {
                    $transfer->setTransportVehicle($transportVehicleRepo->find($transferData['transportVehicleId']));
                }
                if (!empty($transferData['transportDriverId'])) {
                    $transfer->setTransportDriver($transportDriverRepo->find($transferData['transportDriverId']));
                }

                $this->entityManager->persist($transfer);
                $reservation->addTransfer($transfer);
            }

            // Update transferSelected based on whether there are transfers
            $reservation->setTransferSelected(count($data['transfers']) > 0);
        }

        $this->entityManager->flush();

        // If date changed, sync events for both old and new dates
        if ($dateChanged) {
            try {
                // Sync old date event (remove guests from old event)
                $this->autoEventService->handleReservationDeleted($oldDate);
                // Sync new date event (add guests to new event)
                $this->autoEventService->syncReservationToEvent($reservation);
            } catch (\Exception $e) {
                error_log('AutoEvent sync on date change failed: ' . $e->getMessage());
            }
        }

        // Also sync event guests when persons are updated
        if (isset($data['persons'])) {
            try {
                $this->autoEventService->syncReservationToEvent($reservation);
            } catch (\Exception $e) {
                error_log('AutoEvent sync on persons update failed: ' . $e->getMessage());
            }
        }

        return $this->json([
            'id' => $reservation->getId(),
            'message' => 'Reservation updated successfully',
        ]);
    }

    /**
     * Get warnings/info about what will be affected by deleting a reservation.
     * Returns array of warnings (non-blocking) and blockers (blocking).
     */
    private function getReservationDeletionInfo(Reservation $reservation): array
    {
        $warnings = [];
        $event = $this->findEventByReservationDate($reservation);

        if ($event) {
            // Count guests linked to this reservation in the event
            $guestCount = (int) $this->entityManager->createQuery(
                'SELECT COUNT(g.id) FROM App\Entity\EventGuest g WHERE g.event = :eventId AND g.reservation = :resId'
            )->setParameter('eventId', $event->getId())
             ->setParameter('resId', $reservation->getId())
             ->getSingleScalarResult();

            $warnings[] = [
                'type' => 'linked_event',
                'message' => "Rezervace je propojena s akcí \"{$event->getName()}\" ({$event->getEventDate()->format('d.m.Y')})"
                    . ($guestCount > 0 ? ". {$guestCount} hostů bude odpojeno z akce." : "."),
                'eventId' => $event->getId(),
                'eventName' => $event->getName(),
            ];
        }

        // Check if reservation has payments
        $paymentCount = $reservation->getPayments()->count();
        if ($paymentCount > 0) {
            $warnings[] = [
                'type' => 'has_payments',
                'message' => "Rezervace má {$paymentCount} plateb(ní záznamy). Smazáním se tyto záznamy odstraní.",
            ];
        }

        // Check if reservation has invoices
        $invoiceCount = (int) $this->entityManager->createQuery(
            'SELECT COUNT(i.id) FROM App\Entity\Invoice i WHERE i.reservation = :resId'
        )->setParameter('resId', $reservation->getId())->getSingleScalarResult();

        if ($invoiceCount > 0) {
            $warnings[] = [
                'type' => 'has_invoices',
                'message' => "Rezervace má {$invoiceCount} faktur. Faktury zůstanou v systému, ale nebudou přiřazeny k žádné rezervaci.",
            ];
        }

        return $warnings;
    }

    #[Route('/api/reservations/{id}', name: 'api_reservations_delete', methods: ['DELETE'])]
    #[IsGranted('reservations.delete')]
    public function delete(int $id, ReservationRepository $reservationRepository): JsonResponse
    {
        $reservation = $reservationRepository->find($id);
        if (!$reservation) {
            return $this->json(['error' => 'Reservation not found'], JsonResponse::HTTP_NOT_FOUND);
        }

        // Store the date before deleting for event sync
        $reservationDate = $reservation->getDate();

        $this->entityManager->remove($reservation);
        $this->entityManager->flush();

        // Re-sync event for this date (may remove auto-generated event if no reservations remain)
        try {
            $this->autoEventService->handleReservationDeleted($reservationDate);
        } catch (\Exception $e) {
            error_log('AutoEvent sync on delete failed: ' . $e->getMessage());
        }

        return new JsonResponse(null, JsonResponse::HTTP_NO_CONTENT);
    }

    #[Route('/api/reservations/statistics', name: 'api_reservations_statistics', methods: ['GET'])]
    #[IsGranted('reservations.read')]
    public function statistics(ManagerRegistry $doctrine): JsonResponse
    {
        $repo = $doctrine->getRepository(Reservation::class);
        $reservations = $repo->findAll();

        $stats = [
            'total' => 0,
            'by_status' => [],
        ];

        foreach ($reservations as $reservation) {
            $totalReservation = 0;
            foreach ($reservation->getPersons() as $person) {
                $totalReservation += $person->getPrice();
            }

            $status = $reservation->getStatus() ?? 'unknown';

            if (!isset($stats['by_status'][$status])) {
                $stats['by_status'][$status] = 0;
            }

            $stats['by_status'][$status] += $totalReservation;
            $stats['total'] += $totalReservation;
        }

        return $this->json($stats);
    }

    /**
     * Vrátí souhrn plateb pro rezervaci
     */
    #[Route('/api/reservations/{id}/payment-summary', name: 'api_reservations_payment_summary', methods: ['GET'])]
    #[IsGranted('reservations.read')]
    public function paymentSummary(int $id, ReservationRepository $reservationRepository): JsonResponse
    {
        $reservation = $reservationRepository->find($id);
        if (!$reservation) {
            return $this->json(['error' => 'Reservation not found'], JsonResponse::HTTP_NOT_FOUND);
        }

        $summary = $this->paymentService->getPaymentSummary($reservation);

        // Přidej seznam faktur
        $invoicesData = [];
        foreach ($reservation->getInvoices() as $invoice) {
            $invoicesData[] = $this->invoiceService->toArray($invoice);
        }
        $summary['invoicesList'] = $invoicesData;

        return $this->json($summary);
    }

    /**
     * Aktualizuje způsob platby rezervace
     *
     * Body params:
     * - paymentMethod: string (ONLINE, DEPOSIT, INVOICE, CASH, BANK_TRANSFER, MIXED)
     * - depositPercent?: float (default 25)
     */
    #[Route('/api/reservations/{id}/payment-method', name: 'api_reservations_update_payment_method', methods: ['PUT'])]
    #[IsGranted('reservations.update')]
    public function updatePaymentMethod(int $id, Request $request, ReservationRepository $reservationRepository): JsonResponse
    {
        $reservation = $reservationRepository->find($id);
        if (!$reservation) {
            return $this->json(['error' => 'Reservation not found'], JsonResponse::HTTP_NOT_FOUND);
        }

        $data = json_decode($request->getContent(), true);
        $paymentMethod = $data['paymentMethod'] ?? null;
        $depositPercent = isset($data['depositPercent']) ? (float)$data['depositPercent'] : null;

        if (!$paymentMethod) {
            return $this->json(['error' => 'paymentMethod is required'], JsonResponse::HTTP_BAD_REQUEST);
        }

        $allowedMethods = ['ONLINE', 'DEPOSIT', 'INVOICE', 'CASH', 'BANK_TRANSFER', 'MIXED'];
        if (!in_array($paymentMethod, $allowedMethods, true)) {
            return $this->json(['error' => 'Invalid paymentMethod'], JsonResponse::HTTP_BAD_REQUEST);
        }

        $this->paymentService->updatePaymentMethod($reservation, $paymentMethod, $depositPercent);

        return $this->json([
            'message' => 'Payment method updated',
            'paymentMethod' => $reservation->getPaymentMethod(),
            'depositPercent' => $reservation->getDepositPercent(),
            'depositAmount' => $reservation->getDepositAmount(),
        ]);
    }

    /**
     * Označí rezervaci jako zaplacenou
     *
     * Body params:
     * - amount?: float (pokud null, použije se zbývající částka)
     * - paymentMethod?: string (CASH, BANK_TRANSFER, ...)
     * - note?: string
     * - cashboxTarget?: string ('event' | 'main' | null) - kam zapsat hotovostní platbu
     */
    #[Route('/api/reservations/{id}/mark-paid', name: 'api_reservations_mark_paid', methods: ['POST'])]
    #[IsGranted('reservations.update')]
    public function markPaid(int $id, Request $request, ReservationRepository $reservationRepository): JsonResponse
    {
        $reservation = $reservationRepository->find($id);
        if (!$reservation) {
            return $this->json(['error' => 'Reservation not found'], JsonResponse::HTTP_NOT_FOUND);
        }

        $data = json_decode($request->getContent(), true) ?? [];
        $amount = isset($data['amount']) ? (float)$data['amount'] : null;
        $paymentMethod = $data['paymentMethod'] ?? 'CASH';
        $note = $data['note'] ?? null;
        $cashboxTarget = $data['cashboxTarget'] ?? null;

        // Calculate the actual payment amount (before markAsPaid changes the state)
        $totalPrice = (float)($reservation->getTotalPrice() ?? 0);
        $currentPaid = (float)($reservation->getPaidAmount() ?? 0);
        $remaining = $totalPrice - $currentPaid;
        $paymentAmount = $amount ?? $remaining;

        $this->paymentService->markAsPaid($reservation, $amount, $paymentMethod, $note);

        // Record to cashbox if requested (only for CASH payments)
        $cashboxRecorded = null;
        if ($cashboxTarget && $paymentMethod === 'CASH' && $paymentAmount > 0) {
            try {
                $cashboxRecorded = $this->recordToCashbox($reservation, $cashboxTarget, $paymentAmount);
            } catch (\Exception $e) {
                error_log('Cashbox record after mark-paid failed: ' . $e->getMessage());
            }
        }

        // Re-sync event guest counts (now that reservation is paid, guests should move from free to paid)
        try {
            $this->autoEventService->syncReservationToEvent($reservation);
        } catch (\Exception $e) {
            error_log('AutoEvent sync after mark-paid failed: ' . $e->getMessage());
        }

        return $this->json([
            'message' => 'Reservation marked as paid',
            'paymentStatus' => $reservation->getPaymentStatus(),
            'paidAmount' => $reservation->getPaidAmount(),
            'totalPrice' => $reservation->getTotalPrice(),
            'cashboxRecorded' => $cashboxRecorded,
        ]);
    }

    /**
     * Vrátí informace o propojeném eventu pro rezervaci (podle data)
     */
    #[Route('/api/reservations/{id}/linked-event', name: 'api_reservations_linked_event', methods: ['GET'])]
    #[IsGranted('reservations.read')]
    public function getLinkedEvent(int $id, ReservationRepository $reservationRepository): JsonResponse
    {
        $reservation = $reservationRepository->find($id);
        if (!$reservation) {
            return $this->json(['error' => 'Reservation not found'], JsonResponse::HTTP_NOT_FOUND);
        }

        $event = $this->findEventByReservationDate($reservation);
        if (!$event) {
            return $this->json(['event' => null]);
        }

        $eventCashbox = $this->cashboxService->getEventCashbox($event);

        return $this->json([
            'event' => [
                'id' => $event->getId(),
                'name' => $event->getName(),
                'eventDate' => $event->getEventDate(),
                'hasCashbox' => $eventCashbox !== null,
                'cashboxId' => $eventCashbox?->getId(),
            ],
        ]);
    }

    private function findEventByReservationDate(Reservation $reservation): ?Event
    {
        $date = \DateTime::createFromInterface($reservation->getDate())->setTime(0, 0, 0);
        return $this->entityManager->createQueryBuilder()
            ->select('e')
            ->from(Event::class, 'e')
            ->where('e.eventDate = :date')
            ->setParameter('date', $date)
            ->setMaxResults(1)
            ->getQuery()
            ->getOneOrNullResult();
    }

    /**
     * Zapíše hotovostní platbu do pokladny (event nebo hlavní)
     */
    private function recordToCashbox(Reservation $reservation, string $target, float $amount): string
    {
        if ($target === 'event') {
            $event = $this->findEventByReservationDate($reservation);
            if (!$event) {
                throw new \RuntimeException('No event found for this reservation date');
            }
            $cashbox = $this->cashboxService->getOrCreateEventCashbox($event);
            $cashboxName = 'Kasa eventu: ' . $event->getName();
        } else {
            $cashbox = $this->cashboxService->getOrCreateMainCashbox();
            $cashboxName = 'Hlavní kasa';
        }

        $contactName = $reservation->getContactName() ?? 'Neznámý';
        $movement = $this->cashboxService->addMovement($cashbox, 'INCOME', number_format($amount, 2, '.', ''), [
            'category' => 'Platba rezervace',
            'description' => "Platba hotově - rezervace #{$reservation->getId()} ({$contactName})",
            'paymentMethod' => 'CASH',
        ]);
        $movement->setReservation($reservation);
        $this->entityManager->flush();

        return $cashboxName;
    }

    /**
     * Zaznamená částečnou platbu
     *
     * Body params:
     * - amount: float (povinné)
     * - note?: string
     */
    #[Route('/api/reservations/{id}/record-payment', name: 'api_reservations_record_payment', methods: ['POST'])]
    #[IsGranted('reservations.update')]
    public function recordPayment(int $id, Request $request, ReservationRepository $reservationRepository): JsonResponse
    {
        $reservation = $reservationRepository->find($id);
        if (!$reservation) {
            return $this->json(['error' => 'Reservation not found'], JsonResponse::HTTP_NOT_FOUND);
        }

        $data = json_decode($request->getContent(), true) ?? [];
        $amount = isset($data['amount']) ? (float)$data['amount'] : null;
        $note = $data['note'] ?? null;

        if ($amount === null || $amount <= 0) {
            return $this->json(['error' => 'amount is required and must be positive'], JsonResponse::HTTP_BAD_REQUEST);
        }

        $this->paymentService->recordPayment($reservation, $amount, $note);

        // Re-sync event if now fully paid
        if ($reservation->getPaymentStatus() === 'PAID') {
            try {
                $this->autoEventService->syncReservationToEvent($reservation);
            } catch (\Exception $e) {
                error_log('AutoEvent sync after payment failed: ' . $e->getMessage());
            }
        }

        return $this->json([
            'message' => 'Payment recorded',
            'paymentStatus' => $reservation->getPaymentStatus(),
            'paidAmount' => $reservation->getPaidAmount(),
            'remainingAmount' => $reservation->getRemainingAmount(),
        ]);
    }

    /**
     * Upraví stav platby rezervace (nastaví zaplacenou částku, metodu a status)
     *
     * Body params:
     * - paidAmount: float (nová zaplacená částka)
     * - paymentMethod?: string (CASH, BANK_TRANSFER, ONLINE, ...)
     * - paymentStatus?: string (UNPAID, PARTIAL, PAID) - pokud null, automaticky se dopočítá
     * - note?: string
     */
    #[Route('/api/reservations/{id}/adjust-payment', name: 'api_reservations_adjust_payment', methods: ['POST'])]
    #[IsGranted('reservations.update')]
    public function adjustPayment(int $id, Request $request, ReservationRepository $reservationRepository): JsonResponse
    {
        $reservation = $reservationRepository->find($id);
        if (!$reservation) {
            return $this->json(['error' => 'Reservation not found'], JsonResponse::HTTP_NOT_FOUND);
        }

        $data = json_decode($request->getContent(), true) ?? [];
        $paidAmount = isset($data['paidAmount']) ? (float)$data['paidAmount'] : null;
        $paymentMethod = $data['paymentMethod'] ?? null;
        $paymentStatus = $data['paymentStatus'] ?? null;
        $note = $data['note'] ?? null;

        if ($paidAmount === null || $paidAmount < 0) {
            return $this->json(['error' => 'paidAmount is required and must be >= 0'], JsonResponse::HTTP_BAD_REQUEST);
        }

        $reservation->setPaidAmount(number_format($paidAmount, 2, '.', ''));

        if ($paymentMethod !== null) {
            $reservation->setPaymentMethod($paymentMethod ?: null);
        }

        // Přidej poznámku o úpravě
        $noteText = date('d.m.Y H:i') . ': Platba ručně upravena na ' . number_format($paidAmount, 0, ',', ' ') . ' Kč';
        if ($note) {
            $noteText .= ' (' . $note . ')';
        }
        $existingNote = $reservation->getPaymentNote();
        $reservation->setPaymentNote($existingNote ? $existingNote . "\n" . $noteText : $noteText);

        // Automaticky dopočítej status pokud není explicitně zadán
        if ($paymentStatus) {
            $reservation->setPaymentStatus($paymentStatus);
            if ($paymentStatus === 'PAID') {
                $reservation->setStatus('PAID');
            } elseif ($reservation->getStatus() === 'PAID') {
                $reservation->setStatus('CONFIRMED');
            }
        } else {
            $this->paymentService->updatePaymentStatus($reservation);
            if ($reservation->getPaymentStatus() !== 'PAID' && $reservation->getStatus() === 'PAID') {
                $reservation->setStatus('CONFIRMED');
            }
        }

        $reservation->setUpdatedAt(new \DateTime());
        $this->entityManager->flush();

        // Re-sync event
        try {
            $this->autoEventService->syncReservationToEvent($reservation);
        } catch (\Exception $e) {
            error_log('AutoEvent sync after adjust-payment failed: ' . $e->getMessage());
        }

        return $this->json([
            'message' => 'Payment adjusted',
            'paymentStatus' => $reservation->getPaymentStatus(),
            'paymentMethod' => $reservation->getPaymentMethod(),
            'paidAmount' => $reservation->getPaidAmount(),
            'totalPrice' => $reservation->getTotalPrice(),
            'remainingAmount' => $reservation->getRemainingAmount(),
        ]);
    }
}
