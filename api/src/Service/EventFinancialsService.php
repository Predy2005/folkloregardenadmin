<?php

declare(strict_types=1);

namespace App\Service;

use App\Entity\Event;
use App\Repository\CashMovementRepository;
use App\Repository\InvoiceRepository;
use App\Repository\ReservationRepository;

class EventFinancialsService
{
    public function __construct(
        private CashMovementRepository $cashMovementRepo,
        private ReservationRepository $reservationRepo,
        private InvoiceRepository $invoiceRepo,
        private CashboxService $cashboxService,
    ) {
    }

    /**
     * Get financial summary for the event
     */
    public function getFinancials(Event $event): array
    {
        // Find cashbox linked to this event by event_id
        $eventCashbox = $this->cashboxService->getEventCashbox($event);

        // Get all cash movements for this cashbox
        $movements = $eventCashbox
            ? $this->cashMovementRepo->findBy(['cashbox' => $eventCashbox])
            : [];

        // Group expenses and income by category
        $expensesByCategory = [];
        $incomeByCategory = [];
        $totalExpenses = 0;
        $totalIncome = 0;

        foreach ($movements as $m) {
            $category = $m->getCategory() ?? 'OTHER';
            $amount = (float) $m->getAmount();

            if ($m->getMovementType() === 'EXPENSE') {
                if (!isset($expensesByCategory[$category])) {
                    $expensesByCategory[$category] = [
                        'category' => $category,
                        'label' => $this->getExpenseCategoryLabel($category),
                        'items' => [],
                        'subtotal' => 0,
                    ];
                }
                $expensesByCategory[$category]['items'][] = [
                    'id' => $m->getId(),
                    'description' => $m->getDescription(),
                    'amount' => $amount,
                    'paidTo' => $m->getDescription(),
                    'paymentMethod' => $m->getPaymentMethod(),
                    'createdAt' => $m->getCreatedAt()->format('Y-m-d H:i:s'),
                ];
                $expensesByCategory[$category]['subtotal'] += $amount;
                $totalExpenses += $amount;
            } else {
                if (!isset($incomeByCategory[$category])) {
                    $incomeByCategory[$category] = [
                        'category' => $category,
                        'label' => $this->getIncomeCategoryLabel($category),
                        'items' => [],
                        'subtotal' => 0,
                    ];
                }
                $incomeByCategory[$category]['items'][] = [
                    'id' => $m->getId(),
                    'description' => $m->getDescription(),
                    'amount' => $amount,
                    'source' => $m->getDescription(),
                    'createdAt' => $m->getCreatedAt()->format('Y-m-d H:i:s'),
                ];
                $incomeByCategory[$category]['subtotal'] += $amount;
                $totalIncome += $amount;
            }
        }

        $initialBalance = $eventCashbox ? (float) $eventCashbox->getInitialBalance() : 0;
        $currentBalance = $eventCashbox ? (float) $eventCashbox->getCurrentBalance() : 0;

        return [
            'cashbox' => $eventCashbox ? [
                'id' => $eventCashbox->getId(),
                'name' => $eventCashbox->getName(),
                'cashboxType' => $eventCashbox->getCashboxType(),
                'initialBalance' => $initialBalance,
                'currentBalance' => $currentBalance,
                'totalIncome' => $totalIncome,
                'totalExpense' => $totalExpenses,
                'isActive' => $eventCashbox->isActive(),
                'lockedBy' => $eventCashbox->getLockedBy()?->getId(),
                'lockedAt' => $eventCashbox->getLockedAt()?->format(DATE_ATOM),
            ] : null,
            'expensesByCategory' => array_values($expensesByCategory),
            'incomeByCategory' => array_values($incomeByCategory),
            'settlement' => [
                'initialCash' => $initialBalance,
                'totalIncome' => $totalIncome,
                'totalExpenses' => $totalExpenses,
                'netResult' => $initialBalance + $totalIncome - $totalExpenses,
                'cashOnHand' => $currentBalance,
            ],
            'payments' => $this->getReservationPayments($event),
        ];
    }

