<?php

declare(strict_types=1);

namespace App\Entity;

use App\Repository\FoodDrinkPairingRepository;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity(repositoryClass: FoodDrinkPairingRepository::class)]
#[ORM\Table(name: 'food_drink_pairing')]
#[ORM\UniqueConstraint(name: 'unique_food_drink', columns: ['food_id', 'drink_id'])]
class FoodDrinkPairing
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column(type: Types::INTEGER)]
    private ?int $id = null;

    #[ORM\ManyToOne(targetEntity: ReservationFoods::class)]
    #[ORM\JoinColumn(name: 'food_id', referencedColumnName: 'id', nullable: false, onDelete: 'CASCADE')]
    private ?ReservationFoods $food = null;

    #[ORM\ManyToOne(targetEntity: DrinkItem::class)]
    #[ORM\JoinColumn(name: 'drink_id', referencedColumnName: 'id', nullable: false, onDelete: 'CASCADE')]
    private ?DrinkItem $drink = null;

    #[ORM\Column(name: 'is_default', type: Types::BOOLEAN, options: ['default' => false])]
    private bool $isDefault = false;

    #[ORM\Column(name: 'is_included_in_price', type: Types::BOOLEAN, options: ['default' => false])]
    private bool $isIncludedInPrice = false;

    #[ORM\Column(type: Types::DECIMAL, precision: 10, scale: 2, options: ['default' => '0.00'])]
    private string $surcharge = '0.00';

    public function getId(): ?int { return $this->id; }
    public function getFood(): ?ReservationFoods { return $this->food; }
    public function setFood(?ReservationFoods $v): self { $this->food = $v; return $this; }
    public function getDrink(): ?DrinkItem { return $this->drink; }
    public function setDrink(?DrinkItem $v): self { $this->drink = $v; return $this; }
    public function isDefault(): bool { return $this->isDefault; }
    public function setIsDefault(bool $v): self { $this->isDefault = $v; return $this; }
    public function isIncludedInPrice(): bool { return $this->isIncludedInPrice; }
    public function setIsIncludedInPrice(bool $v): self { $this->isIncludedInPrice = $v; return $this; }
    public function getSurcharge(): string { return $this->surcharge; }
    public function setSurcharge(string $v): self { $this->surcharge = $v; return $this; }
}
