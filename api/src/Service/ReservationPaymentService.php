<?php
declare(strict_types=1);

namespace App\Service;

use App\Entity\Reservation;
use App\Entity\User;
use Doctrine\ORM\EntityManagerInterface;
use Psr\Log\LoggerInterface;

/**
 * Služba pro správu plateb rezervací
 */
class ReservationPaymentService
{
    public function __construct(
        private EntityManagerInterface $entityManager,
        private InvoiceCalculationService $invoiceCalculationService,
        private LoggerInterface $logger,
    ) {
    }

    /**
     * Zaznamená platbu pro rezervaci
     *
     * @param Reservation $reservation Rezervace
     * @param float $amount Částka platby
     * @param string|null $note Poznámka k platbě
     */
    public function recordPayment(
        Reservation $reservation,
        float $amount,
        ?string $note = null
    ): void {
        $currentPaid = (float)($reservation->getPaidAmount() ?? 0);
        $newPaidAmount = $currentPaid + $amount;
        $reservation->setPaidAmount(number_format($newPaidAmount, 2, '.', ''));

        // Přidej poznámku pokud je
        if ($note) {
            $existingNote = $reservation->getPaymentNote();
            $newNote = $existingNote
                ? $existingNote . "\n" . date('d.m.Y H:i') . ": " . $note
                : date('d.m.Y H:i') . ": " . $note;
            $reservation->setPaymentNote($newNote);
        }

        // Aktualizuj status platby
        $this->updatePaymentStatus($reservation);

        $reservation->setUpdatedAt(new \DateTime());
        $this->entityManager->flush();

        $this->logger->info(sprintf(
            'Zaznamenána platba %s Kč pro rezervaci #%d, nový stav: %s Kč',
            number_format($amount, 2, ',', ' '),
            $reservation->getId(),
            number_format($newPaidAmount, 2, ',', ' ')
        ));
    }

    /**
     * Označí rezervaci jako plně zaplacenou (např. hotově na místě)
     *
     * @param Reservation $reservation Rezervace
     * @param float|null $amount Částka (pokud null, použije se celková cena nebo zbývající částka)
     * @param string|null $paymentMethod Způsob platby (CASH, BANK_TRANSFER, ...)
     * @param string|null $note Poznámka
     */
    public function markAsPaid(
        Reservation $reservation,
        ?float $amount = null,
        ?string $paymentMethod = null,
        ?string $note = null
    ): void {
        // Vypočítej celkovou cenu pokud ještě není nastavena
        $totalPrice = (float)($reservation->getTotalPrice() ?? 0);
        if ($totalPrice <= 0) {
            $totalPrice = $this->invoiceCalculationService->calculateReservationTotal($reservation);
            $reservation->setTotalPrice(number_format($totalPrice, 2, '.', ''));
        }

        // Zjisti částku k zaplacení
        $currentPaid = (float)($reservation->getPaidAmount() ?? 0);
        $remaining = $totalPrice - $currentPaid;

        // Pokud není zadána částka, použij zbývající
        $paymentAmount = $amount ?? $remaining;

        // Nastav zaplacenou částku
        $newPaidAmount = $currentPaid + $paymentAmount;
        $reservation->setPaidAmount(number_format($newPaidAmount, 2, '.', ''));

        // Nastav způsob platby
        if ($paymentMethod) {
            $currentMethod = $reservation->getPaymentMethod();
            if ($currentMethod && $currentMethod !== $paymentMethod) {
                $reservation->setPaymentMethod('MIXED');
            } else {
                $reservation->setPaymentMethod($paymentMethod);
            }
        }

        // Přidej poznámku
        if ($note) {
            $existingNote = $reservation->getPaymentNote();
            $newNote = $existingNote
                ? $existingNote . "\n" . date('d.m.Y H:i') . ": " . $note
                : date('d.m.Y H:i') . ": " . $note;
            $reservation->setPaymentNote($newNote);
        }

        // Aktualizuj status
        $reservation->setPaymentStatus('PAID');
        $reservation->setStatus('PAID');
        $reservation->setUpdatedAt(new \DateTime());

        $this->entityManager->flush();

        $this->logger->info(sprintf(
            'Rezervace #%d označena jako zaplacená. Částka: %s Kč, způsob: %s',
            $reservation->getId(),
            number_format($paymentAmount, 2, ',', ' '),
            $paymentMethod ?? 'neuvedeno'
        ));
    }

