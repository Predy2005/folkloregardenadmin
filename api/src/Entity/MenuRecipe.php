<?php

declare(strict_types=1);

namespace App\Entity;

use App\Repository\MenuRecipeRepository;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity(repositoryClass: MenuRecipeRepository::class)]
#[ORM\Table(name: 'menu_recipe')]
#[ORM\UniqueConstraint(name: 'UNIQ_MENU_RECIPE', columns: ['reservation_food_id', 'recipe_id'])]
class MenuRecipe
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column(type: Types::INTEGER)]
    private ?int $id = null;

    #[ORM\ManyToOne(targetEntity: ReservationFoods::class)]
    #[ORM\JoinColumn(name: 'reservation_food_id', referencedColumnName: 'id', nullable: false, onDelete: 'CASCADE')]
    private ?ReservationFoods $reservationFood = null;

    #[ORM\ManyToOne(targetEntity: Recipe::class)]
    #[ORM\JoinColumn(name: 'recipe_id', referencedColumnName: 'id', nullable: false, onDelete: 'CASCADE')]
    private ?Recipe $recipe = null;

    #[ORM\Column(type: Types::DECIMAL, precision: 5, scale: 2, options: ['default' => '1.00'])]
    private string $portionsPerServing = '1.00';

    #[ORM\Column(type: Types::STRING, length: 50, nullable: true)]
    private ?string $courseType = null; // 'starter' | 'soup' | 'main' | 'side' | 'dessert'

    #[ORM\Column(type: Types::DATETIME_MUTABLE)]
    private \DateTimeInterface $createdAt;

    public function __construct()
    {
        $this->createdAt = new \DateTime();
    }

    public function getId(): ?int { return $this->id; }

    public function getReservationFood(): ?ReservationFoods { return $this->reservationFood; }
    public function setReservationFood(?ReservationFoods $v): self { $this->reservationFood = $v; return $this; }

    public function getRecipe(): ?Recipe { return $this->recipe; }
    public function setRecipe(?Recipe $v): self { $this->recipe = $v; return $this; }

    public function getPortionsPerServing(): string { return $this->portionsPerServing; }
    public function setPortionsPerServing(string $v): self { $this->portionsPerServing = $v; return $this; }

    public function getCourseType(): ?string { return $this->courseType; }
    public function setCourseType(?string $v): self { $this->courseType = $v; return $this; }

    public function getCreatedAt(): \DateTimeInterface { return $this->createdAt; }
}
