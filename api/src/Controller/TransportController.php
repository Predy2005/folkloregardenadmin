<?php

namespace App\Controller;

use App\Entity\TransportCompany;
use App\Entity\TransportVehicle;
use App\Entity\TransportDriver;
use App\Entity\EventTransport;
use App\Entity\Event;
use App\Repository\TransportCompanyRepository;
use App\Repository\TransportVehicleRepository;
use App\Repository\TransportDriverRepository;
use App\Repository\EventTransportRepository;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Annotation\Route;
use Symfony\Component\Security\Http\Attribute\IsGranted;

#[Route('/api/transport')]
class TransportController extends AbstractController
{
    public function __construct(
        private readonly EntityManagerInterface $em,
        private readonly TransportCompanyRepository $companyRepo,
        private readonly TransportVehicleRepository $vehicleRepo,
        private readonly TransportDriverRepository $driverRepo,
        private readonly EventTransportRepository $eventTransportRepo,
    ) {}

    // ─── Companies ───────────────────────────────────────────────────────

    #[Route('', methods: ['GET'])]
    #[IsGranted('transport.read')]
    public function listCompanies(): JsonResponse
    {
        $companies = $this->companyRepo->findBy([], ['name' => 'ASC']);
        $data = array_map(function (TransportCompany $c) {
            return [
                'id' => $c->getId(),
                'name' => $c->getName(),
                'contactPerson' => $c->getContactPerson(),
                'email' => $c->getEmail(),
                'phone' => $c->getPhone(),
                'ic' => $c->getIc(),
                'isActive' => $c->isActive(),
                'vehicleCount' => $c->getVehicles()->count(),
                'driverCount' => $c->getDrivers()->count(),
                'vehicles' => array_map(fn(TransportVehicle $v) => $this->serializeVehicle($v), $c->getVehicles()->toArray()),
                'drivers' => array_map(fn(TransportDriver $d) => $this->serializeDriver($d), $c->getDrivers()->toArray()),
                'eventCount' => $c->getEventTransports()->count(),
                'totalRevenue' => array_sum(array_map(
                    fn(EventTransport $et) => (float)($et->getPrice() ?? 0),
                    $c->getEventTransports()->toArray()
                )),
            ];
        }, $companies);
        return $this->json($data);
    }

    #[Route('', methods: ['POST'])]
    #[IsGranted('transport.create')]
    public function createCompany(Request $request): JsonResponse
    {
        $data = json_decode($request->getContent(), true) ?? [];
        if (empty($data['name'])) {
            return $this->json(['error' => 'Název je povinný'], 400);
        }

        $c = new TransportCompany();
        $this->applyCompanyData($c, $data);
        $this->em->persist($c);
        $this->em->flush();

        return $this->json(['status' => 'created', 'id' => $c->getId()], 201);
    }

    #[Route('/{id}', methods: ['GET'], requirements: ['id' => '\d+'])]
    #[IsGranted('transport.read')]
    public function getCompany(int $id): JsonResponse
    {
        $c = $this->companyRepo->find($id);
        if (!$c) return $this->json(['error' => 'Not found'], 404);

        return $this->json($this->serializeCompanyDetail($c));
    }

    #[Route('/{id}', methods: ['PUT', 'PATCH'], requirements: ['id' => '\d+'])]
    #[IsGranted('transport.update')]
    public function updateCompany(int $id, Request $request): JsonResponse
    {
        $c = $this->companyRepo->find($id);
        if (!$c) return $this->json(['error' => 'Not found'], 404);

        $data = json_decode($request->getContent(), true) ?? [];
        $this->applyCompanyData($c, $data);
        $this->em->flush();

        return $this->json(['status' => 'updated']);
    }

    #[Route('/{id}', methods: ['DELETE'], requirements: ['id' => '\d+'])]
    #[IsGranted('transport.delete')]
    public function deleteCompany(int $id): JsonResponse
    {
        $c = $this->companyRepo->find($id);
        if (!$c) return $this->json(['error' => 'Not found'], 404);

        $this->em->remove($c);
        $this->em->flush();
        return $this->json(['status' => 'deleted']);
    }

