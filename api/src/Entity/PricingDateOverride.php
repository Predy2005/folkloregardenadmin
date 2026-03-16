<?php

namespace App\Entity;

use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity]
#[ORM\Table(name: 'pricing_date_override')]
#[ORM\HasLifecycleCallbacks]
class PricingDateOverride
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column(type: Types::INTEGER)]
    private ?int $id = null;

    #[ORM\Column(type: Types::DATE_MUTABLE)]
    private \DateTimeInterface $date;

    #[ORM\Column(name: 'adult_price', type: Types::DECIMAL, precision: 10, scale: 2)]
    private string $adultPrice = '0.00';

    #[ORM\Column(name: 'child_price', type: Types::DECIMAL, precision: 10, scale: 2)]
    private string $childPrice = '0.00';

    #[ORM\Column(name: 'infant_price', type: Types::DECIMAL, precision: 10, scale: 2)]
    private string $infantPrice = '0.00';

    #[ORM\Column(name: 'include_meal', type: Types::BOOLEAN)]
    private bool $includeMeal = true;

    #[ORM\Column(type: Types::STRING, length: 255, nullable: true)]
    private ?string $reason = null;

    #[ORM\Column(name: 'created_at', type: Types::DATETIME_MUTABLE)]
    private \DateTimeInterface $createdAt;

    #[ORM\Column(name: 'updated_at', type: Types::DATETIME_MUTABLE)]
    private \DateTimeInterface $updatedAt;

    public function __construct()
    {
        $this->date = new \DateTime();
        $this->createdAt = new \DateTime();
        $this->updatedAt = new \DateTime();
    }

    #[ORM\PreUpdate]
    public function onPreUpdate(): void
    {
        $this->updatedAt = new \DateTime();
    }

    public function getId(): ?int { return $this->id; }

    public function getDate(): \DateTimeInterface { return $this->date; }
    public function setDate(\DateTimeInterface $v): self { $this->date = $v; return $this; }

    public function getAdultPrice(): string { return $this->adultPrice; }
    public function setAdultPrice(string $v): self { $this->adultPrice = $v; return $this; }

    public function getChildPrice(): string { return $this->childPrice; }
    public function setChildPrice(string $v): self { $this->childPrice = $v; return $this; }

    public function getInfantPrice(): string { return $this->infantPrice; }
    public function setInfantPrice(string $v): self { $this->infantPrice = $v; return $this; }

    public function isIncludeMeal(): bool { return $this->includeMeal; }
    public function setIncludeMeal(bool $v): self { $this->includeMeal = $v; return $this; }

    public function getReason(): ?string { return $this->reason; }
    public function setReason(?string $v): self { $this->reason = $v; return $this; }

    public function getCreatedAt(): \DateTimeInterface { return $this->createdAt; }
    public function getUpdatedAt(): \DateTimeInterface { return $this->updatedAt; }
}
