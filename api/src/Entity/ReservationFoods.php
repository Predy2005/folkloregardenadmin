<?php

namespace App\Entity;

use App\Repository\ReservationFoodsRepository;
use Doctrine\ORM\EntityManagerInterface;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity(repositoryClass: ReservationFoodsRepository::class)]
class ReservationFoods
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    private ?int $id = null;

    #[ORM\Column(type: 'string', length: 50, nullable: true, unique: true)]
    private ?string $externalId = null;

    #[ORM\Column(type: 'string', length: 255)]
    private string $name;

    #[ORM\Column(type: 'text', nullable: true)]
    private ?string $description = null;

    #[ORM\Column(type: 'integer')]
    private int $price;

    #[ORM\Column(type: 'boolean')]
    private bool $isChildrenMenu = false;

    #[ORM\Column(type: 'integer', options: ['default' => 0])]
    private int $surcharge = 0;

    public function getId(): ?int
    {
        return $this->id;
    }

    public function getExternalId(): ?string
    {
        return $this->externalId;
    }

    public function setExternalId(?string $externalId): static
    {
        $this->externalId = $externalId;
        return $this;
    }

    public function getName(): string
    {
        return $this->name;
    }

    public function setName(string $name): static
    {
        $this->name = $name;
        return $this;
    }

    public function getDescription(): ?string
    {
        return $this->description;
    }

    public function setDescription(?string $description): static
    {
        $this->description = $description;
        return $this;
    }

    public function getPrice(): int
    {
        return $this->price;
    }

    public function setPrice(int $price): static
    {
        $this->price = $price;
        return $this;
    }

    public function isChildrenMenu(): bool
    {
        return $this->isChildrenMenu;
    }

    public function setIsChildrenMenu(bool $isChildrenMenu): static
    {
        $this->isChildrenMenu = $isChildrenMenu;
        return $this;
    }

    public function getSurcharge(): int
    {
        return $this->surcharge;
    }

    public function setSurcharge(int $surcharge): static
    {
        $this->surcharge = $surcharge;
        return $this;
    }

    public function loadReservationFoods(EntityManagerInterface $em): void
    {
        $foods = [
            ['Bez jídla', null, 0, false],
            ['Standardní menu - Tradiční', null, 380, false],
            ['Standardní menu - Kuřecí', null, 380, false],
            ['Standardní menu - Vegetariánské', null, 380, false],
            ['Speciální menu - Semikošer', null, 455, false],
            ['Speciální menu - Vepřové koleno', null, 455, false],
            ['Speciální menu - Kachna', null, 455, false],
            ['Speciální menu - Kuřecí halal', null, 455, false],
            ['Speciální menu - Losos', null, 455, false],
            ['Speciální menu - Pstruh', null, 455, false],
        ];

        foreach ($foods as [$name, $desc, $price, $isChild]) {
            $food = new ReservationFoods();
            $food->setName($name)
                ->setDescription($desc)
                ->setPrice($price)
                ->setIsChildrenMenu($isChild);

            $em->persist($food);
        }

        $em->flush();
    }
}
