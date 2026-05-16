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

    #[ORM\Column(type: Types::STRING, length: 3, options: ['default' => 'CZK'])]
    private string $currency = 'CZK';

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

    // External Pohoda customer number (legacy ERP code)
    #[ORM\Column(name: 'pohoda_code', type: Types::STRING, length: 20, nullable: true)]
    private ?string $pohodaCode = null;

    #[ORM\Column(type: Types::BOOLEAN, options: ['default' => true])]
    private bool $isActive = true;

    #[ORM\Column(type: Types::TEXT, nullable: true)]
    private ?string $notes = null;

    #[ORM\Column(type: Types::DATETIME_MUTABLE)]
    private \DateTimeInterface $createdAt;

    #[ORM\Column(type: Types::DATETIME_MUTABLE)]
    private \DateTimeInterface $updatedAt;

    // Pricing model
    #[ORM\Column(name: 'pricing_model', type: Types::STRING, length: 20, options: ['default' => 'DEFAULT'])]
    private string $pricingModel = 'DEFAULT'; // DEFAULT = use system prices, CUSTOM = per-menu prices, FLAT = single price per person

    #[ORM\Column(name: 'flat_price_adult', type: Types::DECIMAL, precision: 10, scale: 2, nullable: true)]
    private ?string $flatPriceAdult = null; // Used when pricingModel = FLAT

    #[ORM\Column(name: 'flat_price_child', type: Types::DECIMAL, precision: 10, scale: 2, nullable: true)]
    private ?string $flatPriceChild = null;

    #[ORM\Column(name: 'flat_price_infant', type: Types::DECIMAL, precision: 10, scale: 2, nullable: true)]
    private ?string $flatPriceInfant = null;

    // Custom menu prices: JSON map of { menuName: price } overrides
    // e.g. {"Traditional": 850, "Chicken Menu": 900, "Children menu": 500}
    #[ORM\Column(name: 'custom_menu_prices', type: Types::JSON, nullable: true)]
    private ?array $customMenuPrices = null;

    // Billing settings
    #[ORM\Column(name: 'billing_period', type: Types::STRING, length: 20, options: ['default' => 'PER_RESERVATION'])]
    private string $billingPeriod = 'PER_RESERVATION'; // PER_RESERVATION, MONTHLY, QUARTERLY

    #[ORM\Column(name: 'billing_email', type: Types::STRING, length: 255, nullable: true)]
    private ?string $billingEmail = null;

    // Invoice info (for auto-generating partner invoices)
    #[ORM\Column(name: 'invoice_company', type: Types::STRING, length: 255, nullable: true)]
    private ?string $invoiceCompany = null;

    #[ORM\Column(name: 'invoice_street', type: Types::STRING, length: 255, nullable: true)]
    private ?string $invoiceStreet = null;

    #[ORM\Column(name: 'invoice_city', type: Types::STRING, length: 255, nullable: true)]
    private ?string $invoiceCity = null;

    #[ORM\Column(name: 'invoice_zipcode', type: Types::STRING, length: 20, nullable: true)]
    private ?string $invoiceZipcode = null;

    // Detection: emails/domains that identify this partner's reservations
    #[ORM\Column(name: 'detection_emails', type: Types::JSON, nullable: true)]
    private ?array $detectionEmails = null; // e.g. ["@hotelprague.cz", "booking@agency.com"]

    #[ORM\Column(name: 'detection_keywords', type: Types::JSON, nullable: true)]
    private ?array $detectionKeywords = null; // e.g. ["Hotel Prague", "Prague Tours"]

    // API key auth — partner přístup přes X-API-Key header. Plaintext klíče
    // se nikdy neukládá, jen jeho SHA-256 hash. Last4 slouží k identifikaci v UI.
    #[ORM\Column(name: 'api_key_hash', type: Types::STRING, length: 64, nullable: true)]
    private ?string $apiKeyHash = null;

    #[ORM\Column(name: 'api_key_last4', type: Types::STRING, length: 4, nullable: true)]
    private ?string $apiKeyLast4 = null;

    #[ORM\Column(name: 'api_key_generated_at', type: Types::DATETIME_MUTABLE, nullable: true)]
    private ?\DateTimeInterface $apiKeyGeneratedAt = null;

    #[ORM\Column(name: 'api_key_last_used_at', type: Types::DATETIME_MUTABLE, nullable: true)]
    private ?\DateTimeInterface $apiKeyLastUsedAt = null;

    // Swagger UI HTTP Basic Auth — credentials pro /api/doc/partner přístup.
    // Heslo se ukládá jen jako bcrypt hash (password_hash); plaintext se vrací
    // adminovi jen při generování. Username musí být unikátní napříč partnery
    // (partial unique index `WHERE NOT NULL`).
    #[ORM\Column(name: 'swagger_username', type: Types::STRING, length: 64, nullable: true)]
    private ?string $swaggerUsername = null;

    #[ORM\Column(name: 'swagger_password_hash', type: Types::STRING, length: 255, nullable: true)]
    private ?string $swaggerPasswordHash = null;

    #[ORM\Column(name: 'swagger_credentials_generated_at', type: Types::DATETIME_MUTABLE, nullable: true)]
    private ?\DateTimeInterface $swaggerCredentialsGeneratedAt = null;

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

    public function getCurrency(): string { return $this->currency; }
    public function setCurrency(string $v): self { $this->currency = $v; return $this; }

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

    public function getPohodaCode(): ?string { return $this->pohodaCode; }
    public function setPohodaCode(?string $v): self { $this->pohodaCode = $v; return $this; }

    public function getApiKeyHash(): ?string { return $this->apiKeyHash; }
    public function setApiKeyHash(?string $v): self { $this->apiKeyHash = $v; return $this; }

    public function getApiKeyLast4(): ?string { return $this->apiKeyLast4; }
    public function setApiKeyLast4(?string $v): self { $this->apiKeyLast4 = $v; return $this; }

    public function getApiKeyGeneratedAt(): ?\DateTimeInterface { return $this->apiKeyGeneratedAt; }
    public function setApiKeyGeneratedAt(?\DateTimeInterface $v): self { $this->apiKeyGeneratedAt = $v; return $this; }

    public function getApiKeyLastUsedAt(): ?\DateTimeInterface { return $this->apiKeyLastUsedAt; }
    public function setApiKeyLastUsedAt(?\DateTimeInterface $v): self { $this->apiKeyLastUsedAt = $v; return $this; }

    public function hasApiKey(): bool { return $this->apiKeyHash !== null; }

    public function getSwaggerUsername(): ?string { return $this->swaggerUsername; }
    public function setSwaggerUsername(?string $v): self { $this->swaggerUsername = $v; return $this; }

    public function getSwaggerPasswordHash(): ?string { return $this->swaggerPasswordHash; }
    public function setSwaggerPasswordHash(?string $v): self { $this->swaggerPasswordHash = $v; return $this; }

    public function getSwaggerCredentialsGeneratedAt(): ?\DateTimeInterface { return $this->swaggerCredentialsGeneratedAt; }
    public function setSwaggerCredentialsGeneratedAt(?\DateTimeInterface $v): self { $this->swaggerCredentialsGeneratedAt = $v; return $this; }

    public function hasSwaggerCredentials(): bool { return $this->swaggerUsername !== null && $this->swaggerPasswordHash !== null; }

    public function isActive(): bool { return $this->isActive; }
    public function setIsActive(bool $v): self { $this->isActive = $v; return $this; }

    public function getNotes(): ?string { return $this->notes; }
    public function setNotes(?string $v): self { $this->notes = $v; return $this; }

    public function getCreatedAt(): \DateTimeInterface { return $this->createdAt; }
    public function setCreatedAt(\DateTimeInterface $v): self { $this->createdAt = $v; return $this; }

    public function getUpdatedAt(): \DateTimeInterface { return $this->updatedAt; }
    public function setUpdatedAt(\DateTimeInterface $v): self { $this->updatedAt = $v; return $this; }

    public function getPricingModel(): string { return $this->pricingModel; }
    public function setPricingModel(string $v): self { $this->pricingModel = $v; return $this; }

    public function getFlatPriceAdult(): ?string { return $this->flatPriceAdult; }
    public function setFlatPriceAdult(?string $v): self { $this->flatPriceAdult = $v; return $this; }

    public function getFlatPriceChild(): ?string { return $this->flatPriceChild; }
    public function setFlatPriceChild(?string $v): self { $this->flatPriceChild = $v; return $this; }

    public function getFlatPriceInfant(): ?string { return $this->flatPriceInfant; }
    public function setFlatPriceInfant(?string $v): self { $this->flatPriceInfant = $v; return $this; }

    public function getCustomMenuPrices(): ?array { return $this->customMenuPrices; }
    public function setCustomMenuPrices(?array $v): self { $this->customMenuPrices = $v; return $this; }

    public function getBillingPeriod(): string { return $this->billingPeriod; }
    public function setBillingPeriod(string $v): self { $this->billingPeriod = $v; return $this; }

    public function getBillingEmail(): ?string { return $this->billingEmail; }
    public function setBillingEmail(?string $v): self { $this->billingEmail = $v; return $this; }

    public function getInvoiceCompany(): ?string { return $this->invoiceCompany; }
    public function setInvoiceCompany(?string $v): self { $this->invoiceCompany = $v; return $this; }

    public function getInvoiceStreet(): ?string { return $this->invoiceStreet; }
    public function setInvoiceStreet(?string $v): self { $this->invoiceStreet = $v; return $this; }

    public function getInvoiceCity(): ?string { return $this->invoiceCity; }
    public function setInvoiceCity(?string $v): self { $this->invoiceCity = $v; return $this; }

    public function getInvoiceZipcode(): ?string { return $this->invoiceZipcode; }
    public function setInvoiceZipcode(?string $v): self { $this->invoiceZipcode = $v; return $this; }

    public function getDetectionEmails(): ?array { return $this->detectionEmails; }
    public function setDetectionEmails(?array $v): self { $this->detectionEmails = $v; return $this; }

    public function getDetectionKeywords(): ?array { return $this->detectionKeywords; }
    public function setDetectionKeywords(?array $v): self { $this->detectionKeywords = $v; return $this; }
}
