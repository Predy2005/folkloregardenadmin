<?php
declare(strict_types=1);

namespace App\Entity;

use App\Repository\StaffRoleRepository;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity(repositoryClass: StaffRoleRepository::class)]
#[ORM\Table(name: 'staff_role')]
class StaffRole
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column(type: Types::INTEGER)]
    private ?int $id = null;

    #[ORM\Column(type: Types::STRING, length: 100, unique: true)]
    private string $name;

    #[ORM\Column(type: Types::TEXT, nullable: true)]
    private ?string $description = null;

    #[ORM\Column(type: Types::INTEGER, options: ['default' => 0])]
    private int $requiredPerGuests = 0;

    #[ORM\Column(type: Types::INTEGER, options: ['default' => 10])]
    private int $guestsRatio = 10;

    #[ORM\Column(type: Types::DATETIME_MUTABLE)]
    private \DateTimeInterface $createdAt;

    public function __construct()
    {
        $this->createdAt = new \DateTime();
    }

    public function getId(): ?int { return $this->id; }
    public function getName(): string { return $this->name; }
    public function setName(string $name): self { $this->name = $name; return $this; }
    public function getDescription(): ?string { return $this->description; }
    public function setDescription(?string $d): self { $this->description = $d; return $this; }
    public function getRequiredPerGuests(): int { return $this->requiredPerGuests; }
    public function setRequiredPerGuests(int $v): self { $this->requiredPerGuests = $v; return $this; }
    public function getGuestsRatio(): int { return $this->guestsRatio; }
    public function setGuestsRatio(int $v): self { $this->guestsRatio = $v; return $this; }
    public function getCreatedAt(): \DateTimeInterface { return $this->createdAt; }
}