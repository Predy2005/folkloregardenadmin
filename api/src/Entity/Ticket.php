<?php
declare(strict_types=1);

namespace App\Entity;

use App\Repository\TicketRepository;
use Doctrine\Common\Collections\ArrayCollection;
use Doctrine\Common\Collections\Collection;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;

/**
 * Interní ticket / TODO pro hlášení chyb a požadavků v systému.
 * Slouží jako náhrada Excel TODO listu — admin/manager hlásí, developer řeší.
 */
#[ORM\Entity(repositoryClass: TicketRepository::class)]
#[ORM\Table(name: 'ticket')]
#[ORM\HasLifecycleCallbacks]
class Ticket
{
    public const STATUS_OPEN = 'OPEN';
    public const STATUS_IN_PROGRESS = 'IN_PROGRESS';
    public const STATUS_WAITING = 'WAITING_FOR_INFO';
    public const STATUS_RESOLVED = 'RESOLVED';
    public const STATUS_CLOSED = 'CLOSED';
    public const STATUS_WONTFIX = 'WONTFIX';

    public const PRIORITY_LOW = 'LOW';
    public const PRIORITY_NORMAL = 'NORMAL';
    public const PRIORITY_HIGH = 'HIGH';
    public const PRIORITY_CRITICAL = 'CRITICAL';

    public const TYPE_BUG = 'BUG';
    public const TYPE_FEATURE = 'FEATURE';
    public const TYPE_QUESTION = 'QUESTION';
    public const TYPE_IMPROVEMENT = 'IMPROVEMENT';