    /**
     * Aktualizuje způsob platby pro rezervaci
     */
    public function updatePaymentMethod(
        Reservation $reservation,
        string $paymentMethod,
        ?float $depositPercent = null
    ): void {
        $reservation->setPaymentMethod($paymentMethod);

        if ($depositPercent !== null) {
            $reservation->setDepositPercent(number_format($depositPercent, 2, '.', ''));

            // Přepočítej částku zálohy
            $totalPrice = (float)($reservation->getTotalPrice() ?? 0);
            if ($totalPrice <= 0) {
                $totalPrice = $this->invoiceCalculationService->calculateReservationTotal($reservation);
                $reservation->setTotalPrice(number_format($totalPrice, 2, '.', ''));
            }

            $depositAmount = $totalPrice * $depositPercent / 100;
            $reservation->setDepositAmount(number_format($depositAmount, 2, '.', ''));
        }

        $reservation->setUpdatedAt(new \DateTime());
        $this->entityManager->flush();
    }

    /**
     * Aktualizuje stav platby na základě zaplacené částky
     */
    public function updatePaymentStatus(Reservation $reservation): void
    {
        $totalPrice = (float)($reservation->getTotalPrice() ?? 0);
        $paidAmount = (float)($reservation->getPaidAmount() ?? 0);

        if ($totalPrice <= 0) {
            return;
        }

        if ($paidAmount >= $totalPrice) {
            $reservation->setPaymentStatus('PAID');
            if ($reservation->getStatus() !== 'CANCELLED') {
                $reservation->setStatus('PAID');
            }
        } elseif ($paidAmount > 0) {
            $reservation->setPaymentStatus('PARTIAL');
        } else {
            $reservation->setPaymentStatus('UNPAID');
        }
    }

    /**
     * Vrátí souhrn plateb pro rezervaci
     */
    public function getPaymentSummary(Reservation $reservation): array
    {
        // Vypočítej celkovou cenu pokud ještě není nastavena
        $totalPrice = (float)($reservation->getTotalPrice() ?? 0);
        if ($totalPrice <= 0) {
            $totalPrice = $this->invoiceCalculationService->calculateReservationTotal($reservation);
        }

        $paidAmount = (float)($reservation->getPaidAmount() ?? 0);
        $depositAmount = (float)($reservation->getDepositAmount() ?? 0);
        $depositPercent = (float)($reservation->getDepositPercent() ?? 25);

        // Pokud depositAmount není nastaven, vypočítej z procent
        if ($depositAmount <= 0 && $totalPrice > 0) {
            $depositAmount = $totalPrice * $depositPercent / 100;
        }

        $remaining = max(0, $totalPrice - $paidAmount);

        // Zjisti kolik z faktur bylo zaplaceno
        $invoicesPaid = 0;
        $invoicesTotal = 0;
        $depositInvoicesPaid = 0;
        $depositInvoicesTotal = 0;

        foreach ($reservation->getInvoices() as $invoice) {
            $invoiceAmount = (float)$invoice->getTotal();
            $invoicesTotal += $invoiceAmount;

            if ($invoice->getStatus() === 'PAID') {
                $invoicesPaid += $invoiceAmount;

                if ($invoice->getInvoiceType() === 'DEPOSIT') {
                    $depositInvoicesPaid += $invoiceAmount;
                }
            }

            if ($invoice->getInvoiceType() === 'DEPOSIT') {
                $depositInvoicesTotal += $invoiceAmount;
            }
        }

        return [
            'totalPrice' => $totalPrice,
            'paidAmount' => $paidAmount,
            'remainingAmount' => $remaining,
            'depositPercent' => $depositPercent,
            'depositAmount' => $depositAmount,
            'currency' => $reservation->getCurrency(),
            'paymentStatus' => $reservation->getPaymentStatus() ?? 'UNPAID',
            'paymentMethod' => $reservation->getPaymentMethod(),
            'isFullyPaid' => $reservation->isFullyPaid(),
            'invoices' => [
                'total' => $invoicesTotal,
                'paid' => $invoicesPaid,
                'depositsTotal' => $depositInvoicesTotal,
                'depositsPaid' => $depositInvoicesPaid,
            ],
        ];
    }

    /**
     * Zkontroluje, zda je rezervace zaplacená (pro účely počítání hostů v eventu)
     */
    public function isReservationPaid(Reservation $reservation): bool
    {
        return $reservation->getPaymentStatus() === 'PAID' || $reservation->isFullyPaid();
    }
}
