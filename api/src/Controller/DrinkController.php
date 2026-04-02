<?php

namespace App\Controller;

use App\Entity\DrinkItem;
use App\Entity\FoodDrinkPairing;
use App\Entity\ReservationFoods;
use App\Repository\DrinkItemRepository;
use App\Repository\FoodDrinkPairingRepository;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Annotation\Route;
use Symfony\Component\Security\Http\Attribute\IsGranted;

#[Route('/api/drinks')]
class DrinkController extends AbstractController
{
    public function __construct(
        private readonly EntityManagerInterface $em,
        private readonly DrinkItemRepository $drinkRepo,
        private readonly FoodDrinkPairingRepository $pairingRepo,
    ) {}

    #[Route('', methods: ['GET'])]
    #[IsGranted('drinks.read')]
    public function list(): JsonResponse
    {
        $items = $this->drinkRepo->findBy([], ['sortOrder' => 'ASC', 'name' => 'ASC']);
        return $this->json(array_map(fn(DrinkItem $d) => $this->serialize($d), $items));
    }

    #[Route('', methods: ['POST'])]
    #[IsGranted('drinks.create')]
    public function create(Request $request): JsonResponse
    {
        $data = json_decode($request->getContent(), true) ?? [];
        if (empty($data['name'])) return $this->json(['error' => 'Název je povinný'], 400);

        $d = new DrinkItem();
        $this->apply($d, $data);
        $this->em->persist($d);
        $this->em->flush();
        return $this->json(['status' => 'created', 'id' => $d->getId()], 201);
    }

    #[Route('/{id}', methods: ['GET'], requirements: ['id' => '\d+'])]
    #[IsGranted('drinks.read')]
    public function get(int $id): JsonResponse
    {
        $d = $this->drinkRepo->find($id);
        if (!$d) return $this->json(['error' => 'Not found'], 404);
        return $this->json($this->serialize($d));
    }

    #[Route('/{id}', methods: ['PUT', 'PATCH'], requirements: ['id' => '\d+'])]
    #[IsGranted('drinks.update')]
    public function update(int $id, Request $request): JsonResponse
    {
        $d = $this->drinkRepo->find($id);
        if (!$d) return $this->json(['error' => 'Not found'], 404);
        $data = json_decode($request->getContent(), true) ?? [];
        $this->apply($d, $data);
        $this->em->flush();
        return $this->json(['status' => 'updated']);
    }

    #[Route('/{id}', methods: ['DELETE'], requirements: ['id' => '\d+'])]
    #[IsGranted('drinks.delete')]
    public function delete(int $id): JsonResponse
    {
        $d = $this->drinkRepo->find($id);
        if (!$d) return $this->json(['error' => 'Not found'], 404);
        $this->em->remove($d);
        $this->em->flush();
        return $this->json(['status' => 'deleted']);
    }

    #[Route('/bulk', methods: ['POST'])]
    #[IsGranted('drinks.update')]
    public function bulk(Request $request): JsonResponse
    {
        $data = json_decode($request->getContent(), true) ?? [];
        $ids = $data['ids'] ?? [];
        $action = $data['action'] ?? null;
        if (empty($ids) || !$action) return $this->json(['error' => 'Missing ids or action'], 400);

        $items = $this->drinkRepo->findBy(['id' => $ids]);
        $count = 0;
        foreach ($items as $d) {
            match ($action) {
                'activate' => $d->setIsActive(true),
                'deactivate' => $d->setIsActive(false),
                'delete' => $this->em->remove($d),
                default => null,
            };
            $count++;
        }
        $this->em->flush();
        return $this->json(['status' => 'ok', 'affected' => $count]);
    }

    // ─── Pairings ────────────────────────────────────────────────────────

    #[Route('/pairings', methods: ['GET'])]
    #[IsGranted('drinks.read')]
    public function listPairings(): JsonResponse
    {
        $pairings = $this->pairingRepo->findAll();
        return $this->json(array_map(fn(FoodDrinkPairing $p) => [
            'id' => $p->getId(),
            'foodId' => $p->getFood()?->getId(),
            'foodName' => $p->getFood()?->getName(),
            'drinkId' => $p->getDrink()?->getId(),
            'drinkName' => $p->getDrink()?->getName(),
            'drinkCategory' => $p->getDrink()?->getCategory(),
            'drinkPrice' => $p->getDrink()?->getPrice(),
            'isDefault' => $p->isDefault(),
            'isIncludedInPrice' => $p->isIncludedInPrice(),
            'surcharge' => $p->getSurcharge(),
        ], $pairings));
    }

