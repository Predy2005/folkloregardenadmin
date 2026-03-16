<?php

declare(strict_types=1);

namespace App\Controller;

use App\Repository\EventRepository;
use App\Service\EventStockRequirementService;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Annotation\Route;
use Symfony\Component\Security\Http\Attribute\IsGranted;

#[Route('/api/stock-requirements')]
class StockRequirementController extends AbstractController
{
    public function __construct(
        private readonly EventStockRequirementService $stockService,
        private readonly EventRepository $eventRepo,
    ) {
    }

    /**
     * GET /api/stock-requirements?dateFrom=YYYY-MM-DD&dateTo=YYYY-MM-DD
     * Aggregated stock requirements across events in a date range.
     */
    #[Route('', name: 'stock_requirements_list', methods: ['GET'])]
    #[IsGranted('stock_items.read')]
    public function list(Request $request): JsonResponse
    {
        $dateFrom = $request->query->get('dateFrom', date('Y-m-d'));
        $dateTo = $request->query->get('dateTo', date('Y-m-d', strtotime('+30 days')));

        $result = $this->stockService->getAggregatedRequirements($dateFrom, $dateTo);

        return $this->json($result);
    }

    /**
     * GET /api/stock-requirements/events/{id}
     * Stock requirements for a specific event.
     */
    #[Route('/events/{id}', name: 'stock_requirements_event', methods: ['GET'])]
    #[IsGranted('stock_items.read')]
    public function eventRequirements(int $id): JsonResponse
    {
        $event = $this->eventRepo->find($id);
        if (!$event) {
            return $this->json(['error' => 'Event not found'], 404);
        }

        $result = $this->stockService->getEventRequirements($event);

        return $this->json($result);
    }
}
