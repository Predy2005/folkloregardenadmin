<?php

declare(strict_types=1);

namespace App\Entity;

use App\Repository\FloorPlanElementRepository;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity(repositoryClass: FloorPlanElementRepository::class)]
#[ORM\Table(name: 'floor_plan_element')]
#[ORM\HasLifecycleCallbacks]
class FloorPlanElement
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column(type: Types::INTEGER)]
    private ?int $id = null;

    #[ORM\ManyToOne(targetEntity: Event::class, inversedBy: 'floorPlanElements')]
    #[ORM\JoinColumn(name: 'event_id', referencedColumnName: 'id', nullable: false, onDelete: 'CASCADE')]
    private ?Event $event = null;

    #[ORM\ManyToOne(targetEntity: Room::class)]
    #[ORM\JoinColumn(name: 'room_id', referencedColumnName: 'id', nullable: true, onDelete: 'SET NULL')]
    private ?Room $room = null;

    // 'stage' | 'dance_floor' | 'bar' | 'buffet' | 'entrance' | 'wall' | 'decoration' | 'custom'
    #[ORM\Column(name: 'element_type', type: Types::STRING, length: 30)]
    private string $elementType;

    #[ORM\Column(type: Types::STRING, length: 100, nullable: true)]
    private ?string $label = null;

    #[ORM\Column(name: 'position_x', type: Types::FLOAT, options: ['default' => 0])]
    private float $positionX = 0;

    #[ORM\Column(name: 'position_y', type: Types::FLOAT, options: ['default' => 0])]
    private float $positionY = 0;

    #[ORM\Column(name: 'width_px', type: Types::FLOAT, options: ['default' => 100])]
    private float $widthPx = 100;

    #[ORM\Column(name: 'height_px', type: Types::FLOAT, options: ['default' => 100])]
    private float $heightPx = 100;

    #[ORM\Column(type: Types::FLOAT, options: ['default' => 0])]
    private float $rotation = 0;

    // 'rectangle' | 'circle' | 'polygon'
    #[ORM\Column(type: Types::STRING, length: 20, options: ['default' => 'rectangle'])]
    private string $shape = 'rectangle';

    #[ORM\Column(name: 'shape_data', type: Types::JSON, nullable: true)]
    private ?array $shapeData = null;

    #[ORM\Column(type: Types::STRING, length: 7, nullable: true)]
    private ?string $color = null;

    #[ORM\Column(name: 'is_locked', type: Types::BOOLEAN, options: ['default' => false])]
    private bool $isLocked = false;

    #[ORM\Column(name: 'sort_order', type: Types::INTEGER, options: ['default' => 0])]
    private int $sortOrder = 0;

    #[ORM\Column(type: Types::DATETIME_MUTABLE)]
    private \DateTimeInterface $createdAt;

    public function __construct()
    {
        $this->createdAt = new \DateTime();
    }

    #[ORM\PrePersist]
    public function onPrePersist(): void
    {
        $this->createdAt = $this->createdAt ?? new \DateTime();
    }

    public function getId(): ?int { return $this->id; }

    public function getEvent(): ?Event { return $this->event; }
    public function setEvent(?Event $v): self { $this->event = $v; return $this; }

    public function getRoom(): ?Room { return $this->room; }
    public function setRoom(?Room $v): self { $this->room = $v; return $this; }

    public function getElementType(): string { return $this->elementType; }
    public function setElementType(string $v): self { $this->elementType = $v; return $this; }

    public function getLabel(): ?string { return $this->label; }
    public function setLabel(?string $v): self { $this->label = $v; return $this; }

    public function getPositionX(): float { return $this->positionX; }
    public function setPositionX(float $v): self { $this->positionX = $v; return $this; }

    public function getPositionY(): float { return $this->positionY; }
    public function setPositionY(float $v): self { $this->positionY = $v; return $this; }

    public function getWidthPx(): float { return $this->widthPx; }
    public function setWidthPx(float $v): self { $this->widthPx = $v; return $this; }

    public function getHeightPx(): float { return $this->heightPx; }
    public function setHeightPx(float $v): self { $this->heightPx = $v; return $this; }

    public function getRotation(): float { return $this->rotation; }
    public function setRotation(float $v): self { $this->rotation = $v; return $this; }

    public function getShape(): string { return $this->shape; }
    public function setShape(string $v): self { $this->shape = $v; return $this; }

    public function getShapeData(): ?array { return $this->shapeData; }
    public function setShapeData(?array $v): self { $this->shapeData = $v; return $this; }

    public function getColor(): ?string { return $this->color; }
    public function setColor(?string $v): self { $this->color = $v; return $this; }

    public function isLocked(): bool { return $this->isLocked; }
    public function setIsLocked(bool $v): self { $this->isLocked = $v; return $this; }

    public function getSortOrder(): int { return $this->sortOrder; }
    public function setSortOrder(int $v): self { $this->sortOrder = $v; return $this; }

    public function getCreatedAt(): \DateTimeInterface { return $this->createdAt; }
}
