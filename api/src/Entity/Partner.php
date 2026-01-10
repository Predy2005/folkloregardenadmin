<?php

namespace App\Entity;

use App\Repository\PartnerRepository;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity(repositoryClass: PartnerRepository::class)]
#[ORM\Table(name: 'partner')]
class Partner
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column(type: Types::INTEGER)]
    private ?int $id = null;

    #[ORM\Column(type: Types::STRING, length: 255)]
    private string $name;

    #[ORM\Column(type: Types::STRING, length: 50)]
    private string $partnerType; // 'HOTEL', 'RECEPTION', 'DISTRIBUTOR', 'OTHER'

    #[ORM\Column(type: Types::STRING, length: 255, nullable: true)]
    private ?string $contactPerson = null;

    #[ORM\Column(type: Types::STRING, length: 255, nullable: true)]
    private ?string $email = null;

    #[ORM\Column(type: Types::STRING, length: 50, nullable: true)]
    private ?string $phone = null;

    #[ORM\Column(type: Types::TEXT, nullable: true)]
    private ?string $address = null;

    #[ORM\Column(type: Types::DECIMAL, precision: 5, scale: 2, options: ['default' => 0])]
    private string $commissionRate = '0.00';

    #[ORM\Column(type: Types::DECIMAL, precision: 10, scale: 2, options: ['default' => 0])]
    private string $commissionAmount = '0.00';

    #[ORM\Column(type: Types::STRING, length: 50, nullable: true)]
    private ?string $paymentMethod = null; // 'BANK_TRANSFER', 'CASH', 'INVOICE'

    #[ORM\Column(type: Types::STRING, length: 100, nullable: true)]
    private ?string $bankAccount = null;

    #[ORM\Column(type: Types::STRING, length: 20, nullable: true)]
    private ?string $ic = null;

    #[ORM\Column(type: Types::STRING, length: 20, nullable: true)]
    private ?string $dic = null;

    #[ORM\Column(type: Types::BOOLEAN, options: ['default' => true])]
    private bool $isActive = true;

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

    public function getId(): ?int { return $this->id; }

    public function getName(): string { return $this->name; }
    public function setName(string $v): self { $this->name = $v; return $this; }

    public function getPartnerType(): string { return $this->partnerType; }
    public function setPartnerType(string $v): self { $this->partnerType = $v; return $this; }

    public function getContactPerson(): ?string { return $this->contactPerson; }
    public function setContactPerson(?string $v): self { $this->contactPerson = $v; return $this; }

    public function getEmail(): ?string { return $this->email; }
    public function setEmail(?string $v): self { $this->email = $v; return $this; }

    public function getPhone(): ?string { return $this->phone; }
    public function setPhone(?string $v): self { $this->phone = $v; return $this; }

    public function getAddress(): ?string { return $this->address; }
    public function setAddress(?string $v): self { $this->address = $v; return $this; }

    public function getCommissionRate(): string { return $this->commissionRate; }
    public function setCommissionRate(string $v): self { $this->commissionRate = $v; return $this; }

    public function getCommissionAmount(): string { return $this->commissionAmount; }
    public function setCommissionAmount(string $v): self { $this->commissionAmount = $v; return $this; }

    public function getPaymentMethod(): ?string { return $this->paymentMethod; }
    public function setPaymentMethod(?string $v): self { $this->paymentMethod = $v; return $this; }

    public function getBankAccount(): ?string { return $this->bankAccount; }
    public function setBankAccount(?string $v): self { $this->bankAccount = $v; return $this; }

    public function getIc(): ?string { return $this->ic; }
    public function setIc(?string $v): self { $this->ic = $v; return $this; }

    public function getDic(): ?string { return $this->dic; }
    public function setDic(?string $v): self { $this->dic = $v; return $this; }

    public function isActive(): bool { return $this->isActive; }
    public function setIsActive(bool $v): self { $this->isActive = $v; return $this; }

    public function getNotes(): ?string { return $this->notes; }
    public function setNotes(?string $v): self { $this->notes = $v; return $this; }

    public function getCreatedAt(): \DateTimeInterface { return $this->createdAt; }
    public function setCreatedAt(\DateTimeInterface $v): self { $this->createdAt = $v; return $this; }

    public function getUpdatedAt(): \DateTimeInterface { return $this->updatedAt; }
    public function setUpdatedAt(\DateTimeInterface $v): self { $this->updatedAt = $v; return $this; }
}
