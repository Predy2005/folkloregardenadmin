<?php
declare(strict_types=1);

namespace App\Entity;

use App\Repository\EventTagRepository;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;

/**
 * Tabulka pro ukládání všech použitých tagů (pro našeptávání)
 */
#[ORM\Entity(repositoryClass: EventTagRepository::class)]
#[ORM\Table(name: 'event_tag')]
#[ORM\UniqueConstraint(name: 'unique_tag_name', columns: ['name'])]
class EventTag
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column(type: Types::INTEGER)]
    private ?int $id = null;

    #[ORM\Column(type: Types::STRING, length: 100)]
    private string $name;

    // Počet použití tagu (pro řazení podle popularity)
    #[ORM\Column(type: Types::INTEGER, options: ['default' => 1])]
    private int $usageCount = 1;

    #[ORM\Column(type: Types::DATETIME_MUTABLE)]
    private \DateTimeInterface $createdAt;

    #[ORM\Column(type: Types::DATETIME_MUTABLE)]
    private \DateTimeInterface $lastUsedAt;

    public function __construct()
    {
        $this->createdAt = new \DateTime();
        $this->lastUsedAt = new \DateTime();
    }

    public function getId(): ?int
    {
        return $this->id;
    }

    public function getName(): string
    {
        return $this->name;
    }

    public function setName(string $name): self
    {
        $this->name = $name;
        return $this;
    }

    public function getUsageCount(): int
    {
        return $this->usageCount;
    }

    public function incrementUsageCount(): self
    {
        $this->usageCount++;
        $this->lastUsedAt = new \DateTime();
        return $this;
    }

    public function getCreatedAt(): \DateTimeInterface
    {
        return $this->createdAt;
    }

    public function getLastUsedAt(): \DateTimeInterface
    {
        return $this->lastUsedAt;
    }
}
