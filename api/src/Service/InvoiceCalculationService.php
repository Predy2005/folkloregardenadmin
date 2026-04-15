<?php
declare(strict_types=1);

namespace App\Service;

use App\Entity\CompanySettings;
use App\Entity\Invoice;
use App\Entity\Reservation;
use App\Entity\User;
use App\Repository\CompanySettingsRepository;
use Doctrine\ORM\EntityManagerInterface;

class InvoiceCalculationService
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
     * Vypočítá celkovou cenu rezervace
     */
    public function calculateReservationTotal(Reservation $reservation): float
    {
        $total = 0;

        // Ceny z osob (základ + menu příplatek)
        foreach ($reservation->getPersons() as $person) {
            $total += (float) $person->getPrice();
            // Případný drink (welcome/allin)
            $total += (float) ($person->getDrinkPrice() ?? 0);
        }

        // Transfer
        if ($reservation->isTransferSelected() && $reservation->getTransferCount()) {
            $total += $reservation->getTransferCount() * 200;
        }

        // Fallback na uloženou totalPrice (např. když persons ještě nebyly přepočítány
        // nebo když je rezervace v jiné měně a součet nesedí)
        if ($total <= 0) {
            $saved = (float) ($reservation->getTotalPrice() ?? 0);
            if ($saved > 0) {
                return $saved;
            }
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
            'currency' => $reservation->getCurrency() ?? 'CZK',
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
            'currency' => $reservation->getCurrency() ?? 'CZK',
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

        // Typ faktury - DEPOSIT je proforma (výzva k platbě), není daňový doklad
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

        // Zálohová faktura (proforma) - zobrazí celkovou částku k úhradě
        // DPH se uvádí informativně, ale není to daňový doklad
        // Daňový doklad k přijaté záloze se vystaví až po zaplacení
        $vatRate = $settings->getDefaultVatRate();
        if ($settings->isVatPayer()) {
            $vatAmount = bcmul((string) $depositAmount, bcdiv((string) $vatRate, '100', 6), 2);
            $total = bcadd((string) $depositAmount, $vatAmount, 2);
        } else {
            $vatAmount = '0.00';
            $total = number_format($depositAmount, 2, '.', '');
        }

        $invoice->setSubtotal(number_format($depositAmount, 2, '.', ''));
        $invoice->setVatRate($vatRate);
        $invoice->setVatAmount($vatAmount);
        $invoice->setTotal($total);
        $invoice->setCurrency($reservation->getCurrency());

        // Generuj QR kód pro platbu
        $qrData = $this->invoiceEmailService->generateQrPaymentData($invoice, $settings);
        $invoice->setQrPaymentData($qrData);

        // Poznámka - důležité upozornění dle zákona
        $invoice->setNote(sprintf(
            "Zálohová faktura (proforma) - %d%% z celkové ceny %s Kč.\n" .
            "Toto není daňový doklad. Daňový doklad k přijaté platbě bude vystaven po úhradě zálohy dle §28 odst. 9 zákona o DPH.",
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

        // Zjisti již zaplacené zálohy - odečítáme ZÁKLAD (subtotal), ne total s DPH
        // Protože DPH ze zálohy už bylo odvedeno v daňovém dokladu k záloze
        $paidDepositsSubtotal = '0.00';
        $paidDepositsVat = '0.00';
        $paidDepositsTotal = '0.00';
        $depositInvoiceRefs = [];
        if ($deductDeposit) {
            foreach ($reservation->getInvoices() as $existingInvoice) {
                if ($existingInvoice->getInvoiceType() === 'DEPOSIT' && $existingInvoice->getStatus() === 'PAID') {
                    $paidDepositsSubtotal = bcadd($paidDepositsSubtotal, $existingInvoice->getSubtotal(), 2);
                    $paidDepositsVat = bcadd($paidDepositsVat, $existingInvoice->getVatAmount(), 2);
                    $paidDepositsTotal = bcadd($paidDepositsTotal, $existingInvoice->getTotal(), 2);
                    $depositInvoiceRefs[] = sprintf(
                        'DD č. %s ze dne %s',
                        $existingInvoice->getInvoiceNumber(),
                        $existingInvoice->getIssueDate()->format('d.m.Y')
                    );
                }
            }
        }

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
            // Standardní položky z rezervace - seskupené podle typu a ceny
            $grouped = [];
            $subtotal = 0;
            $dateStr = $reservation->getDate()?->format('d.m.Y') ?? '';

            foreach ($reservation->getPersons() as $person) {
                $price = (float) $person->getPrice();
                $subtotal += $price;

                $typeLabel = $this->getPersonTypeLabel($person->getType());
                $menu = $person->getMenu() ?? 'standardní menu';
                // Klíč pro seskupení: typ + menu + cena
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
            // Dle §36 odst. 12 zákona o DPH: odpočet zálohy = základ zvlášť, DPH zvlášť
            if (bccomp($paidDepositsSubtotal, '0', 2) > 0) {
                $depositDesc = 'Odpočet uhrazené zálohy';
                if (!empty($depositInvoiceRefs)) {
                    $depositDesc .= ' (dle ' . implode(', ', $depositInvoiceRefs) . ')';
                }
                $items[] = [
                    'description' => $depositDesc,
                    'quantity' => 1,
                    'unitPrice' => -1 * (float) $paidDepositsSubtotal,
                    'total' => -1 * (float) $paidDepositsSubtotal,
                ];
                $subtotal -= (float) $paidDepositsSubtotal;
            }
        }

        $invoice->setItems($items);

        // Výpočet DPH na vyúčtovací faktuře
        // Základ = plná cena služeb MINUS záloha (základ)
        // DPH = DPH z plné ceny MINUS DPH ze zálohy
        $vatRate = $settings->getDefaultVatRate();
        $subtotalStr = number_format(max(0, $subtotal), 2, '.', '');

        if ($settings->isVatPayer()) {
            // DPH z celkového základu (po odpočtu zálohy)
            $fullVatAmount = bcmul($subtotalStr, bcdiv((string) $vatRate, '100', 6), 2);
            $total = bcadd($subtotalStr, $fullVatAmount, 2);
        } else {
            $fullVatAmount = '0.00';
            $total = $subtotalStr;
        }

        $invoice->setSubtotal($subtotalStr);
        $invoice->setVatRate($vatRate);
        $invoice->setVatAmount($fullVatAmount);
        $invoice->setTotal($total);
        $invoice->setCurrency($reservation->getCurrency());

        // Generuj QR kód pro platbu
        $qrData = $this->invoiceEmailService->generateQrPaymentData($invoice, $settings);
        $invoice->setQrPaymentData($qrData);

        // Poznámka s referencemi dle zákona
        $noteLines = [];
        $isFullyPaidByDeposits = bccomp($total, '0', 2) <= 0 || bccomp($total, '0.01', 2) < 0;

        if (bccomp($paidDepositsTotal, '0', 2) > 0) {
            $noteLines[] = sprintf(
                'Vyúčtovací faktura - celková cena %s Kč',
                number_format($totalPrice, 2, ',', ' ')
            );
            $noteLines[] = sprintf(
                'Uhrazená záloha: %s Kč (základ %s Kč + DPH %s Kč)',
                number_format((float) $paidDepositsTotal, 2, ',', ' '),
                number_format((float) $paidDepositsSubtotal, 2, ',', ' '),
                number_format((float) $paidDepositsVat, 2, ',', ' ')
            );
            if ($isFullyPaidByDeposits) {
                $noteLines[] = 'UHRAZENO v plné výši zálohami. Nic k doplacení.';
            } else {
                $noteLines[] = sprintf('K úhradě: %s Kč', number_format((float) $total, 2, ',', ' '));
            }
            if (!empty($depositInvoiceRefs)) {
                $noteLines[] = 'Záloha uhrazena dle: ' . implode(', ', $depositInvoiceRefs);
            }
        }
        if (!empty($noteLines)) {
            $invoice->setNote(implode("\n", $noteLines));
        }

        // Vazby
        $invoice->setReservation($reservation);
        $invoice->setCreatedBy($createdBy);

        // Pokud zálohy pokryly celou částku, faktura je automaticky "zaplacená"
        if ($isFullyPaidByDeposits && bccomp($paidDepositsTotal, '0', 2) > 0) {
            $invoice->setStatus('PAID');
            $invoice->setPaidAt(new \DateTime());
        } else {
            $invoice->setStatus('DRAFT');
        }

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
}
