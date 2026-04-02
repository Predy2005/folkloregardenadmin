<?php

declare(strict_types=1);

namespace App\Entity;

use App\Repository\RoomRepository;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity(repositoryClass: RoomRepository::class)]
#[ORM\Table(name: 'room')]
#[ORM\HasLifecycleCallbacks]
class Room
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column(type: Types::INTEGER)]
    private ?int $id = null;

    #[ORM\ManyToOne(targetEntity: Building::class, inversedBy: 'rooms')]
    #[ORM\JoinColumn(name: 'building_id', referencedColumnName: 'id', nullable: false, onDelete: 'CASCADE')]
    private ?Building $building = null;

    #[ORM\Column(type: Types::STRING, length: 100)]
    private string $name;

    #[ORM\Column(type: Types::STRING, length: 50)]
    private string $slug;

    #[ORM\Column(name: 'width_cm', type: Types::INTEGER, options: ['default' => 1000])]
    private int $widthCm = 1000;

    #[ORM\Column(name: 'height_cm', type: Types::INTEGER, options: ['default' => 800])]
    private int $heightCm = 800;

    #[ORM\Column(name: 'capacity_limit', type: Types::INTEGER, nullable: true)]
    private ?int $capacityLimit = null;

    #[ORM\Column(name: 'shape_data', type: Types::JSON, nullable: true)]
    private ?array $shapeData = null;

    #[ORM\Column(type: Types::STRING, length: 7, nullable: true)]
    private ?string $color = null;

    #[ORM\Column(name: 'sort_order', type: Types::INTEGER, options: ['default' => 0])]
    private int $sortOrder = 0;

    #[ORM\Column(name: 'is_active', type: Types::BOOLEAN, options: ['default' => true])]
    private bool $isActive = true;

    #[ORM\Column(type: Types::DATETIME_MUTABLE)]
    private \DateTimeInterface $createdAt;

    #[ORM\Column(type: Types::DATETIME_MUTABLE)]
    private \DateTimeInterface $updatedAt;

    public function __construct()
    {
        $now = new \DateTime();
        $this->createdAt = $now;
        $this->updatedAt = $now;
    }

    #[ORM\PrePersist]
    public function onPrePersist(): void
    {
        $now = new \DateTime();
        $this->createdAt = $this->createdAt ?? $now;
        $this->updatedAt = $now;
    }

    #[ORM\PreUpdate]
    public function onPreUpdate(): void
    {
        $this->updatedAt = new \DateTime();
    }

    public function getId(): ?int { return $this->id; }

    public function getBuilding(): ?Building { return $this->building; }
    public function setBuilding(?Building $v): self { $this->building = $v; return $this; }

    public function getName(): string { return $this->name; }
    public function setName(string $v): self { $this->name = $v; return $this; }

    public function getSlug(): string { return $this->slug; }
    public function setSlug(string $v): self { $this->slug = $v; return $this; }

    public function getWidthCm(): int { return $this->widthCm; }
    public function setWidthCm(int $v): self { $this->widthCm = $v; return $this; }

    public function getHeightCm(): int { return $this->heightCm; }
    public function setHeightCm(int $v): self { $this->heightCm = $v; return $this; }

    public function getCapacityLimit(): ?int { return $this->capacityLimit; }
    public function setCapacityLimit(?int $v): self { $this->capacityLimit = $v; return $this; }

    public function getShapeData(): ?array { return $this->shapeData; }
    public function setShapeData(?array $v): self { $this->shapeData = $v; return $this; }

    public function getColor(): ?string { return $this->color; }
    public function setColor(?string $v): self { $this->color = $v; return $this; }

    public function getSortOrder(): int { return $this->sortOrder; }
    public function setSortOrder(int $v): self { $this->sortOrder = $v; return $this; }

    public function isActive(): bool { return $this->isActive; }
    public function setIsActive(bool $v): self { $this->isActive = $v; return $this; }

    public function getCreatedAt(): \DateTimeInterface { return $this->createdAt; }
    public function getUpdatedAt(): \DateTimeInterface { return $this->updatedAt; }
}