    #[Route('/pairings', methods: ['POST'])]
    #[IsGranted('drinks.create')]
    public function createPairing(Request $request): JsonResponse
    {
        $data = json_decode($request->getContent(), true) ?? [];
        $food = $this->em->getRepository(ReservationFoods::class)->find($data['foodId'] ?? 0);
        $drink = $this->drinkRepo->find($data['drinkId'] ?? 0);
        if (!$food || !$drink) return $this->json(['error' => 'Food or drink not found'], 404);

        // Check if pairing already exists
        $existing = $this->pairingRepo->findOneBy(['food' => $food, 'drink' => $drink]);
        if ($existing) return $this->json(['error' => 'Propojení již existuje'], 409);

        $p = new FoodDrinkPairing();
        $p->setFood($food);
        $p->setDrink($drink);
        $p->setIsDefault((bool)($data['isDefault'] ?? false));
        $p->setIsIncludedInPrice((bool)($data['isIncludedInPrice'] ?? false));
        $p->setSurcharge((string)($data['surcharge'] ?? '0.00'));
        $this->em->persist($p);
        $this->em->flush();
        return $this->json(['status' => 'created', 'id' => $p->getId()], 201);
    }

    #[Route('/pairings/{id}', methods: ['DELETE'])]
    #[IsGranted('drinks.delete')]
    public function deletePairing(int $id): JsonResponse
    {
        $p = $this->pairingRepo->find($id);
        if (!$p) return $this->json(['error' => 'Not found'], 404);
        $this->em->remove($p);
        $this->em->flush();
        return $this->json(['status' => 'deleted']);
    }

    #[Route('/for-food/{foodId}', methods: ['GET'])]
    #[IsGranted('drinks.read')]
    public function drinksForFood(int $foodId): JsonResponse
    {
        $food = $this->em->getRepository(ReservationFoods::class)->find($foodId);
        if (!$food) return $this->json(['error' => 'Food not found'], 404);

        $pairings = $this->pairingRepo->findBy(['food' => $food]);
        return $this->json(array_map(fn(FoodDrinkPairing $p) => [
            'id' => $p->getDrink()?->getId(),
            'name' => $p->getDrink()?->getName(),
            'category' => $p->getDrink()?->getCategory(),
            'price' => $p->getDrink()?->getPrice(),
            'isDefault' => $p->isDefault(),
            'isIncludedInPrice' => $p->isIncludedInPrice(),
            'surcharge' => $p->getSurcharge(),
        ], $pairings));
    }

    // ─── Helpers ─────────────────────────────────────────────────────────

    private function apply(DrinkItem $d, array $data): void
    {
        if (isset($data['name'])) $d->setName($data['name']);
        if (isset($data['category'])) $d->setCategory($data['category']);
        if (isset($data['price'])) $d->setPrice((string)$data['price']);
        if (isset($data['isAlcoholic'])) $d->setIsAlcoholic((bool)$data['isAlcoholic']);
        if (isset($data['isActive'])) $d->setIsActive((bool)$data['isActive']);
        if (array_key_exists('description', $data)) $d->setDescription($data['description']);
        if (isset($data['sortOrder'])) $d->setSortOrder((int)$data['sortOrder']);
    }

    private function serialize(DrinkItem $d): array
    {
        return [
            'id' => $d->getId(),
            'name' => $d->getName(),
            'category' => $d->getCategory(),
            'price' => $d->getPrice(),
            'isAlcoholic' => $d->isAlcoholic(),
            'isActive' => $d->isActive(),
            'description' => $d->getDescription(),
            'sortOrder' => $d->getSortOrder(),
            'createdAt' => $d->getCreatedAt()->format('c'),
            'updatedAt' => $d->getUpdatedAt()->format('c'),
        ];
    }
}