    #[Route('/bulk', methods: ['POST'])]
    #[IsGranted('transport.update')]
    public function bulkAction(Request $request): JsonResponse
    {
        $data = json_decode($request->getContent(), true) ?? [];
        $ids = $data['ids'] ?? [];
        $action = $data['action'] ?? null;
        if (empty($ids) || !$action) return $this->json(['error' => 'Missing ids or action'], 400);

        $companies = $this->companyRepo->findBy(['id' => $ids]);
        $count = 0;
        foreach ($companies as $c) {
            match ($action) {
                'activate' => $c->setIsActive(true),
                'deactivate' => $c->setIsActive(false),
                'delete' => $this->em->remove($c),
                default => null,
            };
            $count++;
        }
        $this->em->flush();
        return $this->json(['status' => 'ok', 'affected' => $count]);
    }

    // ─── Vehicles ────────────────────────────────────────────────────────

    #[Route('/{id}/vehicles', methods: ['GET'], requirements: ['id' => '\d+'])]
    #[IsGranted('transport.read')]
    public function listVehicles(int $id): JsonResponse
    {
        $c = $this->companyRepo->find($id);
        if (!$c) return $this->json(['error' => 'Company not found'], 404);

        $vehicles = $this->vehicleRepo->findBy(['company' => $c], ['licensePlate' => 'ASC']);
        return $this->json(array_map(fn(TransportVehicle $v) => $this->serializeVehicle($v), $vehicles));
    }

    #[Route('/{id}/vehicles', methods: ['POST'], requirements: ['id' => '\d+'])]
    #[IsGranted('transport.create')]
    public function createVehicle(int $id, Request $request): JsonResponse
    {
        $c = $this->companyRepo->find($id);
        if (!$c) return $this->json(['error' => 'Company not found'], 404);

        $data = json_decode($request->getContent(), true) ?? [];
        if (empty($data['licensePlate'])) return $this->json(['error' => 'SPZ je povinná'], 400);

        $v = new TransportVehicle();
        $v->setCompany($c);
        $this->applyVehicleData($v, $data);
        $this->em->persist($v);
        $this->em->flush();

        return $this->json(['status' => 'created', 'id' => $v->getId()], 201);
    }

    #[Route('/vehicles/{vid}', methods: ['GET'])]
    #[IsGranted('transport.read')]
    public function getVehicle(int $vid): JsonResponse
    {
        $v = $this->vehicleRepo->find($vid);
        if (!$v) return $this->json(['error' => 'Not found'], 404);

        $events = $this->eventTransportRepo->findBy(['vehicle' => $v], ['createdAt' => 'DESC']);

        return $this->json([
            'vehicle' => $this->serializeVehicle($v),
            'events' => array_map(fn(EventTransport $et) => $this->serializeEventTransport($et), $events),
            'summary' => [
                'totalTrips' => count($events),
                'totalRevenue' => array_sum(array_map(fn(EventTransport $et) => (float)($et->getPrice() ?? 0), $events)),
            ],
        ]);
    }

    #[Route('/vehicles/{vid}', methods: ['PUT', 'PATCH'])]
    #[IsGranted('transport.update')]
    public function updateVehicle(int $vid, Request $request): JsonResponse
    {
        $v = $this->vehicleRepo->find($vid);
        if (!$v) return $this->json(['error' => 'Not found'], 404);

        $data = json_decode($request->getContent(), true) ?? [];
        $this->applyVehicleData($v, $data);
        $this->em->flush();

        return $this->json(['status' => 'updated']);
    }

    #[Route('/vehicles/{vid}', methods: ['DELETE'])]
    #[IsGranted('transport.delete')]
    public function deleteVehicle(int $vid): JsonResponse
    {
        $v = $this->vehicleRepo->find($vid);
        if (!$v) return $this->json(['error' => 'Not found'], 404);

        $this->em->remove($v);
        $this->em->flush();
        return $this->json(['status' => 'deleted']);
    }

    // ─── Drivers ─────────────────────────────────────────────────────────

    #[Route('/{id}/drivers', methods: ['GET'], requirements: ['id' => '\d+'])]
    #[IsGranted('transport.read')]
    public function listDrivers(int $id): JsonResponse
    {
        $c = $this->companyRepo->find($id);
        if (!$c) return $this->json(['error' => 'Company not found'], 404);

        $drivers = $this->driverRepo->findBy(['company' => $c], ['lastName' => 'ASC']);
        return $this->json(array_map(fn(TransportDriver $d) => $this->serializeDriver($d), $drivers));
    }