    public const SOURCE_MANUAL = 'MANUAL';
    public const SOURCE_AUTO = 'AUTO_ERROR_LOG';

    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column(type: Types::INTEGER)]
    private ?int $id = null;

    #[ORM\Column(type: Types::STRING, length: 255)]
    private string $title = '';

    #[ORM\Column(type: Types::TEXT, nullable: true)]
    private ?string $description = null;

    #[ORM\Column(type: Types::STRING, length: 30)]
    private string $status = self::STATUS_OPEN;

    #[ORM\Column(type: Types::STRING, length: 20)]
    private string $priority = self::PRIORITY_NORMAL;

    #[ORM\Column(type: Types::STRING, length: 20)]
    private string $type = self::TYPE_BUG;

    #[ORM\Column(type: Types::STRING, length: 30)]
    private string $source = self::SOURCE_MANUAL;

    /** Volitelný tag pro kategorizaci (např. modul: "events", "reservations"). */
    #[ORM\Column(type: Types::STRING, length: 50, nullable: true)]
    private ?string $module = null;

    #[ORM\ManyToOne(targetEntity: User::class)]
    #[ORM\JoinColumn(name: 'created_by_id', referencedColumnName: 'id', nullable: true, onDelete: 'SET NULL')]
    private ?User $createdBy = null;

    #[ORM\ManyToOne(targetEntity: User::class)]
    #[ORM\JoinColumn(name: 'assigned_to_id', referencedColumnName: 'id', nullable: true, onDelete: 'SET NULL')]
    private ?User $assignedTo = null;

    // ── Pole pro auto-error capture (source = AUTO_ERROR_LOG) ──
    #[ORM\Column(type: Types::STRING, length: 64, nullable: true, unique: true)]
    private ?string $errorHash = null;

    #[ORM\Column(type: Types::STRING, length: 255, nullable: true)]
    private ?string $errorClass = null;

    #[ORM\Column(type: Types::TEXT, nullable: true)]
    private ?string $stackTrace = null;

    #[ORM\Column(type: Types::STRING, length: 500, nullable: true)]
    private ?string $requestUrl = null;

    #[ORM\Column(type: Types::INTEGER, nullable: true)]
    private ?int $httpStatus = null;

    #[ORM\Column(type: Types::INTEGER, options: ['default' => 1])]
    private int $occurrenceCount = 1;

    #[ORM\Column(type: Types::DATETIME_MUTABLE)]
    private \DateTimeInterface $createdAt;

    #[ORM\Column(type: Types::DATETIME_MUTABLE)]
    private \DateTimeInterface $updatedAt;

    #[ORM\Column(type: Types::DATETIME_MUTABLE, nullable: true)]
    private ?\DateTimeInterface $resolvedAt = null;

    #[ORM\Column(type: Types::DATETIME_MUTABLE, nullable: true)]
    private ?\DateTimeInterface $lastOccurrenceAt = null;

    #[ORM\OneToMany(mappedBy: 'ticket', targetEntity: TicketComment::class, cascade: ['remove'], orphanRemoval: true)]
    #[ORM\OrderBy(['createdAt' => 'ASC'])]
    private Collection $comments;

    #[ORM\OneToMany(mappedBy: 'ticket', targetEntity: TicketAttachment::class, cascade: ['remove'], orphanRemoval: true)]
    #[ORM\OrderBy(['createdAt' => 'ASC'])]
    private Collection $attachments;

    public function __construct()
    {
        $this->createdAt = new \DateTime();
        $this->updatedAt = new \DateTime();
        $this->comments = new ArrayCollection();
        $this->attachments = new ArrayCollection();
    }

    #[ORM\PreUpdate]
    public function onPreUpdate(): void
    {
        $this->updatedAt = new \DateTime();
    }

    public function getId(): ?int { return $this->id; }
    public function getTitle(): string { return $this->title; }
    public function setTitle(string $v): self { $this->title = $v; return $this; }
    public function getDescription(): ?string { return $this->description; }
    public function setDescription(?string $v): self { $this->description = $v; return $this; }
    public function getStatus(): string { return $this->status; }
    public function setStatus(string $v): self {
        $this->status = $v;
        if ($v === self::STATUS_RESOLVED || $v === self::STATUS_CLOSED || $v === self::STATUS_WONTFIX) {
            if ($this->resolvedAt === null) $this->resolvedAt = new \DateTime();
        } else {
            $this->resolvedAt = null;
        }
        return $this;
    }
    public function getPriority(): string { return $this->priority; }
    public function setPriority(string $v): self { $this->priority = $v; return $this; }
    public function getType(): string { return $this->type; }
    public function setType(string $v): self { $this->type = $v; return $this; }
    public function getSource(): string { return $this->source; }
    public function setSource(string $v): self { $this->source = $v; return $this; }
    public function getModule(): ?string { return $this->module; }
    public function setModule(?string $v): self { $this->module = $v; return $this; }
    public function getCreatedBy(): ?User { return $this->createdBy; }
    public function setCreatedBy(?User $v): self { $this->createdBy = $v; return $this; }
    public function getAssignedTo(): ?User { return $this->assignedTo; }
    public function setAssignedTo(?User $v): self { $this->assignedTo = $v; return $this; }
    public function getErrorHash(): ?string { return $this->errorHash; }
    public function setErrorHash(?string $v): self { $this->errorHash = $v; return $this; }
    public function getErrorClass(): ?string { return $this->errorClass; }
    public function setErrorClass(?string $v): self { $this->errorClass = $v; return $this; }
    public function getStackTrace(): ?string { return $this->stackTrace; }
    public function setStackTrace(?string $v): self { $this->stackTrace = $v; return $this; }
    public function getRequestUrl(): ?string { return $this->requestUrl; }
    public function setRequestUrl(?string $v): self { $this->requestUrl = $v; return $this; }
    public function getHttpStatus(): ?int { return $this->httpStatus; }
    public function setHttpStatus(?int $v): self { $this->httpStatus = $v; return $this; }
    public function getOccurrenceCount(): int { return $this->occurrenceCount; }
    public function setOccurrenceCount(int $v): self { $this->occurrenceCount = $v; return $this; }
    public function incrementOccurrence(): self { $this->occurrenceCount++; $this->lastOccurrenceAt = new \DateTime(); return $this; }
    public function getCreatedAt(): \DateTimeInterface { return $this->createdAt; }
    public function getUpdatedAt(): \DateTimeInterface { return $this->updatedAt; }
    public function getResolvedAt(): ?\DateTimeInterface { return $this->resolvedAt; }
    public function getLastOccurrenceAt(): ?\DateTimeInterface { return $this->lastOccurrenceAt; }
    public function setLastOccurrenceAt(?\DateTimeInterface $v): self { $this->lastOccurrenceAt = $v; return $this; }
    public function getComments(): Collection { return $this->comments; }
    public function getAttachments(): Collection { return $this->attachments; }
}
