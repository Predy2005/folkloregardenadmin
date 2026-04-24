<?php

declare(strict_types=1);

namespace App\Service;

use App\Entity\Event;
use App\Entity\EventBeverage;
use App\Entity\EventMenu;
use App\Entity\EventSchedule;
use App\Entity\EventStaffAssignment;
use App\Entity\EventTable;
use App\Entity\EventTransport;
use App\Entity\StaffAttendance;
use App\Entity\User;
use App\Repository\EventRepository;
use App\Repository\EventStaffAssignmentRepository;
use App\Repository\EventTransportRepository;
use App\Repository\StaffAttendanceRepository;
use Doctrine\ORM\EntityManagerInterface;

/**
 * Sjednocený datový servis pro mobilní aplikaci personálu.
 *
 * Všechny metody pracují výhradně s daty **přihlášeného uživatele** —
 * výběr se filtruje přes `user->getStaffMember()` (číšník/kuchař) nebo
 * `user->getTransportDriver()` (řidič). Nelze přes ně dostat cizí data.
 *
 * Serializace vynechává všechna finanční pole (mzda personálu, cena
 * transportu, fakturační detaily eventu) — mobilka je prozatím nevidí.
 */
class MobileDataService
{
    public function __construct(
        private readonly EntityManagerInterface $em,
        private readonly EventRepository $eventRepo,
        private readonly EventStaffAssignmentRepository $staffAssignRepo,
        private readonly EventTransportRepository $eventTransportRepo,
        private readonly StaffAttendanceRepository $attendanceRepo,
    ) {
    }

    // ─── EVENTY PRO STAFF ───────────────────────────────────────────────

    /**
     * Seznam eventů, kde je přihlášený (jako staff_member přes EventStaffAssignment).
     * Řazení: nejbližší nadcházející první, pak historie.
     *
     * @return array<int, array<string, mixed>>
     */
    public function listEventsForStaff(User $user, ?\DateTimeInterface $from = null, ?\DateTimeInterface $to = null): array
    {
        $staff = $user->getStaffMember();
        if ($staff === null) {
            return [];
        }

        $qb = $this->staffAssignRepo->createQueryBuilder('a')
            ->select('a', 'e')
            ->join('a.event', 'e')
            ->where('a.staffMemberId = :sid')
            ->setParameter('sid', $staff->getId())
            ->orderBy('e.eventDate', 'DESC')
            ->addOrderBy('e.eventTime', 'DESC');

        if ($from !== null) {
            $qb->andWhere('e.eventDate >= :from')->setParameter('from', $from);
        }
        if ($to !== null) {
            $qb->andWhere('e.eventDate <= :to')->setParameter('to', $to);
        }

        $assignments = $qb->getQuery()->getResult();

        return array_map(fn(EventStaffAssignment $a) => $this->serializeEventListItem($a->getEvent(), $a), $assignments);
    }

    /**
     * Detail eventu pro staff — obsah závisí na roli (tables pro waiter,
     * menu+porce pro cook). Oba vidí základní info + harmonogram.
     *
     * @throws \DomainException pokud staff k eventu není přiřazen
     */
    public function getEventDetailForStaff(User $user, int $eventId): array
    {
        $staff = $user->getStaffMember();
        if ($staff === null) {
            throw new \DomainException('Uživatel není napojený na žádného člena personálu.');
        }

        $event = $this->eventRepo->find($eventId);
        if (!$event) {
            throw new \DomainException('Event nenalezen.');
        }

        $myAssignment = $this->staffAssignRepo->findOneBy([
            'event' => $event,
            'staffMemberId' => $staff->getId(),
        ]);
        if ($myAssignment === null) {
            throw new \DomainException('Na tento event nejsi přiřazený.');
        }

        $permissions = $user->getEffectivePermissions();
        $data = $this->serializeEventDetail($event, $myAssignment);

        if (in_array('mobile_events.tables', $permissions, true)) {
            $data['tables'] = array_map(
                fn(EventTable $t) => $this->serializeTable($t),
                $event->getTables()->toArray()
            );
        }

        if (in_array('mobile_events.menu', $permissions, true)) {
            $data['menu'] = array_map(
                fn(EventMenu $m) => $this->serializeMenu($m),
                $event->getMenus()->toArray()
            );
            $data['beverages'] = array_map(
                fn(EventBeverage $b) => $this->serializeBeverage($b),
                $event->getBeverages()->toArray()
            );
        }

        return $data;
    }

