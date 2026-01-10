<?php

declare(strict_types=1);

namespace App\Entity;

use App\Repository\EventVoucherRepository;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity(repositoryClass: EventVoucherRepository::class)]
#[ORM\Table(name: 'event_voucher')]
class EventVoucher
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column(type: Types::INTEGER)]
    private ?int $id = null;

    #[ORM\ManyToOne(targetEntity: Event::class, inversedBy: 'vouchers')]
    #[ORM\JoinColumn(name: 'event_id', referencedColumnName: 'id', nullable: false, onDelete: 'CASCADE')]
    private ?Event $event = null;

    // Keep voucher as scalar ID for now
    #[ORM\Column(type: Types::INTEGER)]
    private int $voucherId;

    #[ORM\Column(type: Types::INTEGER, options: ['default' => 1])]
    private int $quantity = 1;

    #[ORM\Column(type: Types::BOOLEAN, options: ['default' => false])]
    private bool $validated = false;

    #[ORM\Column(type: Types::DATETIME_MUTABLE, nullable: true)]
    private ?\DateTimeInterface $validatedAt = null;

    #[ORM\ManyToOne(targetEntity: User::class)]
    #[ORM\JoinColumn(name: 'validated_by', referencedColumnName: 'id', nullable: true, onDelete: 'SET NULL')]
    private ?User $validatedBy = null;

    #[ORM\Column(type: Types::TEXT, nullable: true)]
    private ?string $notes = null;

    #[ORM\Column(type: Types::DATETIME_MUTABLE)]
    private \DateTimeInterface $createdAt;

    public function __construct()
    {
        $this->createdAt = new \DateTime();
    }

    public function getId(): ?int { return $this->id; }
    public function getEvent(): ?Event { return $this->event; }
    public function setEvent(?Event $event): self { $this->event = $event; return $this; }

    public function getVoucherId(): int { return $this->voucherId; }
    public function setVoucherId(int $v): self { $this->voucherId = $v; return $this; }

    public function getQuantity(): int { return $this->quantity; }
    public function setQuantity(int $v): self { $this->quantity = $v; return $this; }

    public function isValidated(): bool { return $this->validated; }
    public function setValidated(bool $v): self { $this->validated = $v; return $this; }

    public function getValidatedAt(): ?\DateTimeInterface { return $this->validatedAt; }
    public function setValidatedAt(?\DateTimeInterface $v): self { $this->validatedAt = $v; return $this; }

    public function getValidatedBy(): ?User { return $this->validatedBy; }
    public function setValidatedBy(?User $u): self { $this->validatedBy = $u; return $this; }

    public function getNotes(): ?string { return $this->notes; }
    public function setNotes(?string $v): self { $this->notes = $v; return $this; }

    public function getCreatedAt(): \DateTimeInterface { return $this->createdAt; }
}
