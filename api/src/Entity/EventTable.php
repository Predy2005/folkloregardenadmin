<?php

declare(strict_types=1);

namespace App\Entity;

use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity]
#[ORM\Table(name: 'event_table')]
#[ORM\HasLifecycleCallbacks]
class EventTable
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column(type: Types::INTEGER)]
    private ?int $id = null;

    #[ORM\ManyToOne(targetEntity: Event::class)]
    #[ORM\JoinColumn(name: 'event_id', referencedColumnName: 'id', nullable: false, onDelete: 'CASCADE')]
    private ?Event $event = null;

    #[ORM\Column(name: 'table_name', type: Types::STRING, length: 100)]
    private string $tableName;

    // Legacy room enum stored as string: 'roubenka', 'terasa', 'stodolka', 'cely_areal'
    #[ORM\Column(type: Types::STRING, length: 50)]
    private string $room = 'cely_areal';

    // New: FK to Room entity (nullable for backward compatibility)
    #[ORM\ManyToOne(targetEntity: Room::class)]
    #[ORM\JoinColumn(name: 'room_id', referencedColumnName: 'id', nullable: true, onDelete: 'SET NULL')]
    private ?Room $roomEntity = null;

    #[ORM\Column(type: Types::INTEGER, options: ['default' => 4])]
    private int $capacity = 4;

    #[ORM\Column(name: 'position_x', type: Types::FLOAT, nullable: true)]
    private ?float $positionX = null;

    #[ORM\Column(name: 'position_y', type: Types::FLOAT, nullable: true)]
    private ?float $positionY = null;

    // Visual properties for canvas editor
    // 'round' | 'rectangle' | 'oval' | 'square'
    #[ORM\Column(type: Types::STRING, length: 20, options: ['default' => 'round'])]
    private string $shape = 'round';

    #[ORM\Column(name: 'width_px', type: Types::FLOAT, nullable: true)]
    private ?float $widthPx = null;

    #[ORM\Column(name: 'height_px', type: Types::FLOAT, nullable: true)]
    private ?float $heightPx = null;

    #[ORM\Column(type: Types::FLOAT, options: ['default' => 0])]
    private float $rotation = 0;

    #[ORM\Column(name: 'table_number', type: Types::INTEGER, nullable: true)]
    private ?int $tableNumber = null;

    #[ORM\Column(type: Types::STRING, length: 7, nullable: true)]
    private ?string $color = null;

    #[ORM\Column(name: 'is_locked', type: Types::BOOLEAN, options: ['default' => false])]
    private bool $isLocked = false;

    #[ORM\Column(name: 'sort_order', type: Types::INTEGER, options: ['default' => 0])]
    private int $sortOrder = 0;

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

    public function getEvent(): ?Event { return $this->event; }
    public function setEvent(?Event $event): self { $this->event = $event; return $this; }

    public function getTableName(): string { return $this->tableName; }
    public function setTableName(string $v): self { $this->tableName = $v; return $this; }

    public function getRoom(): string { return $this->room; }
    public function setRoom(string $v): self { $this->room = $v; return $this; }

    public function getRoomEntity(): ?Room { return $this->roomEntity; }
    public function setRoomEntity(?Room $v): self { $this->roomEntity = $v; return $this; }

    public function getCapacity(): int { return $this->capacity; }
    public function setCapacity(int $v): self { $this->capacity = $v; return $this; }

    public function getPositionX(): ?float { return $this->positionX; }
    public function setPositionX(?float $v): self { $this->positionX = $v; return $this; }

    public function getPositionY(): ?float { return $this->positionY; }
    public function setPositionY(?float $v): self { $this->positionY = $v; return $this; }

    public function getShape(): string { return $this->shape; }
    public function setShape(string $v): self { $this->shape = $v; return $this; }

    public function getWidthPx(): ?float { return $this->widthPx; }
    public function setWidthPx(?float $v): self { $this->widthPx = $v; return $this; }

    public function getHeightPx(): ?float { return $this->heightPx; }
    public function setHeightPx(?float $v): self { $this->heightPx = $v; return $this; }

    public function getRotation(): float { return $this->rotation; }
    public function setRotation(float $v): self { $this->rotation = $v; return $this; }

    public function getTableNumber(): ?int { return $this->tableNumber; }
    public function setTableNumber(?int $v): self { $this->tableNumber = $v; return $this; }

    public function getColor(): ?string { return $this->color; }
    public function setColor(?string $v): self { $this->color = $v; return $this; }

    public function isLocked(): bool { return $this->isLocked; }
    public function setIsLocked(bool $v): self { $this->isLocked = $v; return $this; }

    public function getSortOrder(): int { return $this->sortOrder; }
    public function setSortOrder(int $v): self { $this->sortOrder = $v; return $this; }

    public function getCreatedAt(): \DateTimeInterface { return $this->createdAt; }
    public function getUpdatedAt(): \DateTimeInterface { return $this->updatedAt; }
}