    // ─── DOCHÁZKA ───────────────────────────────────────────────────────

    /**
     * Check-in na event: označí EventStaffAssignment jako PRESENT a
     * vytvoří StaffAttendance záznam s checkInTime.
     *
     * @throws \DomainException
     */
    public function checkIn(User $user, int $eventId, ?\DateTimeInterface $at = null): array
    {
        $staff = $user->getStaffMember();
        if ($staff === null) {
            throw new \DomainException('Uživatel není napojený na žádného člena personálu.');
        }

        $event = $this->eventRepo->find($eventId);
        if (!$event) {
            throw new \DomainException('Event nenalezen.');
        }

        $assignment = $this->staffAssignRepo->findOneBy([
            'event' => $event,
            'staffMemberId' => $staff->getId(),
        ]);
        if ($assignment === null) {
            throw new \DomainException('Na tento event nejsi přiřazený.');
        }

        $now = $at ?? new \DateTime();
        $assignment->setAttendanceStatus('PRESENT');
        $assignment->setAttendedAt($now);

        // Najdi otevřenou attendance (pokud byl check-in duplicitně) jinak vytvoř novou
        $existing = $this->findOpenAttendance($staff->getId(), $eventId);
        if ($existing === null) {
            $attendance = new StaffAttendance();
            $attendance->setStaffMember($staff);
            $attendance->setEventId($eventId);
            $attendance->setAttendanceDate(new \DateTime($now->format('Y-m-d')));
            $attendance->setCheckInTime($now);
            $this->em->persist($attendance);
        } else {
            $existing->setCheckInTime($now);
        }

        $this->em->flush();

        return [
            'status' => 'checked_in',
            'attendanceStatus' => 'PRESENT',
            'at' => $now->format('c'),
            'eventId' => $eventId,
        ];
    }

    /**
     * Check-out: najde otevřený StaffAttendance záznam tohoto usera pro
     * daný event, nastaví checkOutTime a dopočítá hoursWorked.
     *
     * @throws \DomainException
     */
    public function checkOut(User $user, int $eventId, ?\DateTimeInterface $at = null): array
    {
        $staff = $user->getStaffMember();
        if ($staff === null) {
            throw new \DomainException('Uživatel není napojený na žádného člena personálu.');
        }

        $attendance = $this->findOpenAttendance($staff->getId(), $eventId);
        if ($attendance === null) {
            throw new \DomainException('Žádný otevřený check-in pro tento event. Udělej nejdřív check-in.');
        }

        $now = $at ?? new \DateTime();
        $attendance->setCheckOutTime($now);

        $checkIn = $attendance->getCheckInTime();
        if ($checkIn) {
            $diffSeconds = $now->getTimestamp() - $checkIn->getTimestamp();
            $hours = round($diffSeconds / 3600, 2);
            $attendance->setHoursWorked(number_format(max($hours, 0), 2, '.', ''));
        }

        $this->em->flush();

        return [
            'status' => 'checked_out',
            'at' => $now->format('c'),
            'hoursWorked' => $attendance->getHoursWorked(),
            'eventId' => $eventId,
        ];
    }

    // ─── TRANSPORT PRO ŘIDIČE ───────────────────────────────────────────

