<?php
declare(strict_types=1);

namespace App\Service;

use App\Entity\Invoice;
use App\Entity\Reservation;
use App\Entity\User;
use App\Repository\CompanySettingsRepository;
use App\Repository\InvoiceRepository;
use Doctrine\ORM\EntityManagerInterface;

class InvoiceService
{
    private const PERSON_TYPE_LABELS = [
        'adult' => 'Dospělý',
        'child' => 'Dítě',
        'infant' => 'Batole',
        'driver' => 'Řidič',
        'guide' => 'Průvodce',
    ];

    public function __construct(
        private EntityManagerInterface $entityManager,
        private InvoiceRepository $invoiceRepository,
        private CompanySettingsRepository $companySettingsRepository,
        private InvoiceEmailService $invoiceEmailService,
    ) {
    }

    /**
     * Vrátí lidský popis typu osoby
     */
    private function getPersonTypeLabel(?string $type): string
    {
        return self::PERSON_TYPE_LABELS[$type ?? ''] ?? ($type ?? 'Osoba');
    }

    /**
     * Vytvoří fakturu z rezervace
     */
    public function createFromReservation(Reservation $reservation, ?User $createdBy = null): Invoice
    {
        $settings = $this->companySettingsRepository->getOrCreateDefault();

        $invoice = new Invoice();

        // Vygeneruj číslo faktury
        $invoiceNumber = $settings->generateNextInvoiceNumber();
        $invoice->setInvoiceNumber($invoiceNumber);

        // Variabilní symbol = ID rezervace
        $invoice->setVariableSymbol((string) $reservation->getId());

        // Datum vystavení a splatnosti
        $invoice->setIssueDate(new \DateTime());
        $invoice->setTaxableDate(new \DateTime());
        $invoice->setDueDate((new \DateTime())->modify('+' . $settings->getInvoiceDueDays() . ' days'));

        // Dodavatel z nastavení
        $invoice->setSupplierName($settings->getCompanyName());
        $invoice->setSupplierStreet($settings->getStreet());
        $invoice->setSupplierCity($settings->getCity());
        $invoice->setSupplierZipcode($settings->getZipcode());
        $invoice->setSupplierIco($settings->getIco());
        $invoice->setSupplierDic($settings->getDic());
        $invoice->setSupplierEmail($settings->getEmail());
        $invoice->setSupplierPhone($settings->getPhone());
        $invoice->setSupplierBankAccount($settings->getFullBankAccount());
        $invoice->setSupplierBankName($settings->getBankName());
        $invoice->setSupplierIban($settings->getIban());
        $invoice->setSupplierSwift($settings->getSwift());

        // Odběratel z rezervace
        if ($reservation->isInvoiceSameAsContact()) {
            $invoice->setCustomerName($reservation->getContactName() ?? '');
            $invoice->setCustomerEmail($reservation->getContactEmail());
            $invoice->setCustomerPhone($reservation->getContactPhone());
        } else {
            $invoice->setCustomerName($reservation->getInvoiceName() ?? $reservation->getContactName() ?? '');
            $invoice->setCustomerCompany($reservation->getInvoiceCompany());
            $invoice->setCustomerIco($reservation->getInvoiceIc());
            $invoice->setCustomerDic($reservation->getInvoiceDic());
            $invoice->setCustomerEmail($reservation->getInvoiceEmail() ?? $reservation->getContactEmail());
            $invoice->setCustomerPhone($reservation->getInvoicePhone() ?? $reservation->getContactPhone());
            $invoice->setCustomerStreet($reservation->getInvoiceStreet());
            $invoice->setCustomerCity($reservation->getInvoiceCity());
            $invoice->setCustomerZipcode($reservation->getInvoiceZipcode());
        }

        // Položky faktury - z osob v rezervaci, seskupené podle typu a ceny
        $grouped = [];
        $subtotal = 0;
        $dateStr = $reservation->getDate()?->format('d.m.Y') ?? '';

        foreach ($reservation->getPersons() as $person) {
            $price = (float) $person->getPrice();
            $subtotal += $price;

            $typeLabel = $this->getPersonTypeLabel($person->getType());
            $menu = $person->getMenu() ?? 'standardní menu';
            $key = $typeLabel . '|' . $menu . '|' . number_format($price, 2, '.', '');

            if (!isset($grouped[$key])) {
                $grouped[$key] = [
                    'description' => sprintf('%s - %s (%s)', $dateStr, $typeLabel, $menu),
                    'quantity' => 0,
                    'unitPrice' => $price,
                    'total' => 0,
                ];
            }
            $grouped[$key]['quantity']++;
            $grouped[$key]['total'] += $price;
        }

        $items = array_values($grouped);

        // Pokud je transfer
        if ($reservation->isTransferSelected() && $reservation->getTransferCount()) {
            $transferPrice = $reservation->getTransferCount() * 200;
            $subtotal += $transferPrice;

            $items[] = [
                'description' => sprintf('Transfer (%dx osoba)', $reservation->getTransferCount()),
                'quantity' => $reservation->getTransferCount(),
                'unitPrice' => 200,
                'total' => $transferPrice,
            ];
        }

        $invoice->setItems($items);

        // Výpočet DPH a celkové částky
        $vatRate = $settings->getDefaultVatRate();
        if ($settings->isVatPayer()) {
            $vatAmount = $subtotal * ($vatRate / 100);
            $total = $subtotal + $vatAmount;
        } else {
            $vatAmount = 0;
            $total = $subtotal;
        }

        $invoice->setSubtotal(number_format($subtotal, 2, '.', ''));
        $invoice->setVatRate($vatRate);
        $invoice->setVatAmount(number_format($vatAmount, 2, '.', ''));
        $invoice->setTotal(number_format($total, 2, '.', ''));
        $invoice->setCurrency($reservation->getCurrency());

        // Generuj QR kód pro platbu
        $qrData = $this->invoiceEmailService->generateQrPaymentData($invoice, $settings);
        $invoice->setQrPaymentData($qrData);

        // Vazby
        $invoice->setReservation($reservation);
        $invoice->setCreatedBy($createdBy);
        $invoice->setStatus('DRAFT');

        // Uložení
        $this->entityManager->persist($invoice);
        $this->entityManager->persist($settings); // Aktualizuje počítadlo faktur
        $this->entityManager->flush();

        return $invoice;
    }

