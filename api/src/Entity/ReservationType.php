<?php

namespace App\Entity;

use App\Repository\ReservationTypeRepository;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity(repositoryClass: ReservationTypeRepository::class)]
#[ORM\Table(name: 'reservation_type')]
#[ORM\HasLifecycleCallbacks]
class ReservationType
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column(type: Types::INTEGER)]
    private ?int $id = null;

    #[ORM\Column(type: Types::STRING, length: 100)]
    private string $name = '';

    #[ORM\Column(type: Types::STRING, length: 50, unique: true)]
    private string $code = '';

    #[ORM\Column(type: Types::STRING, length: 20)]
    private string $color = '#3b82f6';

    #[ORM\Column(name: 'is_system', type: Types::BOOLEAN)]
    private bool $isSystem = false;

    #[ORM\Column(type: Types::STRING, length: 255, nullable: true)]
    private ?string $note = null;

    #[ORM\Column(name: 'sort_order', type: Types::INTEGER)]
    private int $sortOrder = 0;

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

    public function getName(): string { return $this->name; }
    public function setName(string $name): self { $this->name = $name; return $this; }

    public function getCode(): string { return $this->code; }
    public function setCode(string $code): self { $this->code = $code; return $this; }

    public function getColor(): string { return $this->color; }
    public function setColor(string $color): self { $this->color = $color; return $this; }

    public function isSystem(): bool { return $this->isSystem; }
    public function setIsSystem(bool $isSystem): self { $this->isSystem = $isSystem; return $this; }

    public function getNote(): ?string { return $this->note; }
    public function setNote(?string $note): self { $this->note = $note; return $this; }

    public function getSortOrder(): int { return $this->sortOrder; }
    public function setSortOrder(int $sortOrder): self { $this->sortOrder = $sortOrder; return $this; }

    public function getCreatedAt(): \DateTimeInterface { return $this->createdAt; }
    public function getUpdatedAt(): \DateTimeInterface { return $this->updatedAt; }
}
