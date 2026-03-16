<?php
declare(strict_types=1);

namespace App\Entity;

use App\Repository\CashboxTransferRepository;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity(repositoryClass: CashboxTransferRepository::class)]
#[ORM\Table(name: 'cashbox_transfer')]
class CashboxTransfer
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column(type: Types::INTEGER)]
    private ?int $id = null;

    #[ORM\ManyToOne(targetEntity: Cashbox::class)]
    #[ORM\JoinColumn(name: 'source_cashbox_id', referencedColumnName: 'id', nullable: false)]
    private Cashbox $sourceCashbox;

    #[ORM\ManyToOne(targetEntity: Event::class)]
    #[ORM\JoinColumn(name: 'target_event_id', referencedColumnName: 'id', nullable: false)]
    private Event $targetEvent;

    #[ORM\Column(type: Types::DECIMAL, precision: 15, scale: 2)]
    private string $amount;

    #[ORM\Column(type: Types::STRING, length: 3, options: ['default' => 'CZK'])]
    private string $currency = 'CZK';

    #[ORM\Column(type: Types::STRING, length: 500, nullable: true)]
    private ?string $description = null;

    /** 'PENDING' | 'CONFIRMED' | 'REJECTED' */
    #[ORM\Column(type: Types::STRING, length: 20, options: ['default' => 'PENDING'])]
    private string $status = 'PENDING';

    #[ORM\ManyToOne(targetEntity: User::class)]
    #[ORM\JoinColumn(name: 'initiated_by_id', referencedColumnName: 'id', nullable: false)]
    private User $initiatedBy;

    #[ORM\ManyToOne(targetEntity: User::class)]
    #[ORM\JoinColumn(name: 'confirmed_by_id', referencedColumnName: 'id', nullable: true)]
    private ?User $confirmedBy = null;

    #[ORM\Column(type: Types::INTEGER, nullable: true)]
    private ?int $sourceMovementId = null;

    #[ORM\Column(type: Types::INTEGER, nullable: true)]
    private ?int $targetMovementId = null;

    #[ORM\Column(type: Types::INTEGER, nullable: true)]
    private ?int $refundMovementId = null;

    #[ORM\Column(type: Types::DATETIME_MUTABLE)]
    private \DateTimeInterface $initiatedAt;

    #[ORM\Column(type: Types::DATETIME_MUTABLE, nullable: true)]
    private ?\DateTimeInterface $confirmedAt = null;

    public function __construct()
    {
        $this->initiatedAt = new \DateTime();
    }

    public function getId(): ?int { return $this->id; }

    public function getSourceCashbox(): Cashbox { return $this->sourceCashbox; }
    public function setSourceCashbox(Cashbox $sourceCashbox): self { $this->sourceCashbox = $sourceCashbox; return $this; }

    public function getTargetEvent(): Event { return $this->targetEvent; }
    public function setTargetEvent(Event $targetEvent): self { $this->targetEvent = $targetEvent; return $this; }

    public function getAmount(): string { return $this->amount; }
    public function setAmount(string $amount): self { $this->amount = $amount; return $this; }

    public function getCurrency(): string { return $this->currency; }
    public function setCurrency(string $currency): self { $this->currency = $currency; return $this; }

    public function getDescription(): ?string { return $this->description; }
    public function setDescription(?string $description): self { $this->description = $description; return $this; }

    public function getStatus(): string { return $this->status; }
    public function setStatus(string $status): self { $this->status = $status; return $this; }

    public function getInitiatedBy(): User { return $this->initiatedBy; }
    public function setInitiatedBy(User $initiatedBy): self { $this->initiatedBy = $initiatedBy; return $this; }

    public function getConfirmedBy(): ?User { return $this->confirmedBy; }
    public function setConfirmedBy(?User $confirmedBy): self { $this->confirmedBy = $confirmedBy; return $this; }

    public function getSourceMovementId(): ?int { return $this->sourceMovementId; }
    public function setSourceMovementId(?int $sourceMovementId): self { $this->sourceMovementId = $sourceMovementId; return $this; }

    public function getTargetMovementId(): ?int { return $this->targetMovementId; }
    public function setTargetMovementId(?int $targetMovementId): self { $this->targetMovementId = $targetMovementId; return $this; }

    public function getRefundMovementId(): ?int { return $this->refundMovementId; }
    public function setRefundMovementId(?int $refundMovementId): self { $this->refundMovementId = $refundMovementId; return $this; }

    public function getInitiatedAt(): \DateTimeInterface { return $this->initiatedAt; }

    public function getConfirmedAt(): ?\DateTimeInterface { return $this->confirmedAt; }
    public function setConfirmedAt(?\DateTimeInterface $confirmedAt): self { $this->confirmedAt = $confirmedAt; return $this; }
}
