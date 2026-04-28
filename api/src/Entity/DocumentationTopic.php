<?php

declare(strict_types=1);

namespace App\Entity;

use App\Repository\DocumentationTopicRepository;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity(repositoryClass: DocumentationTopicRepository::class)]
#[ORM\Table(name: 'documentation_topic')]
#[ORM\Index(name: 'doc_topic_slug_idx', columns: ['slug'])]
#[ORM\Index(name: 'doc_topic_category_idx', columns: ['category'])]
#[ORM\HasLifecycleCallbacks]
class DocumentationTopic
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column(type: Types::INTEGER)]
    private ?int $id = null;

    #[ORM\Column(type: Types::STRING, length: 120, unique: true)]
    private string $slug;

    #[ORM\Column(type: Types::STRING, length: 200)]
    private string $title;

    #[ORM\Column(type: Types::STRING, length: 80)]
    private string $category;

    #[ORM\Column(type: Types::TEXT)]
    private string $content;

    /** @var list<string> */
    #[ORM\Column(type: Types::JSON)]
    private array $keywords = [];

    /** @var list<string> */
    #[ORM\Column(name: 'related_routes', type: Types::JSON)]
    private array $relatedRoutes = [];

    #[ORM\Column(name: 'created_at', type: Types::DATETIME_MUTABLE)]
    private \DateTimeInterface $createdAt;

    #[ORM\Column(name: 'updated_at', type: Types::DATETIME_MUTABLE)]
    private \DateTimeInterface $updatedAt;

    public function __construct()
    {
        $this->createdAt = new \DateTime();
        $this->updatedAt = new \DateTime();
    }

    #[ORM\PreUpdate]
    public function onPreUpdate(): void
    {
        $this->updatedAt = new \DateTime();
    }

    public function getId(): ?int { return $this->id; }

    public function getSlug(): string { return $this->slug; }
    public function setSlug(string $s): self { $this->slug = $s; return $this; }

    public function getTitle(): string { return $this->title; }
    public function setTitle(string $t): self { $this->title = $t; return $this; }

    public function getCategory(): string { return $this->category; }
    public function setCategory(string $c): self { $this->category = $c; return $this; }

    public function getContent(): string { return $this->content; }
    public function setContent(string $c): self { $this->content = $c; return $this; }

    /** @return list<string> */
    public function getKeywords(): array { return $this->keywords; }
    /** @param list<string> $kw */
    public function setKeywords(array $kw): self { $this->keywords = array_values($kw); return $this; }

    /** @return list<string> */
    public function getRelatedRoutes(): array { return $this->relatedRoutes; }
    /** @param list<string> $r */
    public function setRelatedRoutes(array $r): self { $this->relatedRoutes = array_values($r); return $this; }

    public function getCreatedAt(): \DateTimeInterface { return $this->createdAt; }
    public function getUpdatedAt(): \DateTimeInterface { return $this->updatedAt; }
}