    /**
     * Seznam EventTransport rows, kde je přihlášený jako driver.
     *
     * @return array<int, array<string, mixed>>
     */
    public function listTransportsForDriver(User $user, ?\DateTimeInterface $from = null): array
    {
        $driver = $user->getTransportDriver();
        if ($driver === null) {
            return [];
        }

        $qb = $this->eventTransportRepo->createQueryBuilder('t')
            ->select('t', 'e')
            ->join('t.event', 'e')
            ->where('t.driver = :d')
            ->setParameter('d', $driver)
            ->orderBy('e.eventDate', 'DESC')
            ->addOrderBy('t.scheduledTime', 'ASC');

        if ($from !== null) {
            $qb->andWhere('e.eventDate >= :from')->setParameter('from', $from);
        }

        $rows = $qb->getQuery()->getResult();
        return array_map(fn(EventTransport $t) => $this->serializeTransportForDriver($t), $rows);
    }

    /**
     * @throws \DomainException pokud transport neexistuje nebo není řidiče
     */
    public function getTransportDetailForDriver(User $user, int $eventTransportId): array
    {
        $et = $this->requireDriversTransport($user, $eventTransportId);
        return $this->serializeTransportForDriver($et, detailed: true);
    }

    /**
     * Aktualizuje `executionStatus` na transportu.
     *
     * @throws \InvalidArgumentException|\DomainException
     */
    public function updateTransportStatus(User $user, int $eventTransportId, string $status): array
    {
        $allowed = [
            EventTransport::EXECUTION_IN_PROGRESS,
            EventTransport::EXECUTION_DONE,
        ];
        if (!in_array($status, $allowed, true)) {
            throw new \InvalidArgumentException(
                sprintf('Neplatný stav "%s". Povolené: %s', $status, implode(', ', $allowed))
            );
        }

        $et = $this->requireDriversTransport($user, $eventTransportId);
        $et->setExecutionStatus($status);
        $this->em->flush();

        return $this->serializeTransportForDriver($et, detailed: true);
    }

    // ─── INTERNÍ — SERIALIZACE ─────────────────────────────────────────

    /**
     * Položka seznamu eventu pro staff (bez finančních dat).
     */
    private function serializeEventListItem(Event $e, EventStaffAssignment $a): array
    {
        return [
            'eventId' => $e->getId(),
            'name' => $e->getName(),
            'eventType' => $e->getEventType(),
            'date' => $e->getEventDate()->format('Y-m-d'),
            'startTime' => $e->getEventTime()->format('H:i'),
            'durationMinutes' => $e->getDurationMinutes(),
            'venue' => $e->getVenue(),
            'language' => $e->getLanguage(),
            'guestsTotal' => $e->getGuestsTotal(),
            'status' => $e->getStatus(),
            'myAssignmentId' => $a->getId(),
            'myAttendanceStatus' => $a->getAttendanceStatus(), // PENDING | PRESENT
            'myAttendedAt' => $a->getAttendedAt()?->format('c'),
        ];
    }

    /**
     * Detail eventu (bez finančních dat + bez faktur + bez kontaktů organizátora).
     */
    private function serializeEventDetail(Event $e, EventStaffAssignment $a): array
    {
        return [
            'eventId' => $e->getId(),
            'name' => $e->getName(),
            'eventType' => $e->getEventType(),
            'eventSubcategory' => $e->getEventSubcategory(),
            'date' => $e->getEventDate()->format('Y-m-d'),
            'startTime' => $e->getEventTime()->format('H:i'),
            'durationMinutes' => $e->getDurationMinutes(),
            'venue' => $e->getVenue(),
            'language' => $e->getLanguage(),
            'guestsTotal' => $e->getGuestsTotal(),
            'guestsPaid' => $e->getGuestsPaid(),
            'guestsFree' => $e->getGuestsFree(),
            'status' => $e->getStatus(),
            'notesStaff' => $e->getNotesStaff(),
            'schedule' => array_map(fn(EventSchedule $s) => $this->serializeSchedule($s), $e->getSchedules()->toArray()),
            'myAssignmentId' => $a->getId(),
            'myAttendanceStatus' => $a->getAttendanceStatus(),
            'myAttendedAt' => $a->getAttendedAt()?->format('c'),
        ];
    }

