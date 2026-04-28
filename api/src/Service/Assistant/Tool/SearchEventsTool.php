<?php

declare(strict_types=1);

namespace App\Service\Assistant\Tool;

use App\Entity\Event;
use App\Repository\EventRepository;

final class SearchEventsTool implements ToolInterface
{
    public function __construct(private readonly EventRepository $repo) {}

    public function getName(): string { return 'search_events'; }

    public function getDescription(): string
    {
        return 'Vyhledá akce (eventy) podle názvu, typu, data, organizátora nebo statusu. Vrací seznam s odkazy na editaci a dashboard.';
    }

    public function getParametersSchema(): array
    {
        return [
            'type' => 'object',
            'properties' => [
                'query' => ['type' => 'string', 'description' => 'Hledaný výraz (název, organizátor).'],
                'dateFrom' => ['type' => 'string', 'description' => 'YYYY-MM-DD'],
                'dateTo' => ['type' => 'string', 'description' => 'YYYY-MM-DD'],
                'eventType' => ['type' => 'string', 'description' => 'Typ akce (folklore_show, wedding, event, private).'],
                'status' => ['type' => 'string', 'description' => 'DRAFT, PLANNED, CONFIRMED, IN_PROGRESS, COMPLETED, CANCELLED.'],
                'limit' => ['type' => 'integer'],
            ],
            'required' => [],
        ];
    }

    public function isReadOnly(): bool { return true; }
    public function getRequiredPermission(): ?string { return 'events.read'; }

    private const CZECH_MONTHS = [
        'leden' => 1, 'únor' => 2, 'březen' => 3, 'duben' => 4,
        'květen' => 5, 'červen' => 6, 'červenec' => 7, 'srpen' => 8,
        'září' => 9, 'říjen' => 10, 'listopad' => 11, 'prosinec' => 12,
    ];

    public function execute(array $params): array
    {
        $query = trim((string)($params['query'] ?? ''));
        $dateFrom = (string)($params['dateFrom'] ?? '');
        $dateTo = (string)($params['dateTo'] ?? '');
        $type = (string)($params['eventType'] ?? '');
        $status = strtoupper((string)($params['status'] ?? ''));
        $limit = max(1, min(25, (int)($params['limit'] ?? 10)));

        // Fallback: pokud query obsahuje český měsíc a nejsou zadány datumy,
        // převeď na datumový rozsah (aby „akce na červen" fungovalo).
        if ($dateFrom === '' && $dateTo === '' && $query !== '') {
            $lower = mb_strtolower($query);
            foreach (self::CZECH_MONTHS as $name => $num) {
                if (str_contains($lower, $name)) {
                    $year = (int)date('Y');
                    $dateFrom = sprintf('%04d-%02d-01', $year, $num);
                    $dateTo = date('Y-m-t', strtotime($dateFrom));
                    // Odstraň název měsíce z query, ať nefiltruje i text
                    $query = trim(str_ireplace($name, '', $query));
                    break;
                }
            }
        }

        $qb = $this->repo->createQueryBuilder('e')
            ->orderBy('e.eventDate', 'DESC')
            ->setMaxResults($limit);

        if ($query !== '') {
            $qb->andWhere('LOWER(e.name) LIKE :q OR LOWER(e.organizerPerson) LIKE :q OR LOWER(e.organizerCompany) LIKE :q OR LOWER(e.notesInternal) LIKE :q')
               ->setParameter('q', '%'.mb_strtolower($query).'%');
        }
        if ($dateFrom !== '') {
            try { $qb->andWhere('e.eventDate >= :df')->setParameter('df', new \DateTime($dateFrom)); } catch (\Throwable) {}
        }
        if ($dateTo !== '') {
            try { $qb->andWhere('e.eventDate <= :dt')->setParameter('dt', new \DateTime($dateTo)); } catch (\Throwable) {}
        }
        if ($type !== '') {
            $qb->andWhere('e.eventType = :t')->setParameter('t', $type);
        }
        if ($status !== '') {
            $qb->andWhere('e.status = :st')->setParameter('st', $status);
        }

        /** @var list<Event> $rows */
        $rows = $qb->getQuery()->getResult();

        $items = array_map(function (Event $e) {
            $d = $e->getEventDate()->format('Y-m-d');
            return [
                'id' => $e->getId(),
                'name' => $e->getName(),
                'date' => $d,
                'type' => $e->getEventType(),
                'status' => $e->getStatus(),
                'guestsTotal' => $e->getGuestsTotal(),
                'organizer' => $e->getOrganizerPerson(),
                'editLink' => '/events/'.$e->getId().'/edit',
                'dashboardLink' => '/events/'.$e->getId().'/dashboard',
                'waiterLink' => '/events/'.$e->getId().'/waiter',
                'label' => $e->getName().' — '.$d,
            ];
        }, $rows);

        return ['count' => count($items), 'items' => $items];
    }

    public function buildPreview(array $params): ?string { return null; }
}
