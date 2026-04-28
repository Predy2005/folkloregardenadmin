<?php

declare(strict_types=1);

namespace App\Service\Assistant\Tool;

use App\Entity\Contact;
use App\Repository\ContactRepository;

final class SearchContactsTool implements ToolInterface
{
    public function __construct(private readonly ContactRepository $repo) {}

    public function getName(): string { return 'search_contacts'; }
    public function getDescription(): string { return 'Vyhledá kontakty v adresáři podle jména, emailu, telefonu, firmy nebo IČO.'; }

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
    public function getRequiredPermission(): ?string { return 'contacts.read'; }

    public function execute(array $params): array
    {
        $query = (string)($params['query'] ?? '');
        $limit = max(1, min(25, (int)($params['limit'] ?? 10)));
        $result = $this->repo->search($query, $limit, 0);
        $items = array_map(function (Contact $c) {
            return [
                'id' => $c->getId(),
                'name' => $c->getName(),
                'email' => $c->getEmail(),
                'phone' => $c->getPhone(),
                'company' => $c->getCompany(),
                'link' => '/contacts/'.$c->getId().'/edit',
                'label' => $c->getName(),
            ];
        }, $result['items']);
        return ['count' => count($items), 'total' => $result['total'], 'items' => $items];
    }

    public function buildPreview(array $params): ?string { return null; }
}
