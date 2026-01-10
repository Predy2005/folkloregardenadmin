<?php

namespace App\Controller;

use App\Entity\FoodItemAvailability;
use App\Entity\FoodItemPriceOverride;
use App\Entity\ReservationFoods;
use App\Repository\FoodItemAvailabilityRepository;
use App\Repository\FoodItemPriceOverrideRepository;
use App\Repository\ReservationFoodsRepository;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Annotation\Route;
use Symfony\Component\Security\Http\Attribute\IsGranted;

#[Route('/api/food-pricing')]
class FoodPricingController extends AbstractController
{
    public function __construct(private readonly EntityManagerInterface $em)
    {
    }

    // ---------- Price Overrides ----------

    #[Route('/overrides', methods: ['GET'])]
    #[IsGranted('food_pricing.read')]
    public function listOverrides(Request $request, FoodItemPriceOverrideRepository $repo, ReservationFoodsRepository $foodsRepo): JsonResponse
    {
        $foodId = $request->query->getInt('foodId', 0);
        $criteria = [];
        if ($foodId > 0) {
            $food = $foodsRepo->find($foodId);
            if ($food) { $criteria['reservationFood'] = $food; }
        }
        $items = $repo->findBy($criteria, ['dateFrom' => 'DESC']);
        $data = array_map(function (FoodItemPriceOverride $o) {
            return [
                'id' => $o->getId(),
                'foodId' => $o->getReservationFood()->getId(),
                'dateFrom' => $o->getDateFrom()->format('Y-m-d'),
                'dateTo' => $o->getDateTo()?->format('Y-m-d'),
                'price' => $o->getPrice(),
                'reason' => $o->getReason(),
                'createdAt' => $o->getCreatedAt()->format(DATE_ATOM),
                'updatedAt' => $o->getUpdatedAt()->format(DATE_ATOM),
            ];
        }, $items);
        return $this->json($data);
    }

    #[Route('/overrides', methods: ['POST'])]
    #[IsGranted('food_pricing.create')]
    public function createOverride(Request $req, ReservationFoodsRepository $foodsRepo): JsonResponse
    {
        $d = json_decode($req->getContent(), true) ?? [];
        foreach (['foodId','dateFrom','price'] as $k) {
            if (!isset($d[$k])) return $this->json(['error' => 'Missing '.$k], 400);
        }
        $food = $foodsRepo->find((int)$d['foodId']);
        if (!$food) return $this->json(['error' => 'Food item not found'], 404);
        $o = new FoodItemPriceOverride();
        $o->setReservationFood($food)
          ->setDateFrom(new \DateTime($d['dateFrom']))
          ->setPrice((string)$d['price'])
          ->setReason($d['reason'] ?? null);
        if (!empty($d['dateTo'])) $o->setDateTo(new \DateTime($d['dateTo']));
        $this->em->persist($o);
        $this->em->flush();
        return $this->json(['status' => 'created', 'id' => $o->getId()], 201);
    }

    #[Route('/overrides/{id}', methods: ['PUT','PATCH'])]
    #[IsGranted('food_pricing.update')]
    public function updateOverride(int $id, Request $req, FoodItemPriceOverrideRepository $repo, ReservationFoodsRepository $foodsRepo): JsonResponse
    {
        $o = $repo->find($id);
        if (!$o) return $this->json(['error' => 'Not found'], 404);
        $d = json_decode($req->getContent(), true) ?? [];
        if (array_key_exists('foodId',$d)) {
            $food = $d['foodId'] ? $foodsRepo->find((int)$d['foodId']) : null;
            if (!$food) return $this->json(['error' => 'Food item not found'], 404);
            $o->setReservationFood($food);
        }
        if (isset($d['dateFrom'])) $o->setDateFrom(new \DateTime($d['dateFrom']));
        if (array_key_exists('dateTo',$d)) $o->setDateTo($d['dateTo'] ? new \DateTime($d['dateTo']) : null);
        if (isset($d['price'])) $o->setPrice((string)$d['price']);
        if (array_key_exists('reason',$d)) $o->setReason($d['reason']);
        $this->em->flush();
        return $this->json(['status' => 'updated']);
    }

    #[Route('/overrides/{id}', methods: ['DELETE'])]
    #[IsGranted('food_pricing.delete')]
    public function deleteOverride(int $id, FoodItemPriceOverrideRepository $repo): JsonResponse
    {
        $o = $repo->find($id);
        if (!$o) return $this->json(['error' => 'Not found'], 404);
        $this->em->remove($o);
        $this->em->flush();
        return $this->json(['status' => 'deleted']);
    }

    // ---------- Availability ----------

    #[Route('/availability', methods: ['GET'])]
    #[IsGranted('food_pricing.read')]
    public function listAvailability(Request $request, FoodItemAvailabilityRepository $repo, ReservationFoodsRepository $foodsRepo): JsonResponse
    {
        $foodId = $request->query->getInt('foodId', 0);
        $criteria = [];
        if ($foodId > 0) {
            $food = $foodsRepo->find($foodId);
            if ($food) { $criteria['reservationFood'] = $food; }
        }
        $items = $repo->findBy($criteria, ['dateFrom' => 'DESC']);
        $data = array_map(function (FoodItemAvailability $a) {
            return [
                'id' => $a->getId(),
                'foodId' => $a->getReservationFood()->getId(),
                'dateFrom' => $a->getDateFrom()->format('Y-m-d'),
                'dateTo' => $a->getDateTo()?->format('Y-m-d'),
                'available' => $a->isAvailable(),
                'reason' => $a->getReason(),
                'createdAt' => $a->getCreatedAt()->format(DATE_ATOM),
                'updatedAt' => $a->getUpdatedAt()->format(DATE_ATOM),
            ];
        }, $items);
        return $this->json($data);
    }

