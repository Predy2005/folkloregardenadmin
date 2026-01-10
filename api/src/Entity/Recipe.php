<?php
namespace App\Entity;

use App\Repository\RecipeRepository;
use App\Entity\ReservationFoods;
use Doctrine\ORM\Mapping as ORM;
use Doctrine\DBAL\Types\Types;
use Doctrine\Common\Collections\ArrayCollection;
use Doctrine\Common\Collections\Collection;

#[ORM\Entity(repositoryClass: RecipeRepository::class)]
#[ORM\HasLifecycleCallbacks]
#[ORM\Table(name: 'recipe')]
class Recipe
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column(type: Types::INTEGER)]
    private ?int $id = null;

    // relation to reservation_foods
    #[ORM\ManyToOne(targetEntity: ReservationFoods::class)]
    #[ORM\JoinColumn(name: 'reservation_food_id', referencedColumnName: 'id', onDelete: 'CASCADE', nullable: true)]
    private ?ReservationFoods $reservationFood = null;

    #[ORM\Column(type: Types::STRING, length: 255)]
    private string $name;

    #[ORM\Column(type: Types::TEXT, nullable: true)]
    private ?string $description = null;

    #[ORM\Column(type: Types::INTEGER, options: ['default' => 1])]
    private int $portions = 1;

    #[ORM\Column(type: Types::DATETIME_MUTABLE)]
    private \DateTimeInterface $createdAt;

    #[ORM\Column(type: Types::DATETIME_MUTABLE)]
    private \DateTimeInterface $updatedAt;

    #[ORM\OneToMany(mappedBy: 'recipe', targetEntity: RecipeIngredient::class, cascade: ['persist', 'remove'])]
    private Collection $ingredients;

    public function __construct()
    {
        $now = new \DateTime();
        $this->createdAt = $now;
        $this->updatedAt = $now;
        $this->ingredients = new ArrayCollection();
    }

    #[ORM\PreUpdate]
    public function onPreUpdate(): void
    {
        $this->updatedAt = new \DateTime();
    }

    public function getId(): ?int { return $this->id; }

    public function getReservationFood(): ?ReservationFoods { return $this->reservationFood; }
    public function setReservationFood(?ReservationFoods $v): self { $this->reservationFood = $v; return $this; }

    public function getName(): string { return $this->name; }
    public function setName(string $v): self { $this->name = $v; return $this; }

    public function getDescription(): ?string { return $this->description; }
    public function setDescription(?string $v): self { $this->description = $v; return $this; }

    public function getPortions(): int { return $this->portions; }
    public function setPortions(int $v): self { $this->portions = $v; return $this; }

    public function getCreatedAt(): \DateTimeInterface { return $this->createdAt; }
    public function setCreatedAt(\DateTimeInterface $d): self { $this->createdAt = $d; return $this; }
    public function getUpdatedAt(): \DateTimeInterface { return $this->updatedAt; }
    public function setUpdatedAt(\DateTimeInterface $d): self { $this->updatedAt = $d; return $this; }

    public function getIngredients(): Collection { return $this->ingredients; }
    public function addIngredient(RecipeIngredient $i): self { if(!$this->ingredients->contains($i)){ $this->ingredients->add($i); $i->setRecipe($this);} return $this; }
    public function removeIngredient(RecipeIngredient $i): self { if($this->ingredients->removeElement($i)){ if($i->getRecipe() === $this){ $i->setRecipe(null);} } return $this; }
}
