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
    private ?string $nationality = null; // Národnost osoby pro skupinování ke stolům

    // Gettery a settery generujte pomocí maker nebo IDE.

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
}