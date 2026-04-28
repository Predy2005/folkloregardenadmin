<?php

declare(strict_types=1);

namespace App\Service\Assistant;

use App\Entity\Event;
use App\Entity\EventGuest;
use App\Entity\EventSpace;
use App\Entity\EventTable;
use App\Entity\FloorPlanTemplate;
use App\Entity\Room;
use App\Repository\EventRepository;
use Doctrine\ORM\EntityManagerInterface;

/**
 * Smart seating engine: analyses past similar events and generates
 * optimised seating plan + event-setup recommendations for the AI assistant.
 *
 * Strategies:
 *  - "smart" (default): find similar events, replicate their seating patterns
 *  - "group_by_reservation": keep reservation groups together
 *  - "group_by_nationality": cluster by nationality (existing logic)
 *  - "mixed": round-robin across tables
 */
final class SmartSeatingService
{
    public function __construct(
        private readonly EntityManagerInterface $em,
        private readonly EventRepository $eventRepo,
    ) {}

    // ──────────────────────────── ANALYSIS ─────────────────────────────

    /**
     * Find similar completed events and extract their seating/setup patterns.
     *
     * @return array{
     *   similarEvents: list<array<string,mixed>>,
     *   nationalityRoomMap: array<string, array<string,int>>,
     *   templateSuggestion: ?array{id:int, name:string, room:?string},
     *   avgTableCapacity: float,
     *   spacesUsed: list<string>,
     *   staffingPattern: array<string,float>,
     *   summary: string
     * }
     */
    public function analyseHistory(Event $event): array
    {
        $type = $event->getEventType();
        $total = $event->getGuestsTotal();
        $min = (int)round($total * 0.6);
        $max = (int)round($total * 1.4);

        $qb = $this->eventRepo->createQueryBuilder('e')
            ->andWhere('e.eventType = :t')->setParameter('t', $type)
            ->andWhere('e.status IN (:ok)')->setParameter('ok', ['COMPLETED', 'CONFIRMED', 'IN_PROGRESS'])
            ->andWhere('e.id != :cur')->setParameter('cur', $event->getId())
            ->orderBy('e.eventDate', 'DESC')
            ->setMaxResults(20);

        if ($total > 0) {
            $qb->andWhere('e.guestsTotal BETWEEN :gmin AND :gmax')
               ->setParameter('gmin', $min)->setParameter('gmax', $max);
        }

        /** @var list<Event> $similar */
        $similar = $qb->getQuery()->getResult();

        if (empty($similar)) {
            return [
                'similarEvents' => [],
                'nationalityRoomMap' => [],
                'templateSuggestion' => null,
                'avgTableCapacity' => 0,
                'spacesUsed' => [],
                'staffingPattern' => [],
                'summary' => 'Žádné podobné akce v historii.',
            ];
        }

        $natRoomMap = [];    // nationality → [room => count]
        $tableCaps = [];
        $spaceSets = [];
        $staffCategories = [];
        $templateCounts = []; // template-name → count used
        $eventSummaries = [];

        foreach ($similar as $ev) {
            /** @var list<EventGuest> $guests */
            $guests = $this->em->getRepository(EventGuest::class)->findBy(['event' => $ev]);
            /** @var list<EventTable> $tables */
            $tables = $this->em->getRepository(EventTable::class)->findBy(['event' => $ev]);
            /** @var list<EventSpace> $spaces */
            $spaces = $this->em->getRepository(EventSpace::class)->findBy(['event' => $ev]);

            // Nationality → room mapping
            foreach ($guests as $g) {
                $nat = $g->getNationality() ?: 'UNKNOWN';
                $table = $g->getEventTable();
                $room = $table
                    ? ($table->getRoomEntity()?->getName() ?? $table->getRoom())
                    : ($g->getSpace() ?? 'unassigned');
                $natRoomMap[$nat][$room] = ($natRoomMap[$nat][$room] ?? 0) + 1;
            }

            // Table capacities
            foreach ($tables as $t) {
                $tableCaps[] = $t->getCapacity();
            }

            // Spaces used
            foreach ($spaces as $sp) {
                $name = $sp->getRoomEntity()?->getName() ?? $sp->getSpaceName();
                $spaceSets[$name] = ($spaceSets[$name] ?? 0) + 1;
            }

            // Staff requirement pattern
            $staffReqs = $this->em->getRepository(\App\Entity\EventStaffRequirement::class)->findBy(['event' => $ev]);
            foreach ($staffReqs as $sr) {
                $cat = $sr->getCategory();
                $cnt = $sr->getRequiredCount();
                if ($cnt > 0) {
                    $staffCategories[$cat][] = $cnt / max(1, $ev->getGuestsTotal());
                }
            }

            // Count which templates were used (check if tables match a template)
            // Simple heuristic: count tables with roomEntity to guess template usage
            $roomName = null;
            if (!empty($tables) && $tables[0]->getRoomEntity()) {
                $roomName = $tables[0]->getRoomEntity()->getName();
            }

            $seatedCount = 0;
            $nationalityBreakdown = [];
            foreach ($guests as $g) {
                if ($g->getEventTable()) $seatedCount++;
                $nat = $g->getNationality() ?: 'UNKNOWN';
                $nationalityBreakdown[$nat] = ($nationalityBreakdown[$nat] ?? 0) + 1;
            }

            $eventSummaries[] = [
                'id' => $ev->getId(),
                'name' => $ev->getName(),
                'date' => $ev->getEventDate()->format('Y-m-d'),
                'guestsTotal' => $ev->getGuestsTotal(),
                'tablesCount' => count($tables),
                'seatedCount' => $seatedCount,
                'nationalityBreakdown' => $nationalityBreakdown,
                'spacesUsed' => array_map(fn($s) => $s->getRoomEntity()?->getName() ?? $s->getSpaceName(), $spaces),
                'link' => '/events/'.$ev->getId().'/edit',
                'dashboardLink' => '/events/'.$ev->getId().'/dashboard',
            ];
        }

        // Find best template: match room used most often
        $bestTemplate = null;
        arsort($spaceSets);
        $mostUsedRoom = array_key_first($spaceSets);
        if ($mostUsedRoom) {
            $tpl = $this->em->getRepository(FloorPlanTemplate::class)
                ->createQueryBuilder('t')
                ->leftJoin('t.room', 'r')
                ->andWhere('r.name = :rn OR r.slug = :rn')
                ->setParameter('rn', $mostUsedRoom)
                ->orderBy('t.updatedAt', 'DESC')
                ->setMaxResults(1)
                ->getQuery()->getOneOrNullResult();
            if ($tpl instanceof FloorPlanTemplate) {
                $bestTemplate = [
                    'id' => $tpl->getId(),
                    'name' => $tpl->getName(),
                    'room' => $tpl->getRoom()?->getName(),
                ];
            }
        }

        $avgCap = !empty($tableCaps) ? round(array_sum($tableCaps) / count($tableCaps), 1) : 0;

        $staffPattern = [];
        foreach ($staffCategories as $cat => $ratios) {
            $staffPattern[$cat] = round(array_sum($ratios) / count($ratios), 3);
        }

        $spaces = array_keys($spaceSets);

        $summary = sprintf(
            'Analyzováno %d podobných akcí (typ: %s, rozsah %d-%d hostů). '
            .'Průměrná kapacita stolu: %.0f. Nejčastější prostory: %s. '
            .'%s',
            count($similar),
            $type,
            $min, $max,
            $avgCap,
            implode(', ', array_slice($spaces, 0, 3)) ?: '?',
            $bestTemplate ? 'Doporučená šablona: "'.$bestTemplate['name'].'". ' : ''
        );

        return [
            'similarEvents' => $eventSummaries,
            'nationalityRoomMap' => $natRoomMap,
            'templateSuggestion' => $bestTemplate,
            'avgTableCapacity' => $avgCap,
            'spacesUsed' => $spaces,
            'staffingPattern' => $staffPattern,
            'summary' => $summary,
        ];
    }

