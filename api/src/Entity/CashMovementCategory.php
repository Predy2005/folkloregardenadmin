<?php
declare(strict_types=1);

namespace App\Entity;

use App\Repository\CashMovementCategoryRepository;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity(repositoryClass: CashMovementCategoryRepository::class)]
#[ORM\Table(name: 'cash_movement_category')]
#[ORM\UniqueConstraint(name: 'unique_category_name', columns: ['name'])]
class CashMovementCategory
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column(type: Types::INTEGER)]
    private ?int $id = null;

    #[ORM\Column(type: Types::STRING, length: 100)]
    private string $name;

    /** 'INCOME' | 'EXPENSE' | 'BOTH' */
    #[ORM\Column(type: Types::STRING, length: 10)]
    private string $type = 'BOTH';

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

    public function getType(): string
    {
        return $this->type;
    }

    public function setType(string $type): self
    {
        $this->type = $type;
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
