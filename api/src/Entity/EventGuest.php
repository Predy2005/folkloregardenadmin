<?php

declare(strict_types=1);

namespace App\Entity;

use App\Repository\EventGuestRepository;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity(repositoryClass: EventGuestRepository::class)]
#[ORM\Table(name: 'event_guest')]
class EventGuest
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column(type: Types::INTEGER)]
    private ?int $id = null;

    #[ORM\ManyToOne(targetEntity: Event::class, inversedBy: 'guests')]
    #[ORM\JoinColumn(name: 'event_id', referencedColumnName: 'id', nullable: false, onDelete: 'CASCADE')]
    private ?Event $event = null;

    #[ORM\ManyToOne(targetEntity: EventTable::class)]
    #[ORM\JoinColumn(name: 'event_table_id', referencedColumnName: 'id', nullable: true, onDelete: 'SET NULL')]
    private ?EventTable $eventTable = null;

    #[ORM\ManyToOne(targetEntity: Reservation::class)]
    #[ORM\JoinColumn(name: 'reservation_id', referencedColumnName: 'id', nullable: true, onDelete: 'SET NULL')]
    private ?Reservation $reservation = null;

    #[ORM\ManyToOne(targetEntity: EventMenu::class)]
    #[ORM\JoinColumn(name: 'menu_item_id', referencedColumnName: 'id', nullable: true, onDelete: 'SET NULL')]
    private ?EventMenu $menuItem = null;

    #[ORM\Column(type: Types::STRING, length: 100, nullable: true)]
    private ?string $firstName = null;

    #[ORM\Column(type: Types::STRING, length: 100, nullable: true)]
    private ?string $lastName = null;

    #[ORM\Column(type: Types::STRING, length: 50, nullable: true)]
    private ?string $nationality = null;

    #[ORM\Column(type: Types::BOOLEAN, options: ['default' => true])]
    private bool $isPaid = true;

    #[ORM\Column(name: 'person_index', type: Types::INTEGER, nullable: true)]
    private ?int $personIndex = null;

    #[ORM\Column(type: Types::STRING, length: 20, options: ['default' => 'adult'])]
    private string $type = 'adult'; // 'adult' | 'child'

    #[ORM\Column(name: 'is_present', type: Types::BOOLEAN, options: ['default' => false])]
    private bool $isPresent = false;

    #[ORM\Column(type: Types::TEXT, nullable: true)]
    private ?string $notes = null;

    #[ORM\Column(type: Types::STRING, length: 50, nullable: true)]
    private ?string $space = null;

    #[ORM\Column(type: Types::DATETIME_MUTABLE)]
    private \DateTimeInterface $createdAt;

    public function __construct()
    {
        $this->createdAt = new \DateTime();
    }

    public function getId(): ?int { return $this->id; }
    public function getEvent(): ?Event { return $this->event; }
    public function setEvent(?Event $event): self { $this->event = $event; return $this; }

    public function getEventTable(): ?EventTable { return $this->eventTable; }
    public function setEventTable(?EventTable $t): self { $this->eventTable = $t; return $this; }

    public function getReservation(): ?Reservation { return $this->reservation; }
    public function setReservation(?Reservation $r): self { $this->reservation = $r; return $this; }

    public function getMenuItem(): ?EventMenu { return $this->menuItem; }
    public function setMenuItem(?EventMenu $m): self { $this->menuItem = $m; return $this; }

    public function getFirstName(): ?string { return $this->firstName; }
    public function setFirstName(?string $v): self { $this->firstName = $v; return $this; }

    public function getLastName(): ?string { return $this->lastName; }
    public function setLastName(?string $v): self { $this->lastName = $v; return $this; }

    public function getNationality(): ?string { return $this->nationality; }
    public function setNationality(?string $v): self { $this->nationality = $v; return $this; }

    public function isPaid(): bool { return $this->isPaid; }
    public function setIsPaid(bool $v): self { $this->isPaid = $v; return $this; }

    public function getPersonIndex(): ?int { return $this->personIndex; }
    public function setPersonIndex(?int $v): self { $this->personIndex = $v; return $this; }

    public function getType(): string { return $this->type; }
    public function setType(string $v): self { $this->type = $v; return $this; }

    public function isPresent(): bool { return $this->isPresent; }
    public function setIsPresent(bool $v): self { $this->isPresent = $v; return $this; }

    public function getNotes(): ?string { return $this->notes; }
    public function setNotes(?string $v): self { $this->notes = $v; return $this; }

    public function getSpace(): ?string { return $this->space; }
    public function setSpace(?string $v): self { $this->space = $v; return $this; }

    public function getCreatedAt(): \DateTimeInterface { return $this->createdAt; }
}
