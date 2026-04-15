<?php

namespace App\Entity;

use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;
use App\Repository\ReservationPersonRepository;

#[ORM\Entity(repositoryClass: ReservationPersonRepository::class)]
#[ORM\Table(name: 'reservation_person')]
class ReservationPerson
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column(type: "integer")]
    private ?int $id = null;

    #[ORM\ManyToOne(targetEntity: Reservation::class, inversedBy: 'persons')]
    #[ORM\JoinColumn(nullable: false, onDelete: 'CASCADE')]
    private ?Reservation $reservation = null;

    #[ORM\Column(type: "string", length: 20)]
    private ?string $type = null; // Například 'adult', 'child' nebo 'infant'

    #[ORM\Column(type: "string", length: 255)]
    private ?string $menu = null;

    #[ORM\Column(type: "decimal", precision: 10, scale: 2)]
    private ?string $price = null; // Ukládá základní cenu + případný příplatek

    #[ORM\Column(type: "string", length: 100, nullable: true)]
    private ?string $nationality = null;

    /** none = bez nápoje, welcome = 1 drink v ceně, allin = neomezené pití */
    #[ORM\Column(name: 'drink_option', type: 'string', length: 20, options: ['default' => 'none'])]
    private string $drinkOption = 'none';

    #[ORM\Column(name: 'drink_name', type: 'string', length: 255, nullable: true)]
    private ?string $drinkName = null;

    #[ORM\Column(name: 'drink_price', type: 'decimal', precision: 10, scale: 2, nullable: true)]
    private ?string $drinkPrice = null;

    #[ORM\ManyToOne(targetEntity: DrinkItem::class)]
    #[ORM\JoinColumn(name: 'drink_item_id', nullable: true, onDelete: 'SET NULL')]
    private ?DrinkItem $drinkItem = null;

    #[ORM\Column(type: Types::STRING, length: 3, options: ['default' => 'CZK'])]
    private string $currency = 'CZK';

    /** Komplimentární osoba — neúčtuje se, ale počítá se do kapacity */
    #[ORM\Column(name: 'is_free', type: Types::BOOLEAN, options: ['default' => false])]
    private bool $isFree = false;

    public function getCurrency(): string { return $this->currency; }
    public function setCurrency(string $currency): static { $this->currency = $currency; return $this; }

    public function isFree(): bool { return $this->isFree; }
    public function setIsFree(bool $isFree): static { $this->isFree = $isFree; return $this; }

    public function getId(): ?int
    {
        return $this->id;
    }

    public function getType(): ?string
    {
        return $this->type;
    }

    public function setType(string $type): static
    {
        $this->type = $type;

        return $this;
    }

    public function getMenu(): ?string
    {
        return $this->menu;
    }

    public function setMenu(string $menu): static
    {
        $this->menu = $menu;

        return $this;
    }

    public function getPrice(): ?string
    {
        return $this->price;
    }

    public function setPrice(string $price): static
    {
        $this->price = $price;

        return $this;
    }

    public function getReservation(): ?Reservation
    {
        return $this->reservation;
    }

    public function setReservation(?Reservation $reservation): static
    {
        $this->reservation = $reservation;

        return $this;
    }

    public function getNationality(): ?string
    {
        return $this->nationality;
    }

    public function setNationality(?string $nationality): static
    {
        $this->nationality = $nationality;
        return $this;
    }

    public function getDrinkOption(): string { return $this->drinkOption; }
    public function setDrinkOption(string $v): static { $this->drinkOption = $v; return $this; }

    public function getDrinkName(): ?string { return $this->drinkName; }
    public function setDrinkName(?string $v): static { $this->drinkName = $v; return $this; }

    public function getDrinkPrice(): ?string { return $this->drinkPrice; }
    public function setDrinkPrice(?string $v): static { $this->drinkPrice = $v; return $this; }

    public function getDrinkItem(): ?DrinkItem { return $this->drinkItem; }
    public function setDrinkItem(?DrinkItem $v): static { $this->drinkItem = $v; return $this; }
}