    /**
     * Vytvoří fakturu manuálně
     */
    public function create(array $data, ?User $createdBy = null): Invoice
    {
        $settings = $this->companySettingsRepository->getOrCreateDefault();

        $invoice = new Invoice();

        // Vygeneruj číslo faktury
        $invoiceNumber = $settings->generateNextInvoiceNumber();
        $invoice->setInvoiceNumber($invoiceNumber);

        // Data z formuláře
        $issueDate = new \DateTime($data['issueDate'] ?? 'now');
        $invoice->setIssueDate($issueDate);
        // DUZP: pokud není zadán, použij datum vystavení
        $taxableDate = isset($data['taxableDate']) ? new \DateTime($data['taxableDate']) : clone $issueDate;
        $invoice->setTaxableDate($taxableDate);
        $invoice->setDueDate(new \DateTime($data['dueDate'] ?? '+' . $settings->getInvoiceDueDays() . ' days'));
        $invoice->setVariableSymbol($data['variableSymbol'] ?? '');
        $invoice->setStatus($data['status'] ?? 'DRAFT');
        $invoice->setNote($data['note'] ?? null);

        // Dodavatel z nastavení
        $invoice->setSupplierName($settings->getCompanyName());
        $invoice->setSupplierStreet($settings->getStreet());
        $invoice->setSupplierCity($settings->getCity());
        $invoice->setSupplierZipcode($settings->getZipcode());
        $invoice->setSupplierIco($settings->getIco());
        $invoice->setSupplierDic($settings->getDic());
        $invoice->setSupplierEmail($settings->getEmail());
        $invoice->setSupplierPhone($settings->getPhone());
        $invoice->setSupplierBankAccount($settings->getFullBankAccount());
        $invoice->setSupplierBankName($settings->getBankName());
        $invoice->setSupplierIban($settings->getIban());
        $invoice->setSupplierSwift($settings->getSwift());

        // Odběratel z formuláře
        $invoice->setCustomerName($data['customerName'] ?? '');
        $invoice->setCustomerCompany($data['customerCompany'] ?? null);
        $invoice->setCustomerStreet($data['customerStreet'] ?? null);
        $invoice->setCustomerCity($data['customerCity'] ?? null);
        $invoice->setCustomerZipcode($data['customerZipcode'] ?? null);
        $invoice->setCustomerIco($data['customerIco'] ?? null);
        $invoice->setCustomerDic($data['customerDic'] ?? null);
        $invoice->setCustomerEmail($data['customerEmail'] ?? null);
        $invoice->setCustomerPhone($data['customerPhone'] ?? null);

        // Položky a částky
        $invoice->setItems($data['items'] ?? []);
        $invoice->setVatRate((int) ($data['vatRate'] ?? $settings->getDefaultVatRate()));
        $invoice->setCurrency($data['currency'] ?? 'CZK');

        // Server-side přepočet celkových částek
        $this->recalculateTotals($invoice);

        // Generuj QR kód pro platbu
        $qrData = $this->invoiceEmailService->generateQrPaymentData($invoice, $settings);
        $invoice->setQrPaymentData($qrData);

        // Vazby
        $invoice->setCreatedBy($createdBy);

        // Uložení
        $this->entityManager->persist($invoice);
        $this->entityManager->persist($settings); // Aktualizuje počítadlo faktur
        $this->entityManager->flush();

        return $invoice;
    }

