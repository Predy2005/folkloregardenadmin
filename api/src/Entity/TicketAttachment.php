<?php
declare(strict_types=1);

namespace App\Entity;

use App\Repository\TicketAttachmentRepository;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;

/**
 * Příloha k ticketu — typicky screenshot vložený přes Ctrl+V z clipboardu.
 * Soubor je v `var/uploads/tickets/` (mimo webroot), servíruje se přes
 * autentizovaný endpoint, ne přímou URL.
 */
#[ORM\Entity(repositoryClass: TicketAttachmentRepository::class)]
#[ORM\Table(name: 'ticket_attachment')]
class TicketAttachment
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column(type: Types::INTEGER)]
    private ?int $id = null;

    #[ORM\ManyToOne(targetEntity: Ticket::class, inversedBy: 'attachments')]
    #[ORM\JoinColumn(name: 'ticket_id', referencedColumnName: 'id', nullable: false, onDelete: 'CASCADE')]
    private Ticket $ticket;

    #[ORM\ManyToOne(targetEntity: TicketComment::class)]
    #[ORM\JoinColumn(name: 'comment_id', referencedColumnName: 'id', nullable: true, onDelete: 'CASCADE')]
    private ?TicketComment $comment = null;

    #[ORM\ManyToOne(targetEntity: User::class)]
    #[ORM\JoinColumn(name: 'uploaded_by_id', referencedColumnName: 'id', nullable: true, onDelete: 'SET NULL')]
    private ?User $uploadedBy = null;

    /** Originální název nebo "screenshot-YYYYMMDD-hhmmss.png" pro paste. */
    #[ORM\Column(type: Types::STRING, length: 255)]
    private string $filename = '';

    #[ORM\Column(type: Types::STRING, length: 100)]
    private string $mimeType = '';

    #[ORM\Column(type: Types::INTEGER)]
    private int $sizeBytes = 0;

    /** Cesta relativní k var/uploads/tickets/. */
    #[ORM\Column(type: Types::STRING, length: 500)]
    private string $storagePath = '';

    #[ORM\Column(type: Types::DATETIME_MUTABLE)]
    private \DateTimeInterface $createdAt;

    public function __construct()
    {
        $this->createdAt = new \DateTime();
    }

    public function getId(): ?int { return $this->id; }
    public function getTicket(): Ticket { return $this->ticket; }
    public function setTicket(Ticket $t): self { $this->ticket = $t; return $this; }
    public function getComment(): ?TicketComment { return $this->comment; }
    public function setComment(?TicketComment $c): self { $this->comment = $c; return $this; }
    public function getUploadedBy(): ?User { return $this->uploadedBy; }
    public function setUploadedBy(?User $u): self { $this->uploadedBy = $u; return $this; }
    public function getFilename(): string { return $this->filename; }
    public function setFilename(string $n): self { $this->filename = $n; return $this; }
    public function getMimeType(): string { return $this->mimeType; }
    public function setMimeType(string $m): self { $this->mimeType = $m; return $this; }
    public function getSizeBytes(): int { return $this->sizeBytes; }
    public function setSizeBytes(int $s): self { $this->sizeBytes = $s; return $this; }
    public function getStoragePath(): string { return $this->storagePath; }
    public function setStoragePath(string $p): self { $this->storagePath = $p; return $this; }
    public function getCreatedAt(): \DateTimeInterface { return $this->createdAt; }
    public function isImage(): bool { return str_starts_with($this->mimeType, 'image/'); }
}
