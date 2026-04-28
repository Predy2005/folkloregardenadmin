<?php

declare(strict_types=1);

namespace App\Service\Assistant\Tool;

use App\Entity\Event;
use App\Entity\EventGuest;
use App\Repository\EventRepository;
use Doctrine\ORM\EntityManagerInterface;

/**
 * Analyzes historical similar events to suggest parameters for a new event
 * (typical duration, menu mix, staffing, typical nationality distribution, etc.).
 *
 * Read-only: returns suggestions only; never creates an event itself.
 */
final class SuggestNextEventTool implements ToolInterface
{
    public function __construct(
        private readonly EntityManagerInterface $em,
        private readonly EventRepository $events,
    ) {}

    public function getName(): string { return 'suggest_next_event'; }

    public function getDescription(): string
    {
        return 'Analyzuje podobné akce v historii a vrátí doporučení pro novou akci — typické trvání, rozložení národností, průměrnou obsazenost, doporučený personál. Použij když uživatel chce naplánovat podobnou akci nebo potřebuje odhad kapacit.';
    }

    public function getParametersSchema(): array
    {
        return [
            'type' => 'object',
            'properties' => [
                'basedOnEventId' => ['type' => 'integer', 'description' => 'ID akce, kterou vzít jako vzor.'],
                'eventType' => ['type' => 'string', 'description' => 'Alternativa: typ akce (folklore_show, wedding, event, private).'],
                'expectedGuests' => ['type' => 'integer', 'description' => 'Očekávaný počet hostů (nepovinné).'],
            ],
            'required' => [],
        ];
    }

    public function isReadOnly(): bool { return true; }
    public function getRequiredPermission(): ?string { return 'events.read'; }

    public function execute(array $params): array
    {
        $baseId = (int)($params['basedOnEventId'] ?? 0);
        $type = (string)($params['eventType'] ?? '');
        $expected = (int)($params['expectedGuests'] ?? 0);

        /** @var Event|null $base */
        $base = $baseId > 0 ? $this->em->getRepository(Event::class)->find($baseId) : null;
        if ($base) {
            $type = $type ?: $base->getEventType();
            $expected = $expected ?: $base->getGuestsTotal();
        }
        if ($type === '') {
            return ['error' => 'Specifikuj typ akce nebo ID vzorové akce.'];
        }

        $qb = $this->events->createQueryBuilder('e')
            ->andWhere('e.eventType = :t')->setParameter('t', $type)
            ->andWhere('e.status IN (:ok)')->setParameter('ok', ['COMPLETED', 'CONFIRMED', 'IN_PROGRESS'])
            ->orderBy('e.eventDate', 'DESC')
            ->setMaxResults(30);

        if ($expected > 0) {
            $min = (int)round($expected * 0.7);
            $max = (int)round($expected * 1.3);
            $qb->andWhere('e.guestsTotal BETWEEN :gmin AND :gmax')
               ->setParameter('gmin', $min)
               ->setParameter('gmax', $max);
        }

        /** @var list<Event> $similar */
        $similar = $qb->getQuery()->getResult();

        if (empty($similar)) {
            return [
                'similarCount' => 0,
                'message' => 'Žádné podobné akce v historii.',
            ];
        }

        $durations = [];
        $guestCounts = [];
        $nationalityTotals = [];
        $guestsPerSample = [];

        foreach ($similar as $ev) {
            $durations[] = $ev->getDurationMinutes();
            $guestCounts[] = $ev->getGuestsTotal();

            $guests = $this->em->getRepository(EventGuest::class)->findBy(['event' => $ev]);
            $guestsPerSample[] = count($guests);
            foreach ($guests as $g) {
                $key = $g->getNationality() ?: 'UNKNOWN';
                $nationalityTotals[$key] = ($nationalityTotals[$key] ?? 0) + 1;
            }
        }

        $totalGuests = array_sum($nationalityTotals) ?: 1;
        $natPct = [];
        foreach ($nationalityTotals as $k => $v) {
            $natPct[$k] = round(($v / $totalGuests) * 100, 1);
        }
        arsort($natPct);

        $avgGuests = (int)round(array_sum($guestCounts) / count($guestCounts));
        $avgDuration = (int)round(array_sum($durations) / count($durations));
        $suggestedGuests = $expected > 0 ? $expected : $avgGuests;
        $suggestedStaff = max(2, (int)ceil($suggestedGuests / 15));

        return [
            'similarCount' => count($similar),
            'avgGuests' => $avgGuests,
            'avgDurationMinutes' => $avgDuration,
            'nationalityDistributionPct' => $natPct,
            'suggestedGuests' => $suggestedGuests,
            'suggestedStaffCount' => $suggestedStaff,
            'recentExamples' => array_map(fn(Event $e) => [
                'id' => $e->getId(),
                'name' => $e->getName(),
                'date' => $e->getEventDate()->format('Y-m-d'),
                'guests' => $e->getGuestsTotal(),
                'link' => '/events/'.$e->getId().'/edit',
            ], array_slice($similar, 0, 5)),
            'message' => sprintf('Analyzováno %d podobných akcí. Doporučuji plánovat ~%d hostů, %d min., ~%d personálu.', count($similar), $suggestedGuests, $avgDuration, $suggestedStaff),
        ];
    }

    public function buildPreview(array $params): ?string { return null; }
}
