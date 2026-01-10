<?php

namespace App\Entity;

use App\Repository\VoucherRedemptionRepository;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity(repositoryClass: VoucherRedemptionRepository::class)]
#[ORM\Table(name: 'voucher_redemption')]
class VoucherRedemption
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column(type: Types::INTEGER)]
    private ?int $id = null;

    #[ORM\ManyToOne(targetEntity: Voucher::class)]
    #[ORM\JoinColumn(name: 'voucher_id', referencedColumnName: 'id', nullable: false, onDelete: 'CASCADE')]
    private Voucher $voucher;

    #[ORM\ManyToOne(targetEntity: Reservation::class)]
    #[ORM\JoinColumn(name: 'reservation_id', referencedColumnName: 'id', nullable: true, onDelete: 'SET NULL')]
    private ?Reservation $reservation = null;

    #[ORM\Column(type: Types::DATETIME_MUTABLE)]
    private \DateTimeInterface $redeemedAt;

    #[ORM\ManyToOne(targetEntity: User::class)]
    #[ORM\JoinColumn(name: 'redeemed_by', referencedColumnName: 'id', nullable: true, onDelete: 'SET NULL')]
    private ?User $redeemedBy = null;

    #[ORM\Column(type: Types::DECIMAL, precision: 10, scale: 2, nullable: true)]
    private ?string $discountApplied = null;

    #[ORM\Column(type: Types::DECIMAL, precision: 10, scale: 2, nullable: true)]
    private ?string $originalAmount = null;

    #[ORM\Column(type: Types::DECIMAL, precision: 10, scale: 2, nullable: true)]
    private ?string $finalAmount = null;

    #[ORM\Column(type: Types::TEXT, nullable: true)]
    private ?string $notes = null;

    public function __construct()
    {
        $this->redeemedAt = new \DateTime();
    }

    public function getId(): ?int { return $this->id; }

    public function getVoucher(): Voucher { return $this->voucher; }
    public function setVoucher(Voucher $v): self { $this->voucher = $v; return $this; }

    public function getReservation(): ?Reservation { return $this->reservation; }
    public function setReservation(?Reservation $r): self { $this->reservation = $r; return $this; }

    public function getRedeemedAt(): \DateTimeInterface { return $this->redeemedAt; }
    public function setRedeemedAt(\DateTimeInterface $v): self { $this->redeemedAt = $v; return $this; }

    public function getRedeemedBy(): ?User { return $this->redeemedBy; }
    public function setRedeemedBy(?User $u): self { $this->redeemedBy = $u; return $this; }

    public function getDiscountApplied(): ?string { return $this->discountApplied; }
    public function setDiscountApplied(?string $v): self { $this->discountApplied = $v; return $this; }

    public function getOriginalAmount(): ?string { return $this->originalAmount; }
    public function setOriginalAmount(?string $v): self { $this->originalAmount = $v; return $this; }

    public function getFinalAmount(): ?string { return $this->finalAmount; }
    public function setFinalAmount(?string $v): self { $this->finalAmount = $v; return $this; }

    public function getNotes(): ?string { return $this->notes; }
    public function setNotes(?string $v): self { $this->notes = $v; return $this; }
}
