<?php

declare(strict_types=1);

namespace App\Entity;

use App\Repository\EventSpaceRepository;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity(repositoryClass: EventSpaceRepository::class)]
#[ORM\Table(name: 'event_space')]
class EventSpace
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column(type: Types::INTEGER)]
    private ?int $id = null;

    #[ORM\ManyToOne(targetEntity: Event::class, inversedBy: 'spaces')]
    #[ORM\JoinColumn(name: 'event_id', referencedColumnName: 'id', nullable: false, onDelete: 'CASCADE')]
    private ?Event $event = null;

    #[ORM\Column(name: 'space_name', type: Types::STRING, length: 50)]
    private string $spaceName; // 'roubenka', 'terasa', 'stodolka', 'cely_areal'

    // New: FK to Room entity (nullable for backward compatibility)
    #[ORM\ManyToOne(targetEntity: Room::class)]
    #[ORM\JoinColumn(name: 'room_id', referencedColumnName: 'id', nullable: true, onDelete: 'SET NULL')]
    private ?Room $roomEntity = null;

    #[ORM\Column(type: Types::DATETIME_MUTABLE)]
    private \DateTimeInterface $createdAt;

    public function __construct()
    {
        $this->createdAt = new \DateTime();
    }

    public function getId(): ?int { return $this->id; }
    public function getEvent(): ?Event { return $this->event; }
    public function setEvent(?Event $event): self { $this->event = $event; return $this; }

    public function getSpaceName(): string { return $this->spaceName; }
    public function setSpaceName(string $v): self { $this->spaceName = $v; return $this; }

    public function getRoomEntity(): ?Room { return $this->roomEntity; }
    public function setRoomEntity(?Room $v): self { $this->roomEntity = $v; return $this; }

    public function getCreatedAt(): \DateTimeInterface { return $this->createdAt; }
}
