<?php
declare(strict_types=1);

namespace App\Controller;

use App\Repository\InvoiceRepository;
use App\Repository\ReservationRepository;
use App\Service\InvoiceService;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;
use Symfony\Component\Routing\Annotation\Route;
use Symfony\Component\Security\Http\Attribute\IsGranted;

#[Route('/api/invoices')]
class InvoiceController extends AbstractController
{
    public function __construct(
        private InvoiceRepository $invoiceRepository,
        private ReservationRepository $reservationRepository,
        private InvoiceService $invoiceService,
        private EntityManagerInterface $entityManager,
    ) {
    }

    #[Route('', methods: ['GET'])]
    #[IsGranted('invoices.read')]
    public function list(Request $request): JsonResponse
    {
        $status = $request->query->get('status');
        $dateFrom = $request->query->get('dateFrom');
        $dateTo = $request->query->get('dateTo');

        if ($status) {
            $invoices = $this->invoiceRepository->findByStatus($status);
        } elseif ($dateFrom && $dateTo) {
            $invoices = $this->invoiceRepository->findByDateRange(
                new \DateTime($dateFrom),
                new \DateTime($dateTo)
            );
        } else {
            $invoices = $this->invoiceRepository->findBy([], ['createdAt' => 'DESC']);
        }

        $data = array_map(fn($invoice) => $this->invoiceService->toArray($invoice), $invoices);

        return new JsonResponse($data);
    }

    #[Route('', methods: ['POST'])]
    #[IsGranted('invoices.create')]
    public function create(Request $request): JsonResponse
    {
        $data = json_decode($request->getContent(), true);

        try {
            $user = $this->getUser();
            $invoice = $this->invoiceService->create($data, $user);

            return new JsonResponse($this->invoiceService->toArray($invoice), Response::HTTP_CREATED);
        } catch (\RuntimeException $e) {
            return new JsonResponse(['error' => $e->getMessage()], Response::HTTP_BAD_REQUEST);
        }
    }

    #[Route('/bulk-update', methods: ['PUT'])]
    #[IsGranted('invoices.update')]
    public function bulkUpdate(Request $request): JsonResponse
    {
        $data = json_decode($request->getContent(), true);
        $ids = $data['ids'] ?? [];
        $updates = $data['updates'] ?? [];

        if (empty($ids)) {
            return new JsonResponse(['error' => 'Chybí pole ids'], Response::HTTP_BAD_REQUEST);
        }

        $allowedStatuses = ['DRAFT', 'SENT', 'PAID', 'CANCELLED'];
        $count = 0;

        foreach ($ids as $id) {
            $invoice = $this->invoiceRepository->find($id);
            if (!$invoice) {
                continue;
            }

            if (isset($updates['status'])) {
                $status = $updates['status'];
                if (!in_array($status, $allowedStatuses, true)) {
                    return new JsonResponse(
                        ['error' => "Neplatný status: $status"],
                        Response::HTTP_BAD_REQUEST
                    );
                }

                match ($status) {
                    'PAID' => $this->invoiceService->markAsPaid($invoice),
                    'SENT' => $this->invoiceService->markAsSent($invoice),
                    'CANCELLED' => $this->invoiceService->cancel($invoice),
                    default => (function () use ($invoice, $status) {
                        $invoice->setStatus($status);
                        $invoice->setUpdatedAt(new \DateTime());
                        $this->entityManager->flush();
                    })(),
                };
            }

            $count++;
        }

        return new JsonResponse(['status' => 'updated', 'count' => $count]);
    }

    #[Route('/bulk-delete', methods: ['DELETE'])]
    #[IsGranted('invoices.delete')]
    public function bulkDelete(Request $request): JsonResponse
    {
        $data = json_decode($request->getContent(), true);
        $ids = $data['ids'] ?? [];

        if (empty($ids)) {
            return new JsonResponse(['error' => 'Chybí pole ids'], Response::HTTP_BAD_REQUEST);
        }

        // Kontrola: nelze mazat ne-DRAFT faktury
        $nonDraftIds = [];
        foreach ($ids as $id) {
            $invoice = $this->invoiceRepository->find($id);
            if ($invoice && !in_array($invoice->getStatus(), ['DRAFT', 'CANCELLED'], true)) {
                $nonDraftIds[] = $id;
            }
        }

        if (!empty($nonDraftIds)) {
            return new JsonResponse([
                'error' => 'Některé faktury nelze smazat (pouze DRAFT a CANCELLED). Odeslanou/zaplacenou fakturu nejprve stornujte.',
                'nonDraftIds' => $nonDraftIds,
            ], Response::HTTP_CONFLICT);
        }

        $count = 0;

        foreach ($ids as $id) {
            $invoice = $this->invoiceRepository->find($id);
            if (!$invoice) {
                continue;
            }

            $this->entityManager->remove($invoice);
            $count++;
        }

        $this->entityManager->flush();

        return new JsonResponse(['status' => 'deleted', 'count' => $count]);
    }

