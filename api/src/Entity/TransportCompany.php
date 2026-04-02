<?php

declare(strict_types=1);

namespace App\Entity;

use App\Repository\TransportCompanyRepository;
use Doctrine\Common\Collections\ArrayCollection;
use Doctrine\Common\Collections\Collection;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity(repositoryClass: TransportCompanyRepository::class)]
#[ORM\Table(name: 'transport_company')]
#[ORM\HasLifecycleCallbacks]
class TransportCompany
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column(type: Types::INTEGER)]
    private ?int $id = null;

    #[ORM\Column(type: Types::STRING, length: 255)]
    private string $name;

    #[ORM\Column(name: 'contact_person', type: Types::STRING, length: 255, nullable: true)]
    private ?string $contactPerson = null;

    #[ORM\Column(type: Types::STRING, length: 255, nullable: true)]
    private ?string $email = null;

    #[ORM\Column(type: Types::STRING, length: 50, nullable: true)]
    private ?string $phone = null;

    #[ORM\Column(type: Types::TEXT, nullable: true)]
    private ?string $address = null;

    #[ORM\Column(type: Types::STRING, length: 20, nullable: true)]
    private ?string $ic = null;

    #[ORM\Column(type: Types::STRING, length: 20, nullable: true)]
    private ?string $dic = null;

    #[ORM\Column(name: 'bank_account', type: Types::STRING, length: 100, nullable: true)]
    private ?string $bankAccount = null;

    #[ORM\Column(name: 'is_active', type: Types::BOOLEAN, options: ['default' => true])]
    private bool $isActive = true;

    #[ORM\Column(type: Types::TEXT, nullable: true)]
    private ?string $notes = null;

    #[ORM\Column(type: Types::DATETIME_MUTABLE)]
    private \DateTimeInterface $createdAt;

    #[ORM\Column(type: Types::DATETIME_MUTABLE)]
    private \DateTimeInterface $updatedAt;

    /** @var Collection<int, TransportVehicle> */
    #[ORM\OneToMany(mappedBy: 'company', targetEntity: TransportVehicle::class, cascade: ['persist', 'remove'])]
    private Collection $vehicles;

    /** @var Collection<int, TransportDriver> */
    #[ORM\OneToMany(mappedBy: 'company', targetEntity: TransportDriver::class, cascade: ['persist', 'remove'])]
    private Collection $drivers;

    /** @var Collection<int, EventTransport> */
    #[ORM\OneToMany(mappedBy: 'company', targetEntity: EventTransport::class, cascade: ['persist', 'remove'])]
    private Collection $eventTransports;

    public function __construct()
    {
        $now = new \DateTime();
        $this->createdAt = $now;
        $this->updatedAt = $now;
        $this->vehicles = new ArrayCollection();
        $this->drivers = new ArrayCollection();
        $this->eventTransports = new ArrayCollection();
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

    public function getName(): string { return $this->name; }
    public function setName(string $v): self { $this->name = $v; return $this; }

    public function getContactPerson(): ?string { return $this->contactPerson; }
    public function setContactPerson(?string $v): self { $this->contactPerson = $v; return $this; }

    public function getEmail(): ?string { return $this->email; }
    public function setEmail(?string $v): self { $this->email = $v; return $this; }

    public function getPhone(): ?string { return $this->phone; }
    public function setPhone(?string $v): self { $this->phone = $v; return $this; }

    public function getAddress(): ?string { return $this->address; }
    public function setAddress(?string $v): self { $this->address = $v; return $this; }

    public function getIc(): ?string { return $this->ic; }
    public function setIc(?string $v): self { $this->ic = $v; return $this; }

    public function getDic(): ?string { return $this->dic; }
    public function setDic(?string $v): self { $this->dic = $v; return $this; }

    public function getBankAccount(): ?string { return $this->bankAccount; }
    public function setBankAccount(?string $v): self { $this->bankAccount = $v; return $this; }

    public function isActive(): bool { return $this->isActive; }
    public function setIsActive(bool $v): self { $this->isActive = $v; return $this; }

    public function getNotes(): ?string { return $this->notes; }
    public function setNotes(?string $v): self { $this->notes = $v; return $this; }

    public function getCreatedAt(): \DateTimeInterface { return $this->createdAt; }
    public function getUpdatedAt(): \DateTimeInterface { return $this->updatedAt; }

    /** @return Collection<int, TransportVehicle> */
    public function getVehicles(): Collection { return $this->vehicles; }

    /** @return Collection<int, TransportDriver> */
    public function getDrivers(): Collection { return $this->drivers; }

    /** @return Collection<int, EventTransport> */
    public function getEventTransports(): Collection { return $this->eventTransports; }
}
