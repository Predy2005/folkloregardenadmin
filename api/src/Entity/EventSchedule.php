<?php

declare(strict_types=1);

namespace App\Entity;

use App\Repository\EventScheduleRepository;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity(repositoryClass: EventScheduleRepository::class)]
#[ORM\Table(name: 'event_schedule')]
class EventSchedule
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column(type: Types::INTEGER)]
    private ?int $id = null;

    #[ORM\ManyToOne(targetEntity: Event::class, inversedBy: 'schedules')]
    #[ORM\JoinColumn(name: 'event_id', referencedColumnName: 'id', nullable: false, onDelete: 'CASCADE')]
    private ?Event $event = null;

    #[ORM\Column(type: Types::TIME_MUTABLE)]
    private \DateTimeInterface $timeSlot;

    #[ORM\Column(type: Types::INTEGER, options: ['default' => 30])]
    private int $durationMinutes = 30;

    #[ORM\Column(type: Types::STRING, length: 255)]
    private string $activity;

    #[ORM\Column(type: Types::TEXT, nullable: true)]
    private ?string $description = null;

    // Keep as scalar
    #[ORM\Column(type: Types::INTEGER, nullable: true)]
    private ?int $responsibleStaffId = null;

    #[ORM\Column(type: Types::TEXT, nullable: true)]
    private ?string $notes = null;

    #[ORM\Column(type: Types::DATETIME_MUTABLE)]
    private \DateTimeInterface $createdAt;

    public function __construct()
    {
        $this->createdAt = new \DateTime();
    }

    public function getId(): ?int { return $this->id; }
    public function getEvent(): ?Event { return $this->event; }
    public function setEvent(?Event $event): self { $this->event = $event; return $this; }

    public function getTimeSlot(): \DateTimeInterface { return $this->timeSlot; }
    public function setTimeSlot(\DateTimeInterface $v): self { $this->timeSlot = $v; return $this; }

    public function getDurationMinutes(): int { return $this->durationMinutes; }
    public function setDurationMinutes(int $v): self { $this->durationMinutes = $v; return $this; }

    public function getActivity(): string { return $this->activity; }
    public function setActivity(string $v): self { $this->activity = $v; return $this; }

    public function getDescription(): ?string { return $this->description; }
    public function setDescription(?string $v): self { $this->description = $v; return $this; }

    public function getResponsibleStaffId(): ?int { return $this->responsibleStaffId; }
    public function setResponsibleStaffId(?int $v): self { $this->responsibleStaffId = $v; return $this; }

    public function getNotes(): ?string { return $this->notes; }
    public function setNotes(?string $v): self { $this->notes = $v; return $this; }

    public function getCreatedAt(): \DateTimeInterface { return $this->createdAt; }
}