    // ──────────────────────────── SMART SEATING PLAN ──────────────────

    /**
     * Generate a smart seating plan based on historical patterns.
     *
     * @return array{
     *   assignments: list<array{guestId:int, guestName:string, tableId:int, tableName:string, room:?string}>,
     *   unassigned: list<array{guestId:int, guestName:string, reason:string}>,
     *   summary: array<string,mixed>,
     *   historyUsed: bool
     * }
     */
    public function planSmart(Event $event, string $strategy = 'smart'): array
    {
        /** @var list<EventTable> $tables */
        $tables = $this->em->getRepository(EventTable::class)->findBy(['event' => $event]);
        /** @var list<EventGuest> $guests */
        $guests = $this->em->getRepository(EventGuest::class)->findBy(['event' => $event]);

        $tables = array_values(array_filter($tables, fn(EventTable $t) => $t->getCapacity() > 0));
        usort($tables, fn(EventTable $a, EventTable $b) => $b->getCapacity() <=> $a->getCapacity());

        if (empty($tables)) {
            return [
                'assignments' => [],
                'unassigned' => array_map(fn($g) => [
                    'guestId' => (int)$g->getId(),
                    'guestName' => self::gName($g),
                    'reason' => 'Žádné stoly — nejdřív vytvoř floor plan nebo aplikuj šablonu.',
                ], $guests),
                'summary' => ['tables' => 0, 'seated' => 0, 'unassigned' => count($guests)],
                'historyUsed' => false,
            ];
        }

        // Separate locked guests (already seated at locked tables)
        $remaining = [];
        foreach ($tables as $t) {
            $remaining[$t->getId()] = $t->getCapacity();
        }
        $preAssigned = [];
        foreach ($guests as $g) {
            $t = $g->getEventTable();
            if ($t && method_exists($t, 'getIsLocked') && $t->getIsLocked()) {
                $remaining[$t->getId()] = max(0, ($remaining[$t->getId()] ?? 0) - 1);
                $preAssigned[$g->getId()] = $t;
            }
        }
        $movable = array_values(array_filter($guests, fn($g) => !isset($preAssigned[$g->getId()])));

        $historyUsed = false;
        if ($strategy === 'smart') {
            $analysis = $this->analyseHistory($event);
            if (!empty($analysis['nationalityRoomMap'])) {
                $historyUsed = true;
                return $this->applySmartStrategy($movable, $tables, $remaining, $preAssigned, $analysis, $guests);
            }
            // Fallback to group_by_reservation if no history
            $strategy = 'group_by_reservation';
        }

        $groups = $this->groupGuests($movable, $strategy);
        return $this->greedyAssign($groups, $tables, $remaining, $preAssigned, $guests, $historyUsed);
    }

