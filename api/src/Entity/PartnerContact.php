<?php
declare(strict_types=1);

namespace App\Entity;

use App\Repository\PartnerContactRepository;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;

/**
 * Kontaktní osoba u partnera (zaměstnanec / asistent / průvodce…). Jeden partner
 * jich může mít víc — typicky CK má víc lidí, kteří řeší různé skupiny.
 */
#[ORM\Entity(repositoryClass: PartnerContactRepository::class)]
#[ORM\Table(name: 'partner_contact')]
#[ORM\HasLifecycleCallbacks]
class PartnerContact
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column(type: Types::INTEGER)]
    private ?int $id = null;

    #[ORM\ManyToOne(targetEntity: Partner::class)]
    #[ORM\JoinColumn(name: 'partner_id', referencedColumnName: 'id', nullable: false, onDelete: 'CASCADE')]
    private Partner $partner;

    #[ORM\Column(type: Types::STRING, length: 100)]
    private string $firstName = '';

    #[ORM\Column(type: Types::STRING, length: 100, nullable: true)]
    private ?string $lastName = null;

    #[ORM\Column(type: Types::STRING, length: 255, nullable: true)]
    private ?string $email = null;

    #[ORM\Column(type: Types::STRING, length: 50, nullable: true)]
    private ?string $phone = null;

    #[ORM\Column(type: Types::TEXT, nullable: true)]
    private ?string $notes = null;

    #[ORM\Column(type: Types::INTEGER, options: ['default' => 0])]
    private int $displayOrder = 0;

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
    public function getPartner(): Partner { return $this->partner; }
    public function setPartner(Partner $partner): self { $this->partner = $partner; return $this; }
    public function getFirstName(): string { return $this->firstName; }
    public function setFirstName(string $v): self { $this->firstName = $v; return $this; }
    public function getLastName(): ?string { return $this->lastName; }
    public function setLastName(?string $v): self { $this->lastName = $v; return $this; }
    public function getEmail(): ?string { return $this->email; }
    public function setEmail(?string $v): self { $this->email = $v; return $this; }
    public function getPhone(): ?string { return $this->phone; }
    public function setPhone(?string $v): self { $this->phone = $v; return $this; }
    public function getNotes(): ?string { return $this->notes; }
    public function setNotes(?string $v): self { $this->notes = $v; return $this; }
    public function getDisplayOrder(): int { return $this->displayOrder; }
    public function setDisplayOrder(int $v): self { $this->displayOrder = $v; return $this; }
    public function getCreatedAt(): \DateTimeInterface { return $this->createdAt; }
    public function getUpdatedAt(): \DateTimeInterface { return $this->updatedAt; }
}
