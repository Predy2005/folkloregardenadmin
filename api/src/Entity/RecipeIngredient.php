<?php
namespace App\Entity;

use App\Repository\RecipeIngredientRepository;
use Doctrine\ORM\Mapping as ORM;
use Doctrine\DBAL\Types\Types;

#[ORM\Entity(repositoryClass: RecipeIngredientRepository::class)]
#[ORM\Table(name: 'recipe_ingredient')]
class RecipeIngredient
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column(type: Types::INTEGER)]
    private ?int $id = null;

    #[ORM\ManyToOne(targetEntity: Recipe::class, inversedBy: 'ingredients')]
    #[ORM\JoinColumn(name: 'recipe_id', referencedColumnName: 'id', nullable: false, onDelete: 'CASCADE')]
    private ?Recipe $recipe = null;

    #[ORM\ManyToOne(targetEntity: StockItem::class)]
    #[ORM\JoinColumn(name: 'stock_item_id', referencedColumnName: 'id', nullable: false, onDelete: 'CASCADE')]
    private ?StockItem $stockItem = null;

    #[ORM\Column(type: Types::DECIMAL, precision: 10, scale: 2)]
    private string $quantityRequired = '0.00';

    #[ORM\Column(type: Types::DATETIME_MUTABLE)]
    private \DateTimeInterface $createdAt;

    public function __construct()
    {
        $this->createdAt = new \DateTime();
    }

    public function getId(): ?int { return $this->id; }

    public function getRecipe(): ?Recipe { return $this->recipe; }
    public function setRecipe(?Recipe $r): self { $this->recipe = $r; return $this; }

    public function getStockItem(): ?StockItem { return $this->stockItem; }
    public function setStockItem(?StockItem $s): self { $this->stockItem = $s; return $this; }

    public function getQuantityRequired(): string { return $this->quantityRequired; }
    public function setQuantityRequired(string $v): self { $this->quantityRequired = $v; return $this; }

    public function getCreatedAt(): \DateTimeInterface { return $this->createdAt; }
    public function setCreatedAt(\DateTimeInterface $d): self { $this->createdAt = $d; return $this; }
}
