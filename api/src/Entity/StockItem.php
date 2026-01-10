<?php
namespace App\Entity;

use App\Repository\StockItemRepository;
use Doctrine\ORM\Mapping as ORM;
use Doctrine\DBAL\Types\Types;

#[ORM\Entity(repositoryClass: StockItemRepository::class)]
#[ORM\HasLifecycleCallbacks]
#[ORM\Table(name: 'stock_item')]
class StockItem
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column(type: Types::INTEGER)]
    private ?int $id = null;

    #[ORM\Column(type: Types::STRING, length: 255)]
    private string $name;

    #[ORM\Column(type: Types::TEXT, nullable: true)]
    private ?string $description = null;

    #[ORM\Column(type: Types::STRING, length: 50, options: ['default' => 'kg'])]
    private string $unit = 'kg'; // kg, l, ks, g, ml

    #[ORM\Column(type: Types::DECIMAL, precision: 10, scale: 2, options: ['default' => 0])]
    private string $quantityAvailable = '0.00';

    #[ORM\Column(type: Types::DECIMAL, precision: 10, scale: 2, nullable: true, options: ['default' => 0])]
    private ?string $minQuantity = '0.00';

    #[ORM\Column(type: Types::DECIMAL, precision: 10, scale: 2, nullable: true)]
    private ?string $pricePerUnit = null;

    #[ORM\Column(type: Types::STRING, length: 255, nullable: true)]
    private ?string $supplier = null;

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

    #[ORM\PreUpdate]
    public function onPreUpdate(): void
    {
        $this->updatedAt = new \DateTime();
    }

    // Getters & setters
    public function getId(): ?int { return $this->id; }

    public function getName(): string { return $this->name; }
    public function setName(string $v): self { $this->name = $v; return $this; }

    public function getDescription(): ?string { return $this->description; }
    public function setDescription(?string $v): self { $this->description = $v; return $this; }

    public function getUnit(): string { return $this->unit; }
    public function setUnit(string $v): self { $this->unit = $v; return $this; }

    public function getQuantityAvailable(): string { return $this->quantityAvailable; }
    public function setQuantityAvailable(string $v): self { $this->quantityAvailable = $v; return $this; }

    public function getMinQuantity(): ?string { return $this->minQuantity; }
    public function setMinQuantity(?string $v): self { $this->minQuantity = $v; return $this; }

    public function getPricePerUnit(): ?string { return $this->pricePerUnit; }
    public function setPricePerUnit(?string $v): self { $this->pricePerUnit = $v; return $this; }

    public function getSupplier(): ?string { return $this->supplier; }
    public function setSupplier(?string $v): self { $this->supplier = $v; return $this; }

    public function getCreatedAt(): \DateTimeInterface { return $this->createdAt; }
    public function setCreatedAt(\DateTimeInterface $d): self { $this->createdAt = $d; return $this; }
    public function getUpdatedAt(): \DateTimeInterface { return $this->updatedAt; }
    public function setUpdatedAt(\DateTimeInterface $d): self { $this->updatedAt = $d; return $this; }
}
