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
 * Strategy — IDEMPOTENT UPDATE-IN-PLACE:
 * - For every ReservationPerson in reservations on the event date, match against
 *   the existing EventGuest with the same (reservation_id, position-within-reservation).
 * - Matching guests keep their ID and all assignments (eventTable, space, isPresent, isPaid).
 * - Unmatched persons → create new EventGuest.
 * - Orphaned EventGuests (reservation deleted or person removed) → delete.
 *
 * This way, repeated calls are safe: IDs stay stable, table assignments survive,
 * and no frontend cache invalidation is required unless reservations actually changed.
 */
class EventGuestSyncService
{
    public function __construct(private readonly EntityManagerInterface $em)
    {
    }

    public function syncForEvent(Event $event): void
    {
        $guestRepo = $this->em->getRepository(EventGuest::class);
        $menuRepo  = $this->em->getRepository(EventMenu::class);

        // ── 1) Index existing EventGuests by (reservationId, positionInRes) ────────
        // Position is determined by sorting existing guests within each reservation
        // by personIndex ascending — stable ordering matches reservation.persons order.
        /** @var EventGuest[] $existingGuests */
        $existingGuests = $guestRepo->findBy(['event' => $event]);

        /** @var array<int, EventGuest[]> $byRes */
        $byRes = [];
        foreach ($existingGuests as $g) {
            $resId = $g->getReservation()?->getId();
            if ($resId === null) continue;
            $byRes[$resId][] = $g;
        }
        // Sort each reservation's guests by personIndex for stable matching
        foreach ($byRes as $resId => &$list) {
            usort($list, fn(EventGuest $a, EventGuest $b) => ($a->getPersonIndex() ?? 0) - ($b->getPersonIndex() ?? 0));
        }
        unset($list);

        /** @var array<string, EventGuest> $matchedByKey */
        $matchedByKey = [];
        $usedGuestIds = []; // ids of guests we keep (all others get deleted)

        // ── 2) Load reservations for the event date ────────────────────────────────
        $reservations = $this->em->getRepository(Reservation::class)
            ->findBy(['date' => $event->getEventDate()]);

        // ── 3) Wipe EventMenu aggregates (cheap; rebuilt each sync) ────────────────
        // Aggregates are derived data; wiping is fine because nothing else references them.
        foreach ($menuRepo->findBy(['event' => $event]) as $m) {
            $this->em->remove($m);
        }
        $this->em->flush();

        if (!$reservations) {
            // No reservations — remove any orphan guests and exit
            foreach ($existingGuests as $g) {
                $this->em->remove($g);
            }
            $this->em->flush();
            return;
        }

        $globalPersonIndex = 0;
        /** @var array<string, EventMenu> $menuCache */
        $menuCache = [];

        foreach ($reservations as $reservation) {
            $resId = $reservation->getId();
            $resGuests = $byRes[$resId] ?? [];
            $localPos = 0;

            foreach ($reservation->getPersons() as $person) {
                $globalPersonIndex++;
                $positionKey = $resId . '_' . $localPos;

                // ── Match existing OR create new ────────────────────────────────
                $guest = $resGuests[$localPos] ?? null;
                if ($guest !== null) {
                    // Reuse existing record — preserves ID, eventTable, space, isPresent, etc.
                    $matchedByKey[$positionKey] = $guest;
                    $usedGuestIds[$guest->getId()] = true;
                } else {
                    $guest = new EventGuest();
                    $guest->setEvent($event)
                        ->setReservation($reservation)
                        ->setIsPaid(true);
                    $this->em->persist($guest);
                }

                // Update mutable fields that mirror reservation data
                $guest->setType($person->getType() ?? 'adult')
                    ->setFirstName($reservation->getContactName() ?: $person->getType())
                    ->setPersonIndex($globalPersonIndex)
                    ->setNationality($reservation->getContactNationality());

                // ── Menu linking (aggregate into EventMenu) ──────────────────────
                $menuRaw = trim((string) $person->getMenu());
                if ($menuRaw !== '') {
                    $rf = null;
                    $menuKey = null;
                    if (ctype_digit($menuRaw)) {
                        $rf = $this->em->getRepository(ReservationFoods::class)->find((int) $menuRaw);
                        if ($rf) {
                            $menuKey = 'res:' . $resId . ':id:' . $rf->getId();
                        }
                    }
                    if (!$rf) {
                        $rf = $this->em->getRepository(ReservationFoods::class)->findOneBy(['name' => $menuRaw]);
                        $menuKey = $rf
                            ? ('res:' . $resId . ':id:' . $rf->getId())
                            : ('res:' . $resId . ':name:' . $menuRaw);
                    }

                    if (!isset($menuCache[$menuKey])) {
                        $emItem = new EventMenu();
                        $emItem->setEvent($event)
                            ->setReservation($reservation)
                            ->setMenuName($rf ? $rf->getName() : $menuRaw)
                            ->setQuantity(0)
                            ->setPricePerUnit(null)
                            ->setTotalPrice('0.00');
                        if ($rf) {
                            $emItem->setReservationFood($rf);
                            $emItem->setPricePerUnit(number_format((float) $rf->getPrice(), 2, '.', ''));
                        }
                        $this->em->persist($emItem);
                        $menuCache[$menuKey] = $emItem;
                    }
                    $eventMenu = $menuCache[$menuKey];

                    $personPrice = $person->getPrice();
                    if ($personPrice !== null && $personPrice !== '') {
                        $eventMenu->setPricePerUnit(number_format((float) $personPrice, 2, '.', ''));
                    }

                    $eventMenu->setQuantity($eventMenu->getQuantity() + 1);
                    $ppu = (float) ($eventMenu->getPricePerUnit() ?? 0);
                    $currentTotal = (float) ($eventMenu->getTotalPrice() ?? 0);
                    $eventMenu->setTotalPrice(number_format($currentTotal + $ppu, 2, '.', ''));

                    $guest->setMenuItem($eventMenu);
                } else {
                    // No menu in reservation — clear any previously set link
                    $guest->setMenuItem(null);
                }

                $localPos++;
            }
        }

        // ── 4) Remove orphaned guests (their reservation or person no longer exists) ──
        foreach ($existingGuests as $g) {
            if (!isset($usedGuestIds[$g->getId()])) {
                $this->em->remove($g);
            }
        }

        $this->em->flush();
    }
}
