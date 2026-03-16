<?php

namespace App\Entity;

use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;
use App\Repository\ReservationTransferRepository;

#[ORM\Entity(repositoryClass: ReservationTransferRepository::class)]
#[ORM\Table(name: 'reservation_transfer')]
class ReservationTransfer
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column(type: Types::INTEGER)]
    private ?int $id = null;

    #[ORM\ManyToOne(targetEntity: Reservation::class, inversedBy: 'transfers')]
    #[ORM\JoinColumn(nullable: false, onDelete: 'CASCADE')]
    private ?Reservation $reservation = null;

    #[ORM\Column(type: Types::INTEGER)]
    private int $personCount = 1;

    #[ORM\Column(type: Types::STRING, length: 500)]
    private string $address = '';

    public function getId(): ?int
    {
        return $this->id;
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

    public function getPersonCount(): int
    {
        return $this->personCount;
    }

    public function setPersonCount(int $personCount): static
    {
        $this->personCount = $personCount;
        return $this;
    }

    public function getAddress(): string
    {
        return $this->address;
    }

    public function setAddress(string $address): static
    {
        $this->address = $address;
        return $this;
    }
}
