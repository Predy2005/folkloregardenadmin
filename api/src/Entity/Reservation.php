<?php
declare(strict_types=1);

namespace App\Entity;

use App\Entity\ReservationPerson;
use App\Entity\Payment;
use App\Repository\ReservationRepository;
use Doctrine\Common\Collections\ArrayCollection;
use Doctrine\Common\Collections\Collection;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity(repositoryClass: ReservationRepository::class)]
#[ORM\Table(name: 'reservation')]
class Reservation
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column(type: Types::INTEGER)]
    private ?int $id = null;

    #[ORM\Column(type: Types::DATE_MUTABLE)]
    private ?\DateTimeInterface $date = null;

    #[ORM\Column(type: Types::STRING, length: 20)]
    private string $status = 'RECEIVED';

    // Kontaktní údaje
    #[ORM\Column(type: Types::STRING, length: 255)]
    private ?string $contactName = null;

    #[ORM\Column(type: Types::STRING, length: 255)]
    private ?string $contactEmail = null;

    #[ORM\Column(type: Types::STRING, length: 50)]
    private ?string $contactPhone = null;

    #[ORM\Column(type: Types::STRING, length: 50)]
    private ?string $contactNationality = null;

    #[ORM\Column(type: Types::STRING, length: 255)]
    private ?string $clientComeFrom = null;

    #[ORM\Column(type: Types::TEXT, nullable: true)]
    private ?string $contactNote = null;

    // Fakturační údaje
    #[ORM\Column(type: Types::BOOLEAN)]
    private bool $invoiceSameAsContact = true;

    #[ORM\Column(type: Types::STRING, length: 255, nullable: true)]
    private ?string $invoiceName = null;

    #[ORM\Column(type: Types::STRING, length: 255, nullable: true)]
    private ?string $invoiceCompany = null;

    #[ORM\Column(type: Types::STRING, length: 50, nullable: true)]
    private ?string $invoiceIc = null;

    #[ORM\Column(type: Types::STRING, length: 50, nullable: true)]
    private ?string $invoiceDic = null;

    #[ORM\Column(type: Types::STRING, length: 255, nullable: true)]
    private ?string $invoiceEmail = null;

    #[ORM\Column(type: Types::STRING, length: 50, nullable: true)]
    private ?string $invoicePhone = null;

    #[ORM\Column(type: Types::STRING, length: 255, nullable: true)]
    private ?string $invoiceStreet = null;

    #[ORM\Column(type: Types::STRING, length: 255, nullable: true)]
    private ?string $invoiceCity = null;

    #[ORM\Column(type: Types::STRING, length: 20, nullable: true)]
    private ?string $invoiceZipcode = null;

    #[ORM\Column(type: Types::STRING, length: 100, nullable: true)]
    private ?string $invoiceCountry = null;

    // Transfer
    #[ORM\Column(type: Types::BOOLEAN)]
    private bool $transferSelected = false;

    #[ORM\Column(type: Types::INTEGER, nullable: true)]
    private ?int $transferCount = null;

    #[ORM\Column(type: Types::STRING, length: 255, nullable: true)]
    private ?string $transferAddress = null;

    // Souhlas
    #[ORM\Column(type: Types::BOOLEAN)]
    private bool $agreement = false;

    // Časové značky
    #[ORM\Column(type: Types::DATETIME_MUTABLE)]
    private \DateTimeInterface $createdAt;

    #[ORM\Column(type: Types::DATETIME_MUTABLE)]
    private \DateTimeInterface $updatedAt;

    // Vztahy
    #[ORM\OneToMany(mappedBy: 'reservation', targetEntity: ReservationPerson::class, cascade: ['persist', 'remove'])]
    private Collection $persons;

    #[ORM\OneToMany(mappedBy: 'reservation', targetEntity: Payment::class, cascade: ['persist', 'remove'])]
    private Collection $payments;

    #[ORM\OneToMany(mappedBy: 'reservation', targetEntity: Invoice::class)]
    private Collection $invoices;

    // Platební údaje
    #[ORM\Column(type: Types::STRING, length: 20, nullable: true)]
    private ?string $source = 'WEB'; // 'WEB' | 'ADMIN'

    #[ORM\Column(type: Types::STRING, length: 50, nullable: true)]
    private ?string $paymentMethod = null; // 'ONLINE' | 'DEPOSIT' | 'INVOICE' | 'CASH' | 'BANK_TRANSFER' | 'MIXED'

    #[ORM\Column(type: Types::STRING, length: 20, nullable: true)]
    private ?string $paymentStatus = 'UNPAID'; // 'UNPAID' | 'PARTIAL' | 'PAID'

    #[ORM\Column(type: Types::DECIMAL, precision: 5, scale: 2, nullable: true)]
    private ?string $depositPercent = '25.00';

    #[ORM\Column(type: Types::DECIMAL, precision: 12, scale: 2, nullable: true)]
    private ?string $depositAmount = null;

    #[ORM\Column(type: Types::DECIMAL, precision: 12, scale: 2, nullable: true)]
    private ?string $totalPrice = null;

    #[ORM\Column(type: Types::DECIMAL, precision: 12, scale: 2, nullable: true)]
    private ?string $paidAmount = '0.00';

    #[ORM\Column(type: Types::TEXT, nullable: true)]
    private ?string $paymentNote = null;

    public function __construct()
    {
        $this->persons = new ArrayCollection();
        $this->payments = new ArrayCollection();
        $this->invoices = new ArrayCollection();
        $this->createdAt = new \DateTime();
        $this->updatedAt = new \DateTime();
    }

    public function getId(): ?int
    {
        return $this->id;
    }

    public function getDate(): ?\DateTimeInterface
    {
        return $this->date;
    }

    public function setDate(\DateTimeInterface $date): static
    {
        $this->date = $date;
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

    public function getContactName(): ?string
    {
        return $this->contactName;
    }

    public function setContactName(string $contactName): static
    {
        $this->contactName = $contactName;
        return $this;
    }

    public function getContactEmail(): ?string
    {
        return $this->contactEmail;
    }

    public function setContactEmail(string $contactEmail): static
    {
        $this->contactEmail = $contactEmail;
        return $this;
    }

    public function getContactPhone(): ?string
    {
        return $this->contactPhone;
    }

    public function setContactPhone(string $contactPhone): static
    {
        $this->contactPhone = $contactPhone;
        return $this;
    }

    public function getContactNationality(): ?string
    {
        return $this->contactNationality;
    }

    public function setContactNationality(string $contactNationality): static
    {
        $this->contactNationality = $contactNationality;
        return $this;
    }

    public function getContactNote(): ?string
    {
        return $this->contactNote;
    }

    public function setContactNote(?string $contactNote): static
    {
        $this->contactNote = $contactNote;
        return $this;
    }

    public function isInvoiceSameAsContact(): bool
    {
        return $this->invoiceSameAsContact;
    }

    public function setInvoiceSameAsContact(bool $invoiceSameAsContact): static
    {
        $this->invoiceSameAsContact = $invoiceSameAsContact;
        return $this;
    }

    public function getInvoiceName(): ?string
    {
        return $this->invoiceName;
    }

    public function setInvoiceName(?string $invoiceName): static
    {
        $this->invoiceName = $invoiceName;
        return $this;
    }

    public function getInvoiceCompany(): ?string
    {
        return $this->invoiceCompany;
    }

    public function setInvoiceCompany(?string $invoiceCompany): static
    {
        $this->invoiceCompany = $invoiceCompany;
        return $this;
    }

    public function getInvoiceIc(): ?string
    {
        return $this->invoiceIc;
    }

    public function setInvoiceIc(?string $invoiceIc): static
    {
        $this->invoiceIc = $invoiceIc;
        return $this;
    }

    public function getInvoiceDic(): ?string
    {
        return $this->invoiceDic;
    }

    public function setInvoiceDic(?string $invoiceDic): static
    {
        $this->invoiceDic = $invoiceDic;
        return $this;
    }

    public function getInvoiceEmail(): ?string
    {
        return $this->invoiceEmail;
    }

    public function setInvoiceEmail(?string $invoiceEmail): static
    {
        $this->invoiceEmail = $invoiceEmail;
        return $this;
    }

    public function getInvoicePhone(): ?string
    {
        return $this->invoicePhone;
    }

    public function setInvoicePhone(?string $invoicePhone): static
    {
        $this->invoicePhone = $invoicePhone;
        return $this;
    }

    public function getInvoiceStreet(): ?string
    {
        return $this->invoiceStreet;
    }

    public function setInvoiceStreet(?string $invoiceStreet): static
    {
        $this->invoiceStreet = $invoiceStreet;
        return $this;
    }

    public function getInvoiceCity(): ?string
    {
        return $this->invoiceCity;
    }

    public function setInvoiceCity(?string $invoiceCity): static
    {
        $this->invoiceCity = $invoiceCity;
        return $this;
    }

    public function getInvoiceZipcode(): ?string
    {
        return $this->invoiceZipcode;
    }

    public function setInvoiceZipcode(?string $invoiceZipcode): static
    {
        $this->invoiceZipcode = $invoiceZipcode;
        return $this;
    }

    public function getInvoiceCountry(): ?string
    {
        return $this->invoiceCountry;
    }

    public function setInvoiceCountry(?string $invoiceCountry): static
    {
        $this->invoiceCountry = $invoiceCountry;
        return $this;
    }

    public function isTransferSelected(): bool
    {
        return $this->transferSelected;
    }

    public function setTransferSelected(bool $transferSelected): static
    {
        $this->transferSelected = $transferSelected;
        return $this;
    }

    public function getTransferCount(): ?int
    {
        return $this->transferCount;
    }

    public function setTransferCount(?int $transferCount): static
    {
        $this->transferCount = $transferCount;
        return $this;
    }

    public function getTransferAddress(): ?string
    {
        return $this->transferAddress;
    }

    public function setTransferAddress(?string $transferAddress): static
    {
        $this->transferAddress = $transferAddress;
        return $this;
    }

    public function isAgreement(): bool
    {
        return $this->agreement;
    }

    public function setAgreement(bool $agreement): static
    {
        $this->agreement = $agreement;
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

    public function getClientComeFrom(): ?string
    {
        return $this->clientComeFrom;
    }

    public function setClientComeFrom(?string $clientComeFrom): static
    {
        $this->clientComeFrom = $clientComeFrom;
        return $this;
    }

    /** @return Collection<int, ReservationPerson> */
    public function getPersons(): Collection
    {
        return $this->persons;
    }

    public function addPerson(ReservationPerson $person): static
    {
        if (!$this->persons->contains($person)) {
            $this->persons->add($person);
            $person->setReservation($this);
        }
        return $this;
    }

    public function removePerson(ReservationPerson $person): static
    {
        if ($this->persons->removeElement($person) && $person->getReservation() === $this) {
            $person->setReservation(null);
        }
        return $this;
    }

    public function getPayments(): Collection
    {
        return $this->payments;
    }

    public function addPayment(Payment $payment): static
    {
        if (!$this->payments->contains($payment)) {
            $this->payments->add($payment);
            $payment->setReservation($this);
        }
        return $this;
    }

    public function removePayment(Payment $payment): static
    {
        if ($this->payments->removeElement($payment) && $payment->getReservation() === $this) {
            $payment->setReservation(null);
        }
        return $this;
    }

    /** @return Collection<int, Invoice> */
    public function getInvoices(): Collection
    {
        return $this->invoices;
    }

    public function addInvoice(Invoice $invoice): static
    {
        if (!$this->invoices->contains($invoice)) {
            $this->invoices->add($invoice);
            $invoice->setReservation($this);
        }
        return $this;
    }

    public function removeInvoice(Invoice $invoice): static
    {
        if ($this->invoices->removeElement($invoice) && $invoice->getReservation() === $this) {
            $invoice->setReservation(null);
        }
        return $this;
    }

    // Platební metody - gettery a settery

    public function getSource(): ?string
    {
        return $this->source;
    }

    public function setSource(?string $source): static
    {
        $this->source = $source;
        return $this;
    }

    public function getPaymentMethod(): ?string
    {
        return $this->paymentMethod;
    }

    public function setPaymentMethod(?string $paymentMethod): static
    {
        $this->paymentMethod = $paymentMethod;
        return $this;
    }

    public function getPaymentStatus(): ?string
    {
        return $this->paymentStatus;
    }

    public function setPaymentStatus(?string $paymentStatus): static
    {
        $this->paymentStatus = $paymentStatus;
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

    public function getDepositAmount(): ?string
    {
        return $this->depositAmount;
    }

    public function setDepositAmount(?string $depositAmount): static
    {
        $this->depositAmount = $depositAmount;
        return $this;
    }

    public function getTotalPrice(): ?string
    {
        return $this->totalPrice;
    }

    public function setTotalPrice(?string $totalPrice): static
    {
        $this->totalPrice = $totalPrice;
        return $this;
    }

    public function getPaidAmount(): ?string
    {
        return $this->paidAmount;
    }

    public function setPaidAmount(?string $paidAmount): static
    {
        $this->paidAmount = $paidAmount;
        return $this;
    }

    public function getPaymentNote(): ?string
    {
        return $this->paymentNote;
    }

    public function setPaymentNote(?string $paymentNote): static
    {
        $this->paymentNote = $paymentNote;
        return $this;
    }

    /**
     * Vypočítá zbývající částku k úhradě
     */
    public function getRemainingAmount(): float
    {
        $total = (float)($this->totalPrice ?? 0);
        $paid = (float)($this->paidAmount ?? 0);
        return max(0, $total - $paid);
    }

    /**
     * Zkontroluje, zda je rezervace plně zaplacena
     */
    public function isFullyPaid(): bool
    {
        if ($this->paymentStatus === 'PAID') {
            return true;
        }
        $total = (float)($this->totalPrice ?? 0);
        $paid = (float)($this->paidAmount ?? 0);
        return $total > 0 && $paid >= $total;
    }
}