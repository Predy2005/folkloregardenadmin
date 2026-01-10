<?php

namespace App\Entity;

use App\Repository\CommissionLogRepository;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity(repositoryClass: CommissionLogRepository::class)]
#[ORM\Table(name: 'commission_log')]
class CommissionLog
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column(type: Types::INTEGER)]
    private ?int $id = null;

    #[ORM\ManyToOne(targetEntity: Partner::class)]
    #[ORM\JoinColumn(name: 'partner_id', referencedColumnName: 'id', nullable: false, onDelete: 'CASCADE')]
    private Partner $partner;

    #[ORM\ManyToOne(targetEntity: Voucher::class)]
    #[ORM\JoinColumn(name: 'voucher_id', referencedColumnName: 'id', nullable: true, onDelete: 'SET NULL')]
    private ?Voucher $voucher = null;

    #[ORM\ManyToOne(targetEntity: Reservation::class)]
    #[ORM\JoinColumn(name: 'reservation_id', referencedColumnName: 'id', nullable: true, onDelete: 'SET NULL')]
    private ?Reservation $reservation = null;

    #[ORM\Column(type: Types::STRING, length: 50)]
    private string $commissionType; // 'VOUCHER_REDEMPTION', 'BOOKING', 'EVENT'

    #[ORM\Column(type: Types::DECIMAL, precision: 10, scale: 2)]
    private string $baseAmount;

    #[ORM\Column(type: Types::DECIMAL, precision: 5, scale: 2, nullable: true)]
    private ?string $commissionRate = null;

    #[ORM\Column(type: Types::DECIMAL, precision: 10, scale: 2)]
    private string $commissionAmount;

    #[ORM\Column(type: Types::STRING, length: 50, options: ['default' => 'PENDING'])]
    private string $paymentStatus = 'PENDING';

    #[ORM\Column(type: Types::STRING, length: 50, nullable: true)]
    private ?string $paymentMethod = null; // 'BANK_TRANSFER', 'CASH', 'INVOICE'

    #[ORM\Column(type: Types::DATETIME_MUTABLE, nullable: true)]
    private ?\DateTimeInterface $paidAt = null;

    #[ORM\Column(type: Types::TEXT, nullable: true)]
    private ?string $notes = null;

    #[ORM\Column(type: Types::DATETIME_MUTABLE)]
    private \DateTimeInterface $createdAt;

    #[ORM\Column(type: Types::DATETIME_MUTABLE)]
    private \DateTimeInterface $updatedAt;

    public function __construct()
    {
        $this->createdAt = new \DateTime();
        $this->updatedAt = new \DateTime();
    }

    public function getId(): ?int { return $this->id; }

    public function getPartner(): Partner { return $this->partner; }
    public function setPartner(Partner $p): self { $this->partner = $p; return $this; }

    public function getVoucher(): ?Voucher { return $this->voucher; }
    public function setVoucher(?Voucher $v): self { $this->voucher = $v; return $this; }

    public function getReservation(): ?Reservation { return $this->reservation; }
    public function setReservation(?Reservation $r): self { $this->reservation = $r; return $this; }

    public function getCommissionType(): string { return $this->commissionType; }
    public function setCommissionType(string $v): self { $this->commissionType = $v; return $this; }

    public function getBaseAmount(): string { return $this->baseAmount; }
    public function setBaseAmount(string $v): self { $this->baseAmount = $v; return $this; }

    public function getCommissionRate(): ?string { return $this->commissionRate; }
    public function setCommissionRate(?string $v): self { $this->commissionRate = $v; return $this; }

    public function getCommissionAmount(): string { return $this->commissionAmount; }
    public function setCommissionAmount(string $v): self { $this->commissionAmount = $v; return $this; }

    public function getPaymentStatus(): string { return $this->paymentStatus; }
    public function setPaymentStatus(string $v): self { $this->paymentStatus = $v; return $this; }

    public function getPaymentMethod(): ?string { return $this->paymentMethod; }
    public function setPaymentMethod(?string $v): self { $this->paymentMethod = $v; return $this; }

    public function getPaidAt(): ?\DateTimeInterface { return $this->paidAt; }
    public function setPaidAt(?\DateTimeInterface $v): self { $this->paidAt = $v; return $this; }

    public function getNotes(): ?string { return $this->notes; }
    public function setNotes(?string $v): self { $this->notes = $v; return $this; }

    public function getCreatedAt(): \DateTimeInterface { return $this->createdAt; }
    public function setCreatedAt(\DateTimeInterface $v): self { $this->createdAt = $v; return $this; }

    public function getUpdatedAt(): \DateTimeInterface { return $this->updatedAt; }
    public function setUpdatedAt(\DateTimeInterface $v): self { $this->updatedAt = $v; return $this; }
}
