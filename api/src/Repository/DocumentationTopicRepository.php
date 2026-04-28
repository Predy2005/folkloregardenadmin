<?php

declare(strict_types=1);

namespace App\Repository;

use App\Entity\DocumentationTopic;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/**
 * @extends ServiceEntityRepository<DocumentationTopic>
 */
class DocumentationTopicRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, DocumentationTopic::class);
    }

    /**
     * Keyword-based search scored by match count in title/keywords/content.
     *
     * @return list<array{topic: DocumentationTopic, score: int}>
     */
    public function searchByQuery(string $query, int $limit = 5): array
    {
        $terms = array_values(array_filter(
            array_map(
                fn(string $t) => mb_strtolower(trim(preg_replace('/[^\p{L}\p{N}]+/u', ' ', $t) ?? '')),
                preg_split('/\s+/', $query) ?: []
            ),
            fn(string $t) => mb_strlen($t) >= 2
        ));

        // Topics are few (~dozens) — load all and score in PHP.
        // Avoids DQL JSON casts which break on some PostgreSQL/Doctrine combos.
        /** @var list<DocumentationTopic> $all */
        $all = $this->findBy([], ['category' => 'ASC', 'title' => 'ASC']);

        if (empty($terms)) {
            return array_map(fn($t) => ['topic' => $t, 'score' => 0], array_slice($all, 0, $limit));
        }

        $scored = [];
        foreach ($all as $topic) {
            $score = 0;
            $title = mb_strtolower($topic->getTitle());
            $content = mb_strtolower($topic->getContent());
            $category = mb_strtolower($topic->getCategory());
            $keywords = array_map('mb_strtolower', $topic->getKeywords());

            foreach ($terms as $term) {
                if (str_contains($title, $term))       $score += 10;
                if (in_array($term, $keywords, true))  $score += 8;
                foreach ($keywords as $kw) {
                    if ($kw !== $term && str_contains($kw, $term)) { $score += 4; break; }
                }
                if (str_contains($category, $term))    $score += 3;
                $score += min(5, substr_count($content, $term));
            }
            if ($score > 0) {
                $scored[] = ['topic' => $topic, 'score' => $score];
            }
        }

        usort($scored, fn($a, $b) => $b['score'] <=> $a['score']);
        return array_slice($scored, 0, $limit);
    }

    public function findBySlug(string $slug): ?DocumentationTopic
    {
        return $this->findOneBy(['slug' => $slug]);
    }
}
