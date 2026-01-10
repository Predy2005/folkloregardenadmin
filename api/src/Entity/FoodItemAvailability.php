<?php

namespace App\Entity;

use App\Repository\FoodItemAvailabilityRepository;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity(repositoryClass: FoodItemAvailabilityRepository::class)]
#[ORM\Table(name: 'food_item_availability')]
#[ORM\HasLifecycleCallbacks]
class FoodItemAvailability
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column(type: Types::INTEGER)]
    private ?int $id = null;

    #[ORM\ManyToOne(targetEntity: ReservationFoods::class)]
    #[ORM\JoinColumn(name: 'reservation_food_id', referencedColumnName: 'id', nullable: false, onDelete: 'CASCADE')]
    private ReservationFoods $reservationFood;

    #[ORM\Column(name: 'date_from', type: Types::DATE_MUTABLE)]
    private \DateTimeInterface $dateFrom;

    #[ORM\Column(name: 'date_to', type: Types::DATE_MUTABLE, nullable: true)]
    private ?\DateTimeInterface $dateTo = null;

    #[ORM\Column(type: Types::BOOLEAN, options: ['default' => true])]
    private bool $available = true;

    #[ORM\Column(type: Types::STRING, length: 255, nullable: true)]
    private ?string $reason = null;

    #[ORM\Column(type: Types::DATETIME_MUTABLE)]
    private \DateTimeInterface $createdAt;

    #[ORM\Column(type: Types::DATETIME_MUTABLE)]
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
    public function getReservationFood(): ReservationFoods { return $this->reservationFood; }
    public function setReservationFood(ReservationFoods $rf): self { $this->reservationFood = $rf; return $this; }

    public function getDateFrom(): \DateTimeInterface { return $this->dateFrom; }
    public function setDateFrom(\DateTimeInterface $v): self { $this->dateFrom = $v; return $this; }

    public function getDateTo(): ?\DateTimeInterface { return $this->dateTo; }
    public function setDateTo(?\DateTimeInterface $v): self { $this->dateTo = $v; return $this; }

    public function isAvailable(): bool { return $this->available; }
    public function setAvailable(bool $v): self { $this->available = $v; return $this; }

    public function getReason(): ?string { return $this->reason; }
    public function setReason(?string $v): self { $this->reason = $v; return $this; }

    public function getCreatedAt(): \DateTimeInterface { return $this->createdAt; }
    public function getUpdatedAt(): \DateTimeInterface { return $this->updatedAt; }
}
