<?php

namespace App\Entity;

use App\Repository\VoucherRepository;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity(repositoryClass: VoucherRepository::class)]
#[ORM\Table(name: 'voucher')]
class Voucher
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column(type: Types::INTEGER)]
    private ?int $id = null;

    #[ORM\Column(type: Types::STRING, length: 50, unique: true)]
    private string $code;

    #[ORM\ManyToOne(targetEntity: Partner::class)]
    #[ORM\JoinColumn(name: 'partner_id', referencedColumnName: 'id', nullable: true, onDelete: 'SET NULL')]
    private ?Partner $partner = null;

    #[ORM\Column(type: Types::STRING, length: 50)]
    private string $voucherType; // 'PERCENTAGE', 'FIXED_AMOUNT', 'FREE_ENTRY'

    #[ORM\Column(type: Types::DECIMAL, precision: 10, scale: 2, nullable: true)]
    private ?string $discountValue = null;

    #[ORM\Column(type: Types::INTEGER, options: ['default' => 1])]
    private int $maxUses = 1;

    #[ORM\Column(type: Types::INTEGER, options: ['default' => 0])]
    private int $currentUses = 0;

    #[ORM\Column(type: Types::DATE_MUTABLE, nullable: true)]
    private ?\DateTimeInterface $validFrom = null;

    #[ORM\Column(type: Types::DATE_MUTABLE, nullable: true)]
    private ?\DateTimeInterface $validTo = null;

    #[ORM\Column(type: Types::BOOLEAN, options: ['default' => true])]
    private bool $isActive = true;

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

    public function getCode(): string { return $this->code; }
    public function setCode(string $v): self { $this->code = $v; return $this; }

    public function getPartner(): ?Partner { return $this->partner; }
    public function setPartner(?Partner $p): self { $this->partner = $p; return $this; }

    public function getVoucherType(): string { return $this->voucherType; }
    public function setVoucherType(string $v): self { $this->voucherType = $v; return $this; }

    public function getDiscountValue(): ?string { return $this->discountValue; }
    public function setDiscountValue(?string $v): self { $this->discountValue = $v; return $this; }

    public function getMaxUses(): int { return $this->maxUses; }
    public function setMaxUses(int $v): self { $this->maxUses = $v; return $this; }

    public function getCurrentUses(): int { return $this->currentUses; }
    public function setCurrentUses(int $v): self { $this->currentUses = $v; return $this; }

    public function getValidFrom(): ?\DateTimeInterface { return $this->validFrom; }
    public function setValidFrom(?\DateTimeInterface $v): self { $this->validFrom = $v; return $this; }

    public function getValidTo(): ?\DateTimeInterface { return $this->validTo; }
    public function setValidTo(?\DateTimeInterface $v): self { $this->validTo = $v; return $this; }

    public function isActive(): bool { return $this->isActive; }
    public function setIsActive(bool $v): self { $this->isActive = $v; return $this; }

    public function getNotes(): ?string { return $this->notes; }
    public function setNotes(?string $v): self { $this->notes = $v; return $this; }

    public function getCreatedAt(): \DateTimeInterface { return $this->createdAt; }
    public function setCreatedAt(\DateTimeInterface $v): self { $this->createdAt = $v; return $this; }

    public function getUpdatedAt(): \DateTimeInterface { return $this->updatedAt; }
    public function setUpdatedAt(\DateTimeInterface $v): self { $this->updatedAt = $v; return $this; }
}
