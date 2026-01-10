<?php

declare(strict_types=1);

namespace App\Entity;

use App\Repository\EventBeverageRepository;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity(repositoryClass: EventBeverageRepository::class)]
#[ORM\Table(name: 'event_beverage')]
class EventBeverage
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column(type: Types::INTEGER)]
    private ?int $id = null;

    #[ORM\ManyToOne(targetEntity: Event::class, inversedBy: 'beverages')]
    #[ORM\JoinColumn(name: 'event_id', referencedColumnName: 'id', nullable: false, onDelete: 'CASCADE')]
    private ?Event $event = null;

    #[ORM\Column(type: Types::STRING, length: 255)]
    private string $beverageName;

    #[ORM\Column(type: Types::INTEGER, options: ['default' => 0])]
    private int $quantity = 0;

    #[ORM\Column(type: Types::STRING, length: 50, options: ['default' => 'bottle'])]
    private string $unit = 'bottle';

    #[ORM\Column(type: Types::DECIMAL, precision: 10, scale: 2, nullable: true)]
    private ?string $pricePerUnit = null;

    #[ORM\Column(type: Types::DECIMAL, precision: 10, scale: 2, nullable: true)]
    private ?string $totalPrice = null;

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

    public function getBeverageName(): string { return $this->beverageName; }
    public function setBeverageName(string $v): self { $this->beverageName = $v; return $this; }

    public function getQuantity(): int { return $this->quantity; }
    public function setQuantity(int $v): self { $this->quantity = $v; return $this; }

    public function getUnit(): string { return $this->unit; }
    public function setUnit(string $v): self { $this->unit = $v; return $this; }

    public function getPricePerUnit(): ?string { return $this->pricePerUnit; }
    public function setPricePerUnit(?string $v): self { $this->pricePerUnit = $v; return $this; }

    public function getTotalPrice(): ?string { return $this->totalPrice; }
    public function setTotalPrice(?string $v): self { $this->totalPrice = $v; return $this; }

    public function getNotes(): ?string { return $this->notes; }
    public function setNotes(?string $v): self { $this->notes = $v; return $this; }

    public function getCreatedAt(): \DateTimeInterface { return $this->createdAt; }
}
