<?php

declare(strict_types=1);

namespace App\Entity;

use App\Repository\CashMovementRepository;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity(repositoryClass: CashMovementRepository::class)]
#[ORM\Table(name: 'cash_movement')]
class CashMovement
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column(type: Types::INTEGER)]
    private ?int $id = null;

    #[ORM\ManyToOne(targetEntity: Cashbox::class)]
    #[ORM\JoinColumn(name: 'cashbox_id', referencedColumnName: 'id', nullable: false, onDelete: 'CASCADE')]
    private ?Cashbox $cashbox = null;

    // 'INCOME' | 'EXPENSE'
    #[ORM\Column(name: 'movement_type', type: Types::STRING, length: 50)]
    private string $movementType;

    #[ORM\Column(type: Types::STRING, length: 100, nullable: true)]
    private ?string $category = null;

    #[ORM\Column(type: Types::DECIMAL, precision: 15, scale: 2)]
    private string $amount;

    #[ORM\Column(type: Types::STRING, length: 3, options: ['default' => 'CZK'])]
    private string $currency = 'CZK';

    #[ORM\Column(type: Types::TEXT, nullable: true)]
    private ?string $description = null;

    #[ORM\Column(name: 'payment_method', type: Types::STRING, length: 50, nullable: true)]
    private ?string $paymentMethod = null;

    #[ORM\Column(name: 'reference_id', type: Types::STRING, length: 100, nullable: true)]
    private ?string $referenceId = null;

    #[ORM\ManyToOne(targetEntity: Reservation::class)]
    #[ORM\JoinColumn(name: 'reservation_id', referencedColumnName: 'id', nullable: true, onDelete: 'SET NULL')]
    private ?Reservation $reservation = null;

    #[ORM\ManyToOne(targetEntity: User::class)]
    #[ORM\JoinColumn(name: 'user_id', referencedColumnName: 'id', nullable: true, onDelete: 'SET NULL')]
    private ?User $user = null;

    #[ORM\Column(name: 'staff_member_id', type: Types::INTEGER, nullable: true)]
    private ?int $staffMemberId = null;

    #[ORM\Column(name: 'event_staff_assignment_id', type: Types::INTEGER, nullable: true)]
    private ?int $eventStaffAssignmentId = null;

    #[ORM\Column(name: 'created_at', type: Types::DATETIME_MUTABLE)]
    private \DateTimeInterface $createdAt;

    public function __construct()
    {
        $this->createdAt = new \DateTime();
    }

    public function getId(): ?int { return $this->id; }

    public function getCashbox(): ?Cashbox { return $this->cashbox; }
    public function setCashbox(?Cashbox $c): self { $this->cashbox = $c; return $this; }

    public function getMovementType(): string { return $this->movementType; }
    public function setMovementType(string $t): self { $this->movementType = $t; return $this; }

    public function getCategory(): ?string { return $this->category; }
    public function setCategory(?string $c): self { $this->category = $c; return $this; }

    public function getAmount(): string { return $this->amount; }
    public function setAmount(string $a): self { $this->amount = $a; return $this; }

    public function getCurrency(): string { return $this->currency; }
    public function setCurrency(string $c): self { $this->currency = $c; return $this; }

    public function getDescription(): ?string { return $this->description; }
    public function setDescription(?string $d): self { $this->description = $d; return $this; }

    public function getPaymentMethod(): ?string { return $this->paymentMethod; }
    public function setPaymentMethod(?string $p): self { $this->paymentMethod = $p; return $this; }

    public function getReferenceId(): ?string { return $this->referenceId; }
    public function setReferenceId(?string $r): self { $this->referenceId = $r; return $this; }

    public function getReservation(): ?Reservation { return $this->reservation; }
    public function setReservation(?Reservation $r): self { $this->reservation = $r; return $this; }

    public function getUser(): ?User { return $this->user; }
    public function setUser(?User $u): self { $this->user = $u; return $this; }

    public function getStaffMemberId(): ?int { return $this->staffMemberId; }
    public function setStaffMemberId(?int $v): self { $this->staffMemberId = $v; return $this; }

    public function getEventStaffAssignmentId(): ?int { return $this->eventStaffAssignmentId; }
    public function setEventStaffAssignmentId(?int $v): self { $this->eventStaffAssignmentId = $v; return $this; }

    public function getCreatedAt(): \DateTimeInterface { return $this->createdAt; }
}
