<?php

declare(strict_types=1);

namespace App\Service\Assistant\Tool;

use App\Entity\StaffMember;
use App\Repository\StaffMemberRepository;

final class SearchStaffTool implements ToolInterface
{
    public function __construct(private readonly StaffMemberRepository $repo) {}

    public function getName(): string { return 'search_staff'; }
    public function getDescription(): string { return 'Vyhledá zaměstnance/skupiny dle jména, pozice, emailu nebo telefonu.'; }

    public function getParametersSchema(): array
    {
        return [
            'type' => 'object',
            'properties' => [
                'query' => ['type' => 'string'],
                'limit' => ['type' => 'integer'],
            ],
            'required' => ['query'],
        ];
    }

    public function isReadOnly(): bool { return true; }
    public function getRequiredPermission(): ?string { return 'staff.read'; }

    public function execute(array $params): array
    {
        $query = mb_strtolower(trim((string)($params['query'] ?? '')));
        $limit = max(1, min(25, (int)($params['limit'] ?? 10)));

        $qb = $this->repo->createQueryBuilder('s')
            ->orderBy('s.lastName', 'ASC')
            ->setMaxResults($limit);

        if ($query !== '') {
            $qb->andWhere('LOWER(s.firstName) LIKE :q OR LOWER(s.lastName) LIKE :q OR LOWER(s.email) LIKE :q OR LOWER(s.position) LIKE :q OR s.phone LIKE :qraw')
               ->setParameter('q', '%'.$query.'%')
               ->setParameter('qraw', '%'.$query.'%');
        }

        /** @var list<StaffMember> $rows */
        $rows = $qb->getQuery()->getResult();

        $items = array_map(function (StaffMember $s) {
            $name = trim($s->getFirstName().' '.$s->getLastName());
            return [
                'id' => $s->getId(),
                'name' => $name,
                'position' => $s->getPosition(),
                'email' => $s->getEmail(),
                'phone' => $s->getPhone(),
                'link' => '/staff/'.$s->getId().'/edit',
                'label' => $name,
            ];
        }, $rows);

        return ['count' => count($items), 'items' => $items];
    }

    public function buildPreview(array $params): ?string { return null; }
}
