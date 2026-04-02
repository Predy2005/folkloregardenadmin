<?php

declare(strict_types=1);

namespace App\Entity;

use App\Repository\TableExpenseRepository;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity(repositoryClass: TableExpenseRepository::class)]
#[ORM\Table(name: 'table_expense')]
#[ORM\HasLifecycleCallbacks]
class TableExpense
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column(type: Types::INTEGER)]
    private ?int $id = null;

    #[ORM\ManyToOne(targetEntity: EventTable::class)]
    #[ORM\JoinColumn(name: 'event_table_id', referencedColumnName: 'id', nullable: false, onDelete: 'CASCADE')]
    private ?EventTable $eventTable = null;

    #[ORM\ManyToOne(targetEntity: Event::class)]
    #[ORM\JoinColumn(name: 'event_id', referencedColumnName: 'id', nullable: false, onDelete: 'CASCADE')]
    private ?Event $event = null;

    #[ORM\Column(type: Types::STRING, length: 255)]
    private string $description;

    // 'food' | 'drink' | 'service' | 'other'
    #[ORM\Column(type: Types::STRING, length: 50, options: ['default' => 'other'])]
    private string $category = 'other';

    #[ORM\Column(type: Types::INTEGER, options: ['default' => 1])]
    private int $quantity = 1;

    #[ORM\Column(name: 'unit_price', type: Types::DECIMAL, precision: 10, scale: 2)]
    private string $unitPrice = '0.00';

    #[ORM\Column(name: 'total_price', type: Types::DECIMAL, precision: 10, scale: 2)]
    private string $totalPrice = '0.00';

    #[ORM\Column(type: Types::STRING, length: 3, options: ['default' => 'CZK'])]
    private string $currency = 'CZK';

    #[ORM\Column(name: 'is_paid', type: Types::BOOLEAN, options: ['default' => false])]
    private bool $isPaid = false;

    #[ORM\Column(name: 'paid_at', type: Types::DATETIME_MUTABLE, nullable: true)]
    private ?\DateTimeInterface $paidAt = null;

    #[ORM\ManyToOne(targetEntity: User::class)]
    #[ORM\JoinColumn(name: 'created_by', referencedColumnName: 'id', nullable: true, onDelete: 'SET NULL')]
    private ?User $createdBy = null;

    #[ORM\Column(type: Types::DATETIME_MUTABLE)]
    private \DateTimeInterface $createdAt;

    #[ORM\Column(type: Types::DATETIME_MUTABLE)]
    private \DateTimeInterface $updatedAt;

    public function __construct()
    {
        $now = new \DateTime();
        $this->createdAt = $now;
        $this->updatedAt = $now;
    }

    #[ORM\PrePersist]
    public function onPrePersist(): void
    {
        $now = new \DateTime();
        $this->createdAt = $this->createdAt ?? $now;
        $this->updatedAt = $now;
        $this->recalcTotal();
    }

    #[ORM\PreUpdate]
    public function onPreUpdate(): void
    {
        $this->updatedAt = new \DateTime();
        $this->recalcTotal();
    }

    private function recalcTotal(): void
    {
        $this->totalPrice = bcmul($this->unitPrice, (string)$this->quantity, 2);
    }

    public function getId(): ?int { return $this->id; }

    public function getEventTable(): ?EventTable { return $this->eventTable; }
    public function setEventTable(?EventTable $v): self { $this->eventTable = $v; return $this; }

    public function getEvent(): ?Event { return $this->event; }
    public function setEvent(?Event $v): self { $this->event = $v; return $this; }

    public function getDescription(): string { return $this->description; }
    public function setDescription(string $v): self { $this->description = $v; return $this; }

    public function getCategory(): string { return $this->category; }
    public function setCategory(string $v): self { $this->category = $v; return $this; }

    public function getQuantity(): int { return $this->quantity; }
    public function setQuantity(int $v): self { $this->quantity = $v; $this->recalcTotal(); return $this; }

    public function getUnitPrice(): string { return $this->unitPrice; }
    public function setUnitPrice(string $v): self { $this->unitPrice = $v; $this->recalcTotal(); return $this; }

    public function getTotalPrice(): string { return $this->totalPrice; }

    public function getCurrency(): string { return $this->currency; }
    public function setCurrency(string $v): self { $this->currency = $v; return $this; }

    public function isPaid(): bool { return $this->isPaid; }
    public function setIsPaid(bool $v): self { $this->isPaid = $v; return $this; }

    public function getPaidAt(): ?\DateTimeInterface { return $this->paidAt; }
    public function setPaidAt(?\DateTimeInterface $v): self { $this->paidAt = $v; return $this; }

    public function getCreatedBy(): ?User { return $this->createdBy; }
    public function setCreatedBy(?User $v): self { $this->createdBy = $v; return $this; }

    public function getCreatedAt(): \DateTimeInterface { return $this->createdAt; }
    public function getUpdatedAt(): \DateTimeInterface { return $this->updatedAt; }
}
