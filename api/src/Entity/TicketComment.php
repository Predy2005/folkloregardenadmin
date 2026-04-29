<?php
declare(strict_types=1);

namespace App\Entity;

use App\Repository\TicketCommentRepository;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity(repositoryClass: TicketCommentRepository::class)]
#[ORM\Table(name: 'ticket_comment')]
class TicketComment
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column(type: Types::INTEGER)]
    private ?int $id = null;

    #[ORM\ManyToOne(targetEntity: Ticket::class, inversedBy: 'comments')]
    #[ORM\JoinColumn(name: 'ticket_id', referencedColumnName: 'id', nullable: false, onDelete: 'CASCADE')]
    private Ticket $ticket;

    #[ORM\ManyToOne(targetEntity: User::class)]
    #[ORM\JoinColumn(name: 'author_id', referencedColumnName: 'id', nullable: true, onDelete: 'SET NULL')]
    private ?User $author = null;

    #[ORM\Column(type: Types::TEXT)]
    private string $content = '';

    /** Pokud true, komentář je interní (jen pro developera) — UI zobrazí jiným stylem. */
    #[ORM\Column(type: Types::BOOLEAN, options: ['default' => false])]
    private bool $isInternal = false;

    #[ORM\Column(type: Types::DATETIME_MUTABLE)]
    private \DateTimeInterface $createdAt;

    public function __construct()
    {
        $this->createdAt = new \DateTime();
    }

    public function getId(): ?int { return $this->id; }
    public function getTicket(): Ticket { return $this->ticket; }
    public function setTicket(Ticket $t): self { $this->ticket = $t; return $this; }
    public function getAuthor(): ?User { return $this->author; }
    public function setAuthor(?User $u): self { $this->author = $u; return $this; }
    public function getContent(): string { return $this->content; }
    public function setContent(string $c): self { $this->content = $c; return $this; }
    public function isInternal(): bool { return $this->isInternal; }
    public function setIsInternal(bool $v): self { $this->isInternal = $v; return $this; }
    public function getCreatedAt(): \DateTimeInterface { return $this->createdAt; }
}
