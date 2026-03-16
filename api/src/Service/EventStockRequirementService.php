<?php

declare(strict_types=1);

namespace App\Service;

use App\Entity\Event;
use App\Entity\EventMenu;
use App\Entity\MenuRecipe;
use App\Entity\RecipeIngredient;
use App\Repository\EventRepository;
use App\Repository\MenuRecipeRepository;
use Doctrine\ORM\EntityManagerInterface;

/**
 * Unified service for calculating stock requirements from event menus.
 *
 * This service is the SINGLE SOURCE OF TRUTH for all stock requirement calculations.
 * Both the event dashboard card and the stock requirements page use this service.
 *
 * FLOW:
 *   EventMenu (menuName, quantity, reservationFoodId)
 *     → MenuRecipe (which recipes compose the menu)
 *       → Recipe → RecipeIngredient (grams per portion)
 *         → StockItem (current available stock in kg/l)
 *
 * UNIT CONVERSION:
 *   RecipeIngredient.quantityRequired is in grams/ml (per portion)
 *   StockItem.quantityAvailable is in kg/l
 *   This service converts g→kg (÷1000) before comparing.
 */
class EventStockRequirementService
{
    public function __construct(
        private readonly MenuRecipeRepository $menuRecipeRepo,
        private readonly EventRepository $eventRepo,
        private readonly EntityManagerInterface $em,
    ) {
    }

    /**
     * Get stock requirements for a single event.
     *
     * @return array{items: array, summary: array}
     */
    public function getEventRequirements(Event $event): array
    {
        $menus = $event->getMenus();

        // Collect all unique reservation food IDs from event menus
        $foodIds = [];
        foreach ($menus as $menu) {
            $rf = $menu->getReservationFood();
            if ($rf) {
                $foodIds[$rf->getId()] = true;
            }
        }

        // Batch-load all menu recipes with eager-loaded recipe ingredients + stock items
        $menuRecipes = $this->menuRecipeRepo->findByFoodIds(array_keys($foodIds));

        // Index menu recipes by reservation food ID
        $menuRecipesByFood = [];
        foreach ($menuRecipes as $mr) {
            $rfId = $mr->getReservationFood()->getId();
            $menuRecipesByFood[$rfId][] = $mr;
        }

        // Accumulate requirements per stock item
        $requirements = []; // stockItemId => {required, details[], ...}

        foreach ($menus as $menu) {
            $rf = $menu->getReservationFood();
            if (!$rf) {
                continue;
            }

            $rfId = $rf->getId();
            $quantity = $menu->getQuantity(); // number of guests/portions for this menu

            $linkedRecipes = $menuRecipesByFood[$rfId] ?? [];

            foreach ($linkedRecipes as $menuRecipe) {
                /** @var MenuRecipe $menuRecipe */
                $recipe = $menuRecipe->getRecipe();
                $portionsPerServing = (float) $menuRecipe->getPortionsPerServing();
                $recipeTotalPortions = $recipe->getPortions(); // portions the recipe yields

                foreach ($recipe->getIngredients() as $ingredient) {
                    /** @var RecipeIngredient $ingredient */
                    $stockItem = $ingredient->getStockItem();
                    if (!$stockItem) {
                        continue;
                    }

                    $siId = $stockItem->getId();
                    $qtyRequiredGrams = (float) $ingredient->getQuantityRequired();

                    // requiredGrams = (guestCount / recipePortions) * gramsPerPortion * portionsPerServing
                    $requiredGrams = ($quantity / max(1, $recipeTotalPortions)) * $qtyRequiredGrams * $portionsPerServing;
                    $requiredKg = $requiredGrams / 1000;

                    if (!isset($requirements[$siId])) {
                        $requirements[$siId] = [
                            'stockItemId' => $siId,
                            'stockItemName' => $stockItem->getName(),
                            'unit' => $stockItem->getUnit(),
                            'available' => (float) $stockItem->getQuantityAvailable(),
                            'pricePerUnit' => $stockItem->getPricePerUnit() !== null ? (float) $stockItem->getPricePerUnit() : null,
                            'required' => 0.0,
                            'details' => [],
                        ];
                    }

                    $requirements[$siId]['required'] += $requiredKg;
                    $requirements[$siId]['details'][] = [
                        'menuName' => $menu->getMenuName(),
                        'recipeName' => $recipe->getName(),
                        'courseType' => $menuRecipe->getCourseType(),
                        'guestCount' => $quantity,
                        'subtotal' => round($requiredKg, 4),
                    ];
                }
            }
        }

        // Calculate deficit/surplus and status
        $items = [];
        $totalDeficits = 0;
        $totalEstimatedCost = 0;

        foreach ($requirements as $req) {
            $required = round($req['required'], 4);
            $available = $req['available'];
            $deficit = max(0, round($required - $available, 4));
            $surplus = max(0, round($available - $required, 4));
            $status = $deficit > 0 ? 'DEFICIT' : 'OK';

            $estimatedCost = $req['pricePerUnit'] !== null ? round($required * $req['pricePerUnit'], 2) : 0;
            $deficitCost = $req['pricePerUnit'] !== null ? round($deficit * $req['pricePerUnit'], 2) : 0;

            if ($deficit > 0) {
                $totalDeficits++;
            }
            $totalEstimatedCost += $estimatedCost;

            $items[] = [
                'stockItemId' => $req['stockItemId'],
                'stockItemName' => $req['stockItemName'],
                'unit' => $req['unit'],
                'available' => $available,
                'required' => $required,
                'deficit' => $deficit,
                'surplus' => $surplus,
                'status' => $status,
                'estimatedCost' => $estimatedCost,
                'deficitCost' => $deficitCost,
                'details' => $req['details'],
            ];
        }

        // Sort: deficits first, then by required amount descending
        usort($items, function ($a, $b) {
            if ($a['status'] !== $b['status']) {
                return $a['status'] === 'DEFICIT' ? -1 : 1;
            }
            return $b['required'] <=> $a['required'];
        });

        return [
            'items' => $items,
            'summary' => [
                'totalItems' => count($items),
                'totalDeficits' => $totalDeficits,
                'totalEstimatedCost' => round($totalEstimatedCost, 2),
            ],
        ];
    }

