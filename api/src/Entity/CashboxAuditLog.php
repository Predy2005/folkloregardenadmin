<?php

namespace App\Entity;

use App\Repository\CashboxAuditLogRepository;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity(repositoryClass: CashboxAuditLogRepository::class)]
#[ORM\Table(name: 'cashbox_audit_log')]
#[ORM\Index(name: 'idx_audit_cashbox', columns: ['cashbox_id'])]
#[ORM\Index(name: 'idx_audit_created', columns: ['created_at'])]
class CashboxAuditLog
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column(type: Types::INTEGER)]
    private ?int $id = null;

    #[ORM\ManyToOne(targetEntity: Cashbox::class)]
    #[ORM\JoinColumn(name: 'cashbox_id', nullable: true, onDelete: 'SET NULL')]
    private ?Cashbox $cashbox = null;

    #[ORM\ManyToOne(targetEntity: User::class)]
    #[ORM\JoinColumn(name: 'user_id', nullable: true, onDelete: 'SET NULL')]
    private ?User $user = null;

    #[ORM\Column(type: Types::STRING, length: 50)]
    private string $action; // MOVEMENT_CREATE, MOVEMENT_EDIT, MOVEMENT_DELETE, TRANSFER_CREATE, etc.

    #[ORM\Column(name: 'entity_type', type: Types::STRING, length: 50)]
    private string $entityType; // CashMovement, CashboxTransfer, Cashbox

    #[ORM\Column(name: 'entity_id', type: Types::INTEGER, nullable: true)]
    private ?int $entityId = null;

    #[ORM\Column(name: 'change_data', type: Types::JSON, nullable: true)]
    private ?array $changeData = null;

    #[ORM\Column(type: Types::TEXT, nullable: true)]
    private ?string $description = null;

    #[ORM\Column(name: 'ip_address', type: Types::STRING, length: 45, nullable: true)]
    private ?string $ipAddress = null;

    #[ORM\Column(name: 'created_at', type: Types::DATETIME_MUTABLE)]
    private \DateTimeInterface $createdAt;

    public function __construct()
    {
        $this->createdAt = new \DateTime();
    }

    // Getters and setters for all fields
    public function getId(): ?int { return $this->id; }

    public function getCashbox(): ?Cashbox { return $this->cashbox; }
    public function setCashbox(?Cashbox $cashbox): self { $this->cashbox = $cashbox; return $this; }

    public function getUser(): ?User { return $this->user; }
    public function setUser(?User $user): self { $this->user = $user; return $this; }

    public function getAction(): string { return $this->action; }
    public function setAction(string $action): self { $this->action = $action; return $this; }

    public function getEntityType(): string { return $this->entityType; }
    public function setEntityType(string $entityType): self { $this->entityType = $entityType; return $this; }

    public function getEntityId(): ?int { return $this->entityId; }
    public function setEntityId(?int $entityId): self { $this->entityId = $entityId; return $this; }

    public function getChangeData(): ?array { return $this->changeData; }
    public function setChangeData(?array $changeData): self { $this->changeData = $changeData; return $this; }

    public function getDescription(): ?string { return $this->description; }
    public function setDescription(?string $description): self { $this->description = $description; return $this; }

    public function getIpAddress(): ?string { return $this->ipAddress; }
    public function setIpAddress(?string $ipAddress): self { $this->ipAddress = $ipAddress; return $this; }

    public function getCreatedAt(): \DateTimeInterface { return $this->createdAt; }
}
