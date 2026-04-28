<?php

declare(strict_types=1);

namespace App\Service\Assistant\Tool;

use App\Entity\Event;
use App\Service\Assistant\SmartSeatingService;
use Doctrine\ORM\EntityManagerInterface;

/**
 * AI-powered auto-seating: analyses past events and generates optimal plan.
 *
 * Strategies:
 *  - smart (default): uses historical nationality→room mapping + reservation groups
 *  - group_by_reservation: keep reservation groups at same table
 *  - group_by_nationality: cluster by nationality
 *  - mixed: round-robin across tables
 *
 * Always requires user confirmation (isReadOnly = false).
 */
final class AutoSeatGuestsTool implements ToolInterface
{
    public function __construct(
        private readonly EntityManagerInterface $em,
        private readonly SmartSeatingService $smart,
    ) {}

    public function getName(): string { return 'auto_seat_guests'; }

    public function getDescription(): string
    {
        return 'Automaticky rozsadí hosty akce ke stolům. Strategie: '
            .'"smart" (výchozí) = analyzuje podobné minulé akce a použije osvědčené rozsazení; '
            .'"group_by_reservation" = skupiny z jedné rezervace drží pohromadě; '
            .'"group_by_nationality" = seskupí dle národnosti; '
            .'"mixed" = rovnoměrně namíchá. '
            .'Vrací plán, uživatel musí potvrdit kliknutím na Potvrdit.';
    }

    public function getParametersSchema(): array
    {
        return [
            'type' => 'object',
            'properties' => [
                'eventId' => ['type' => 'integer', 'description' => 'ID akce.'],
                'strategy' => [
                    'type' => 'string',
                    'description' => 'smart (výchozí), group_by_reservation, group_by_nationality, mixed.',
                    'enum' => ['smart', 'group_by_reservation', 'group_by_nationality', 'mixed'],
                ],
            ],
            'required' => ['eventId'],
        ];
    }

    public function isReadOnly(): bool { return false; }
    public function getRequiredPermission(): ?string { return 'events.update'; }

    public function execute(array $params): array
    {
        $eventId = (int)($params['eventId'] ?? 0);
        $strategy = (string)($params['strategy'] ?? 'smart');

        /** @var Event|null $event */
        $event = $this->em->getRepository(Event::class)->find($eventId);
        if (!$event) {
            throw new \InvalidArgumentException('Akce nenalezena: #'.$eventId);
        }

        $plan = $this->smart->planSmart($event, $strategy);
        $assignments = array_map(
            fn($a) => ['guestId' => $a['guestId'], 'tableId' => $a['tableId']],
            $plan['assignments']
        );
        $applied = $this->smart->apply($event, $assignments);

        return [
            'eventId' => $eventId,
            'applied' => $applied,
            'summary' => $plan['summary'],
            'historyUsed' => $plan['historyUsed'],
            'unassignedCount' => count($plan['unassigned']),
            'link' => '/events/'.$eventId.'/dashboard',
            'message' => sprintf(
                'Rozsazeno %d hostů%s, nerozsazeno %d.%s',
                $applied,
                $plan['historyUsed'] ? ' (dle historického vzoru)' : '',
                count($plan['unassigned']),
                $plan['historyUsed'] ? ' Vzor čerpán z podobných minulých akcí.' : ''
            ),
        ];
    }

    public function buildPreview(array $params): ?string
    {
        $eventId = (int)($params['eventId'] ?? 0);
        $strategy = (string)($params['strategy'] ?? 'smart');

        /** @var Event|null $event */
        $event = $this->em->getRepository(Event::class)->find($eventId);
        if (!$event) return 'Rozsadit hosty: akce #'.$eventId.' neexistuje';

        $plan = $this->smart->planSmart($event, $strategy);
        $s = $plan['summary'];
        $strategyLabel = [
            'smart' => 'chytře (dle historie)',
            'group_by_reservation' => 'po skupinách (rezervacích)',
            'group_by_nationality' => 'po národnostech',
            'mixed' => 'rovnoměrně mixem',
        ][$strategy] ?? $strategy;

        return sprintf(
            'Rozsadit hosty akce „%s" %s: %d/%d hostů na %d stolů (kapacita %d)%s%s',
            $event->getName(),
            $strategyLabel,
            $s['seated'] ?? 0,
            ($s['seated'] ?? 0) + ($s['unassigned'] ?? 0),
            $s['tables'] ?? 0,
            $s['capacity'] ?? 0,
            ($s['unassigned'] ?? 0) > 0 ? ", pozor: {$s['unassigned']} nezasedne" : '',
            $plan['historyUsed'] ? ' [historický vzor]' : ''
        );
    }
}