    #[Route('/bulk-pdf', methods: ['POST'])]
    #[IsGranted('invoices.read')]
    public function bulkPdf(Request $request): Response
    {
        $data = json_decode($request->getContent(), true);
        $ids = $data['ids'] ?? [];

        if (empty($ids)) {
            return new JsonResponse(['error' => 'Chybí pole ids'], Response::HTTP_BAD_REQUEST);
        }

        $tmpFile = tempnam(sys_get_temp_dir(), 'invoices_') . '.zip';
        $zip = new \ZipArchive();

        if ($zip->open($tmpFile, \ZipArchive::CREATE) !== true) {
            return new JsonResponse(['error' => 'Nelze vytvořit ZIP archiv'], Response::HTTP_INTERNAL_SERVER_ERROR);
        }

        foreach ($ids as $id) {
            $invoice = $this->invoiceRepository->find($id);
            if (!$invoice) {
                continue;
            }

            $pdfContent = $this->generateInvoicePdf($invoice);
            $filename = 'faktura-' . $invoice->getInvoiceNumber() . '.pdf';
            $zip->addFromString($filename, $pdfContent);
        }

        $zip->close();

        $response = new Response(file_get_contents($tmpFile));
        $response->headers->set('Content-Type', 'application/zip');
        $response->headers->set('Content-Disposition', 'attachment; filename="faktury-export.zip"');

        unlink($tmpFile);

        return $response;
    }

    #[Route('/{id}', methods: ['GET'], requirements: ['id' => '\d+'])]
    #[IsGranted('invoices.read')]
    public function show(int $id): JsonResponse
    {
        $invoice = $this->invoiceRepository->find($id);

        if (!$invoice) {
            return new JsonResponse(['error' => 'Faktura nenalezena'], Response::HTTP_NOT_FOUND);
        }

        return new JsonResponse($this->invoiceService->toArray($invoice));
    }

    #[Route('/{id}/pdf', methods: ['GET'], requirements: ['id' => '\d+'])]
    #[IsGranted('invoices.read')]
    public function pdf(int $id): Response
    {
        $invoice = $this->invoiceRepository->find($id);

        if (!$invoice) {
            return new JsonResponse(['error' => 'Faktura nenalezena'], Response::HTTP_NOT_FOUND);
        }

        $pdfContent = $this->generateInvoicePdf($invoice);
        $filename = 'faktura-' . $invoice->getInvoiceNumber() . '.pdf';

        $response = new Response($pdfContent);
        $response->headers->set('Content-Type', 'application/pdf');
        $response->headers->set('Content-Disposition', 'inline; filename="' . $filename . '"');

        return $response;
    }

    #[Route('/reservation/{reservationId}', methods: ['GET'], requirements: ['reservationId' => '\d+'])]
    #[IsGranted('invoices.read')]
    public function byReservation(int $reservationId): JsonResponse
    {
        $invoices = $this->invoiceRepository->findByReservation($reservationId);
        $data = array_map(fn($invoice) => $this->invoiceService->toArray($invoice), $invoices);

        return new JsonResponse($data);
    }

    #[Route('/create-from-reservation/{reservationId}', methods: ['POST'], requirements: ['reservationId' => '\d+'])]
    #[IsGranted('invoices.create')]
    public function createFromReservation(int $reservationId): JsonResponse
    {
        $reservation = $this->reservationRepository->find($reservationId);

        if (!$reservation) {
            return new JsonResponse(['error' => 'Rezervace nenalezena'], Response::HTTP_NOT_FOUND);
        }

        try {
            $user = $this->getUser();
            $invoice = $this->invoiceService->createFromReservation($reservation, $user);

            return new JsonResponse($this->invoiceService->toArray($invoice), Response::HTTP_CREATED);
        } catch (\RuntimeException $e) {
            return new JsonResponse(['error' => $e->getMessage()], Response::HTTP_BAD_REQUEST);
        }
    }

