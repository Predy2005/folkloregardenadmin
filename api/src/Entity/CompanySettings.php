<?php
declare(strict_types=1);

namespace App\Entity;

use App\Repository\CompanySettingsRepository;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity(repositoryClass: CompanySettingsRepository::class)]
#[ORM\Table(name: 'company_settings')]
class CompanySettings
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column(type: Types::INTEGER)]
    private ?int $id = null;

    #[ORM\Column(type: Types::STRING, length: 50, unique: true)]
    private string $code = 'default'; // Pro možnost více nastavení v budoucnu

    // Základní informace o firmě
    #[ORM\Column(type: Types::STRING, length: 255)]
    private string $companyName;

    #[ORM\Column(type: Types::STRING, length: 255)]
    private string $street;

    #[ORM\Column(type: Types::STRING, length: 255)]
    private string $city;

    #[ORM\Column(type: Types::STRING, length: 20)]
    private string $zipcode;

    #[ORM\Column(type: Types::STRING, length: 100, nullable: true)]
    private ?string $country = 'Česká republika';

    #[ORM\Column(type: Types::STRING, length: 50)]
    private string $ico;

    #[ORM\Column(type: Types::STRING, length: 50, nullable: true)]
    private ?string $dic = null;

    // Kontaktní údaje
    #[ORM\Column(type: Types::STRING, length: 255, nullable: true)]
    private ?string $email = null;

    #[ORM\Column(type: Types::STRING, length: 50, nullable: true)]
    private ?string $phone = null;

    #[ORM\Column(type: Types::STRING, length: 255, nullable: true)]
    private ?string $web = null;

    // Bankovní údaje
    #[ORM\Column(type: Types::STRING, length: 50, nullable: true)]
    private ?string $bankAccount = null;

    #[ORM\Column(type: Types::STRING, length: 10, nullable: true)]
    private ?string $bankCode = null;

    #[ORM\Column(type: Types::STRING, length: 255, nullable: true)]
    private ?string $bankName = null;

    #[ORM\Column(type: Types::STRING, length: 50, nullable: true)]
    private ?string $iban = null;

    #[ORM\Column(type: Types::STRING, length: 20, nullable: true)]
    private ?string $swift = null;

    // Fakturační nastavení - ostré faktury
    #[ORM\Column(type: Types::STRING, length: 20)]
    private string $invoicePrefix = 'FG';

    #[ORM\Column(type: Types::INTEGER)]
    private int $invoiceNextNumber = 1;

    // Fakturační nastavení - zálohové faktury
    #[ORM\Column(type: Types::STRING, length: 20)]
    private string $depositInvoicePrefix = 'ZF';

    #[ORM\Column(type: Types::INTEGER)]
    private int $depositInvoiceNextNumber = 1;

    #[ORM\Column(type: Types::INTEGER)]
    private int $invoiceDueDays = 14;

    #[ORM\Column(type: Types::INTEGER)]
    private int $defaultVatRate = 21;

    // Logo a další
    #[ORM\Column(type: Types::TEXT, nullable: true)]
    private ?string $logoBase64 = null;

    #[ORM\Column(type: Types::TEXT, nullable: true)]
    private ?string $invoiceFooterText = null;

    // Registrace
    #[ORM\Column(type: Types::STRING, length: 255, nullable: true)]
    private ?string $registrationInfo = null; // Např. "Zapsáno v OR u MS v Praze, oddíl C, vložka 12345"

    #[ORM\Column(type: Types::BOOLEAN)]
    private bool $isVatPayer = true;

    #[ORM\Column(type: Types::DATETIME_MUTABLE)]
    private \DateTimeInterface $createdAt;

    #[ORM\Column(type: Types::DATETIME_MUTABLE)]
    private \DateTimeInterface $updatedAt;

    public function __construct()
    {
        $this->createdAt = new \DateTime();
        $this->updatedAt = new \DateTime();
    }

    public function getId(): ?int
    {
        return $this->id;
    }

    public function getCode(): string
    {
        return $this->code;
    }

    public function setCode(string $code): static
    {
        $this->code = $code;
        return $this;
    }

    public function getCompanyName(): string
    {
        return $this->companyName;
    }

    public function setCompanyName(string $companyName): static
    {
        $this->companyName = $companyName;
        return $this;
    }

    public function getStreet(): string
    {
        return $this->street;
    }

    public function setStreet(string $street): static
    {
        $this->street = $street;
        return $this;
    }

    public function getCity(): string
    {
        return $this->city;
    }

    public function setCity(string $city): static
    {
        $this->city = $city;
        return $this;
    }

    public function getZipcode(): string
    {
        return $this->zipcode;
    }

    public function setZipcode(string $zipcode): static
    {
        $this->zipcode = $zipcode;
        return $this;
    }

    public function getCountry(): ?string
    {
        return $this->country;
    }

    public function setCountry(?string $country): static
    {
        $this->country = $country;
        return $this;
    }

    public function getIco(): string
    {
        return $this->ico;
    }

    public function setIco(string $ico): static
    {
        $this->ico = $ico;
        return $this;
    }

    public function getDic(): ?string
    {
        return $this->dic;
    }

    public function setDic(?string $dic): static
    {
        $this->dic = $dic;
        return $this;
    }

    public function getEmail(): ?string
    {
        return $this->email;
    }

    public function setEmail(?string $email): static
    {
        $this->email = $email;
        return $this;
    }

    public function getPhone(): ?string
    {
        return $this->phone;
    }

    public function setPhone(?string $phone): static
    {
        $this->phone = $phone;
        return $this;
    }

    public function getWeb(): ?string
    {
        return $this->web;
    }

    public function setWeb(?string $web): static
    {
        $this->web = $web;
        return $this;
    }

    public function getBankAccount(): ?string
    {
        return $this->bankAccount;
    }

    public function setBankAccount(?string $bankAccount): static
    {
        $this->bankAccount = $bankAccount;
        return $this;
    }

    public function getBankCode(): ?string
    {
        return $this->bankCode;
    }

    public function setBankCode(?string $bankCode): static
    {
        $this->bankCode = $bankCode;
        return $this;
    }

    public function getBankName(): ?string
    {
        return $this->bankName;
    }

    public function setBankName(?string $bankName): static
    {
        $this->bankName = $bankName;
        return $this;
    }

    public function getIban(): ?string
    {
        return $this->iban;
    }

    public function setIban(?string $iban): static
    {
        $this->iban = $iban;
        return $this;
    }

    public function getSwift(): ?string
    {
        return $this->swift;
    }

    public function setSwift(?string $swift): static
    {
        $this->swift = $swift;
        return $this;
    }

    public function getInvoicePrefix(): string
    {
        return $this->invoicePrefix;
    }

    public function setInvoicePrefix(string $invoicePrefix): static
    {
        $this->invoicePrefix = $invoicePrefix;
        return $this;
    }

    public function getInvoiceNextNumber(): int
    {
        return $this->invoiceNextNumber;
    }

    public function setInvoiceNextNumber(int $invoiceNextNumber): static
    {
        $this->invoiceNextNumber = $invoiceNextNumber;
        return $this;
    }

    public function getInvoiceDueDays(): int
    {
        return $this->invoiceDueDays;
    }

    public function setInvoiceDueDays(int $invoiceDueDays): static
    {
        $this->invoiceDueDays = $invoiceDueDays;
        return $this;
    }

    public function getDefaultVatRate(): int
    {
        return $this->defaultVatRate;
    }

    public function setDefaultVatRate(int $defaultVatRate): static
    {
        $this->defaultVatRate = $defaultVatRate;
        return $this;
    }

    public function getLogoBase64(): ?string
    {
        return $this->logoBase64;
    }

    public function setLogoBase64(?string $logoBase64): static
    {
        $this->logoBase64 = $logoBase64;
        return $this;
    }

    public function getInvoiceFooterText(): ?string
    {
        return $this->invoiceFooterText;
    }

    public function setInvoiceFooterText(?string $invoiceFooterText): static
    {
        $this->invoiceFooterText = $invoiceFooterText;
        return $this;
    }

    public function getRegistrationInfo(): ?string
    {
        return $this->registrationInfo;
    }

    public function setRegistrationInfo(?string $registrationInfo): static
    {
        $this->registrationInfo = $registrationInfo;
        return $this;
    }

    public function isVatPayer(): bool
    {
        return $this->isVatPayer;
    }

    public function setIsVatPayer(bool $isVatPayer): static
    {
        $this->isVatPayer = $isVatPayer;
        return $this;
    }

    public function getCreatedAt(): \DateTimeInterface
    {
        return $this->createdAt;
    }

    public function setCreatedAt(\DateTimeInterface $createdAt): static
    {
        $this->createdAt = $createdAt;
        return $this;
    }

    public function getUpdatedAt(): \DateTimeInterface
    {
        return $this->updatedAt;
    }

    public function setUpdatedAt(\DateTimeInterface $updatedAt): static
    {
        $this->updatedAt = $updatedAt;
        return $this;
    }

    public function getDepositInvoicePrefix(): string
    {
        return $this->depositInvoicePrefix;
    }

    public function setDepositInvoicePrefix(string $depositInvoicePrefix): static
    {
        $this->depositInvoicePrefix = $depositInvoicePrefix;
        return $this;
    }

    public function getDepositInvoiceNextNumber(): int
    {
        return $this->depositInvoiceNextNumber;
    }

    public function setDepositInvoiceNextNumber(int $depositInvoiceNextNumber): static
    {
        $this->depositInvoiceNextNumber = $depositInvoiceNextNumber;
        return $this;
    }

    /**
     * Vrátí plné číslo účtu ve formátu pro CZ
     */
    public function getFullBankAccount(): ?string
    {
        if (!$this->bankAccount || !$this->bankCode) {
            return null;
        }
        return $this->bankAccount . '/' . $this->bankCode;
    }

    /**
     * Generuje další číslo ostré faktury a inkrementuje počítadlo
     */
    public function generateNextInvoiceNumber(): string
    {
        $year = date('Y');
        $number = str_pad((string) $this->invoiceNextNumber, 6, '0', STR_PAD_LEFT);
        $this->invoiceNextNumber++;
        return $this->invoicePrefix . $year . $number;
    }

    /**
     * Generuje další číslo zálohové faktury a inkrementuje počítadlo
     */
    public function generateNextDepositInvoiceNumber(): string
    {
        $year = date('Y');
        $number = str_pad((string) $this->depositInvoiceNextNumber, 6, '0', STR_PAD_LEFT);
        $this->depositInvoiceNextNumber++;
        return $this->depositInvoicePrefix . $year . $number;
    }
}