    #[Route('/{id}/drivers', methods: ['POST'], requirements: ['id' => '\d+'])]
    #[IsGranted('transport.create')]
    public function createDriver(int $id, Request $request): JsonResponse
    {
        $c = $this->companyRepo->find($id);
        if (!$c) return $this->json(['error' => 'Company not found'], 404);

        $data = json_decode($request->getContent(), true) ?? [];
        if (empty($data['firstName']) || empty($data['lastName'])) {
            return $this->json(['error' => 'Jméno a příjmení jsou povinné'], 400);
        }

        $d = new TransportDriver();
        $d->setCompany($c);
        $this->applyDriverData($d, $data);
        $this->em->persist($d);
        $this->em->flush();

        return $this->json(['status' => 'created', 'id' => $d->getId()], 201);
    }

    #[Route('/drivers/{did}', methods: ['GET'])]
    #[IsGranted('transport.read')]
    public function getDriver(int $did): JsonResponse
    {
        $d = $this->driverRepo->find($did);
        if (!$d) return $this->json(['error' => 'Not found'], 404);

        $events = $this->eventTransportRepo->findBy(['driver' => $d], ['createdAt' => 'DESC']);

        return $this->json([
            'driver' => $this->serializeDriver($d),
            'events' => array_map(fn(EventTransport $et) => $this->serializeEventTransport($et), $events),
            'summary' => [
                'totalTrips' => count($events),
                'totalRevenue' => array_sum(array_map(fn(EventTransport $et) => (float)($et->getPrice() ?? 0), $events)),
            ],
        ]);
    }

    #[Route('/drivers/{did}', methods: ['PUT', 'PATCH'])]
    #[IsGranted('transport.update')]
    public function updateDriver(int $did, Request $request): JsonResponse
    {
        $d = $this->driverRepo->find($did);
        if (!$d) return $this->json(['error' => 'Not found'], 404);

        $data = json_decode($request->getContent(), true) ?? [];
        $this->applyDriverData($d, $data);
        $this->em->flush();

        return $this->json(['status' => 'updated']);
    }

    #[Route('/drivers/{did}', methods: ['DELETE'])]
    #[IsGranted('transport.delete')]
    public function deleteDriver(int $did): JsonResponse
    {
        $d = $this->driverRepo->find($did);
        if (!$d) return $this->json(['error' => 'Not found'], 404);

        $this->em->remove($d);
        $this->em->flush();
        return $this->json(['status' => 'deleted']);
    }

    // ─── Event Transport (by event ID) ─────────────────────────────────

    #[Route('/by-event/{eventId}', methods: ['GET'])]
    #[IsGranted('transport.read')]
    public function eventTransports(int $eventId): JsonResponse
    {
        $event = $this->em->getRepository(Event::class)->find($eventId);
        if (!$event) return $this->json(['error' => 'Event not found'], 404);

        $assignments = $this->eventTransportRepo->findBy(['event' => $event], ['createdAt' => 'ASC']);
        return $this->json(array_map(fn(EventTransport $et) => $this->serializeEventTransport($et), $assignments));
    }

    // ─── Event Assignments ───────────────────────────────────────────────

    #[Route('/{id}/events', methods: ['GET'], requirements: ['id' => '\d+'])]
    #[IsGranted('transport.read')]
    public function companyEvents(int $id): JsonResponse
    {
        $c = $this->companyRepo->find($id);
        if (!$c) return $this->json(['error' => 'Company not found'], 404);

        $assignments = $this->eventTransportRepo->findBy(['company' => $c], ['createdAt' => 'DESC']);

        $totalRevenue = 0;
        $pendingPayments = 0;
        $items = [];

        foreach ($assignments as $et) {
            $price = (float)($et->getPrice() ?? 0);
            $totalRevenue += $price;
            if ($et->getPaymentStatus() !== 'PAID') $pendingPayments += $price;
            $items[] = $this->serializeEventTransport($et);
        }

        return $this->json([
            'items' => $items,
            'summary' => [
                'totalEvents' => count($assignments),
                'totalRevenue' => $totalRevenue,
                'pendingPayments' => $pendingPayments,
            ],
        ]);
    }

