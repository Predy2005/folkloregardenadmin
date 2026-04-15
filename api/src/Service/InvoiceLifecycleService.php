<?php
declare(strict_types=1);

namespace App\Service;

use App\Entity\Invoice;
use App\Entity\User;
use App\Repository\CompanySettingsRepository;
use Doctrine\ORM\EntityManagerInterface;

class InvoiceLifecycleService
{
    public function __construct(
        private EntityManagerInterface $entityManager,
        private CompanySettingsRepository $companySettingsRepository,
    ) {
    }

    /**
     * Označí fakturu jako odeslanou
     */
    public function markAsSent(Invoice $invoice, ?User $updatedBy = null): Invoice
    {
        $invoice->setStatus('SENT');
        $invoice->setUpdatedAt(new \DateTime());
        if ($updatedBy) {
            $invoice->setUpdatedBy($updatedBy->getId());
        }
        $this->entityManager->flush();

        return $invoice;
    }

    /**
     * Označí fakturu jako zaplacenou a aktualizuje rezervaci
     */
    public function markAsPaid(Invoice $invoice, ?User $updatedBy = null): Invoice
    {
        $invoice->setStatus('PAID');
        $invoice->setPaidAt(new \DateTime());
        $invoice->setUpdatedAt(new \DateTime());
        if ($updatedBy) {
            $invoice->setUpdatedBy($updatedBy->getId());
        }

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
    public function cancel(Invoice $invoice, ?User $updatedBy = null): Invoice
    {
        $invoice->setStatus('CANCELLED');
        $invoice->setUpdatedAt(new \DateTime());
        if ($updatedBy) {
            $invoice->setUpdatedBy($updatedBy->getId());
        }
        $this->entityManager->flush();

        return $invoice;
    }

    /**
     * Vytvoří dobropis (credit note) k existující faktuře
     */
    public function createCreditNote(Invoice $originalInvoice, User $createdBy, ?string $reason = null): Invoice
    {
        if (!in_array($originalInvoice->getStatus(), ['SENT', 'PAID'], true)) {
            throw new \RuntimeException('Dobropis lze vytvořit pouze k odeslané nebo zaplacené faktuře.');
        }

        $settings = $this->companySettingsRepository->getOrCreateDefault();

        $creditNote = new Invoice();

        // Vygeneruj číslo dobropisu s prefixem D
        $invoiceNumber = 'D' . $settings->generateNextInvoiceNumber();
        $creditNote->setInvoiceNumber($invoiceNumber);

        // Typ a reference
        $creditNote->setInvoiceType('CREDIT_NOTE');
        $creditNote->setOriginalInvoiceId($originalInvoice->getId());

        // Variabilní symbol - stejný jako originál
        $creditNote->setVariableSymbol($originalInvoice->getVariableSymbol());

        // Datumy
        $creditNote->setIssueDate(new \DateTime());
        $creditNote->setTaxableDate(new \DateTime());
        $creditNote->setDueDate((new \DateTime())->modify('+' . $settings->getInvoiceDueDays() . ' days'));

        // Dodavatel - kopie z originálu
        $creditNote->setSupplierName($originalInvoice->getSupplierName());
        $creditNote->setSupplierStreet($originalInvoice->getSupplierStreet());
        $creditNote->setSupplierCity($originalInvoice->getSupplierCity());
        $creditNote->setSupplierZipcode($originalInvoice->getSupplierZipcode());
        $creditNote->setSupplierIco($originalInvoice->getSupplierIco());
        $creditNote->setSupplierDic($originalInvoice->getSupplierDic());
        $creditNote->setSupplierEmail($originalInvoice->getSupplierEmail());
        $creditNote->setSupplierPhone($originalInvoice->getSupplierPhone());
        $creditNote->setSupplierBankAccount($originalInvoice->getSupplierBankAccount());
        $creditNote->setSupplierBankName($originalInvoice->getSupplierBankName());
        $creditNote->setSupplierIban($originalInvoice->getSupplierIban());
        $creditNote->setSupplierSwift($originalInvoice->getSupplierSwift());

        // Odběratel - kopie z originálu
        $creditNote->setCustomerName($originalInvoice->getCustomerName());
        $creditNote->setCustomerCompany($originalInvoice->getCustomerCompany());
        $creditNote->setCustomerStreet($originalInvoice->getCustomerStreet());
        $creditNote->setCustomerCity($originalInvoice->getCustomerCity());
        $creditNote->setCustomerZipcode($originalInvoice->getCustomerZipcode());
        $creditNote->setCustomerIco($originalInvoice->getCustomerIco());
        $creditNote->setCustomerDic($originalInvoice->getCustomerDic());
        $creditNote->setCustomerEmail($originalInvoice->getCustomerEmail());
        $creditNote->setCustomerPhone($originalInvoice->getCustomerPhone());

        // Položky - negace původních
        $originalItems = $originalInvoice->getItems();
        $negatedItems = [];
        foreach ($originalItems as $item) {
            $negatedItems[] = [
                'description' => 'STORNO: ' . ($item['description'] ?? ''),
                'quantity' => $item['quantity'] ?? 1,
                'unitPrice' => bcmul('-1', (string)($item['unitPrice'] ?? 0), 2),
                'total' => bcmul('-1', (string)($item['total'] ?? 0), 2),
            ];
        }
        $creditNote->setItems($negatedItems);

        // Finanční údaje - negace
        $creditNote->setSubtotal(bcmul('-1', $originalInvoice->getSubtotal(), 2));
        $creditNote->setVatRate($originalInvoice->getVatRate());
        $creditNote->setVatAmount(bcmul('-1', $originalInvoice->getVatAmount(), 2));
        $creditNote->setTotal(bcmul('-1', $originalInvoice->getTotal(), 2));
        $creditNote->setCurrency($originalInvoice->getCurrency());

        // Poznámka
        $noteText = sprintf(
            'Dobropis k faktuře č. %s.',
            $originalInvoice->getInvoiceNumber()
        );
        if ($reason) {
            $noteText .= ' Důvod: ' . $reason;
        }
        $creditNote->setNote($noteText);

        // Vazby
        $creditNote->setReservation($originalInvoice->getReservation());
        $creditNote->setCreatedBy($createdBy);
        $creditNote->setStatus('DRAFT');

        // Označ původní fakturu jako stornovanou
        $originalInvoice->setStatus('CANCELLED');
        $originalInvoice->setUpdatedAt(new \DateTime());
        $originalInvoice->setUpdatedBy($createdBy->getId());

        // Uložení
        $this->entityManager->persist($creditNote);
        $this->entityManager->persist($settings);
        $this->entityManager->flush();

        return $creditNote;
    }
}
