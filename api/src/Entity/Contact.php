<?php

declare(strict_types=1);

namespace App\Entity;

use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;
use App\Repository\ContactRepository;

#[ORM\Entity(repositoryClass: ContactRepository::class)]
#[ORM\Table(name: 'contact')]
#[ORM\Index(name: 'contact_email_idx', columns: ['email'])]
#[ORM\Index(name: 'contact_phone_idx', columns: ['phone'])]
#[ORM\Index(name: 'contact_phone_normalized_idx', columns: ['phone_normalized'])]
#[ORM\HasLifecycleCallbacks]
class Contact
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column(type: Types::INTEGER)]
    private ?int $id = null;

    #[ORM\Column(type: Types::STRING, length: 255)]
    private string $name;

    #[ORM\Column(type: Types::STRING, length: 255, nullable: true)]
    private ?string $email = null;

    // Lowercased/trimmed email for dedup (nullable unique)
    #[ORM\Column(name: 'email_normalized', type: Types::STRING, length: 255, nullable: true, unique: true)]
    private ?string $emailNormalized = null;

    #[ORM\Column(type: Types::STRING, length: 50, nullable: true)]
    private ?string $phone = null;

    // Digits-only phone normalized (nullable, indexed)
    #[ORM\Column(name: 'phone_normalized', type: Types::STRING, length: 20, nullable: true)]
    private ?string $phoneNormalized = null;

    #[ORM\Column(type: Types::STRING, length: 255, nullable: true)]
    private ?string $company = null;

    // Invoice / billing fields derived from reservation
    #[ORM\Column(name: 'invoice_name', type: Types::STRING, length: 255, nullable: true)]
    private ?string $invoiceName = null;

    #[ORM\Column(name: 'invoice_email', type: Types::STRING, length: 255, nullable: true)]
    private ?string $invoiceEmail = null;

    #[ORM\Column(name: 'invoice_phone', type: Types::STRING, length: 50, nullable: true)]
    private ?string $invoicePhone = null;

    #[ORM\Column(name: 'invoice_ic', type: Types::STRING, length: 50, nullable: true)]
    private ?string $invoiceIc = null;

    #[ORM\Column(name: 'invoice_dic', type: Types::STRING, length: 50, nullable: true)]
    private ?string $invoiceDic = null;

    // Optional origin info
    #[ORM\Column(name: 'client_come_from', type: Types::STRING, length: 255, nullable: true)]
    private ?string $clientComeFrom = null;

    // Optional address fields for billing (UI-editable; reservations currently don't provide granular address)
    #[ORM\Column(name: 'billing_street', type: Types::STRING, length: 255, nullable: true)]
    private ?string $billingStreet = null;

    #[ORM\Column(name: 'billing_city', type: Types::STRING, length: 100, nullable: true)]
    private ?string $billingCity = null;

    #[ORM\Column(name: 'billing_zip', type: Types::STRING, length: 20, nullable: true)]
    private ?string $billingZip = null;

    #[ORM\Column(name: 'billing_country', type: Types::STRING, length: 100, nullable: true)]
    private ?string $billingCountry = null;

    #[ORM\Column(type: Types::TEXT, nullable: true)]
    private ?string $note = null;

    // first reservation id the contact was derived from (optional)
    #[ORM\Column(type: Types::INTEGER, nullable: true)]
    private ?int $sourceReservationId = null;

    #[ORM\Column(type: Types::DATETIME_MUTABLE)]
    private \DateTimeInterface $createdAt;

    #[ORM\Column(type: Types::DATETIME_MUTABLE)]
    private \DateTimeInterface $updatedAt;

    public function __construct()
    {
        $this->createdAt = new \DateTime();
        $this->updatedAt = new \DateTime();
        $this->name = '';
    }

    #[ORM\PrePersist]
    #[ORM\PreUpdate]
    public function maintainNormalizedFields(): void
    {
        $this->emailNormalized = self::normalizeEmail($this->email);
        $this->phoneNormalized = self::normalizePhone($this->phone);
    }

    public static function normalizeEmail(?string $email): ?string
    {
        if ($email === null) return null;
        $e = trim(mb_strtolower($email));
        return $e !== '' ? $e : null;
    }

    public static function normalizePhone(?string $phone): ?string
    {
        if ($phone === null) return null;
        $digits = preg_replace('/[^0-9]/', '', $phone) ?? '';
        if ($digits === '') return null;
        // If Czech prefix 420, drop it
        if (str_starts_with($digits, '420')) {
            $digits = substr($digits, 3);
        }
        // Compare by last 9 digits if longer
        if (strlen($digits) > 9) {
            $digits = substr($digits, -9);
        }
        return $digits;
    }

    public function getId(): ?int { return $this->id; }

    public function getName(): string { return $this->name; }
    public function setName(string $name): self { $this->name = $name; return $this; }

    public function getEmail(): ?string { return $this->email; }
    public function setEmail(?string $email): self { $this->email = $email; return $this; }

    public function getEmailNormalized(): ?string { return $this->emailNormalized; }

    public function getPhone(): ?string { return $this->phone; }
    public function setPhone(?string $phone): self { $this->phone = $phone; return $this; }

    public function getPhoneNormalized(): ?string { return $this->phoneNormalized; }

    public function getCompany(): ?string { return $this->company; }
    public function setCompany(?string $company): self { $this->company = $company; return $this; }

    public function getInvoiceName(): ?string { return $this->invoiceName; }
    public function setInvoiceName(?string $v): self { $this->invoiceName = $v; return $this; }

    public function getInvoiceEmail(): ?string { return $this->invoiceEmail; }
    public function setInvoiceEmail(?string $v): self { $this->invoiceEmail = $v; return $this; }

    public function getInvoicePhone(): ?string { return $this->invoicePhone; }
    public function setInvoicePhone(?string $v): self { $this->invoicePhone = $v; return $this; }

    public function getInvoiceIc(): ?string { return $this->invoiceIc; }
    public function setInvoiceIc(?string $v): self { $this->invoiceIc = $v; return $this; }

    public function getInvoiceDic(): ?string { return $this->invoiceDic; }
    public function setInvoiceDic(?string $v): self { $this->invoiceDic = $v; return $this; }

    public function getClientComeFrom(): ?string { return $this->clientComeFrom; }
    public function setClientComeFrom(?string $v): self { $this->clientComeFrom = $v; return $this; }

    public function getBillingStreet(): ?string { return $this->billingStreet; }
    public function setBillingStreet(?string $v): self { $this->billingStreet = $v; return $this; }

    public function getBillingCity(): ?string { return $this->billingCity; }
    public function setBillingCity(?string $v): self { $this->billingCity = $v; return $this; }

    public function getBillingZip(): ?string { return $this->billingZip; }
    public function setBillingZip(?string $v): self { $this->billingZip = $v; return $this; }

    public function getBillingCountry(): ?string { return $this->billingCountry; }
    public function setBillingCountry(?string $v): self { $this->billingCountry = $v; return $this; }

    public function getNote(): ?string { return $this->note; }
    public function setNote(?string $note): self { $this->note = $note; return $this; }

    public function getSourceReservationId(): ?int { return $this->sourceReservationId; }
    public function setSourceReservationId(?int $id): self { $this->sourceReservationId = $id; return $this; }

    public function getCreatedAt(): \DateTimeInterface { return $this->createdAt; }
    public function setCreatedAt(\DateTimeInterface $dt): self { $this->createdAt = $dt; return $this; }

    public function getUpdatedAt(): \DateTimeInterface { return $this->updatedAt; }
    public function setUpdatedAt(\DateTimeInterface $dt): self { $this->updatedAt = $dt; return $this; }
}
