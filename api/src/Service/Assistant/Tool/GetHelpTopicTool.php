<?php

declare(strict_types=1);

namespace App\Service\Assistant\Tool;

use App\Repository\DocumentationTopicRepository;

final class GetHelpTopicTool implements ToolInterface
{
    public function __construct(private readonly DocumentationTopicRepository $repo) {}

    public function getName(): string { return 'get_help_topic'; }

    public function getDescription(): string
    {
        return 'Vyhledá nápovědu k systému (navigace, postupy, popis modulů). Použij pro dotazy typu "kde najdu", "jak udělám", "co je to". Vrátí nejrelevantnější téma s popisem a odkazy.';
    }

    public function getParametersSchema(): array
    {
        return [
            'type' => 'object',
            'properties' => [
                'query' => ['type' => 'string', 'description' => 'Téma nebo dotaz v češtině.'],
                'limit' => ['type' => 'integer', 'description' => 'Max počet témat (výchozí 3).'],
            ],
            'required' => ['query'],
        ];
    }

    public function isReadOnly(): bool { return true; }
    public function getRequiredPermission(): ?string { return null; }

    public function execute(array $params): array
    {
        $query = (string)($params['query'] ?? '');
        $limit = max(1, min(5, (int)($params['limit'] ?? 3)));
        $results = $this->repo->searchByQuery($query, $limit);

        $items = array_map(function ($row) {
            $t = $row['topic'];
            return [
                'slug' => $t->getSlug(),
                'title' => $t->getTitle(),
                'category' => $t->getCategory(),
                'content' => $t->getContent(),
                'relatedRoutes' => $t->getRelatedRoutes(),
                'score' => $row['score'],
            ];
        }, $results);

        return ['count' => count($items), 'items' => $items];
    }

    public function buildPreview(array $params): ?string { return null; }
}