    /**
     * Get aggregated stock requirements across multiple events in a date range.
     *
     * @return array{items: array, events: array, summary: array}
     */
    public function getAggregatedRequirements(string $dateFrom, string $dateTo): array
    {
        $events = $this->eventRepo->createQueryBuilder('e')
            ->where('e.eventDate >= :from')
            ->andWhere('e.eventDate <= :to')
            ->andWhere('e.status != :cancelled')
            ->setParameter('from', new \DateTime($dateFrom))
            ->setParameter('to', new \DateTime($dateTo))
            ->setParameter('cancelled', 'CANCELLED')
            ->orderBy('e.eventDate', 'ASC')
            ->getQuery()
            ->getResult();

        $aggregated = []; // stockItemId => accumulated data
        $eventSummaries = [];
        $eventRequirementsMap = []; // eventId => items (raw per-event requirements)

        foreach ($events as $event) {
            $eventReqs = $this->getEventRequirements($event);
            $eventDeficits = $eventReqs['summary']['totalDeficits'];

            $eventSummaries[] = [
                'eventId' => $event->getId(),
                'eventName' => $event->getName(),
                'eventDate' => $event->getEventDate()->format('Y-m-d'),
                'deficits' => $eventDeficits,
                'totalItems' => $eventReqs['summary']['totalItems'],
            ];

            // Store for perEvent timeline calculation
            $eventRequirementsMap[$event->getId()] = [
                'event' => $event,
                'items' => $eventReqs['items'],
            ];

            foreach ($eventReqs['items'] as $item) {
                $siId = $item['stockItemId'];
                if (!isset($aggregated[$siId])) {
                    $aggregated[$siId] = [
                        'stockItemId' => $siId,
                        'stockItemName' => $item['stockItemName'],
                        'unit' => $item['unit'],
                        'available' => $item['available'],
                        'required' => 0.0,
                        'estimatedCost' => 0.0,
                        'deficitCost' => 0.0,
                        'details' => [],
                    ];
                }

                $aggregated[$siId]['required'] += $item['required'];
                $aggregated[$siId]['estimatedCost'] += $item['estimatedCost'];

                // Append details with event context
                foreach ($item['details'] as $detail) {
                    $detail['eventName'] = $event->getName();
                    $detail['eventId'] = $event->getId();
                    $aggregated[$siId]['details'][] = $detail;
                }
            }
        }

        // Build perEvent timeline with running stock
        $runningStock = []; // stockItemId => remaining available
        // Initialize running stock from current available quantities
        foreach ($aggregated as $siId => $agg) {
            $runningStock[$siId] = $agg['available'];
        }

        $perEvent = [];
        foreach ($events as $event) {
            $eid = $event->getId();
            if (!isset($eventRequirementsMap[$eid])) {
                continue;
            }

            $eventItems = $eventRequirementsMap[$eid]['items'];
            $timelineItems = [];
            $eventTotalDeficits = 0;
            $eventTotalEstimatedCost = 0.0;

            foreach ($eventItems as $item) {
                $siId = $item['stockItemId'];
                $required = round((float) $item['required'], 4);

                // Ensure running stock is initialized (for items only in this event)
                if (!isset($runningStock[$siId])) {
                    $runningStock[$siId] = $item['available'];
                }

                $runningAvailable = round($runningStock[$siId], 4);
                $deficit = max(0, round($required - $runningAvailable, 4));
                $status = $deficit > 0 ? 'DEFICIT' : 'OK';

                if ($deficit > 0) {
                    $eventTotalDeficits++;
                }
                $eventTotalEstimatedCost += $item['estimatedCost'];

                $timelineItems[] = [
                    'stockItemId' => $siId,
                    'stockItemName' => $item['stockItemName'],
                    'unit' => $item['unit'],
                    'required' => $required,
                    'runningAvailable' => $runningAvailable,
                    'deficit' => $deficit,
                    'status' => $status,
                    'estimatedCost' => round((float) $item['estimatedCost'], 2),
                ];

                // Deduct from running stock (don't go below 0)
                $runningStock[$siId] = max(0, $runningStock[$siId] - $required);
            }

            // Sort: deficits first
            usort($timelineItems, function ($a, $b) {
                if ($a['status'] !== $b['status']) {
                    return $a['status'] === 'DEFICIT' ? -1 : 1;
                }
                return $b['required'] <=> $a['required'];
            });

            $perEvent[] = [
                'eventId' => $event->getId(),
                'eventName' => $event->getName(),
                'eventDate' => $event->getEventDate()->format('Y-m-d'),
                'guestsTotal' => $event->getGuestsTotal(),
                'items' => $timelineItems,
                'summary' => [
                    'totalItems' => count($timelineItems),
                    'totalDeficits' => $eventTotalDeficits,
                    'totalEstimatedCost' => round($eventTotalEstimatedCost, 2),
                ],
            ];
        }

        // Recalculate deficit/surplus for aggregated items
        $items = [];
        $totalDeficits = 0;
        $totalEstimatedCost = 0;

        foreach ($aggregated as $agg) {
            $required = round($agg['required'], 4);
            $available = $agg['available'];
            $deficit = max(0, round($required - $available, 4));
            $surplus = max(0, round($available - $required, 4));
            $status = $deficit > 0 ? 'DEFICIT' : 'OK';
            $pricePerUnit = $agg['estimatedCost'] > 0 && $required > 0
                ? $agg['estimatedCost'] / $required
                : 0;
            $deficitCost = round($deficit * $pricePerUnit, 2);

            if ($deficit > 0) {
                $totalDeficits++;
            }
            $totalEstimatedCost += $agg['estimatedCost'];

            $items[] = [
                'stockItemId' => $agg['stockItemId'],
                'stockItemName' => $agg['stockItemName'],
                'unit' => $agg['unit'],
                'available' => $available,
                'required' => $required,
                'deficit' => $deficit,
                'surplus' => $surplus,
                'status' => $status,
                'estimatedCost' => round($agg['estimatedCost'], 2),
                'deficitCost' => $deficitCost,
                'details' => $agg['details'],
            ];
        }

        usort($items, function ($a, $b) {
            if ($a['status'] !== $b['status']) {
                return $a['status'] === 'DEFICIT' ? -1 : 1;
            }
            return $b['required'] <=> $a['required'];
        });

        return [
            'items' => $items,
            'events' => $eventSummaries,
            'perEvent' => $perEvent,
            'summary' => [
                'totalEvents' => count($events),
                'totalDeficits' => $totalDeficits,
                'totalEstimatedCost' => round($totalEstimatedCost, 2),
            ],
        ];
    }
}
