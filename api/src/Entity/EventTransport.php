<?php

declare(strict_types=1);

namespace App\Entity;

use App\Repository\EventTransportRepository;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity(repositoryClass: EventTransportRepository::class)]
#[ORM\Table(name: 'event_transport')]
#[ORM\HasLifecycleCallbacks]
class EventTransport
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column(type: Types::INTEGER)]
    private ?int $id = null;

    #[ORM\ManyToOne(targetEntity: Event::class, inversedBy: 'transportAssignments')]
    #[ORM\JoinColumn(name: 'event_id', referencedColumnName: 'id', nullable: false, onDelete: 'CASCADE')]
    private ?Event $event = null;

    #[ORM\ManyToOne(targetEntity: TransportCompany::class, inversedBy: 'eventTransports')]
    #[ORM\JoinColumn(name: 'company_id', referencedColumnName: 'id', nullable: false, onDelete: 'CASCADE')]
    private ?TransportCompany $company = null;

    #[ORM\ManyToOne(targetEntity: TransportVehicle::class)]
    #[ORM\JoinColumn(name: 'vehicle_id', referencedColumnName: 'id', nullable: true, onDelete: 'SET NULL')]
    private ?TransportVehicle $vehicle = null;

    #[ORM\ManyToOne(targetEntity: TransportDriver::class)]
    #[ORM\JoinColumn(name: 'driver_id', referencedColumnName: 'id', nullable: true, onDelete: 'SET NULL')]
    private ?TransportDriver $driver = null;

    #[ORM\Column(name: 'transport_type', type: Types::STRING, length: 50, nullable: true)]
    private ?string $transportType = null;

    #[ORM\Column(name: 'scheduled_time', type: Types::TIME_MUTABLE, nullable: true)]
    private ?\DateTimeInterface $scheduledTime = null;

    #[ORM\Column(name: 'pickup_location', type: Types::STRING, length: 255, nullable: true)]
    private ?string $pickupLocation = null;

    #[ORM\Column(name: 'dropoff_location', type: Types::STRING, length: 255, nullable: true)]
    private ?string $dropoffLocation = null;

    #[ORM\Column(name: 'passenger_count', type: Types::INTEGER, nullable: true)]
    private ?int $passengerCount = null;

    #[ORM\Column(type: Types::DECIMAL, precision: 15, scale: 2, nullable: true)]
    private ?string $price = null;

    #[ORM\Column(name: 'payment_status', type: Types::STRING, length: 50, options: ['default' => 'PENDING'])]
    private string $paymentStatus = 'PENDING';

    #[ORM\Column(name: 'invoice_number', type: Types::STRING, length: 100, nullable: true)]
    private ?string $invoiceNumber = null;

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

    public function getEvent(): ?Event { return $this->event; }
    public function setEvent(?Event $v): self { $this->event = $v; return $this; }

    public function getCompany(): ?TransportCompany { return $this->company; }
    public function setCompany(?TransportCompany $v): self { $this->company = $v; return $this; }

    public function getVehicle(): ?TransportVehicle { return $this->vehicle; }
    public function setVehicle(?TransportVehicle $v): self { $this->vehicle = $v; return $this; }

    public function getDriver(): ?TransportDriver { return $this->driver; }
    public function setDriver(?TransportDriver $v): self { $this->driver = $v; return $this; }

    public function getTransportType(): ?string { return $this->transportType; }
    public function setTransportType(?string $v): self { $this->transportType = $v; return $this; }

    public function getScheduledTime(): ?\DateTimeInterface { return $this->scheduledTime; }
    public function setScheduledTime(?\DateTimeInterface $v): self { $this->scheduledTime = $v; return $this; }

    public function getPickupLocation(): ?string { return $this->pickupLocation; }
    public function setPickupLocation(?string $v): self { $this->pickupLocation = $v; return $this; }

    public function getDropoffLocation(): ?string { return $this->dropoffLocation; }
    public function setDropoffLocation(?string $v): self { $this->dropoffLocation = $v; return $this; }

    public function getPassengerCount(): ?int { return $this->passengerCount; }
    public function setPassengerCount(?int $v): self { $this->passengerCount = $v; return $this; }

    public function getPrice(): ?string { return $this->price; }
    public function setPrice(?string $v): self { $this->price = $v; return $this; }

    public function getPaymentStatus(): string { return $this->paymentStatus; }
    public function setPaymentStatus(string $v): self { $this->paymentStatus = $v; return $this; }

    public function getInvoiceNumber(): ?string { return $this->invoiceNumber; }
    public function setInvoiceNumber(?string $v): self { $this->invoiceNumber = $v; return $this; }

    public function getNotes(): ?string { return $this->notes; }
    public function setNotes(?string $v): self { $this->notes = $v; return $this; }

    public function getCreatedAt(): \DateTimeInterface { return $this->createdAt; }
    public function getUpdatedAt(): \DateTimeInterface { return $this->updatedAt; }
}