    /**
     * Aktualizuje fakturu
     */
    public function update(Invoice $invoice, array $data, ?User $updatedBy = null): Invoice
    {
        // Kontrola immutability dle stavu faktury
        if ($invoice->getStatus() === 'PAID') {
            throw new \RuntimeException('Zaplacená faktura nelze upravovat.');
        }
        if ($invoice->getStatus() === 'SENT') {
            // Only allow changing note and status
            $allowedFields = ['note', 'status'];
            $restrictedChanges = array_diff(array_keys($data), $allowedFields);
            if (!empty($restrictedChanges)) {
                throw new \RuntimeException('Odeslaná faktura - lze měnit pouze poznámku.');
            }
        }
        if ($invoice->getStatus() === 'CANCELLED') {
            throw new \RuntimeException('Stornovaná faktura nelze upravovat.');
        }

        // Data z formuláře
        if (isset($data['issueDate'])) {
            $invoice->setIssueDate(new \DateTime($data['issueDate']));
        }
        if (isset($data['taxableDate'])) {
            $invoice->setTaxableDate(new \DateTime($data['taxableDate']));
        }
        if (isset($data['dueDate'])) {
            $invoice->setDueDate(new \DateTime($data['dueDate']));
        }
        if (isset($data['variableSymbol'])) {
            $invoice->setVariableSymbol($data['variableSymbol']);
        }
        if (isset($data['status'])) {
            $invoice->setStatus($data['status']);
        }
        if (array_key_exists('note', $data)) {
            $invoice->setNote($data['note']);
        }

        // Odběratel
        if (isset($data['customerName'])) {
            $invoice->setCustomerName($data['customerName']);
        }
        if (array_key_exists('customerCompany', $data)) {
            $invoice->setCustomerCompany($data['customerCompany']);
        }
        if (array_key_exists('customerStreet', $data)) {
            $invoice->setCustomerStreet($data['customerStreet']);
        }
        if (array_key_exists('customerCity', $data)) {
            $invoice->setCustomerCity($data['customerCity']);
        }
        if (array_key_exists('customerZipcode', $data)) {
            $invoice->setCustomerZipcode($data['customerZipcode']);
        }
        if (array_key_exists('customerIco', $data)) {
            $invoice->setCustomerIco($data['customerIco']);
        }
        if (array_key_exists('customerDic', $data)) {
            $invoice->setCustomerDic($data['customerDic']);
        }
        if (array_key_exists('customerEmail', $data)) {
            $invoice->setCustomerEmail($data['customerEmail']);
        }
        if (array_key_exists('customerPhone', $data)) {
            $invoice->setCustomerPhone($data['customerPhone']);
        }

        // Položky a částky
        if (isset($data['items'])) {
            $invoice->setItems($data['items']);
        }
        if (isset($data['vatRate'])) {
            $invoice->setVatRate((int) $data['vatRate']);
        }
        if (isset($data['currency'])) {
            $invoice->setCurrency($data['currency']);
        }

        // Server-side přepočet celkových částek pokud se změnily položky nebo DPH
        if (isset($data['items']) || isset($data['vatRate'])) {
            $this->recalculateTotals($invoice);
        }

        // Aktualizuj QR kód
        $settings = $this->companySettingsRepository->getDefault();
        $qrData = $this->invoiceEmailService->generateQrPaymentData($invoice, $settings);
        $invoice->setQrPaymentData($qrData);

        $invoice->setUpdatedAt(new \DateTime());

        // Audit: zaznamenej kdo provedl změnu
        if ($updatedBy) {
            $invoice->setUpdatedBy($updatedBy->getId());
        }

        $this->entityManager->flush();

        return $invoice;
    }