    /**
     * Apply seating plan to DB.
     * @param list<array{guestId:int, tableId:int}> $assignments
     */
    public function apply(Event $event, array $assignments): int
    {
        $guestRepo = $this->em->getRepository(EventGuest::class);
        $tableRepo = $this->em->getRepository(EventTable::class);
        $count = 0;
        foreach ($assignments as $a) {
            $g = $guestRepo->find((int)$a['guestId']);
            $t = $tableRepo->find((int)$a['tableId']);
            if (!$g || !$t) continue;
            if ($g->getEvent()?->getId() !== $event->getId()) continue;
            if ($t->getEvent()?->getId() !== $event->getId()) continue;
            $g->setEventTable($t);
            $count++;
        }
        $this->em->flush();
        return $count;
    }

    // ──────────────────────────── PRIVATE ──────────────────────────────

    /**
     * Smart strategy: use historical nationality→room mapping to place
     * guests into rooms/tables that previously hosted the same nationalities.
     */
    private function applySmartStrategy(
        array $movable,
        array $tables,
        array $remaining,
        array $preAssigned,
        array $analysis,
        array $allGuests,
    ): array {
        $natRoomMap = $analysis['nationalityRoomMap'];

        // Build: nationality → preferred room name (highest count)
        $natPreferred = [];
        foreach ($natRoomMap as $nat => $rooms) {
            arsort($rooms);
            $natPreferred[$nat] = array_key_first($rooms);
        }

        // Group movable guests by nationality
        $byNat = [];
        foreach ($movable as $g) {
            $nat = $g->getNationality() ?: 'UNKNOWN';
            $byNat[$nat][] = $g;
        }
        // Sort groups by size desc
        uasort($byNat, fn($a, $b) => count($b) <=> count($a));

        // Index tables by room
        $tablesByRoom = [];
        foreach ($tables as $t) {
            $room = $t->getRoomEntity()?->getName() ?? $t->getRoom();
            $tablesByRoom[$room][] = $t;
        }

        $assignments = $preAssigned; // guestId → EventTable
        $unassigned = [];

        foreach ($byNat as $nat => $natGuests) {
            $preferredRoom = $natPreferred[$nat] ?? null;

            // Sort guests: keep reservation groups together within nationality
            $resvGroups = [];
            foreach ($natGuests as $g) {
                $key = $g->getReservation()?->getId() ?? ('s-'.$g->getId());
                $resvGroups[$key][] = $g;
            }
            uasort($resvGroups, fn($a, $b) => count($b) <=> count($a));

            foreach ($resvGroups as $group) {
                $seated = false;

                // 1st try: preferred room based on history
                if ($preferredRoom && isset($tablesByRoom[$preferredRoom])) {
                    $seated = $this->seatGroupAtTables($group, $tablesByRoom[$preferredRoom], $remaining, $assignments);
                }

                // 2nd try: any table with space
                if (!$seated) {
                    $seated = $this->seatGroupAtTables($group, $tables, $remaining, $assignments);
                }

                if (!$seated) {
                    foreach ($group as $g) {
                        $unassigned[] = [
                            'guestId' => (int)$g->getId(),
                            'guestName' => self::gName($g),
                            'reason' => 'Všechny stoly plné.',
                        ];
                    }
                }
            }
        }

        $out = [];
        foreach ($assignments as $guestId => $table) {
            $g = $this->findGuest($allGuests, (int)$guestId);
            if (!$g) continue;
            $out[] = [
                'guestId' => (int)$g->getId(),
                'guestName' => self::gName($g),
                'tableId' => (int)$table->getId(),
                'tableName' => $table->getTableName(),
                'room' => $table->getRoomEntity()?->getName() ?? $table->getRoom(),
            ];
        }

        $totalCap = array_sum(array_map(fn($t) => $t->getCapacity(), $tables));
        return [
            'assignments' => $out,
            'unassigned' => $unassigned,
            'summary' => [
                'tables' => count($tables),
                'capacity' => $totalCap,
                'seated' => count($out),
                'unassigned' => count($unassigned),
                'strategy' => 'smart (historická analýza)',
            ],
            'historyUsed' => true,
        ];
    }