    #[Route('/event-assignments', methods: ['POST'])]
    #[IsGranted('transport.create')]
    public function createEventAssignment(Request $request): JsonResponse
    {
        $data = json_decode($request->getContent(), true) ?? [];

        $event = $this->em->getRepository(Event::class)->find($data['eventId'] ?? 0);
        $company = $this->companyRepo->find($data['companyId'] ?? 0);
        if (!$event || !$company) return $this->json(['error' => 'Event or company not found'], 404);

        $et = new EventTransport();
        $et->setEvent($event);
        $et->setCompany($company);

        if (!empty($data['vehicleId'])) {
            $et->setVehicle($this->vehicleRepo->find($data['vehicleId']));
        }
        if (!empty($data['driverId'])) {
            $et->setDriver($this->driverRepo->find($data['driverId']));
        }

        $this->applyAssignmentData($et, $data);
        $this->em->persist($et);
        $this->em->flush();

        return $this->json(['status' => 'created', 'id' => $et->getId()], 201);
    }

    #[Route('/event-assignments/{aid}', methods: ['PUT', 'PATCH'])]
    #[IsGranted('transport.update')]
    public function updateEventAssignment(int $aid, Request $request): JsonResponse
    {
        $et = $this->eventTransportRepo->find($aid);
        if (!$et) return $this->json(['error' => 'Not found'], 404);

        $data = json_decode($request->getContent(), true) ?? [];

        if (isset($data['vehicleId'])) {
            $et->setVehicle($data['vehicleId'] ? $this->vehicleRepo->find($data['vehicleId']) : null);
        }
        if (isset($data['driverId'])) {
            $et->setDriver($data['driverId'] ? $this->driverRepo->find($data['driverId']) : null);
        }

        $this->applyAssignmentData($et, $data);
        $this->em->flush();

        return $this->json(['status' => 'updated']);
    }

    #[Route('/event-assignments/{aid}', methods: ['DELETE'])]
    #[IsGranted('transport.delete')]
    public function deleteEventAssignment(int $aid): JsonResponse
    {
        $et = $this->eventTransportRepo->find($aid);
        if (!$et) return $this->json(['error' => 'Not found'], 404);

        $this->em->remove($et);
        $this->em->flush();
        return $this->json(['status' => 'deleted']);
    }

    // ─── Helpers ─────────────────────────────────────────────────────────

    private function applyCompanyData(TransportCompany $c, array $data): void
    {
        if (isset($data['name'])) $c->setName($data['name']);
        if (array_key_exists('contactPerson', $data)) $c->setContactPerson($data['contactPerson']);
        if (array_key_exists('email', $data)) $c->setEmail($data['email']);
        if (array_key_exists('phone', $data)) $c->setPhone($data['phone']);
        if (array_key_exists('address', $data)) $c->setAddress($data['address']);
        if (array_key_exists('ic', $data)) $c->setIc($data['ic']);
        if (array_key_exists('dic', $data)) $c->setDic($data['dic']);
        if (array_key_exists('bankAccount', $data)) $c->setBankAccount($data['bankAccount']);
        if (isset($data['isActive'])) $c->setIsActive((bool)$data['isActive']);
        if (array_key_exists('notes', $data)) $c->setNotes($data['notes']);
    }

    private function applyVehicleData(TransportVehicle $v, array $data): void
    {
        if (isset($data['licensePlate'])) $v->setLicensePlate($data['licensePlate']);
        if (isset($data['vehicleType'])) $v->setVehicleType($data['vehicleType']);
        if (array_key_exists('brand', $data)) $v->setBrand($data['brand']);
        if (array_key_exists('model', $data)) $v->setModel($data['model']);
        if (isset($data['capacity'])) $v->setCapacity((int)$data['capacity']);
        if (array_key_exists('color', $data)) $v->setColor($data['color']);
        if (array_key_exists('yearOfManufacture', $data)) $v->setYearOfManufacture($data['yearOfManufacture'] ? (int)$data['yearOfManufacture'] : null);
        if (isset($data['isActive'])) $v->setIsActive((bool)$data['isActive']);
        if (array_key_exists('notes', $data)) $v->setNotes($data['notes']);
    }

    private function applyDriverData(TransportDriver $d, array $data): void
    {
        if (isset($data['firstName'])) $d->setFirstName($data['firstName']);
        if (isset($data['lastName'])) $d->setLastName($data['lastName']);
        if (array_key_exists('phone', $data)) $d->setPhone($data['phone']);
        if (array_key_exists('email', $data)) $d->setEmail($data['email']);
        if (array_key_exists('licenseNumber', $data)) $d->setLicenseNumber($data['licenseNumber']);
        if (array_key_exists('licenseCategories', $data)) $d->setLicenseCategories($data['licenseCategories']);
        if (isset($data['isActive'])) $d->setIsActive((bool)$data['isActive']);
        if (array_key_exists('notes', $data)) $d->setNotes($data['notes']);
    }