    private function serializeTable(EventTable $t): array
    {
        // Bez utraty/finančních detailů stolu
        return [
            'id' => $t->getId(),
            'name' => $t->getTableName(),
            'room' => $t->getRoom(),
            'capacity' => $t->getCapacity(),
            'positionX' => $t->getPositionX(),
            'positionY' => $t->getPositionY(),
        ];
    }

    private function serializeMenu(EventMenu $m): array
    {
        // Bez ceny — kuchař vidí počty porcí, ne výnos.
        return [
            'id' => $m->getId(),
            'menuName' => $m->getMenuName(),
            'quantity' => $m->getQuantity(),
            'servingTime' => $m->getServingTime()?->format('H:i'),
            'notes' => $m->getNotes(),
        ];
    }

    private function serializeBeverage(EventBeverage $b): array
    {
        return [
            'id' => $b->getId(),
            'name' => $b->getBeverageName(),
            'quantity' => $b->getQuantity(),
            'unit' => $b->getUnit(),
            'notes' => $b->getNotes(),
        ];
    }

    private function serializeSchedule(EventSchedule $s): array
    {
        return [
            'id' => $s->getId(),
            'time' => $s->getTimeSlot()->format('H:i'),
            'durationMinutes' => $s->getDurationMinutes(),
            'activity' => $s->getActivity(),
            'description' => $s->getDescription(),
            'notes' => $s->getNotes(),
        ];
    }

    /**
     * Řidič: vidí jen co potřebuje k jízdě (bez ceny ani faktury).
     */
    private function serializeTransportForDriver(EventTransport $t, bool $detailed = false): array
    {
        $event = $t->getEvent();
        $arr = [
            'id' => $t->getId(),
            'eventId' => $event?->getId(),
            'eventName' => $event?->getName(),
            'eventDate' => $event?->getEventDate()->format('Y-m-d'),
            'eventStartTime' => $event?->getEventTime()->format('H:i'),
            'venue' => $event?->getVenue(),
            'transportType' => $t->getTransportType(),
            'scheduledTime' => $t->getScheduledTime()?->format('H:i'),
            'pickupLocation' => $t->getPickupLocation(),
            'dropoffLocation' => $t->getDropoffLocation(),
            'passengerCount' => $t->getPassengerCount(),
            'notes' => $t->getNotes(),
            'executionStatus' => $t->getExecutionStatus(), // null | IN_PROGRESS | DONE
            'vehicle' => $t->getVehicle() ? [
                'id' => $t->getVehicle()->getId(),
                'licensePlate' => $t->getVehicle()->getLicensePlate(),
                'brand' => $t->getVehicle()->getBrand(),
                'model' => $t->getVehicle()->getModel(),
                'capacity' => $t->getVehicle()->getCapacity(),
            ] : null,
        ];
        if ($detailed) {
            $arr['organizerPhone'] = $event?->getOrganizerPhone();
            $arr['organizerPerson'] = $event?->getOrganizerPerson();
        }
        return $arr;
    }

    // ─── INTERNÍ — POMOCNÉ ─────────────────────────────────────────────

    private function findOpenAttendance(int $staffMemberId, int $eventId): ?StaffAttendance
    {
        return $this->attendanceRepo->createQueryBuilder('a')
            ->where('a.staffMember = :sid')
            ->andWhere('a.eventId = :eid')
            ->andWhere('a.checkOutTime IS NULL')
            ->setParameter('sid', $staffMemberId)
            ->setParameter('eid', $eventId)
            ->orderBy('a.checkInTime', 'DESC')
            ->setMaxResults(1)
            ->getQuery()
            ->getOneOrNullResult();
    }

    private function requireDriversTransport(User $user, int $eventTransportId): EventTransport
    {
        $driver = $user->getTransportDriver();
        if ($driver === null) {
            throw new \DomainException('Uživatel není napojený na řidiče.');
        }
        $et = $this->eventTransportRepo->find($eventTransportId);
        if (!$et) {
            throw new \DomainException('Transport nenalezen.');
        }
        if ($et->getDriver()?->getId() !== $driver->getId()) {
            throw new \DomainException('Tento transport není přiřazený tobě.');
        }
        return $et;
    }
}
