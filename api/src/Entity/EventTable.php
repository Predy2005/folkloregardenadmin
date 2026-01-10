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

    // room enum stored as string: 'roubenka', 'terasa', 'stodolka', 'cely_areal'
    #[ORM\Column(type: Types::STRING, length: 50)]
    private string $room = 'cely_areal';

    #[ORM\Column(type: Types::INTEGER, options: ['default' => 4])]
    private int $capacity = 4;

    #[ORM\Column(name: 'position_x', type: Types::INTEGER, nullable: true)]
    private ?int $positionX = null;

    #[ORM\Column(name: 'position_y', type: Types::INTEGER, nullable: true)]
    private ?int $positionY = null;

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

    public function getCapacity(): int { return $this->capacity; }
    public function setCapacity(int $v): self { $this->capacity = $v; return $this; }

    public function getPositionX(): ?int { return $this->positionX; }
    public function setPositionX(?int $v): self { $this->positionX = $v; return $this; }

    public function getPositionY(): ?int { return $this->positionY; }
    public function setPositionY(?int $v): self { $this->positionY = $v; return $this; }

    public function getCreatedAt(): \DateTimeInterface { return $this->createdAt; }
    public function getUpdatedAt(): \DateTimeInterface { return $this->updatedAt; }
}