    private function applyAssignmentData(EventTransport $et, array $data): void
    {
        if (array_key_exists('transportType', $data)) $et->setTransportType($data['transportType']);
        if (array_key_exists('scheduledTime', $data)) {
            $et->setScheduledTime($data['scheduledTime'] ? new \DateTime($data['scheduledTime']) : null);
        }
        if (array_key_exists('pickupLocation', $data)) $et->setPickupLocation($data['pickupLocation']);
        if (array_key_exists('dropoffLocation', $data)) $et->setDropoffLocation($data['dropoffLocation']);
        if (array_key_exists('passengerCount', $data)) $et->setPassengerCount($data['passengerCount'] ? (int)$data['passengerCount'] : null);
        if (array_key_exists('price', $data)) $et->setPrice($data['price'] !== null ? (string)$data['price'] : null);
        if (isset($data['paymentStatus'])) $et->setPaymentStatus($data['paymentStatus']);
        if (array_key_exists('invoiceNumber', $data)) $et->setInvoiceNumber($data['invoiceNumber']);
        if (array_key_exists('notes', $data)) $et->setNotes($data['notes']);
    }

    private function serializeCompanyDetail(TransportCompany $c): array
    {
        return [
            'id' => $c->getId(),
            'name' => $c->getName(),
            'contactPerson' => $c->getContactPerson(),
            'email' => $c->getEmail(),
            'phone' => $c->getPhone(),
            'address' => $c->getAddress(),
            'ic' => $c->getIc(),
            'dic' => $c->getDic(),
            'bankAccount' => $c->getBankAccount(),
            'isActive' => $c->isActive(),
            'notes' => $c->getNotes(),
            'createdAt' => $c->getCreatedAt()->format('c'),
            'updatedAt' => $c->getUpdatedAt()->format('c'),
            'vehicles' => array_map(fn(TransportVehicle $v) => $this->serializeVehicle($v), $c->getVehicles()->toArray()),
            'drivers' => array_map(fn(TransportDriver $d) => $this->serializeDriver($d), $c->getDrivers()->toArray()),
        ];
    }

    private function serializeVehicle(TransportVehicle $v): array
    {
        return [
            'id' => $v->getId(),
            'companyId' => $v->getCompany()?->getId(),
            'companyName' => $v->getCompany()?->getName(),
            'licensePlate' => $v->getLicensePlate(),
            'vehicleType' => $v->getVehicleType(),
            'brand' => $v->getBrand(),
            'model' => $v->getModel(),
            'capacity' => $v->getCapacity(),
            'color' => $v->getColor(),
            'yearOfManufacture' => $v->getYearOfManufacture(),
            'isActive' => $v->isActive(),
            'notes' => $v->getNotes(),
            'createdAt' => $v->getCreatedAt()->format('c'),
            'updatedAt' => $v->getUpdatedAt()->format('c'),
        ];
    }

    private function serializeDriver(TransportDriver $d): array
    {
        return [
            'id' => $d->getId(),
            'companyId' => $d->getCompany()?->getId(),
            'companyName' => $d->getCompany()?->getName(),
            'firstName' => $d->getFirstName(),
            'lastName' => $d->getLastName(),
            'phone' => $d->getPhone(),
            'email' => $d->getEmail(),
            'licenseNumber' => $d->getLicenseNumber(),
            'licenseCategories' => $d->getLicenseCategories(),
            'isActive' => $d->isActive(),
            'notes' => $d->getNotes(),
            'createdAt' => $d->getCreatedAt()->format('c'),
            'updatedAt' => $d->getUpdatedAt()->format('c'),
        ];
    }

    private function serializeEventTransport(EventTransport $et): array
    {
        return [
            'id' => $et->getId(),
            'eventId' => $et->getEvent()?->getId(),
            'eventName' => $et->getEvent()?->getName(),
            'eventDate' => $et->getEvent()?->getEventDate()?->format('Y-m-d'),
            'companyId' => $et->getCompany()?->getId(),
            'companyName' => $et->getCompany()?->getName(),
            'vehicleId' => $et->getVehicle()?->getId(),
            'vehicleLicensePlate' => $et->getVehicle()?->getLicensePlate(),
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
            'createdAt' => $et->getCreatedAt()->format('c'),
            'updatedAt' => $et->getUpdatedAt()->format('c'),
        ];
    }
}
