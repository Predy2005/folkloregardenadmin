<?php
declare(strict_types=1);

namespace App\Entity;

use App\Repository\InvoiceRepository;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity(repositoryClass: InvoiceRepository::class)]
#[ORM\Table(name: 'invoice')]
class Invoice
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column(type: Types::INTEGER)]
    private ?int $id = null;

    #[ORM\Column(type: Types::STRING, length: 50, unique: true)]
    private string $invoiceNumber;

    #[ORM\Column(type: Types::DATE_MUTABLE)]
    private \DateTimeInterface $issueDate;

    #[ORM\Column(type: Types::DATE_MUTABLE)]
    private \DateTimeInterface $dueDate;

    #[ORM\Column(type: Types::DATE_MUTABLE, nullable: true)]
    private ?\DateTimeInterface $taxableDate = null;

    #[ORM\Column(type: Types::STRING, length: 20)]
    private string $status = 'DRAFT'; // DRAFT, SENT, PAID, CANCELLED

    #[ORM\Column(type: Types::STRING, length: 20)]
    private string $invoiceType = 'FINAL'; // DEPOSIT, FINAL, PARTIAL

    #[ORM\Column(type: Types::DECIMAL, precision: 5, scale: 2, nullable: true)]
    private ?string $depositPercent = null;

    #[ORM\Column(type: Types::DATE_MUTABLE, nullable: true)]
    private ?\DateTimeInterface $paidAt = null;

    // Dodavatel (Folklore Garden s.r.o.)
    #[ORM\Column(type: Types::STRING, length: 255)]
    private string $supplierName;

    #[ORM\Column(type: Types::STRING, length: 255)]
    private string $supplierStreet;

    #[ORM\Column(type: Types::STRING, length: 255)]
    private string $supplierCity;

    #[ORM\Column(type: Types::STRING, length: 20)]
    private string $supplierZipcode;

    #[ORM\Column(type: Types::STRING, length: 50)]
    private string $supplierIco;

    #[ORM\Column(type: Types::STRING, length: 50, nullable: true)]
    private ?string $supplierDic = null;

    #[ORM\Column(type: Types::STRING, length: 255, nullable: true)]
    private ?string $supplierEmail = null;

    #[ORM\Column(type: Types::STRING, length: 50, nullable: true)]
    private ?string $supplierPhone = null;

    #[ORM\Column(type: Types::STRING, length: 255, nullable: true)]
    private ?string $supplierBankAccount = null;

    #[ORM\Column(type: Types::STRING, length: 255, nullable: true)]
    private ?string $supplierBankName = null;

    #[ORM\Column(type: Types::STRING, length: 50, nullable: true)]
    private ?string $supplierIban = null;

    #[ORM\Column(type: Types::STRING, length: 20, nullable: true)]
    private ?string $supplierSwift = null;

    // Odběratel (z rezervace)
    #[ORM\Column(type: Types::STRING, length: 255)]
    private string $customerName;

    #[ORM\Column(type: Types::STRING, length: 255, nullable: true)]
    private ?string $customerCompany = null;

    #[ORM\Column(type: Types::STRING, length: 255, nullable: true)]
    private ?string $customerStreet = null;

    #[ORM\Column(type: Types::STRING, length: 255, nullable: true)]
    private ?string $customerCity = null;

    #[ORM\Column(type: Types::STRING, length: 20, nullable: true)]
    private ?string $customerZipcode = null;

    #[ORM\Column(type: Types::STRING, length: 50, nullable: true)]
    private ?string $customerIco = null;

    #[ORM\Column(type: Types::STRING, length: 50, nullable: true)]
    private ?string $customerDic = null;

    #[ORM\Column(type: Types::STRING, length: 255, nullable: true)]
    private ?string $customerEmail = null;

    #[ORM\Column(type: Types::STRING, length: 50, nullable: true)]
    private ?string $customerPhone = null;

    // Finanční údaje
    #[ORM\Column(type: Types::DECIMAL, precision: 12, scale: 2)]
    private string $subtotal = '0.00';

    #[ORM\Column(type: Types::DECIMAL, precision: 12, scale: 2)]
    private string $vatAmount = '0.00';

    #[ORM\Column(type: Types::INTEGER)]
    private int $vatRate = 21;

    #[ORM\Column(type: Types::DECIMAL, precision: 12, scale: 2)]
    private string $total = '0.00';

    #[ORM\Column(type: Types::STRING, length: 10)]
    private string $currency = 'CZK';

    // Variabilní symbol pro platbu
    #[ORM\Column(type: Types::STRING, length: 50)]
    private string $variableSymbol;

    // QR kód pro platbu (SPD formát)
    #[ORM\Column(type: Types::TEXT, nullable: true)]
    private ?string $qrPaymentData = null;

    // Položky faktury (JSON)
    #[ORM\Column(type: Types::JSON)]
    private array $items = [];

    // Poznámky
    #[ORM\Column(type: Types::TEXT, nullable: true)]
    private ?string $note = null;

    // Vztah k rezervaci
    #[ORM\ManyToOne(targetEntity: Reservation::class)]
    #[ORM\JoinColumn(nullable: true, onDelete: 'SET NULL')]
    private ?Reservation $reservation = null;

    // Vytvořil
    #[ORM\ManyToOne(targetEntity: User::class)]
    #[ORM\JoinColumn(nullable: true, onDelete: 'SET NULL')]
    private ?User $createdBy = null;

    #[ORM\Column(type: Types::DATETIME_MUTABLE)]
    private \DateTimeInterface $createdAt;

    #[ORM\Column(type: Types::DATETIME_MUTABLE)]
    private \DateTimeInterface $updatedAt;

    public function __construct()
    {
        $this->createdAt = new \DateTime();
        $this->updatedAt = new \DateTime();
        $this->issueDate = new \DateTime();
        $this->dueDate = (new \DateTime())->modify('+14 days');
        $this->taxableDate = new \DateTime();
    }

    public function getId(): ?int
    {
        return $this->id;
    }

    public function getInvoiceNumber(): string
    {
        return $this->invoiceNumber;
    }

    public function setInvoiceNumber(string $invoiceNumber): static
    {
        $this->invoiceNumber = $invoiceNumber;
        return $this;
    }

    public function getIssueDate(): \DateTimeInterface
    {
        return $this->issueDate;
    }

    public function setIssueDate(\DateTimeInterface $issueDate): static
    {
        $this->issueDate = $issueDate;
        return $this;
    }

    public function getDueDate(): \DateTimeInterface
    {
        return $this->dueDate;
    }

    public function setDueDate(\DateTimeInterface $dueDate): static
    {
        $this->dueDate = $dueDate;
        return $this;
    }

    public function getTaxableDate(): ?\DateTimeInterface
    {
        return $this->taxableDate;
    }

    public function setTaxableDate(?\DateTimeInterface $taxableDate): static
    {
        $this->taxableDate = $taxableDate;
        return $this;
    }

    public function getStatus(): string
    {
        return $this->status;
    }

    public function setStatus(string $status): static
    {
        $this->status = $status;
        return $this;
    }

    public function getSupplierName(): string
    {
        return $this->supplierName;
    }

    public function setSupplierName(string $supplierName): static
    {
        $this->supplierName = $supplierName;
        return $this;
    }

    public function getSupplierStreet(): string
    {
        return $this->supplierStreet;
    }

    public function setSupplierStreet(string $supplierStreet): static
    {
        $this->supplierStreet = $supplierStreet;
        return $this;
    }

    public function getSupplierCity(): string
    {
        return $this->supplierCity;
    }

    public function setSupplierCity(string $supplierCity): static
    {
        $this->supplierCity = $supplierCity;
        return $this;
    }

    public function getSupplierZipcode(): string
    {
        return $this->supplierZipcode;
    }

    public function setSupplierZipcode(string $supplierZipcode): static
    {
        $this->supplierZipcode = $supplierZipcode;
        return $this;
    }

    public function getSupplierIco(): string
    {
        return $this->supplierIco;
    }

    public function setSupplierIco(string $supplierIco): static
    {
        $this->supplierIco = $supplierIco;
        return $this;
    }

    public function getSupplierDic(): ?string
    {
        return $this->supplierDic;
    }

    public function setSupplierDic(?string $supplierDic): static
    {
        $this->supplierDic = $supplierDic;
        return $this;
    }

    public function getSupplierEmail(): ?string
    {
        return $this->supplierEmail;
    }

    public function setSupplierEmail(?string $supplierEmail): static
    {
        $this->supplierEmail = $supplierEmail;
        return $this;
    }

    public function getSupplierPhone(): ?string
    {
        return $this->supplierPhone;
    }

    public function setSupplierPhone(?string $supplierPhone): static
    {
        $this->supplierPhone = $supplierPhone;
        return $this;
    }

    public function getSupplierBankAccount(): ?string
    {
        return $this->supplierBankAccount;
    }

    public function setSupplierBankAccount(?string $supplierBankAccount): static
    {
        $this->supplierBankAccount = $supplierBankAccount;
        return $this;
    }

    public function getSupplierBankName(): ?string
    {
        return $this->supplierBankName;
    }

    public function setSupplierBankName(?string $supplierBankName): static
    {
        $this->supplierBankName = $supplierBankName;
        return $this;
    }

    public function getSupplierIban(): ?string
    {
        return $this->supplierIban;
    }

    public function setSupplierIban(?string $supplierIban): static
    {
        $this->supplierIban = $supplierIban;
        return $this;
    }

    public function getSupplierSwift(): ?string
    {
        return $this->supplierSwift;
    }

    public function setSupplierSwift(?string $supplierSwift): static
    {
        $this->supplierSwift = $supplierSwift;
        return $this;
    }

    public function getCustomerName(): string
    {
        return $this->customerName;
    }

    public function setCustomerName(string $customerName): static
    {
        $this->customerName = $customerName;
        return $this;
    }

    public function getCustomerCompany(): ?string
    {
        return $this->customerCompany;
    }

    public function setCustomerCompany(?string $customerCompany): static
    {
        $this->customerCompany = $customerCompany;
        return $this;
    }

    public function getCustomerStreet(): ?string
    {
        return $this->customerStreet;
    }

    public function setCustomerStreet(?string $customerStreet): static
    {
        $this->customerStreet = $customerStreet;
        return $this;
    }

    public function getCustomerCity(): ?string
    {
        return $this->customerCity;
    }

    public function setCustomerCity(?string $customerCity): static
    {
        $this->customerCity = $customerCity;
        return $this;
    }

    public function getCustomerZipcode(): ?string
    {
        return $this->customerZipcode;
    }

    public function setCustomerZipcode(?string $customerZipcode): static
    {
        $this->customerZipcode = $customerZipcode;
        return $this;
    }

    public function getCustomerIco(): ?string
    {
        return $this->customerIco;
    }

    public function setCustomerIco(?string $customerIco): static
    {
        $this->customerIco = $customerIco;
        return $this;
    }

    public function getCustomerDic(): ?string
    {
        return $this->customerDic;
    }

    public function setCustomerDic(?string $customerDic): static
    {
        $this->customerDic = $customerDic;
        return $this;
    }

    public function getCustomerEmail(): ?string
    {
        return $this->customerEmail;
    }

    public function setCustomerEmail(?string $customerEmail): static
    {
        $this->customerEmail = $customerEmail;
        return $this;
    }

    public function getCustomerPhone(): ?string
    {
        return $this->customerPhone;
    }

    public function setCustomerPhone(?string $customerPhone): static
    {
        $this->customerPhone = $customerPhone;
        return $this;
    }

    public function getSubtotal(): string
    {
        return $this->subtotal;
    }

    public function setSubtotal(string $subtotal): static
    {
        $this->subtotal = $subtotal;
        return $this;
    }

    public function getVatAmount(): string
    {
        return $this->vatAmount;
    }

    public function setVatAmount(string $vatAmount): static
    {
        $this->vatAmount = $vatAmount;
        return $this;
    }

    public function getVatRate(): int
    {
        return $this->vatRate;
    }

    public function setVatRate(int $vatRate): static
    {
        $this->vatRate = $vatRate;
        return $this;
    }

    public function getTotal(): string
    {
        return $this->total;
    }

    public function setTotal(string $total): static
    {
        $this->total = $total;
        return $this;
    }

    public function getCurrency(): string
    {
        return $this->currency;
    }

    public function setCurrency(string $currency): static
    {
        $this->currency = $currency;
        return $this;
    }

    public function getVariableSymbol(): string
    {
        return $this->variableSymbol;
    }

    public function setVariableSymbol(string $variableSymbol): static
    {
        $this->variableSymbol = $variableSymbol;
        return $this;
    }

    public function getQrPaymentData(): ?string
    {
        return $this->qrPaymentData;
    }

    public function setQrPaymentData(?string $qrPaymentData): static
    {
        $this->qrPaymentData = $qrPaymentData;
        return $this;
    }

    public function getItems(): array
    {
        return $this->items;
    }

    public function setItems(array $items): static
    {
        $this->items = $items;
        return $this;
    }

    public function getNote(): ?string
    {
        return $this->note;
    }

    public function setNote(?string $note): static
    {
        $this->note = $note;
        return $this;
    }

    public function getReservation(): ?Reservation
    {
        return $this->reservation;
    }

    public function setReservation(?Reservation $reservation): static
    {
        $this->reservation = $reservation;
        return $this;
    }

    public function getCreatedBy(): ?User
    {
        return $this->createdBy;
    }

    public function setCreatedBy(?User $createdBy): static
    {
        $this->createdBy = $createdBy;
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

    public function getInvoiceType(): string
    {
        return $this->invoiceType;
    }

    public function setInvoiceType(string $invoiceType): static
    {
        $this->invoiceType = $invoiceType;
        return $this;
    }

    public function getDepositPercent(): ?string
    {
        return $this->depositPercent;
    }

    public function setDepositPercent(?string $depositPercent): static
    {
        $this->depositPercent = $depositPercent;
        return $this;
    }

    public function getPaidAt(): ?\DateTimeInterface
    {
        return $this->paidAt;
    }

    public function setPaidAt(?\DateTimeInterface $paidAt): static
    {
        $this->paidAt = $paidAt;
        return $this;
    }

    public function isDeposit(): bool
    {
        return $this->invoiceType === 'DEPOSIT';
    }

    public function isFinal(): bool
    {
        return $this->invoiceType === 'FINAL';
    }
}