    /**
     * Get payment overview from reservations linked to this event
     */
    public function getReservationPayments(Event $event): array
    {
        // Get unique reservations linked to this event through EventGuests
        $guests = $event->getGuests();
        $reservationIds = [];
        foreach ($guests as $guest) {
            $reservation = $guest->getReservation();
            if ($reservation && !in_array($reservation->getId(), $reservationIds)) {
                $reservationIds[] = $reservation->getId();
            }
        }

        // Build reservation payment summaries
        $reservationSummaries = [];
        $totals = [
            'totalExpected' => 0,
            'totalPaid' => 0,
            'totalRemaining' => 0,
            'reservationCount' => 0,
            'paidCount' => 0,
            'partialCount' => 0,
            'unpaidCount' => 0,
        ];

        foreach ($reservationIds as $resId) {
            $reservation = $this->reservationRepo->find($resId);
            if (!$reservation) {
                continue;
            }

            $totalPrice = (float) ($reservation->getTotalPrice() ?? 0);
            $paidAmount = (float) ($reservation->getPaidAmount() ?? 0);
            $remainingAmount = max(0, $totalPrice - $paidAmount);
            $paymentStatus = $reservation->getPaymentStatus() ?? 'UNPAID';

            // Get invoices for this reservation
            $invoices = $this->invoiceRepo->findBy(['reservation' => $reservation]);
            $invoiceSummaries = [];
            foreach ($invoices as $invoice) {
                $invoiceSummaries[] = [
                    'id' => $invoice->getId(),
                    'invoiceNumber' => $invoice->getInvoiceNumber(),
                    'invoiceType' => $invoice->getInvoiceType(),
                    'status' => $invoice->getStatus(),
                    'total' => (float) $invoice->getTotal(),
                    'currency' => $invoice->getCurrency(),
                    'dueDate' => $invoice->getDueDate()?->format('Y-m-d'),
                ];
            }

            // Count guests from this reservation
            $guestCount = $this->getReservationGuestCount($reservation);

            $reservationSummaries[] = [
                'reservationId' => $reservation->getId(),
                'contactName' => $reservation->getContactName() ?? 'Neznámý',
                'contactEmail' => $reservation->getContactEmail(),
                'contactPhone' => $reservation->getContactPhone(),
                'guestCount' => $guestCount,
                'totalPrice' => $totalPrice,
                'paidAmount' => $paidAmount,
                'remainingAmount' => $remainingAmount,
                'currency' => $reservation->getCurrency(),
                'paymentStatus' => $paymentStatus,
                'paymentMethod' => $reservation->getPaymentMethod(),
                'paymentNote' => $reservation->getPaymentNote(),
                'invoices' => $invoiceSummaries,
            ];

            // Update totals
            $totals['totalExpected'] += $totalPrice;
            $totals['totalPaid'] += $paidAmount;
            $totals['totalRemaining'] += $remainingAmount;
            $totals['reservationCount']++;

            if ($paymentStatus === 'PAID') {
                $totals['paidCount']++;
            } elseif ($paymentStatus === 'PARTIAL') {
                $totals['partialCount']++;
            } else {
                $totals['unpaidCount']++;
            }
        }

        // Get all invoices linked to the event:
        // 1) Via EventInvoice entity
        // 2) Via reservations linked to the event
        $allInvoices = [];
        $seenInvoiceIds = [];

        // From EventInvoice
        $eventInvoices = $event->getEventInvoices();
        foreach ($eventInvoices as $ei) {
            $invoice = $ei->getInvoice();
            if ($invoice && !in_array($invoice->getId(), $seenInvoiceIds)) {
                $seenInvoiceIds[] = $invoice->getId();
                $allInvoices[] = $this->serializeInvoiceSummary($invoice);
            }
        }

        // From reservations (may have invoices not linked via EventInvoice)
        foreach ($reservationIds as $resId) {
            $resInvoices = $this->invoiceRepo->findBy(['reservation' => $resId]);
            foreach ($resInvoices as $invoice) {
                if (!in_array($invoice->getId(), $seenInvoiceIds)) {
                    $seenInvoiceIds[] = $invoice->getId();
                    $allInvoices[] = $this->serializeInvoiceSummary($invoice);
                }
            }
        }

        return [
            'reservations' => $reservationSummaries,
            'totals' => $totals,
            'invoices' => $allInvoices,
        ];
    }

    // ---- Private helper methods ----

    private function getReservationGuestCount($reservation): int
    {
        $count = 0;
        foreach ($reservation->getPersons() as $person) {
            $count++;
        }
        return $count ?: 1;
    }

    private function serializeInvoiceSummary(\App\Entity\Invoice $invoice): array
    {
        return [
            'id' => $invoice->getId(),
            'invoiceNumber' => $invoice->getInvoiceNumber(),
            'invoiceType' => $invoice->getInvoiceType(),
            'status' => $invoice->getStatus(),
            'total' => (float) $invoice->getTotal(),
            'customerName' => $invoice->getCustomerName(),
            'reservationId' => $invoice->getReservation()?->getId(),
            'dueDate' => $invoice->getDueDate()?->format('Y-m-d'),
            'paidAt' => $invoice->getPaidAt()?->format('Y-m-d'),
            'originalInvoiceId' => $invoice->getOriginalInvoiceId(),
        ];
    }

    private function getExpenseCategoryLabel(string $category): string
    {
        $labels = [
            'STAFF_WAITERS' => 'Číšníci',
            'STAFF_COOKS' => 'Kuchaři',
            'STAFF_HELPERS' => 'Pomocné síly',
            'ENTERTAINMENT_DANCERS' => 'Tanečníci',
            'ENTERTAINMENT_MUSICIANS' => 'Muzikanti',
            'ENTERTAINMENT_MODERATOR' => 'Moderátor',
            'PHOTOGRAPHER' => 'Fotograf',
            'CATERING' => 'Catering',
            'TRANSPORT' => 'Doprava',
            'MERCHANDISE_JEWELRY' => 'Šperky',
            'OTHER' => 'Ostatní',
        ];
        return $labels[$category] ?? $category;
    }

    private function getIncomeCategoryLabel(string $category): string
    {
        $labels = [
            'ONLINE_PAYMENT' => 'Online platby',
            'CASH_PAYMENT' => 'Hotovostní platby',
            'JEWELRY_SALES' => 'Prodej šperků',
            'MERCHANDISE' => 'Prodej zboží',
            'OTHER' => 'Ostatní',
        ];
        return $labels[$category] ?? $category;
    }
}
