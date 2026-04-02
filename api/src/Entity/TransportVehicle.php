<?php

declare(strict_types=1);

namespace App\Entity;

use App\Repository\TransportVehicleRepository;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity(repositoryClass: TransportVehicleRepository::class)]
#[ORM\Table(name: 'transport_vehicle')]
#[ORM\HasLifecycleCallbacks]
class TransportVehicle
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column(type: Types::INTEGER)]
    private ?int $id = null;

    #[ORM\ManyToOne(targetEntity: TransportCompany::class, inversedBy: 'vehicles')]
    #[ORM\JoinColumn(name: 'company_id', referencedColumnName: 'id', nullable: false, onDelete: 'CASCADE')]
    private ?TransportCompany $company = null;

    #[ORM\Column(name: 'license_plate', type: Types::STRING, length: 20, unique: true)]
    private string $licensePlate;

    #[ORM\Column(name: 'vehicle_type', type: Types::STRING, length: 50)]
    private string $vehicleType = 'BUS';

    #[ORM\Column(type: Types::STRING, length: 100, nullable: true)]
    private ?string $brand = null;

    #[ORM\Column(type: Types::STRING, length: 100, nullable: true)]
    private ?string $model = null;

    #[ORM\Column(type: Types::INTEGER)]
    private int $capacity = 50;

    #[ORM\Column(type: Types::STRING, length: 50, nullable: true)]
    private ?string $color = null;

    #[ORM\Column(name: 'year_of_manufacture', type: Types::INTEGER, nullable: true)]
    private ?int $yearOfManufacture = null;

    #[ORM\Column(name: 'is_active', type: Types::BOOLEAN, options: ['default' => true])]
    private bool $isActive = true;

    #[ORM\Column(type: Types::TEXT, nullable: true)]
    private ?string $notes = null;

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
    public function onPreUpdate(): void { $this->updatedAt = new \DateTime(); }

    public function getId(): ?int { return $this->id; }

    public function getCompany(): ?TransportCompany { return $this->company; }
    public function setCompany(?TransportCompany $v): self { $this->company = $v; return $this; }

    public function getLicensePlate(): string { return $this->licensePlate; }
    public function setLicensePlate(string $v): self { $this->licensePlate = $v; return $this; }

    public function getVehicleType(): string { return $this->vehicleType; }
    public function setVehicleType(string $v): self { $this->vehicleType = $v; return $this; }

    public function getBrand(): ?string { return $this->brand; }
    public function setBrand(?string $v): self { $this->brand = $v; return $this; }

    public function getModel(): ?string { return $this->model; }
    public function setModel(?string $v): self { $this->model = $v; return $this; }

    public function getCapacity(): int { return $this->capacity; }
    public function setCapacity(int $v): self { $this->capacity = $v; return $this; }

    public function getColor(): ?string { return $this->color; }
    public function setColor(?string $v): self { $this->color = $v; return $this; }

    public function getYearOfManufacture(): ?int { return $this->yearOfManufacture; }
    public function setYearOfManufacture(?int $v): self { $this->yearOfManufacture = $v; return $this; }

    public function isActive(): bool { return $this->isActive; }
    public function setIsActive(bool $v): self { $this->isActive = $v; return $this; }

    public function getNotes(): ?string { return $this->notes; }
    public function setNotes(?string $v): self { $this->notes = $v; return $this; }

    public function getCreatedAt(): \DateTimeInterface { return $this->createdAt; }
    public function getUpdatedAt(): \DateTimeInterface { return $this->updatedAt; }
}
