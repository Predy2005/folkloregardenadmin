<?php

declare(strict_types=1);

namespace App\Service;

use App\Entity\Event;
use App\Entity\EventGuest;
use App\Entity\EventMenu;
use App\Entity\Reservation;
use App\Entity\ReservationFoods;
use Doctrine\ORM\EntityManagerInterface;

/**
 * Central synchronizer: keeps event_guest (and derived event_menu aggregates)
 * in sync with reservations for the event date.
 *
 * Rules:
 * - For the given event, remove all existing EventGuest and EventMenu records
 *   and rebuild them from reservations whose Reservation.date == Event.eventDate.
 * - For every ReservationPerson in those reservations create a corresponding EventGuest.
 * - Aggregate menu selections into EventMenu records with proper quantity and totals.
 * - Idempotent: repeated calls produce the same result without duplicates.
 */
class EventGuestSyncService
{
    public function __construct(private readonly EntityManagerInterface $em)
    {
    }

    public function syncForEvent(Event $event): void
    {
        // 1) Remove current guests and menu items for this event (full rebuild strategy)
        $guestRepo = $this->em->getRepository(EventGuest::class);
        $menuRepo  = $this->em->getRepository(EventMenu::class);

        foreach ($guestRepo->findBy(['event' => $event]) as $g) {
            $this->em->remove($g);
        }
        foreach ($menuRepo->findBy(['event' => $event]) as $m) {
            $this->em->remove($m);
        }
        $this->em->flush();

        // 2) Find reservations matching the event date
        $reservations = $this->em->getRepository(Reservation::class)
            ->findBy(['date' => $event->getEventDate()]);

        if (!$reservations) {
            return; // nothing to build
        }

        $personIndex = 0;
        /** @var array<string, EventMenu> $menuCache */
        $menuCache = [];

        foreach ($reservations as $reservation) {
            foreach ($reservation->getPersons() as $person) {
                $guest = new EventGuest();
                $guest
                    ->setEvent($event)
                    ->setReservation($reservation)
                    ->setType($person->getType() ?? 'adult')
                    ->setFirstName($reservation->getContactName())
                    ->setIsPaid(true)
                    ->setPersonIndex(++$personIndex)
                    ->setNationality($reservation->getContactNationality());

                // Pick menu from ReservationPerson -> link to ReservationFoods if possible
                $menuRaw = trim((string)$person->getMenu());
                if ($menuRaw !== '') {
                    $rf = null;
                    $menuKey = null; // prefer id-based key if possible
                    if (ctype_digit($menuRaw)) {
                        $rf = $this->em->getRepository(ReservationFoods::class)->find((int)$menuRaw);
                        if ($rf) {
                            $menuKey = 'id:' . $rf->getId();
                        }
                    }
                    if (!$rf) {
                        // Fallback: find by name for backward compatibility
                        $rf = $this->em->getRepository(ReservationFoods::class)->findOneBy(['name' => $menuRaw]);
                        $menuKey = $rf ? ('id:' . $rf->getId()) : ('name:' . $menuRaw);
                    }

                    if (!isset($menuCache[$menuKey])) {
                        $emItem = new EventMenu();
                        $emItem->setEvent($event)
                            ->setMenuName($rf ? $rf->getName() : $menuRaw)
                            ->setQuantity(0)
                            ->setPricePerUnit(null)
                            ->setTotalPrice('0.00');
                        if ($rf) {
                            $emItem->setReservationFood($rf);
                            if ($emItem->getPricePerUnit() === null) {
                                $emItem->setPricePerUnit(number_format((float)$rf->getPrice(), 2, '.', ''));
                            }
                        }
                        $this->em->persist($emItem);
                        $menuCache[$menuKey] = $emItem;
                    }
                    $eventMenu = $menuCache[$menuKey];

                    // Person-specific price overrides unit price
                    $personPrice = $person->getPrice();
                    if ($personPrice !== null && $personPrice !== '') {
                        $eventMenu->setPricePerUnit(number_format((float)$personPrice, 2, '.', ''));
                    }

                    // Accumulate quantity and total
                    $eventMenu->setQuantity($eventMenu->getQuantity() + 1);
                    $ppu = (float)($eventMenu->getPricePerUnit() ?? 0);
                    $currentTotal = (float)($eventMenu->getTotalPrice() ?? 0);
                    $eventMenu->setTotalPrice(number_format($currentTotal + $ppu, 2, '.', ''));

                    // Link guest to the chosen menu
                    $guest->setMenuItem($eventMenu);
                }

                if (!$guest->getFirstName()) {
                    $guest->setFirstName($person->getType());
                }

                $this->em->persist($guest);
            }
        }

        $this->em->flush();
    }
}