    /**
     * Vrátí náhled položek pro zálohovou fakturu
     *
     * Query params:
     * - percent?: float (default 25)
     */
    #[Route('/preview-deposit/{reservationId}', methods: ['GET'], requirements: ['reservationId' => '\d+'])]
    #[IsGranted('invoices.read')]
    public function previewDepositInvoice(int $reservationId, Request $request): JsonResponse
    {
        $reservation = $this->reservationRepository->find($reservationId);

        if (!$reservation) {
            return new JsonResponse(['error' => 'Rezervace nenalezena'], Response::HTTP_NOT_FOUND);
        }

        $percent = (float) $request->query->get('percent', 25);
        $preview = $this->invoiceService->getDepositInvoicePreview($reservation, $percent);

        return new JsonResponse($preview);
    }

    /**
     * Vrátí náhled položek pro finální fakturu
     */
    #[Route('/preview-final/{reservationId}', methods: ['GET'], requirements: ['reservationId' => '\d+'])]
    #[IsGranted('invoices.read')]
    public function previewFinalInvoice(int $reservationId): JsonResponse
    {
        $reservation = $this->reservationRepository->find($reservationId);

        if (!$reservation) {
            return new JsonResponse(['error' => 'Rezervace nenalezena'], Response::HTTP_NOT_FOUND);
        }

        $preview = $this->invoiceService->getFinalInvoicePreview($reservation);

        return new JsonResponse($preview);
    }

    /**
     * Vytvoří zálohovou fakturu pro rezervaci
     *
     * Body params:
     * - percent?: float (default 25) - procento zálohy
     * - customAmount?: float - vlastní částka (přepíše procentuální výpočet)
     * - customItems?: array - vlastní položky faktury
     * - customDescription?: string - vlastní popis položky zálohy
     */
    #[Route('/create-deposit/{reservationId}', methods: ['POST'], requirements: ['reservationId' => '\d+'])]
    #[IsGranted('invoices.create')]
    public function createDepositInvoice(int $reservationId, Request $request): JsonResponse
    {
        $reservation = $this->reservationRepository->find($reservationId);

        if (!$reservation) {
            return new JsonResponse(['error' => 'Rezervace nenalezena'], Response::HTTP_NOT_FOUND);
        }

        $data = json_decode($request->getContent(), true) ?? [];
        $percent = isset($data['percent']) ? (float)$data['percent'] : 25.0;
        $customAmount = isset($data['customAmount']) ? (float)$data['customAmount'] : null;
        $customItems = $data['customItems'] ?? null;
        $customDescription = $data['customDescription'] ?? null;

        try {
            $user = $this->getUser();
            $invoice = $this->invoiceService->createDepositInvoice(
                $reservation,
                $percent,
                $customAmount,
                $user,
                $customItems,
                $customDescription
            );

            return new JsonResponse($this->invoiceService->toArray($invoice), Response::HTTP_CREATED);
        } catch (\RuntimeException $e) {
            return new JsonResponse(['error' => $e->getMessage()], Response::HTTP_BAD_REQUEST);
        }
    }

    /**
     * Vytvoří doplatovou (finální) fakturu pro rezervaci
     *
     * Body params:
     * - deductDeposit?: bool (default true) - odečíst zaplacené zálohy
     * - customItems?: array - vlastní položky faktury
     */
    #[Route('/create-final/{reservationId}', methods: ['POST'], requirements: ['reservationId' => '\d+'])]
    #[IsGranted('invoices.create')]
    public function createFinalInvoice(int $reservationId, Request $request): JsonResponse
    {
        $reservation = $this->reservationRepository->find($reservationId);

        if (!$reservation) {
            return new JsonResponse(['error' => 'Rezervace nenalezena'], Response::HTTP_NOT_FOUND);
        }

        $data = json_decode($request->getContent(), true) ?? [];
        $deductDeposit = $data['deductDeposit'] ?? true;
        $customItems = $data['customItems'] ?? null;

        try {
            $user = $this->getUser();
            $invoice = $this->invoiceService->createFinalInvoice(
                $reservation,
                $deductDeposit,
                $user,
                $customItems
            );

            return new JsonResponse($this->invoiceService->toArray($invoice), Response::HTTP_CREATED);
        } catch (\RuntimeException $e) {
            return new JsonResponse(['error' => $e->getMessage()], Response::HTTP_BAD_REQUEST);
        }
    }

    #[Route('/{id}', methods: ['PUT'], requirements: ['id' => '\d+'])]
    #[IsGranted('invoices.update')]
    public function update(int $id, Request $request): JsonResponse
    {
        $invoice = $this->invoiceRepository->find($id);

        if (!$invoice) {
            return new JsonResponse(['error' => 'Faktura nenalezena'], Response::HTTP_NOT_FOUND);
        }

        $data = json_decode($request->getContent(), true);

        try {
            $user = $this->getUser();
            $invoice = $this->invoiceService->update($invoice, $data, $user);
            return new JsonResponse($this->invoiceService->toArray($invoice));
        } catch (\RuntimeException $e) {
            return new JsonResponse(['error' => $e->getMessage()], Response::HTTP_CONFLICT);
        }
    }

