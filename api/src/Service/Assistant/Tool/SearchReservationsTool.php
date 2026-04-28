<?php

declare(strict_types=1);

namespace App\Service\Assistant\Tool;

use App\Entity\Reservation;
use App\Repository\ReservationRepository;

final class SearchReservationsTool implements ToolInterface
{
    public function __construct(private readonly ReservationRepository $repo) {}

    public function getName(): string { return 'search_reservations'; }

    public function getDescription(): string
    {
        return 'Vyhledá rezervace podle jména, emailu, telefonu, data nebo statusu. Vrací až 10 výsledků s odkazy.';
    }

    public function getParametersSchema(): array
    {
        return [
            'type' => 'object',
            'properties' => [
                'query' => ['type' => 'string', 'description' => 'Hledaný výraz (jméno, email, telefon, firma).'],
                'dateFrom' => ['type' => 'string', 'description' => 'Datum od (YYYY-MM-DD).'],
                'dateTo' => ['type' => 'string', 'description' => 'Datum do (YYYY-MM-DD).'],
                'status' => ['type' => 'string', 'description' => 'Status: RECEIVED, WAITING_PAYMENT, PAID, CONFIRMED, CANCELLED.'],
                'limit' => ['type' => 'integer', 'description' => 'Max počet výsledků (výchozí 10).'],
            ],
            'required' => [],
        ];
    }

    public function isReadOnly(): bool { return true; }
    public function getRequiredPermission(): ?string { return 'reservations.read'; }

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
        $status = strtoupper((string)($params['status'] ?? ''));
        $limit = max(1, min(25, (int)($params['limit'] ?? 10)));

        // Fallback: český měsíc v query → datumový rozsah
        if ($dateFrom === '' && $dateTo === '' && $query !== '') {
            $lower = mb_strtolower($query);
            foreach (self::CZECH_MONTHS as $name => $num) {
                if (str_contains($lower, $name)) {
                    $year = (int)date('Y');
                    $dateFrom = sprintf('%04d-%02d-01', $year, $num);
                    $dateTo = date('Y-m-t', strtotime($dateFrom));
                    $query = trim(str_ireplace($name, '', $query));
                    break;
                }
            }
        }

        $qb = $this->repo->createQueryBuilder('r')
            ->orderBy('r.date', 'DESC')
            ->setMaxResults($limit);

        if ($query !== '') {
            $qb->andWhere('LOWER(r.contactName) LIKE :q OR LOWER(r.contactEmail) LIKE :q OR r.contactPhone LIKE :qraw OR LOWER(r.invoiceCompany) LIKE :q OR LOWER(r.contactNote) LIKE :q')
               ->setParameter('q', '%'.mb_strtolower($query).'%')
               ->setParameter('qraw', '%'.$query.'%');
        }
        if ($dateFrom !== '') {
            try { $qb->andWhere('r.date >= :df')->setParameter('df', new \DateTime($dateFrom)); } catch (\Throwable) {}
        }
        if ($dateTo !== '') {
            try { $qb->andWhere('r.date <= :dt')->setParameter('dt', new \DateTime($dateTo)); } catch (\Throwable) {}
        }
        if ($status !== '') {
            $qb->andWhere('r.status = :st')->setParameter('st', $status);
        }

        /** @var list<Reservation> $rows */
        $rows = $qb->getQuery()->getResult();

        $items = array_map(function (Reservation $r) {
            $date = $r->getDate()?->format('Y-m-d');
            return [
                'id' => $r->getId(),
                'name' => $r->getContactName(),
                'email' => $r->getContactEmail(),
                'phone' => $r->getContactPhone(),
                'date' => $date,
                'status' => $r->getStatus(),
                'persons' => count($r->getPersons() ?? []),
                'link' => '/reservations/'.$r->getId().'/edit',
                'label' => ($r->getContactName() ?: 'Bez jména').' — '.($date ?: '?'),
            ];
        }, $rows);

        return ['count' => count($items), 'items' => $items];
    }

    public function buildPreview(array $params): ?string { return null; }
}
