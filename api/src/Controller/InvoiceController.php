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
use Symfony\Component\Routing\Annotation\Route;

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

    #[Route('/{id}', methods: ['GET'], requirements: ['id' => '\d+'])]
    public function show(int $id): JsonResponse
    {
        $invoice = $this->invoiceRepository->find($id);

        if (!$invoice) {
            return new JsonResponse(['error' => 'Faktura nenalezena'], Response::HTTP_NOT_FOUND);
        }

        return new JsonResponse($this->invoiceService->toArray($invoice));
    }

    #[Route('/reservation/{reservationId}', methods: ['GET'], requirements: ['reservationId' => '\d+'])]
    public function byReservation(int $reservationId): JsonResponse
    {
        $invoices = $this->invoiceRepository->findByReservation($reservationId);
        $data = array_map(fn($invoice) => $this->invoiceService->toArray($invoice), $invoices);

        return new JsonResponse($data);
    }

    #[Route('/create-from-reservation/{reservationId}', methods: ['POST'], requirements: ['reservationId' => '\d+'])]
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
    public function update(int $id, Request $request): JsonResponse
    {
        $invoice = $this->invoiceRepository->find($id);

        if (!$invoice) {
            return new JsonResponse(['error' => 'Faktura nenalezena'], Response::HTTP_NOT_FOUND);
        }

        $data = json_decode($request->getContent(), true);
        $invoice = $this->invoiceService->update($invoice, $data);

        return new JsonResponse($this->invoiceService->toArray($invoice));
    }

    #[Route('/{id}/send', methods: ['POST'], requirements: ['id' => '\d+'])]
    public function send(int $id): JsonResponse
    {
        $invoice = $this->invoiceRepository->find($id);

        if (!$invoice) {
            return new JsonResponse(['error' => 'Faktura nenalezena'], Response::HTTP_NOT_FOUND);
        }

        $invoice = $this->invoiceService->markAsSent($invoice);

        return new JsonResponse($this->invoiceService->toArray($invoice));
    }

    #[Route('/{id}/send-email', methods: ['POST'], requirements: ['id' => '\d+'])]
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
    public function pay(int $id): JsonResponse
    {
        $invoice = $this->invoiceRepository->find($id);

        if (!$invoice) {
            return new JsonResponse(['error' => 'Faktura nenalezena'], Response::HTTP_NOT_FOUND);
        }

        $invoice = $this->invoiceService->markAsPaid($invoice);

        return new JsonResponse($this->invoiceService->toArray($invoice));
    }

    #[Route('/{id}/cancel', methods: ['POST'], requirements: ['id' => '\d+'])]
    public function cancel(int $id): JsonResponse
    {
        $invoice = $this->invoiceRepository->find($id);

        if (!$invoice) {
            return new JsonResponse(['error' => 'Faktura nenalezena'], Response::HTTP_NOT_FOUND);
        }

        $invoice = $this->invoiceService->cancel($invoice);

        return new JsonResponse($this->invoiceService->toArray($invoice));
    }

    #[Route('/{id}', methods: ['DELETE'], requirements: ['id' => '\d+'])]
    public function delete(int $id): JsonResponse
    {
        $invoice = $this->invoiceRepository->find($id);

        if (!$invoice) {
            return new JsonResponse(['error' => 'Faktura nenalezena'], Response::HTTP_NOT_FOUND);
        }

        $this->entityManager->remove($invoice);
        $this->entityManager->flush();

        return new JsonResponse(null, Response::HTTP_NO_CONTENT);
    }

    #[Route('/overdue', methods: ['GET'])]
    public function overdue(): JsonResponse
    {
        $invoices = $this->invoiceRepository->findOverdue();
        $data = array_map(fn($invoice) => $this->invoiceService->toArray($invoice), $invoices);

        return new JsonResponse($data);
    }
}