    #[Route('/{id}/send', methods: ['POST'], requirements: ['id' => '\d+'])]
    #[IsGranted('invoices.update')]
    public function send(int $id): JsonResponse
    {
        $invoice = $this->invoiceRepository->find($id);

        if (!$invoice) {
            return new JsonResponse(['error' => 'Faktura nenalezena'], Response::HTTP_NOT_FOUND);
        }

        $user = $this->getUser();
        $invoice = $this->invoiceService->markAsSent($invoice, $user);

        return new JsonResponse($this->invoiceService->toArray($invoice));
    }

    #[Route('/{id}/send-email', methods: ['POST'], requirements: ['id' => '\d+'])]
    #[IsGranted('invoices.update')]
    public function sendEmail(int $id): JsonResponse
    {
        $invoice = $this->invoiceRepository->find($id);

        if (!$invoice) {
            return new JsonResponse(['error' => 'Faktura nenalezena'], Response::HTTP_NOT_FOUND);
        }

        try {
            $this->invoiceService->sendInvoiceEmail($invoice);
            return new JsonResponse($this->invoiceService->toArray($invoice));
        } catch (\RuntimeException $e) {
            return new JsonResponse(['error' => $e->getMessage()], Response::HTTP_BAD_REQUEST);
        }
    }

    #[Route('/{id}/pay', methods: ['POST'], requirements: ['id' => '\d+'])]
    #[IsGranted('invoices.update')]
    public function pay(int $id): JsonResponse
    {
        $invoice = $this->invoiceRepository->find($id);

        if (!$invoice) {
            return new JsonResponse(['error' => 'Faktura nenalezena'], Response::HTTP_NOT_FOUND);
        }

        $user = $this->getUser();
        $invoice = $this->invoiceService->markAsPaid($invoice, $user);

        return new JsonResponse($this->invoiceService->toArray($invoice));
    }

    #[Route('/{id}/cancel', methods: ['POST'], requirements: ['id' => '\d+'])]
    #[IsGranted('invoices.update')]
    public function cancel(int $id): JsonResponse
    {
        $invoice = $this->invoiceRepository->find($id);

        if (!$invoice) {
            return new JsonResponse(['error' => 'Faktura nenalezena'], Response::HTTP_NOT_FOUND);
        }

        $user = $this->getUser();
        $invoice = $this->invoiceService->cancel($invoice, $user);

        return new JsonResponse($this->invoiceService->toArray($invoice));
    }

    #[Route('/{id}/credit-note', methods: ['POST'], requirements: ['id' => '\d+'])]
    #[IsGranted('invoices.create')]
    public function createCreditNote(int $id, Request $request): JsonResponse
    {
        $invoice = $this->invoiceRepository->find($id);

        if (!$invoice) {
            return new JsonResponse(['error' => 'Faktura nenalezena'], Response::HTTP_NOT_FOUND);
        }

        $data = json_decode($request->getContent(), true) ?? [];
        $reason = $data['reason'] ?? null;

        try {
            $user = $this->getUser();
            $creditNote = $this->invoiceService->createCreditNote($invoice, $user, $reason);

            return new JsonResponse($this->invoiceService->toArray($creditNote), Response::HTTP_CREATED);
        } catch (\RuntimeException $e) {
            return new JsonResponse(['error' => $e->getMessage()], Response::HTTP_BAD_REQUEST);
        }
    }

    #[Route('/{id}', methods: ['DELETE'], requirements: ['id' => '\d+'])]
    #[IsGranted('invoices.delete')]
    public function delete(int $id): JsonResponse
    {
        $invoice = $this->invoiceRepository->find($id);

        if (!$invoice) {
            return new JsonResponse(['error' => 'Faktura nenalezena'], Response::HTTP_NOT_FOUND);
        }

        if (!in_array($invoice->getStatus(), ['DRAFT', 'CANCELLED'], true)) {
            return $this->json(['error' => 'Fakturu ve stavu ' . $invoice->getStatus() . ' nelze smazat. Nejprve ji stornujte.'], 409);
        }

        $this->entityManager->remove($invoice);
        $this->entityManager->flush();

        return new JsonResponse(null, Response::HTTP_NO_CONTENT);
    }

    #[Route('/overdue', methods: ['GET'])]
    #[IsGranted('invoices.read')]
    public function overdue(): JsonResponse
    {
        $invoices = $this->invoiceRepository->findOverdue();
        $data = array_map(fn($invoice) => $this->invoiceService->toArray($invoice), $invoices);

        return new JsonResponse($data);
    }