    /**
     * Přepočítá celkové částky faktury z položek (server-side)
     * Používá bcmath pro přesné finanční výpočty
     */
    private function recalculateTotals(Invoice $invoice): void
    {
        $items = $invoice->getItems();
        $subtotal = '0.00';
        foreach ($items as $key => $item) {
            $itemTotal = bcmul((string)($item['quantity'] ?? 1), (string)($item['unitPrice'] ?? 0), 2);
            $items[$key]['total'] = $itemTotal;
            $subtotal = bcadd($subtotal, $itemTotal, 2);
        }
        $invoice->setItems($items);
        $invoice->setSubtotal($subtotal);
        $vatAmount = bcmul($subtotal, bcdiv((string)$invoice->getVatRate(), '100', 6), 2);
        $invoice->setVatAmount($vatAmount);
        $invoice->setTotal(bcadd($subtotal, $vatAmount, 2));
    }

    /**
     * Vrátí fakturu jako pole pro JSON odpověď
     */
    public function toArray(Invoice $invoice): array
    {
        return [
            'id' => $invoice->getId(),
            'invoiceNumber' => $invoice->getInvoiceNumber(),
            'invoiceType' => $invoice->getInvoiceType(),
            'issueDate' => $invoice->getIssueDate()->format('Y-m-d'),
            'dueDate' => $invoice->getDueDate()->format('Y-m-d'),
            'taxableDate' => $invoice->getTaxableDate()?->format('Y-m-d'),
            'paidAt' => $invoice->getPaidAt()?->format('Y-m-d'),
            'status' => $invoice->getStatus(),
            'depositPercent' => $invoice->getDepositPercent(),

            'supplier' => [
                'name' => $invoice->getSupplierName(),
                'street' => $invoice->getSupplierStreet(),
                'city' => $invoice->getSupplierCity(),
                'zipcode' => $invoice->getSupplierZipcode(),
                'ico' => $invoice->getSupplierIco(),
                'dic' => $invoice->getSupplierDic(),
                'email' => $invoice->getSupplierEmail(),
                'phone' => $invoice->getSupplierPhone(),
                'bankAccount' => $invoice->getSupplierBankAccount(),
                'bankName' => $invoice->getSupplierBankName(),
                'iban' => $invoice->getSupplierIban(),
                'swift' => $invoice->getSupplierSwift(),
            ],

            'customer' => [
                'name' => $invoice->getCustomerName(),
                'company' => $invoice->getCustomerCompany(),
                'street' => $invoice->getCustomerStreet(),
                'city' => $invoice->getCustomerCity(),
                'zipcode' => $invoice->getCustomerZipcode(),
                'ico' => $invoice->getCustomerIco(),
                'dic' => $invoice->getCustomerDic(),
                'email' => $invoice->getCustomerEmail(),
                'phone' => $invoice->getCustomerPhone(),
            ],

            'items' => $invoice->getItems(),
            'subtotal' => $invoice->getSubtotal(),
            'vatRate' => $invoice->getVatRate(),
            'vatAmount' => $invoice->getVatAmount(),
            'total' => $invoice->getTotal(),
            'currency' => $invoice->getCurrency(),
            'variableSymbol' => $invoice->getVariableSymbol(),
            'qrPaymentData' => $invoice->getQrPaymentData(),
            'note' => $invoice->getNote(),

            'reservationId' => $invoice->getReservation()?->getId(),
            'originalInvoiceId' => $invoice->getOriginalInvoiceId(),
            'createdById' => $invoice->getCreatedBy()?->getId(),
            'updatedBy' => $invoice->getUpdatedBy(),
            'createdAt' => $invoice->getCreatedAt()->format('Y-m-d H:i:s'),
            'updatedAt' => $invoice->getUpdatedAt()->format('Y-m-d H:i:s'),
        ];
    }
}