    #[Route('/availability', methods: ['POST'])]
    #[IsGranted('food_pricing.create')]
    public function createAvailability(Request $req, ReservationFoodsRepository $foodsRepo): JsonResponse
    {
        $d = json_decode($req->getContent(), true) ?? [];
        foreach (['foodId','dateFrom','available'] as $k) {
            if (!isset($d[$k])) return $this->json(['error' => 'Missing '.$k], 400);
        }
        $food = $foodsRepo->find((int)$d['foodId']);
        if (!$food) return $this->json(['error' => 'Food item not found'], 404);
        $a = new FoodItemAvailability();
        $a->setReservationFood($food)
          ->setDateFrom(new \DateTime($d['dateFrom']))
          ->setAvailable((bool)$d['available'])
          ->setReason($d['reason'] ?? null);
        if (!empty($d['dateTo'])) $a->setDateTo(new \DateTime($d['dateTo']));
        $this->em->persist($a);
        $this->em->flush();
        return $this->json(['status' => 'created', 'id' => $a->getId()], 201);
    }

    #[Route('/availability/{id}', methods: ['PUT','PATCH'])]
    #[IsGranted('food_pricing.update')]
    public function updateAvailability(int $id, Request $req, FoodItemAvailabilityRepository $repo, ReservationFoodsRepository $foodsRepo): JsonResponse
    {
        $a = $repo->find($id);
        if (!$a) return $this->json(['error' => 'Not found'], 404);
        $d = json_decode($req->getContent(), true) ?? [];
        if (array_key_exists('foodId',$d)) {
            $food = $d['foodId'] ? $foodsRepo->find((int)$d['foodId']) : null;
            if (!$food) return $this->json(['error' => 'Food item not found'], 404);
            $a->setReservationFood($food);
        }
        if (isset($d['dateFrom'])) $a->setDateFrom(new \DateTime($d['dateFrom']));
        if (array_key_exists('dateTo',$d)) $a->setDateTo($d['dateTo'] ? new \DateTime($d['dateTo']) : null);
        if (isset($d['available'])) $a->setAvailable((bool)$d['available']);
        if (array_key_exists('reason',$d)) $a->setReason($d['reason']);
        $this->em->flush();
        return $this->json(['status' => 'updated']);
    }

    #[Route('/availability/{id}', methods: ['DELETE'])]
    #[IsGranted('food_pricing.delete')]
    public function deleteAvailability(int $id, FoodItemAvailabilityRepository $repo): JsonResponse
    {
        $a = $repo->find($id);
        if (!$a) return $this->json(['error' => 'Not found'], 404);
        $this->em->remove($a);
        $this->em->flush();
        return $this->json(['status' => 'deleted']);
    }

    // ---------- Effective price & availability ----------

    #[Route('/effective', methods: ['GET'])]
    #[IsGranted('food_pricing.read')]
    public function effective(Request $req, ReservationFoodsRepository $foodsRepo, FoodItemPriceOverrideRepository $priceRepo, FoodItemAvailabilityRepository $availRepo): JsonResponse
    {
        $foodId = (int)($req->query->get('foodId'));
        $dateStr = $req->query->get('date');
        if (!$foodId || !$dateStr) return $this->json(['error' => 'Missing foodId or date'], 400);
        $food = $foodsRepo->find($foodId);
        if (!$food) return $this->json(['error' => 'Food item not found'], 404);
        $date = new \DateTime($dateStr);
        $defaultPrice = (float)$food->getPrice();

        // Evaluate price override with the latest date_from covering the date
        $overrides = $priceRepo->findBy(['reservationFood' => $food]);
        $effectivePrice = $defaultPrice;
        $bestFrom = null;
        foreach ($overrides as $o) {
            $from = $o->getDateFrom();
            $to = $o->getDateTo();
            $inRange = ($date >= $from) && (null === $to || $date <= $to);
            if ($inRange) {
                if ($bestFrom === null || $from > $bestFrom) {
                    $bestFrom = $from;
                    $effectivePrice = (float)$o->getPrice();
                }
            }
        }

        // Evaluate availability with the latest date_from covering the date
        $availabilityRules = $availRepo->findBy(['reservationFood' => $food]);
        $available = true;
        $bestFrom = null;
        foreach ($availabilityRules as $a) {
            $from = $a->getDateFrom();
            $to = $a->getDateTo();
            $inRange = ($date >= $from) && (null === $to || $date <= $to);
            if ($inRange) {
                if ($bestFrom === null || $from > $bestFrom) {
                    $bestFrom = $from;
                    $available = $a->isAvailable();
                }
            }
        }

        return $this->json([
            'foodId' => $food->getId(),
            'date' => $date->format('Y-m-d'),
            'available' => $available,
            'price' => round($effectivePrice, 2),
            'currency' => 'CZK',
        ]);
    }
}
