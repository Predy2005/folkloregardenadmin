<?php

declare(strict_types=1);

namespace App\Entity;

use App\Repository\EventMenuRepository;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity(repositoryClass: EventMenuRepository::class)]
#[ORM\Table(name: 'event_menu')]
class EventMenu
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column(type: Types::INTEGER)]
    private ?int $id = null;

    #[ORM\ManyToOne(targetEntity: Event::class, inversedBy: 'menus')]
    #[ORM\JoinColumn(name: 'event_id', referencedColumnName: 'id', nullable: false, onDelete: 'CASCADE')]
    private ?Event $event = null;

    #[ORM\ManyToOne(targetEntity: ReservationFoods::class)]
    #[ORM\JoinColumn(name: 'reservation_food_id', referencedColumnName: 'id', nullable: true, onDelete: 'SET NULL')]
    private ?ReservationFoods $reservationFood = null;

    #[ORM\ManyToOne(targetEntity: Reservation::class)]
    #[ORM\JoinColumn(name: 'reservation_id', referencedColumnName: 'id', nullable: true, onDelete: 'SET NULL')]
    private ?Reservation $reservation = null;

    #[ORM\Column(type: Types::STRING, length: 255)]
    private string $menuName;

    #[ORM\Column(type: Types::INTEGER, options: ['default' => 0])]
    private int $quantity = 0;

    #[ORM\Column(type: Types::DECIMAL, precision: 10, scale: 2, nullable: true)]
    private ?string $pricePerUnit = null;

    #[ORM\Column(type: Types::DECIMAL, precision: 10, scale: 2, nullable: true)]
    private ?string $totalPrice = null;

    #[ORM\Column(type: Types::TIME_MUTABLE, nullable: true)]
    private ?\DateTimeInterface $servingTime = null;

    #[ORM\Column(type: Types::TEXT, nullable: true)]
    private ?string $notes = null;

    #[ORM\Column(type: Types::DATETIME_MUTABLE)]
    private \DateTimeInterface $createdAt;

    public function __construct()
    {
        $this->createdAt = new \DateTime();
    }

    // Getters/setters
    public function getId(): ?int { return $this->id; }
    public function getEvent(): ?Event { return $this->event; }
    public function setEvent(?Event $event): self { $this->event = $event; return $this; }

    public function getReservationFood(): ?ReservationFoods { return $this->reservationFood; }
    public function setReservationFood(?ReservationFoods $rf): self { $this->reservationFood = $rf; return $this; }

    public function getReservation(): ?Reservation { return $this->reservation; }
    public function setReservation(?Reservation $r): self { $this->reservation = $r; return $this; }

    public function getMenuName(): string { return $this->menuName; }
    public function setMenuName(string $v): self { $this->menuName = $v; return $this; }

    public function getQuantity(): int { return $this->quantity; }
    public function setQuantity(int $v): self { $this->quantity = $v; return $this; }

    public function getPricePerUnit(): ?string { return $this->pricePerUnit; }
    public function setPricePerUnit(?string $v): self { $this->pricePerUnit = $v; return $this; }

    public function getTotalPrice(): ?string { return $this->totalPrice; }
    public function setTotalPrice(?string $v): self { $this->totalPrice = $v; return $this; }

    public function getServingTime(): ?\DateTimeInterface { return $this->servingTime; }
    public function setServingTime(?\DateTimeInterface $v): self { $this->servingTime = $v; return $this; }

    public function getNotes(): ?string { return $this->notes; }
    public function setNotes(?string $v): self { $this->notes = $v; return $this; }

    public function getCreatedAt(): \DateTimeInterface { return $this->createdAt; }
}
