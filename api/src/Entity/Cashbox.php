<?php

declare(strict_types=1);

namespace App\Entity;

use App\Repository\CashboxRepository;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity(repositoryClass: CashboxRepository::class)]
#[ORM\Table(name: 'cashbox')]
class Cashbox
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column(type: Types::INTEGER)]
    private ?int $id = null;

    #[ORM\Column(type: Types::STRING, length: 255)]
    private string $name;

    #[ORM\Column(type: Types::TEXT, nullable: true)]
    private ?string $description = null;

    #[ORM\Column(type: Types::STRING, length: 3, options: ['default' => 'CZK'])]
    private string $currency = 'CZK';

    #[ORM\Column(name: 'initial_balance', type: Types::DECIMAL, precision: 15, scale: 2, options: ['default' => 0])]
    private string $initialBalance = '0.00';

    #[ORM\Column(name: 'current_balance', type: Types::DECIMAL, precision: 15, scale: 2, options: ['default' => 0])]
    private string $currentBalance = '0.00';

    #[ORM\ManyToOne(targetEntity: Reservation::class)]
    #[ORM\JoinColumn(name: 'reservation_id', referencedColumnName: 'id', nullable: true, onDelete: 'SET NULL')]
    private ?Reservation $reservation = null;

    #[ORM\Column(name: 'opened_at', type: Types::DATETIME_MUTABLE)]
    private \DateTimeInterface $openedAt;

    #[ORM\Column(name: 'closed_at', type: Types::DATETIME_MUTABLE, nullable: true)]
    private ?\DateTimeInterface $closedAt = null;

    #[ORM\Column(name: 'is_active', type: Types::BOOLEAN, options: ['default' => true])]
    private bool $isActive = true;

    #[ORM\ManyToOne(targetEntity: User::class)]
    #[ORM\JoinColumn(name: 'user_id', referencedColumnName: 'id', nullable: true, onDelete: 'SET NULL')]
    private ?User $user = null; // kdo otevřel pokladnu

    #[ORM\Column(type: Types::TEXT, nullable: true)]
    private ?string $notes = null;

    public function __construct()
    {
        $this->openedAt = new \DateTime();
    }

    public function getId(): ?int { return $this->id; }

    public function getName(): string { return $this->name; }
    public function setName(string $name): self { $this->name = $name; return $this; }

    public function getDescription(): ?string { return $this->description; }
    public function setDescription(?string $d): self { $this->description = $d; return $this; }

    public function getCurrency(): string { return $this->currency; }
    public function setCurrency(string $c): self { $this->currency = $c; return $this; }

    public function getInitialBalance(): string { return $this->initialBalance; }
    public function setInitialBalance(string $b): self { $this->initialBalance = $b; return $this; }

    public function getCurrentBalance(): string { return $this->currentBalance; }
    public function setCurrentBalance(string $b): self { $this->currentBalance = $b; return $this; }

    public function getReservation(): ?Reservation { return $this->reservation; }
    public function setReservation(?Reservation $r): self { $this->reservation = $r; return $this; }

    public function getOpenedAt(): \DateTimeInterface { return $this->openedAt; }
    public function setOpenedAt(\DateTimeInterface $t): self { $this->openedAt = $t; return $this; }

    public function getClosedAt(): ?\DateTimeInterface { return $this->closedAt; }
    public function setClosedAt(?\DateTimeInterface $t): self { $this->closedAt = $t; return $this; }

    public function isActive(): bool { return $this->isActive; }
    public function setIsActive(bool $v): self { $this->isActive = $v; return $this; }

    public function getUser(): ?User { return $this->user; }
    public function setUser(?User $u): self { $this->user = $u; return $this; }

    public function getNotes(): ?string { return $this->notes; }
    public function setNotes(?string $n): self { $this->notes = $n; return $this; }
}