    private function generateInvoicePdf(\App\Entity\Invoice $invoice): string
    {
        $html = $this->generateInvoiceHtml($invoice);

        $options = new \Dompdf\Options();
        $options->set('isRemoteEnabled', false);
        $options->set('defaultFont', 'DejaVu Sans');
        $options->set('isHtml5ParserEnabled', true);

        $dompdf = new \Dompdf\Dompdf($options);
        $dompdf->loadHtml($html);
        $dompdf->setPaper('A4', 'portrait');
        $dompdf->render();

        return $dompdf->output();
    }

    private function generateInvoiceHtml(\App\Entity\Invoice $invoice): string
    {
        $data = $this->invoiceService->toArray($invoice);

        $formatDate = function (?string $date): string {
            if (!$date) {
                return '-';
            }
            $d = new \DateTime($date);
            return $d->format('d.m.Y');
        };

        $statusLabels = [
            'DRAFT' => 'Koncept',
            'SENT' => 'Odesláno',
            'PAID' => 'Zaplaceno',
            'CANCELLED' => 'Stornováno',
        ];
        $statusLabel = $statusLabels[$data['status']] ?? $data['status'];

        $invoiceTypeLabels = [
            'STANDARD' => 'Faktura - daňový doklad',
            'DEPOSIT' => 'Zálohová faktura (proforma)',
            'FINAL' => 'Faktura - daňový doklad (vyúčtování)',
            'PARTIAL' => 'Faktura - daňový doklad (částečná)',
            'PROFORMA' => 'Proforma faktura',
            'CREDIT_NOTE' => 'Opravný daňový doklad (dobropis)',
        ];
        $typeLabel = $invoiceTypeLabels[$data['invoiceType'] ?? ''] ?? ($data['invoiceType'] ?? 'Faktura');

        $supplier = $data['supplier'];
        $customer = $data['customer'];
        $items = $data['items'] ?? [];

        $itemsHtml = '';
        foreach ($items as $i => $item) {
            $desc = htmlspecialchars($item['description'] ?? '', ENT_QUOTES, 'UTF-8');
            $qty = $item['quantity'] ?? 1;
            $unit = htmlspecialchars($item['unit'] ?? 'ks', ENT_QUOTES, 'UTF-8');
            $unitPrice = number_format((float)($item['unitPrice'] ?? 0), 2, ',', ' ');
            $total = number_format((float)($item['total'] ?? (($item['unitPrice'] ?? 0) * $qty)), 2, ',', ' ');
            $num = $i + 1;
            $itemsHtml .= <<<ROW
            <tr>
                <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:center;">{$num}</td>
                <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;">{$desc}</td>
                <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:center;">{$qty}</td>
                <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:center;">{$unit}</td>
                <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:right;">{$unitPrice} Kč</td>
                <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:right;">{$total} Kč</td>
            </tr>
            ROW;
        }

        $subtotal = number_format((float)($data['subtotal'] ?? 0), 2, ',', ' ');
        $vatRate = $data['vatRate'] ?? 0;
        $vatAmount = number_format((float)($data['vatAmount'] ?? 0), 2, ',', ' ');
        $total = number_format((float)($data['total'] ?? 0), 2, ',', ' ');
        $currency = htmlspecialchars($data['currency'] ?? 'CZK', ENT_QUOTES, 'UTF-8');

        $invoiceNumber = htmlspecialchars($data['invoiceNumber'] ?? '', ENT_QUOTES, 'UTF-8');
        $variableSymbol = htmlspecialchars($data['variableSymbol'] ?? '', ENT_QUOTES, 'UTF-8');
        $issueDate = $formatDate($data['issueDate'] ?? null);
        $dueDate = $formatDate($data['dueDate'] ?? null);
        $taxableDate = $formatDate($data['taxableDate'] ?? null);
        $paidAt = $formatDate($data['paidAt'] ?? null);
        $note = htmlspecialchars($data['note'] ?? '', ENT_QUOTES, 'UTF-8');

        $supplierName = htmlspecialchars($supplier['name'] ?? '', ENT_QUOTES, 'UTF-8');
        $supplierStreet = htmlspecialchars($supplier['street'] ?? '', ENT_QUOTES, 'UTF-8');
        $supplierCity = htmlspecialchars($supplier['city'] ?? '', ENT_QUOTES, 'UTF-8');
        $supplierZipcode = htmlspecialchars($supplier['zipcode'] ?? '', ENT_QUOTES, 'UTF-8');
        $supplierIco = htmlspecialchars($supplier['ico'] ?? '', ENT_QUOTES, 'UTF-8');
        $supplierDic = htmlspecialchars($supplier['dic'] ?? '', ENT_QUOTES, 'UTF-8');
        $supplierEmail = htmlspecialchars($supplier['email'] ?? '', ENT_QUOTES, 'UTF-8');
        $supplierPhone = htmlspecialchars($supplier['phone'] ?? '', ENT_QUOTES, 'UTF-8');
        $supplierBankAccount = htmlspecialchars($supplier['bankAccount'] ?? '', ENT_QUOTES, 'UTF-8');
        $supplierBankName = htmlspecialchars($supplier['bankName'] ?? '', ENT_QUOTES, 'UTF-8');
        $supplierIban = htmlspecialchars($supplier['iban'] ?? '', ENT_QUOTES, 'UTF-8');
        $supplierSwift = htmlspecialchars($supplier['swift'] ?? '', ENT_QUOTES, 'UTF-8');

        $customerName = htmlspecialchars($customer['name'] ?? '', ENT_QUOTES, 'UTF-8');
        $customerCompany = htmlspecialchars($customer['company'] ?? '', ENT_QUOTES, 'UTF-8');
        $customerStreet = htmlspecialchars($customer['street'] ?? '', ENT_QUOTES, 'UTF-8');
        $customerCity = htmlspecialchars($customer['city'] ?? '', ENT_QUOTES, 'UTF-8');
        $customerZipcode = htmlspecialchars($customer['zipcode'] ?? '', ENT_QUOTES, 'UTF-8');
        $customerIco = htmlspecialchars($customer['ico'] ?? '', ENT_QUOTES, 'UTF-8');
        $customerDic = htmlspecialchars($customer['dic'] ?? '', ENT_QUOTES, 'UTF-8');
        $customerEmail = htmlspecialchars($customer['email'] ?? '', ENT_QUOTES, 'UTF-8');
        $customerPhone = htmlspecialchars($customer['phone'] ?? '', ENT_QUOTES, 'UTF-8');

        $customerDisplay = $customerCompany ?: $customerName;

        // Conditional supplier IČO/DIČ
        $supplierIcoLine = $supplierIco ? "<p>IČO: {$supplierIco}</p>" : '';
        $supplierDicLine = $supplierDic ? "<p>DIČ: {$supplierDic}</p>" : '';

        // Conditional customer IČO/DIČ
        $customerIcoLine = $customerIco ? "<p>IČO: {$customerIco}</p>" : '';
        $customerDicLine = $customerDic ? "<p>DIČ: {$customerDic}</p>" : '';

        // Customer name line: only show if company exists and name differs
        $customerNameLine = ($customerCompany && $customerName && $customerCompany !== $customerName)
            ? "<p>{$customerName}</p>"
            : '';
        $qrPaymentData = htmlspecialchars($data['qrPaymentData'] ?? '', ENT_QUOTES, 'UTF-8');

        $paidRow = $data['paidAt'] ? "<tr><td style=\"padding:4px 0;color:#6b7280;\">Datum úhrady:</td><td style=\"padding:4px 0;font-weight:600;\">{$paidAt}</td></tr>" : '';

        $vatRow = $vatRate > 0
            ? "<tr><td colspan=\"5\" style=\"padding:8px 12px;text-align:right;font-weight:600;\">DPH ({$vatRate}%)</td><td style=\"padding:8px 12px;text-align:right;font-weight:600;\">{$vatAmount} Kč</td></tr>"
            : '';

        // Rekapitulace DPH section
        $vatRecapSection = '';
        if ($vatRate > 0) {
            $vatRecapSection = <<<VATREC
            <div style="margin-bottom:20px;padding:15px;background:#f9fafb;border-radius:6px;border:1px solid #e5e7eb;">
                <h3 style="font-size:12px;text-transform:uppercase;color:#6b7280;margin-bottom:8px;letter-spacing:0.5px;">Rekapitulace DPH</h3>
                <table style="width:100%;border-collapse:collapse;">
                    <thead>
                        <tr style="border-bottom:1px solid #e5e7eb;">
                            <th style="padding:6px 12px;text-align:left;font-size:12px;color:#6b7280;">Sazba DPH</th>
                            <th style="padding:6px 12px;text-align:right;font-size:12px;color:#6b7280;">Základ</th>
                            <th style="padding:6px 12px;text-align:right;font-size:12px;color:#6b7280;">DPH</th>
                            <th style="padding:6px 12px;text-align:right;font-size:12px;color:#6b7280;">Celkem</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td style="padding:6px 12px;">{$vatRate} %</td>
                            <td style="padding:6px 12px;text-align:right;">{$subtotal} Kč</td>
                            <td style="padding:6px 12px;text-align:right;">{$vatAmount} Kč</td>
                            <td style="padding:6px 12px;text-align:right;font-weight:600;">{$total} Kč</td>
                        </tr>
                    </tbody>
                </table>
            </div>
            VATREC;
        }

        $noteSection = $note
            ? "<div style=\"margin-top:30px;padding:15px;background:#f9fafb;border-radius:6px;\"><strong>Poznámka:</strong><br>" . nl2br($note) . "</div>"
            : '';

        // Upozornění pro zálohové faktury (proforma)
        $proformaNotice = '';
        if (($data['invoiceType'] ?? '') === 'DEPOSIT') {
            $proformaNotice = '<div style="margin-top:20px;padding:15px;background:#fff7ed;border:1px solid #fed7aa;border-radius:6px;color:#9a3412;font-size:12px;"><strong>Upozornění:</strong> Tento doklad není daňovým dokladem ve smyslu zákona o DPH. Jedná se o výzvu k úhradě zálohy. Daňový doklad k přijaté platbě bude vystaven po přijetí platby dle §28 odst. 9 zákona č. 235/2004 Sb.</div>';
        }

        // Upozornění pro dobropis
        $creditNoteNotice = '';
        if (($data['invoiceType'] ?? '') === 'CREDIT_NOTE') {
            $origId = $data['originalInvoiceId'] ?? null;
            $creditNoteNotice = '<div style="margin-top:20px;padding:15px;background:#fef2f2;border:1px solid #fecaca;border-radius:6px;color:#991b1b;font-size:12px;"><strong>Opravný daňový doklad</strong> dle §45 zákona č. 235/2004 Sb.' . ($origId ? " K původnímu dokladu č. {$origId}." : '') . '</div>';
        }

        $qrSection = $qrPaymentData
            ? "<div style=\"margin-top:20px;padding:15px;background:#f0f9ff;border-radius:6px;border:1px solid #bae6fd;\"><strong>QR platba:</strong><br><code style=\"font-size:11px;word-break:break-all;\">{$qrPaymentData}</code></div>"
            : '';

        return <<<HTML
        <!DOCTYPE html>
        <html lang="cs">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>{$typeLabel} {$invoiceNumber}</title>
            <style>
                * { margin: 0; padding: 0; box-sizing: border-box; }
                body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 14px; color: #1f2937; line-height: 1.5; padding: 40px; max-width: 800px; margin: 0 auto; }
                @media print {
                    body { padding: 20px; font-size: 12px; }
                    .no-print { display: none !important; }
                    @page { margin: 15mm; }
                }
            </style>
        </head>
        <body>
            <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:30px;border-bottom:3px solid #2563eb;padding-bottom:20px;">
                <div>
                    <h1 style="font-size:24px;color:#2563eb;margin-bottom:4px;">{$typeLabel}</h1>
                    <p style="font-size:18px;font-weight:600;">č. {$invoiceNumber}</p>
                </div>
                <div style="text-align:right;">
                    <span style="display:inline-block;padding:4px 12px;border-radius:4px;font-size:12px;font-weight:600;background:#e5e7eb;color:#374151;">{$statusLabel}</span>
                </div>
            </div>

            <div style="display:flex;justify-content:space-between;gap:40px;margin-bottom:30px;">
                <div style="flex:1;">
                    <h3 style="font-size:12px;text-transform:uppercase;color:#6b7280;margin-bottom:8px;letter-spacing:0.5px;">Dodavatel</h3>
                    <p style="font-weight:700;font-size:15px;margin-bottom:4px;">{$supplierName}</p>
                    <p>{$supplierStreet}</p>
                    <p>{$supplierZipcode} {$supplierCity}</p>
                    <div style="margin-top:8px;">{$supplierIcoLine}{$supplierDicLine}</div>
                    <p style="margin-top:8px;">{$supplierEmail}</p>
                    <p>{$supplierPhone}</p>
                </div>
                <div style="flex:1;">
                    <h3 style="font-size:12px;text-transform:uppercase;color:#6b7280;margin-bottom:8px;letter-spacing:0.5px;">Odběratel</h3>
                    <p style="font-weight:700;font-size:15px;margin-bottom:4px;">{$customerDisplay}</p>
                    {$customerNameLine}
                    <p>{$customerStreet}</p>
                    <p>{$customerZipcode} {$customerCity}</p>
                    <div style="margin-top:8px;">{$customerIcoLine}{$customerDicLine}</div>
                    <p style="margin-top:8px;">{$customerEmail}</p>
                    <p>{$customerPhone}</p>
                </div>
            </div>

            <div style="background:#f3f4f6;border-radius:8px;padding:15px 20px;margin-bottom:30px;">
                <table style="width:100%;">
                    <tr>
                        <td style="padding:4px 0;color:#6b7280;">Datum vystavení:</td>
                        <td style="padding:4px 0;font-weight:600;">{$issueDate}</td>
                        <td style="padding:4px 0;color:#6b7280;">Variabilní symbol:</td>
                        <td style="padding:4px 0;font-weight:600;">{$variableSymbol}</td>
                    </tr>
                    <tr>
                        <td style="padding:4px 0;color:#6b7280;">Datum splatnosti:</td>
                        <td style="padding:4px 0;font-weight:600;">{$dueDate}</td>
                        <td style="padding:4px 0;color:#6b7280;">Datum zdanitelného plnění:</td>
                        <td style="padding:4px 0;font-weight:600;">{$taxableDate}</td>
                    </tr>
                    {$paidRow}
                </table>
            </div>

            <table style="width:100%;border-collapse:collapse;margin-bottom:30px;">
                <thead>
                    <tr style="background:#f9fafb;">
                        <th style="padding:10px 12px;text-align:center;border-bottom:2px solid #e5e7eb;font-size:12px;text-transform:uppercase;color:#6b7280;">#</th>
                        <th style="padding:10px 12px;text-align:left;border-bottom:2px solid #e5e7eb;font-size:12px;text-transform:uppercase;color:#6b7280;">Popis</th>
                        <th style="padding:10px 12px;text-align:center;border-bottom:2px solid #e5e7eb;font-size:12px;text-transform:uppercase;color:#6b7280;">Množství</th>
                        <th style="padding:10px 12px;text-align:center;border-bottom:2px solid #e5e7eb;font-size:12px;text-transform:uppercase;color:#6b7280;">Jednotka</th>
                        <th style="padding:10px 12px;text-align:right;border-bottom:2px solid #e5e7eb;font-size:12px;text-transform:uppercase;color:#6b7280;">Cena/ks</th>
                        <th style="padding:10px 12px;text-align:right;border-bottom:2px solid #e5e7eb;font-size:12px;text-transform:uppercase;color:#6b7280;">Celkem</th>
                    </tr>
                </thead>
                <tbody>
                    {$itemsHtml}
                </tbody>
                <tfoot>
                    <tr>
                        <td colspan="5" style="padding:8px 12px;text-align:right;font-weight:600;">Základ</td>
                        <td style="padding:8px 12px;text-align:right;font-weight:600;">{$subtotal} Kč</td>
                    </tr>
                    {$vatRow}
                    <tr style="background:#2563eb;color:white;">
                        <td colspan="5" style="padding:12px;text-align:right;font-weight:700;font-size:16px;">Celkem k úhradě</td>
                        <td style="padding:12px;text-align:right;font-weight:700;font-size:16px;">{$total} Kč</td>
                    </tr>
                </tfoot>
            </table>

            {$vatRecapSection}

            <div style="background:#f3f4f6;border-radius:8px;padding:15px 20px;margin-bottom:20px;">
                <h3 style="font-size:12px;text-transform:uppercase;color:#6b7280;margin-bottom:8px;letter-spacing:0.5px;">Bankovní spojení</h3>
                <table>
                    <tr><td style="padding:3px 15px 3px 0;color:#6b7280;">Číslo účtu:</td><td style="font-weight:600;">{$supplierBankAccount}</td></tr>
                    <tr><td style="padding:3px 15px 3px 0;color:#6b7280;">Banka:</td><td style="font-weight:600;">{$supplierBankName}</td></tr>
                    <tr><td style="padding:3px 15px 3px 0;color:#6b7280;">IBAN:</td><td style="font-weight:600;">{$supplierIban}</td></tr>
                    <tr><td style="padding:3px 15px 3px 0;color:#6b7280;">SWIFT:</td><td style="font-weight:600;">{$supplierSwift}</td></tr>
                </table>
            </div>

            {$qrSection}
            {$noteSection}
            {$proformaNotice}
            {$creditNoteNotice}

            <div style="margin-top:40px;padding-top:20px;border-top:1px solid #e5e7eb;text-align:center;color:#9ca3af;font-size:11px;" class="no-print">
                <p>Vygenerováno {$formatDate(date('Y-m-d'))} | Folklore Garden</p>
            </div>
        </body>
        </html>
        HTML;
    }
}
