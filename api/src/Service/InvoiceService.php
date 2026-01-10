<?php
declare(strict_types=1);

namespace App\Service;

use App\Entity\CompanySettings;
use App\Entity\Invoice;
use App\Entity\Reservation;
use App\Entity\User;
use App\Repository\CompanySettingsRepository;
use App\Repository\InvoiceRepository;
use Doctrine\ORM\EntityManagerInterface;
use Psr\Log\LoggerInterface;
use Symfony\Component\Mailer\Exception\TransportExceptionInterface;
use Symfony\Component\Mime\Email;

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
        private SafeMailerService $safeMailer,
        private LoggerInterface $logger,
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

        // Položky faktury - z osob v rezervaci
        $items = [];
        $subtotal = 0;

        foreach ($reservation->getPersons() as $person) {
            $price = (float) $person->getPrice();
            $subtotal += $price;

            $items[] = [
                'description' => sprintf(
                    'Rezervace na %s - %s (%s)',
                    $reservation->getDate()?->format('d.m.Y'),
                    $this->getPersonTypeLabel($person->getType()),
                    $person->getMenu() ?? 'standardní menu'
                ),
                'quantity' => 1,
                'unitPrice' => $price,
                'total' => $price,
            ];
        }

        // Pokud je transfer
        if ($reservation->isTransferSelected() && $reservation->getTransferCount()) {
            $transferPrice = $reservation->getTransferCount() * 200; // Předpokládaná cena transferu
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
        $invoice->setCurrency('CZK');

        // Generuj QR kód pro platbu
        $qrData = $this->generateQrPaymentData($invoice, $settings);
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
     * Generuje QR kód pro platbu v SPD formátu (Short Payment Descriptor)
     * Formát: SPD*1.0*ACC:IBAN*AM:CASTKA*CC:MENA*X-VS:VARSYMBOL*MSG:ZPRAVA
     */
    public function generateQrPaymentData(Invoice $invoice, ?CompanySettings $settings = null): string
    {
        if ($settings === null) {
            $settings = $this->companySettingsRepository->getDefault();
        }

        if ($settings === null || !$settings->getIban()) {
            return '';
        }

        $parts = [
            'SPD*1.0',
            'ACC:' . str_replace(' ', '', $settings->getIban()),
            'AM:' . number_format((float) $invoice->getTotal(), 2, '.', ''),
            'CC:' . $invoice->getCurrency(),
            'X-VS:' . $invoice->getVariableSymbol(),
            'MSG:Faktura ' . $invoice->getInvoiceNumber(),
        ];

        // Přidej jméno příjemce (max 35 znaků)
        $recipientName = mb_substr($settings->getCompanyName(), 0, 35);
        $parts[] = 'RN:' . $recipientName;

        return implode('*', $parts);
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
        $invoice->setIssueDate(new \DateTime($data['issueDate'] ?? 'now'));
        $invoice->setTaxableDate(new \DateTime($data['taxableDate'] ?? 'now'));
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
        $invoice->setSubtotal($data['subtotal'] ?? '0.00');
        $invoice->setVatRate((int) ($data['vatRate'] ?? $settings->getDefaultVatRate()));
        $invoice->setVatAmount($data['vatAmount'] ?? '0.00');
        $invoice->setTotal($data['total'] ?? '0.00');
        $invoice->setCurrency($data['currency'] ?? 'CZK');

        // Generuj QR kód pro platbu
        $qrData = $this->generateQrPaymentData($invoice, $settings);
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
    public function update(Invoice $invoice, array $data): Invoice
    {
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
        if (isset($data['subtotal'])) {
            $invoice->setSubtotal($data['subtotal']);
        }
        if (isset($data['vatRate'])) {
            $invoice->setVatRate((int) $data['vatRate']);
        }
        if (isset($data['vatAmount'])) {
            $invoice->setVatAmount($data['vatAmount']);
        }
        if (isset($data['total'])) {
            $invoice->setTotal($data['total']);
        }
        if (isset($data['currency'])) {
            $invoice->setCurrency($data['currency']);
        }

        // Aktualizuj QR kód
        $settings = $this->companySettingsRepository->getDefault();
        $qrData = $this->generateQrPaymentData($invoice, $settings);
        $invoice->setQrPaymentData($qrData);

        $invoice->setUpdatedAt(new \DateTime());
        $this->entityManager->flush();

        return $invoice;
    }

    /**
     * Označí fakturu jako odeslanou
     */
    public function markAsSent(Invoice $invoice): Invoice
    {
        $invoice->setStatus('SENT');
        $invoice->setUpdatedAt(new \DateTime());
        $this->entityManager->flush();

        return $invoice;
    }

    /**
     * Označí fakturu jako zaplacenou a aktualizuje rezervaci
     */
    public function markAsPaid(Invoice $invoice): Invoice
    {
        $invoice->setStatus('PAID');
        $invoice->setPaidAt(new \DateTime());
        $invoice->setUpdatedAt(new \DateTime());

        // Aktualizuj rezervaci pokud existuje
        $reservation = $invoice->getReservation();
        if ($reservation) {
            $invoiceAmount = (float)$invoice->getTotal();
            $currentPaid = (float)($reservation->getPaidAmount() ?? 0);
            $newPaidAmount = $currentPaid + $invoiceAmount;
            $reservation->setPaidAmount(number_format($newPaidAmount, 2, '.', ''));

            // Zkontroluj zda je rezervace plně zaplacena
            $totalPrice = (float)($reservation->getTotalPrice() ?? 0);
            if ($totalPrice > 0 && $newPaidAmount >= $totalPrice) {
                $reservation->setPaymentStatus('PAID');
                $reservation->setStatus('PAID');
            } elseif ($newPaidAmount > 0) {
                $reservation->setPaymentStatus('PARTIAL');
            }
        }

        $this->entityManager->flush();

        return $invoice;
    }

    /**
     * Stornuje fakturu
     */
    public function cancel(Invoice $invoice): Invoice
    {
        $invoice->setStatus('CANCELLED');
        $invoice->setUpdatedAt(new \DateTime());
        $this->entityManager->flush();

        return $invoice;
    }

    /**
     * Vypočítá celkovou cenu rezervace
     */
    public function calculateReservationTotal(Reservation $reservation): float
    {
        $total = 0;

        // Ceny z osob
        foreach ($reservation->getPersons() as $person) {
            $total += (float) $person->getPrice();
        }

        // Transfer
        if ($reservation->isTransferSelected() && $reservation->getTransferCount()) {
            $total += $reservation->getTransferCount() * 200;
        }

        return $total;
    }

    /**
     * Vrátí náhled položek pro zálohovou fakturu
     */
    public function getDepositInvoicePreview(Reservation $reservation, float $percent = 25.0): array
    {
        $totalPrice = $this->calculateReservationTotal($reservation);
        $depositAmount = $totalPrice * $percent / 100;
        $settings = $this->companySettingsRepository->getOrCreateDefault();
        $vatRate = $settings->getDefaultVatRate();

        $defaultDescription = sprintf(
            'Záloha %d%% na rezervaci dne %s - %d osob',
            (int) $percent,
            $reservation->getDate()?->format('d.m.Y'),
            $reservation->getPersons()->count()
        );

        $items = [[
            'description' => $defaultDescription,
            'quantity' => 1,
            'unitPrice' => $depositAmount,
            'total' => $depositAmount,
        ]];

        $vatAmount = $settings->isVatPayer() ? $depositAmount * ($vatRate / 100) : 0;

        return [
            'invoiceType' => 'DEPOSIT',
            'items' => $items,
            'subtotal' => $depositAmount,
            'vatRate' => $vatRate,
            'vatAmount' => $vatAmount,
            'total' => $depositAmount + $vatAmount,
            'totalPrice' => $totalPrice,
            'percent' => $percent,
            'defaultDescription' => $defaultDescription,
        ];
    }

    /**
     * Vrátí náhled položek pro finální fakturu
     */
    public function getFinalInvoicePreview(Reservation $reservation): array
    {
        $settings = $this->companySettingsRepository->getOrCreateDefault();
        $vatRate = $settings->getDefaultVatRate();

        // Položky z osob
        $items = [];
        $subtotal = 0;

        foreach ($reservation->getPersons() as $person) {
            $price = (float) $person->getPrice();
            $subtotal += $price;

            $items[] = [
                'description' => sprintf(
                    'Rezervace na %s - %s (%s)',
                    $reservation->getDate()?->format('d.m.Y'),
                    $this->getPersonTypeLabel($person->getType()),
                    $person->getMenu() ?? 'standardní menu'
                ),
                'quantity' => 1,
                'unitPrice' => $price,
                'total' => $price,
            ];
        }

        // Transfer
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

        // Zaplacené zálohy
        $paidDeposits = 0;
        foreach ($reservation->getInvoices() as $invoice) {
            if ($invoice->getInvoiceType() === 'DEPOSIT' && $invoice->getStatus() === 'PAID') {
                $paidDeposits += (float) $invoice->getTotal();
            }
        }

        if ($paidDeposits > 0) {
            $items[] = [
                'description' => 'Uhrazená záloha',
                'quantity' => 1,
                'unitPrice' => -$paidDeposits,
                'total' => -$paidDeposits,
            ];
            $subtotal -= $paidDeposits;
        }

        $vatAmount = $settings->isVatPayer() ? max(0, $subtotal) * ($vatRate / 100) : 0;

        return [
            'invoiceType' => 'FINAL',
            'items' => $items,
            'subtotal' => max(0, $subtotal),
            'vatRate' => $vatRate,
            'vatAmount' => $vatAmount,
            'total' => max(0, $subtotal) + $vatAmount,
            'paidDeposits' => $paidDeposits,
        ];
    }

    /**
     * Vytvoří zálohovou fakturu pro rezervaci
     *
     * @param Reservation $reservation Rezervace
     * @param float $percent Procento zálohy (default 25%)
     * @param float|null $customAmount Vlastní částka zálohy (přepíše procentuální výpočet)
     * @param User|null $createdBy Uživatel který fakturu vytvořil
     * @param array|null $customItems Vlastní položky faktury
     * @param string|null $customDescription Vlastní popis položky zálohy
     */
    public function createDepositInvoice(
        Reservation $reservation,
        float $percent = 25.0,
        ?float $customAmount = null,
        ?User $createdBy = null,
        ?array $customItems = null,
        ?string $customDescription = null
    ): Invoice {
        $settings = $this->companySettingsRepository->getOrCreateDefault();

        // Vypočítej celkovou cenu rezervace
        $totalPrice = $this->calculateReservationTotal($reservation);

        // Nastav celkovou cenu na rezervaci pokud ještě není
        if (!$reservation->getTotalPrice()) {
            $reservation->setTotalPrice(number_format($totalPrice, 2, '.', ''));
        }

        // Vypočítej částku zálohy
        $depositAmount = $customAmount ?? ($totalPrice * $percent / 100);

        // Aktualizuj rezervaci
        $reservation->setDepositPercent(number_format($percent, 2, '.', ''));
        $reservation->setDepositAmount(number_format($depositAmount, 2, '.', ''));
        $reservation->setPaymentMethod('DEPOSIT');

        // Vytvoř fakturu
        $invoice = new Invoice();

        // Vygeneruj číslo zálohové faktury (z vlastní číselné řady)
        $invoiceNumber = $settings->generateNextDepositInvoiceNumber();
        $invoice->setInvoiceNumber($invoiceNumber);

        // Typ faktury
        $invoice->setInvoiceType('DEPOSIT');
        $invoice->setDepositPercent(number_format($percent, 2, '.', ''));

        // Variabilní symbol = ID rezervace
        $invoice->setVariableSymbol((string) $reservation->getId());

        // Datum vystavení a splatnosti
        $invoice->setIssueDate(new \DateTime());
        $invoice->setTaxableDate(new \DateTime());
        $invoice->setDueDate((new \DateTime())->modify('+' . $settings->getInvoiceDueDays() . ' days'));

        // Dodavatel z nastavení
        $this->setSupplierFromSettings($invoice, $settings);

        // Odběratel z rezervace
        $this->setCustomerFromReservation($invoice, $reservation);

        // Položka faktury - záloha
        if ($customItems !== null) {
            // Použij vlastní položky a přepočítej celkové částky
            $items = $customItems;
            $depositAmount = array_reduce($items, fn($sum, $item) => $sum + (float)($item['total'] ?? 0), 0);
        } else {
            // Standardní položka zálohy
            $description = $customDescription ?? sprintf(
                'Záloha %d%% na rezervaci dne %s - %d osob',
                (int) $percent,
                $reservation->getDate()?->format('d.m.Y'),
                $reservation->getPersons()->count()
            );
            $items = [[
                'description' => $description,
                'quantity' => 1,
                'unitPrice' => $depositAmount,
                'total' => $depositAmount,
            ]];
        }

        $invoice->setItems($items);

        // Výpočet DPH
        $vatRate = $settings->getDefaultVatRate();
        if ($settings->isVatPayer()) {
            $vatAmount = $depositAmount * ($vatRate / 100);
            $total = $depositAmount + $vatAmount;
        } else {
            $vatAmount = 0;
            $total = $depositAmount;
        }

        $invoice->setSubtotal(number_format($depositAmount, 2, '.', ''));
        $invoice->setVatRate($vatRate);
        $invoice->setVatAmount(number_format($vatAmount, 2, '.', ''));
        $invoice->setTotal(number_format($total, 2, '.', ''));
        $invoice->setCurrency('CZK');

        // Generuj QR kód pro platbu
        $qrData = $this->generateQrPaymentData($invoice, $settings);
        $invoice->setQrPaymentData($qrData);

        // Poznámka
        $invoice->setNote(sprintf(
            'Zálohová faktura - %d%% z celkové ceny %s Kč',
            (int) $percent,
            number_format($totalPrice, 2, ',', ' ')
        ));

        // Vazby
        $invoice->setReservation($reservation);
        $invoice->setCreatedBy($createdBy);
        $invoice->setStatus('DRAFT');

        // Uložení
        $this->entityManager->persist($invoice);
        $this->entityManager->persist($settings);
        $this->entityManager->flush();

        return $invoice;
    }

    /**
     * Vytvoří doplatovou (finální) fakturu pro rezervaci
     *
     * @param Reservation $reservation Rezervace
     * @param bool $deductDeposit Odečíst již zaplacené zálohy
     * @param User|null $createdBy Uživatel který fakturu vytvořil
     * @param array|null $customItems Vlastní položky faktury
     */
    public function createFinalInvoice(
        Reservation $reservation,
        bool $deductDeposit = true,
        ?User $createdBy = null,
        ?array $customItems = null
    ): Invoice {
        $settings = $this->companySettingsRepository->getOrCreateDefault();

        // Vypočítej celkovou cenu rezervace
        $totalPrice = $this->calculateReservationTotal($reservation);

        // Nastav celkovou cenu na rezervaci pokud ještě není
        if (!$reservation->getTotalPrice()) {
            $reservation->setTotalPrice(number_format($totalPrice, 2, '.', ''));
        }

        // Zjisti již zaplacené zálohy
        $paidDeposits = 0;
        if ($deductDeposit) {
            foreach ($reservation->getInvoices() as $existingInvoice) {
                if ($existingInvoice->getInvoiceType() === 'DEPOSIT' && $existingInvoice->getStatus() === 'PAID') {
                    $paidDeposits += (float) $existingInvoice->getTotal();
                }
            }
        }

        // Částka k doplacení
        $remainingAmount = max(0, $totalPrice - $paidDeposits);

        // Vytvoř fakturu
        $invoice = new Invoice();

        // Vygeneruj číslo faktury
        $invoiceNumber = $settings->generateNextInvoiceNumber();
        $invoice->setInvoiceNumber($invoiceNumber);

        // Typ faktury
        $invoice->setInvoiceType('FINAL');

        // Variabilní symbol = ID rezervace
        $invoice->setVariableSymbol((string) $reservation->getId());

        // Datum vystavení a splatnosti
        $invoice->setIssueDate(new \DateTime());
        $invoice->setTaxableDate(new \DateTime());
        $invoice->setDueDate((new \DateTime())->modify('+' . $settings->getInvoiceDueDays() . ' days'));

        // Dodavatel z nastavení
        $this->setSupplierFromSettings($invoice, $settings);

        // Odběratel z rezervace
        $this->setCustomerFromReservation($invoice, $reservation);

        // Položky faktury
        if ($customItems !== null) {
            // Použij vlastní položky
            $items = $customItems;
            $subtotal = array_reduce($items, fn($sum, $item) => $sum + (float)($item['total'] ?? 0), 0);
        } else {
            // Standardní položky z rezervace
            $items = [];
            $subtotal = 0;

            // Položky z osob v rezervaci
            foreach ($reservation->getPersons() as $person) {
                $price = (float) $person->getPrice();
                $subtotal += $price;

                $items[] = [
                    'description' => sprintf(
                        'Rezervace na %s - %s (%s)',
                        $reservation->getDate()?->format('d.m.Y'),
                        $this->getPersonTypeLabel($person->getType()),
                        $person->getMenu() ?? 'standardní menu'
                    ),
                    'quantity' => 1,
                    'unitPrice' => $price,
                    'total' => $price,
                ];
            }

            // Transfer
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

            // Odečti zálohy pokud byly zaplaceny
            if ($paidDeposits > 0) {
                $items[] = [
                    'description' => 'Uhrazená záloha',
                    'quantity' => 1,
                    'unitPrice' => -$paidDeposits,
                    'total' => -$paidDeposits,
                ];
                $subtotal -= $paidDeposits;
            }
        }

        $invoice->setItems($items);

        // Výpočet DPH
        $vatRate = $settings->getDefaultVatRate();
        if ($settings->isVatPayer()) {
            $vatAmount = max(0, $subtotal) * ($vatRate / 100);
            $total = max(0, $subtotal) + $vatAmount;
        } else {
            $vatAmount = 0;
            $total = max(0, $subtotal);
        }

        $invoice->setSubtotal(number_format(max(0, $subtotal), 2, '.', ''));
        $invoice->setVatRate($vatRate);
        $invoice->setVatAmount(number_format($vatAmount, 2, '.', ''));
        $invoice->setTotal(number_format($total, 2, '.', ''));
        $invoice->setCurrency('CZK');

        // Generuj QR kód pro platbu
        $qrData = $this->generateQrPaymentData($invoice, $settings);
        $invoice->setQrPaymentData($qrData);

        // Poznámka
        if ($paidDeposits > 0) {
            $invoice->setNote(sprintf(
                'Doplatek - celková cena %s Kč, záloha %s Kč',
                number_format($totalPrice, 2, ',', ' '),
                number_format($paidDeposits, 2, ',', ' ')
            ));
        }

        // Vazby
        $invoice->setReservation($reservation);
        $invoice->setCreatedBy($createdBy);
        $invoice->setStatus('DRAFT');

        // Uložení
        $this->entityManager->persist($invoice);
        $this->entityManager->persist($settings);
        $this->entityManager->flush();

        return $invoice;
    }

    /**
     * Nastaví dodavatele na faktuře z nastavení firmy
     */
    private function setSupplierFromSettings(Invoice $invoice, CompanySettings $settings): void
    {
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
    }

    /**
     * Nastaví odběratele na faktuře z rezervace
     */
    private function setCustomerFromReservation(Invoice $invoice, Reservation $reservation): void
    {
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
    }

    /**
     * Odešle fakturu zákazníkovi emailem
     */
    public function sendInvoiceEmail(Invoice $invoice): bool
    {
        $customerEmail = $invoice->getCustomerEmail();
        if (!$customerEmail) {
            throw new \RuntimeException('Zákazník nemá uvedený e-mail.');
        }

        $settings = $this->companySettingsRepository->getDefault();
        $supplierEmail = $settings?->getEmail() ?? 'info@folkloregarden.cz';

        // Sestavení položek pro email
        $itemsHtml = '';
        foreach ($invoice->getItems() as $item) {
            $itemsHtml .= sprintf(
                '<tr><td>%s</td><td style="text-align:right">%d</td><td style="text-align:right">%s Kč</td><td style="text-align:right">%s Kč</td></tr>',
                htmlspecialchars($item['description'] ?? ''),
                (int) ($item['quantity'] ?? 1),
                number_format((float) ($item['unitPrice'] ?? 0), 2, ',', ' '),
                number_format((float) ($item['total'] ?? 0), 2, ',', ' ')
            );
        }

        $htmlContent = sprintf(
            '<!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <style>
                    body { font-family: Arial, sans-serif; color: #333; line-height: 1.6; }
                    .container { max-width: 700px; margin: 0 auto; padding: 20px; }
                    .header { background: linear-gradient(135deg, #6366f1 0%%, #a855f7 100%%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
                    .header h1 { margin: 0; font-size: 24px; }
                    .content { background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; }
                    .section { margin: 20px 0; background: white; padding: 20px; border-radius: 8px; border: 1px solid #e5e7eb; }
                    .section h2 { color: #6366f1; font-size: 16px; margin-top: 0; border-bottom: 2px solid #e5e7eb; padding-bottom: 10px; }
                    .row { display: flex; justify-content: space-between; margin-bottom: 8px; }
                    .label { color: #6b7280; }
                    .value { font-weight: 600; }
                    table { width: 100%%; border-collapse: collapse; margin-top: 10px; }
                    th, td { padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: left; }
                    th { background: #f3f4f6; font-weight: 600; }
                    .totals { margin-top: 20px; text-align: right; }
                    .totals .row { justify-content: flex-end; gap: 40px; }
                    .total-final { font-size: 20px; color: #6366f1; }
                    .bank-info { background: #fef3c7; padding: 15px; border-radius: 8px; border: 1px solid #fcd34d; }
                    .qr-section { text-align: center; margin-top: 20px; }
                    .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 14px; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>Faktura č. %s</h1>
                    </div>
                    <div class="content">
                        <div class="section">
                            <h2>Dodavatel</h2>
                            <p><strong>%s</strong></p>
                            <p>%s</p>
                            <p>%s %s</p>
                            <p>IČO: %s%s</p>
                        </div>
                        <div class="section">
                            <h2>Odběratel</h2>
                            <p><strong>%s</strong></p>
                            %s
                            %s
                            %s
                        </div>
                        <div class="section">
                            <h2>Položky</h2>
                            <table>
                                <thead>
                                    <tr>
                                        <th>Popis</th>
                                        <th style="text-align:right">Množství</th>
                                        <th style="text-align:right">Cena/ks</th>
                                        <th style="text-align:right">Celkem</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    %s
                                </tbody>
                            </table>
                            <div class="totals">
                                <div class="row">
                                    <span class="label">Základ:</span>
                                    <span class="value">%s Kč</span>
                                </div>
                                <div class="row">
                                    <span class="label">DPH %d%%:</span>
                                    <span class="value">%s Kč</span>
                                </div>
                                <div class="row total-final">
                                    <span>Celkem:</span>
                                    <span><strong>%s %s</strong></span>
                                </div>
                            </div>
                        </div>
                        <div class="section bank-info">
                            <h2>Platební údaje</h2>
                            <p><strong>Číslo účtu:</strong> %s</p>
                            <p><strong>IBAN:</strong> %s</p>
                            <p><strong>Variabilní symbol:</strong> %s</p>
                            <p><strong>Částka k úhradě:</strong> %s %s</p>
                            <p><strong>Datum splatnosti:</strong> %s</p>
                        </div>
                        %s
                    </div>
                    <div class="footer">
                        <p>Tato faktura byla vygenerována automaticky. V případě dotazů nás kontaktujte na %s.</p>
                        <p>© %s %s</p>
                    </div>
                </div>
            </body>
            </html>',
            htmlspecialchars($invoice->getInvoiceNumber()),
            // Dodavatel
            htmlspecialchars($invoice->getSupplierName()),
            htmlspecialchars($invoice->getSupplierStreet() ?? ''),
            htmlspecialchars($invoice->getSupplierZipcode() ?? ''),
            htmlspecialchars($invoice->getSupplierCity() ?? ''),
            htmlspecialchars($invoice->getSupplierIco() ?? ''),
            $invoice->getSupplierDic() ? ' | DIČ: ' . htmlspecialchars($invoice->getSupplierDic()) : '',
            // Odběratel
            htmlspecialchars($invoice->getCustomerName()),
            $invoice->getCustomerCompany() ? '<p>' . htmlspecialchars($invoice->getCustomerCompany()) . '</p>' : '',
            $invoice->getCustomerStreet() ? '<p>' . htmlspecialchars($invoice->getCustomerStreet()) . '</p><p>' . htmlspecialchars($invoice->getCustomerZipcode() ?? '') . ' ' . htmlspecialchars($invoice->getCustomerCity() ?? '') . '</p>' : '',
            $invoice->getCustomerIco() ? '<p>IČO: ' . htmlspecialchars($invoice->getCustomerIco()) . ($invoice->getCustomerDic() ? ' | DIČ: ' . htmlspecialchars($invoice->getCustomerDic()) : '') . '</p>' : '',
            // Položky
            $itemsHtml,
            // Totals
            number_format((float) $invoice->getSubtotal(), 2, ',', ' '),
            $invoice->getVatRate(),
            number_format((float) $invoice->getVatAmount(), 2, ',', ' '),
            number_format((float) $invoice->getTotal(), 2, ',', ' '),
            htmlspecialchars($invoice->getCurrency()),
            // Platební údaje
            htmlspecialchars($invoice->getSupplierBankAccount() ?? ''),
            htmlspecialchars($invoice->getSupplierIban() ?? ''),
            htmlspecialchars($invoice->getVariableSymbol()),
            number_format((float) $invoice->getTotal(), 2, ',', ' '),
            htmlspecialchars($invoice->getCurrency()),
            $invoice->getDueDate()->format('d.m.Y'),
            // QR kód info
            $invoice->getQrPaymentData() ? '<div class="qr-section"><p><strong>Pro rychlou platbu naskenujte QR kód ve své bankovní aplikaci:</strong></p><p style="font-size:12px;color:#6b7280;word-break:break-all;">' . htmlspecialchars($invoice->getQrPaymentData()) . '</p></div>' : '',
            // Footer
            htmlspecialchars($supplierEmail),
            date('Y'),
            htmlspecialchars($invoice->getSupplierName())
        );

        $email = (new Email())
            ->from($supplierEmail)
            ->to($customerEmail)
            ->subject('Faktura č. ' . $invoice->getInvoiceNumber())
            ->html($htmlContent);

        try {
            $this->safeMailer->send($email);
            $this->logger->info('Faktura č. ' . $invoice->getInvoiceNumber() . ' byla úspěšně odeslána na ' . $customerEmail);

            // Automaticky označ jako odeslanou
            if ($invoice->getStatus() === 'DRAFT') {
                $invoice->setStatus('SENT');
                $invoice->setUpdatedAt(new \DateTime());
                $this->entityManager->flush();
            }

            return true;
        } catch (TransportExceptionInterface $e) {
            $this->logger->error('Chyba při odesílání faktury č. ' . $invoice->getInvoiceNumber() . ': ' . $e->getMessage());
            throw new \RuntimeException('Nepodařilo se odeslat e-mail: ' . $e->getMessage());
        }
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
            'createdById' => $invoice->getCreatedBy()?->getId(),
            'createdAt' => $invoice->getCreatedAt()->format('Y-m-d H:i:s'),
            'updatedAt' => $invoice->getUpdatedAt()->format('Y-m-d H:i:s'),
        ];
    }
}
