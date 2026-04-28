<?php

declare(strict_types=1);

namespace App\Service\Assistant\Tool;

use App\Entity\Event;
use App\Service\Assistant\SmartSeatingService;
use Doctrine\ORM\EntityManagerInterface;

/**
 * Read-only: analyses similar historical events and returns comprehensive
 * recommendations for the current event setup (seating patterns, templates,
 * spaces, staffing, nationality distribution, etc.).
 */
final class AnalyseEventSetupTool implements ToolInterface
{
    public function __construct(
        private readonly EntityManagerInterface $em,
        private readonly SmartSeatingService $smart,
    ) {}

    public function getName(): string { return 'analyse_event_setup'; }

    public function getDescription(): string
    {
        return 'Analyzuje podobné historické akce a vrátí doporučení pro aktuální event: '
            .'nejlepší rozsazení, doporučená šablona floor planu, používané prostory, '
            .'poměr personálu, rozložení národností. Použij pokud uživatel chce '
            .'naplánovat akci, nebo se ptá „jak to bylo minule", „jaké rozsazení použít", '
            .'„kde hosté seděli" apod.';
    }

    public function getParametersSchema(): array
    {
        return [
            'type' => 'object',
            'properties' => [
                'eventId' => ['type' => 'integer', 'description' => 'ID akce, pro kterou analyzovat historii.'],
            ],
            'required' => ['eventId'],
        ];
    }

    public function isReadOnly(): bool { return true; }
    public function getRequiredPermission(): ?string { return 'events.read'; }

    public function execute(array $params): array
    {
        $eventId = (int)($params['eventId'] ?? 0);
        /** @var Event|null $event */
        $event = $this->em->getRepository(Event::class)->find($eventId);
        if (!$event) {
            throw new \InvalidArgumentException('Akce nenalezena: #'.$eventId);
        }

        $analysis = $this->smart->analyseHistory($event);

        // Flatten nationalityRoomMap for LLM readability
        $natRoomText = [];
        foreach ($analysis['nationalityRoomMap'] as $nat => $rooms) {
            arsort($rooms);
            $pairs = [];
            foreach ($rooms as $room => $count) {
                $pairs[] = "$room ($count×)";
            }
            $natRoomText[] = "$nat → ".implode(', ', $pairs);
        }

        // Staffing recommendations based on current guest count
        $guestsTotal = $event->getGuestsTotal();
        $staffSuggestions = [];
        foreach ($analysis['staffingPattern'] as $cat => $ratio) {
            $staffSuggestions[$cat] = max(1, (int)round($ratio * $guestsTotal));
        }

        return [
            'eventId' => $eventId,
            'eventName' => $event->getName(),
            'eventType' => $event->getEventType(),
            'guestsTotal' => $guestsTotal,
            'similarEventsCount' => count($analysis['similarEvents']),
            'similarEvents' => array_slice($analysis['similarEvents'], 0, 5),
            'nationalityPreferences' => $natRoomText,
            'templateSuggestion' => $analysis['templateSuggestion'],
            'avgTableCapacity' => $analysis['avgTableCapacity'],
            'recommendedSpaces' => $analysis['spacesUsed'],
            'staffingSuggestions' => $staffSuggestions,
            'summary' => $analysis['summary'],
            'editLink' => '/events/'.$eventId.'/edit',
            'dashboardLink' => '/events/'.$eventId.'/dashboard',
        ];
    }

    public function buildPreview(array $params): ?string { return null; }
}
