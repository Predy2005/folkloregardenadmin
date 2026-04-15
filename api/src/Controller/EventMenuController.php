<?php

namespace App\Controller;

use App\Entity\EventMenu;
use App\Entity\Reservation;
use App\Repository\EventRepository;
use App\Service\EventGuestSyncService;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Annotation\Route;
use Symfony\Component\Security\Http\Attribute\IsGranted;

#[Route('/api/events')]
class EventMenuController extends AbstractController
{
    public function __construct(
        private readonly EntityManagerInterface $em,
        private readonly EventGuestSyncService $guestSync,
    ) {
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
}