    /**
     * Try seating a group at given set of tables. Returns true if fully seated.
     * @param list<EventGuest> $group
     * @param list<EventTable> $tables
     * @param array<int,int> $remaining
     * @param array<int,EventTable> $assignments
     */
    private function seatGroupAtTables(array $group, array $tables, array &$remaining, array &$assignments): bool
    {
        // Find tables with enough collective capacity
        $need = count($group);
        $available = [];
        foreach ($tables as $t) {
            $cap = $remaining[$t->getId()] ?? 0;
            if ($cap > 0) $available[] = $t;
        }
        if (empty($available)) return false;

        // Check total available capacity
        $totalAvail = 0;
        foreach ($available as $t) $totalAvail += $remaining[$t->getId()] ?? 0;
        if ($totalAvail < $need) return false;

        // Assign: prefer single table if group fits, else split across tables
        $idx = 0;
        foreach ($available as $t) {
            $cap = $remaining[$t->getId()] ?? 0;
            if ($cap <= 0) continue;
            $take = min($cap, $need - $idx);
            for ($i = 0; $i < $take && $idx < $need; $i++, $idx++) {
                $g = $group[$idx];
                $assignments[$g->getId()] = $t;
                $remaining[$t->getId()]--;
            }
            if ($idx >= $need) break;
        }
        return $idx >= $need;
    }

    private function greedyAssign(array $groups, array $tables, array $remaining, array $preAssigned, array $allGuests, bool $historyUsed): array
    {
        $assignments = $preAssigned;
        $unassigned = [];

        foreach ($groups as $group) {
            if (!$this->seatGroupAtTables($group, $tables, $remaining, $assignments)) {
                foreach ($group as $g) {
                    if (!isset($assignments[$g->getId()])) {
                        $unassigned[] = [
                            'guestId' => (int)$g->getId(),
                            'guestName' => self::gName($g),
                            'reason' => 'Stoly plné.',
                        ];
                    }
                }
            }
        }

        $out = [];
        foreach ($assignments as $guestId => $table) {
            $g = $this->findGuest($allGuests, (int)$guestId);
            if (!$g) continue;
            $out[] = [
                'guestId' => (int)$g->getId(),
                'guestName' => self::gName($g),
                'tableId' => (int)$table->getId(),
                'tableName' => $table->getTableName(),
                'room' => $table->getRoomEntity()?->getName() ?? $table->getRoom(),
            ];
        }

        $totalCap = array_sum(array_map(fn($t) => $t->getCapacity(), $tables));
        return [
            'assignments' => $out,
            'unassigned' => $unassigned,
            'summary' => [
                'tables' => count($tables),
                'capacity' => $totalCap,
                'seated' => count($out),
                'unassigned' => count($unassigned),
            ],
            'historyUsed' => $historyUsed,
        ];
    }

    /** @param iterable<EventGuest> $guests @return list<list<EventGuest>> */
    private function groupGuests(iterable $guests, string $strategy): array
    {
        $groups = [];
        if ($strategy === 'group_by_nationality') {
            foreach ($guests as $g) {
                $groups[$g->getNationality() ?: 'UNKNOWN'][] = $g;
            }
        } elseif ($strategy === 'mixed') {
            $all = [];
            foreach ($guests as $g) $all[] = $g;
            $groups['all'] = $all;
        } else {
            foreach ($guests as $g) {
                $key = $g->getReservation()?->getId() ?? ('solo-'.$g->getId());
                $groups[$key][] = $g;
            }
        }
        uasort($groups, fn($a, $b) => count($b) <=> count($a));
        return array_values($groups);
    }

    /** @param list<EventGuest> $list */
    private function findGuest(array $list, int $id): ?EventGuest
    {
        foreach ($list as $g) if ($g->getId() === $id) return $g;
        return null;
    }

    private static function gName(EventGuest $g): string
    {
        $n = trim(($g->getFirstName() ?? '').' '.($g->getLastName() ?? ''));
        return $n !== '' ? $n : 'Host #'.$g->getId();
    }
}
