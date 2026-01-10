<?php
declare(strict_types=1);

namespace App\Entity;

use App\Repository\StaffMemberRepository;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity(repositoryClass: StaffMemberRepository::class)]
#[ORM\Table(name: 'staff_member')]
#[ORM\HasLifecycleCallbacks]
class StaffMember
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column(type: Types::INTEGER)]
    private ?int $id = null;

    #[ORM\Column(type: Types::STRING, length: 100)]
    private string $firstName;

    #[ORM\Column(type: Types::STRING, length: 100)]
    private string $lastName;

    #[ORM\Column(type: Types::STRING, length: 255, nullable: true, unique: true)]
    private ?string $email = null;

    #[ORM\Column(type: Types::STRING, length: 50, nullable: true)]
    private ?string $phone = null;

    #[ORM\Column(type: Types::TEXT, nullable: true)]
    private ?string $address = null;

    #[ORM\Column(type: Types::DATE_MUTABLE, nullable: true)]
    private ?\DateTimeInterface $dateOfBirth = null;

    #[ORM\Column(type: Types::STRING, length: 100, nullable: true)]
    private ?string $position = null; // e.g., 'COORDINATOR', 'WAITER', ...

    #[ORM\Column(type: Types::DECIMAL, precision: 10, scale: 2, nullable: true)]
    private ?string $hourlyRate = null;

    #[ORM\Column(type: Types::DECIMAL, precision: 10, scale: 2, nullable: true)]
    private ?string $fixedRate = null;

    #[ORM\Column(type: Types::BOOLEAN, options: ['default' => true])]
    private bool $isActive = true;

    #[ORM\Column(type: Types::STRING, length: 255, nullable: true)]
    private ?string $emergencyContact = null;

    #[ORM\Column(type: Types::STRING, length: 50, nullable: true)]
    private ?string $emergencyPhone = null;

    #[ORM\Column(type: Types::TEXT, nullable: true)]
    private ?string $notes = null;

    #[ORM\Column(type: Types::DATETIME_MUTABLE)]
    private \DateTimeInterface $createdAt;

    #[ORM\Column(type: Types::DATETIME_MUTABLE)]
    private \DateTimeInterface $updatedAt;

    public function __construct()
    {
        $this->createdAt = new \DateTime();
        $this->updatedAt = new \DateTime();
    }

    #[ORM\PreUpdate]
    public function onPreUpdate(): void
    {
        $this->updatedAt = new \DateTime();
    }

    public function getId(): ?int { return $this->id; }
    public function getFirstName(): string { return $this->firstName; }
    public function setFirstName(string $firstName): self { $this->firstName = $firstName; return $this; }
    public function getLastName(): string { return $this->lastName; }
    public function setLastName(string $lastName): self { $this->lastName = $lastName; return $this; }
    public function getEmail(): ?string { return $this->email; }
    public function setEmail(?string $email): self { $this->email = $email; return $this; }
    public function getPhone(): ?string { return $this->phone; }
    public function setPhone(?string $phone): self { $this->phone = $phone; return $this; }
    public function getAddress(): ?string { return $this->address; }
    public function setAddress(?string $address): self { $this->address = $address; return $this; }
    public function getDateOfBirth(): ?\DateTimeInterface { return $this->dateOfBirth; }
    public function setDateOfBirth(?\DateTimeInterface $dob): self { $this->dateOfBirth = $dob; return $this; }
    public function getPosition(): ?string { return $this->position; }
    public function setPosition(?string $position): self { $this->position = $position; return $this; }
    public function getHourlyRate(): ?string { return $this->hourlyRate; }
    public function setHourlyRate(?string $rate): self { $this->hourlyRate = $rate; return $this; }
    public function getFixedRate(): ?string { return $this->fixedRate; }
    public function setFixedRate(?string $rate): self { $this->fixedRate = $rate; return $this; }
    public function isActive(): bool { return $this->isActive; }
    public function setIsActive(bool $active): self { $this->isActive = $active; return $this; }
    public function getEmergencyContact(): ?string { return $this->emergencyContact; }
    public function setEmergencyContact(?string $c): self { $this->emergencyContact = $c; return $this; }
    public function getEmergencyPhone(): ?string { return $this->emergencyPhone; }
    public function setEmergencyPhone(?string $p): self { $this->emergencyPhone = $p; return $this; }
    public function getNotes(): ?string { return $this->notes; }
    public function setNotes(?string $n): self { $this->notes = $n; return $this; }
    public function getCreatedAt(): \DateTimeInterface { return $this->createdAt; }
    public function setCreatedAt(\DateTimeInterface $dt): self { $this->createdAt = $dt; return $this; }
    public function getUpdatedAt(): \DateTimeInterface { return $this->updatedAt; }
    public function setUpdatedAt(\DateTimeInterface $dt): self { $this->updatedAt = $dt; return $this; }
}
