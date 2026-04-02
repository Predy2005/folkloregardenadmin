<?php
namespace App\Controller;

use App\Entity\Recipe;
use App\Entity\RecipeIngredient;
use App\Repository\RecipeRepository;
use App\Repository\RecipeIngredientRepository;
use App\Repository\ReservationFoodsRepository;
use App\Repository\StockItemRepository;
use App\Service\RecipeImportService;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Annotation\Route;
use Symfony\Component\Security\Http\Attribute\IsGranted;

#[Route('/api/recipes')]
class RecipeController extends AbstractController
{
    public function __construct(
        private readonly RecipeImportService $importService,
    ) {
    }

    #[Route('', methods: ['GET'])]
    #[IsGranted('recipes.read')]
    public function list(RecipeRepository $repo): JsonResponse
    {
        $recipes = $repo->findAll();

        $data = array_map(fn(Recipe $r) => $this->serializeRecipe($r), $recipes);

        return $this->json($data);
    }

    #[Route('/bulk-delete', methods: ['DELETE'])]
    #[IsGranted('ROLE_SUPER_ADMIN')]
    public function bulkDelete(Request $request, RecipeRepository $repo, EntityManagerInterface $em): JsonResponse
    {
        $data = json_decode($request->getContent(), true) ?? [];
        $ids = $data['ids'] ?? [];
        if (!is_array($ids) || count($ids) === 0) {
            return $this->json(['error' => 'No IDs provided'], 400);
        }

        $count = 0;
        foreach ($ids as $id) {
            $recipe = $repo->find((int)$id);
            if ($recipe) {
                $em->remove($recipe);
                $count++;
            }
        }
        $em->flush();

        return $this->json(['status' => 'deleted', 'count' => $count]);
    }

    #[Route('/{id}', methods: ['GET'], requirements: ['id' => '\d+'])]
    #[IsGranted('recipes.read')]
    public function show(int $id, RecipeRepository $repo): JsonResponse
    {
        $recipe = $repo->find($id);
        if (!$recipe) { return $this->json(['error' => 'Not found'], 404); }
        return $this->json($this->serializeRecipe($recipe));
    }

    #[Route('', methods: ['POST'])]
    #[IsGranted('recipes.create')]
    public function create(
        Request $request,
        EntityManagerInterface $em,
        ReservationFoodsRepository $foodsRepo,
        StockItemRepository $stockRepo
    ): JsonResponse {
        $data = json_decode($request->getContent(), true) ?? [];
        $recipe = new Recipe();
        $recipe->setName($data['name'] ?? '');
        $recipe->setDescription($data['description'] ?? null);
        $recipe->setPortions((int)($data['portions'] ?? 1));
        if (array_key_exists('portionWeight', $data)) {
            $recipe->setPortionWeight($data['portionWeight'] !== null ? (string)$data['portionWeight'] : null);
        }
        if (!empty($data['reservationFoodId'])) {
            $food = $foodsRepo->find((int)$data['reservationFoodId']);
            if ($food) { $recipe->setReservationFood($food); }
        }

        // Ingredients array
        $ingredients = $data['ingredients'] ?? [];
        foreach ($ingredients as $row) {
            if (!isset($row['quantityRequired'])) { continue; }
            $stock = null;
            if (!empty($row['stockItemId'])) {
                $stock = $stockRepo->find((int)$row['stockItemId']);
            }
            if (!$stock && !empty($row['stockItemName'])) {
                $stock = new \App\Entity\StockItem();
                $stock->setName($row['stockItemName']);
                $stock->setUnit('kg');
                $stock->setQuantityAvailable('0.00');
                $em->persist($stock);
            }
            if (!$stock) { continue; }
            $ing = new RecipeIngredient();
            $ing->setStockItem($stock);
            $ing->setQuantityRequired((string)$row['quantityRequired']);
            $recipe->addIngredient($ing);
            $em->persist($ing);
        }

        $em->persist($recipe);
        $em->flush();

        return $this->json($this->serializeRecipe($recipe), 201);
    }

    #[Route('/import', methods: ['POST'])]
    #[IsGranted('recipes.create')]
    public function import(Request $request): JsonResponse
    {
        $file = $request->files->get('file');
        if (!$file) {
            return $this->json(['error' => 'Soubor nebyl nahrán'], 400);
        }

        $ext = strtolower($file->getClientOriginalExtension());
        if (!in_array($ext, ['xlsx', 'xls'], true)) {
            return $this->json(['error' => 'Podporované formáty: .xlsx, .xls'], 400);
        }

        try {
            $result = $this->importService->importFromFile($file->getPathname());
        } catch (\Throwable $e) {
            return $this->json([
                'error' => 'Chyba při importu: ' . $e->getMessage(),
            ], 500);
        }

        return $this->json($result);
    }

    #[Route('/{id}', methods: ['PUT','PATCH'])]
    #[IsGranted('recipes.update')]
    public function update(
        int $id,
        Request $request,
        RecipeRepository $repo,
        EntityManagerInterface $em,
        ReservationFoodsRepository $foodsRepo,
        StockItemRepository $stockRepo
    ): JsonResponse {
        $recipe = $repo->find($id);
        if (!$recipe) { return $this->json(['error' => 'Not found'], 404); }
        $data = json_decode($request->getContent(), true) ?? [];
        if (isset($data['name'])) $recipe->setName($data['name']);
        if (array_key_exists('description', $data)) $recipe->setDescription($data['description']);
        if (isset($data['portions'])) $recipe->setPortions((int)$data['portions']);
        if (array_key_exists('portionWeight', $data)) {
            $recipe->setPortionWeight($data['portionWeight'] !== null ? (string)$data['portionWeight'] : null);
        }
        if (array_key_exists('reservationFoodId', $data)) {
            $food = $data['reservationFoodId'] ? $foodsRepo->find((int)$data['reservationFoodId']) : null;
            $recipe->setReservationFood($food);
        }
        // Optionally replace ingredients if provided
        if (isset($data['ingredients']) && is_array($data['ingredients'])) {
            foreach ($recipe->getIngredients() as $existing) { $em->remove($existing); }
            $recipe->getIngredients()->clear();
            foreach ($data['ingredients'] as $row) {
                if (!isset($row['quantityRequired'])) { continue; }
                $stock = null;
                if (!empty($row['stockItemId'])) {
                    $stock = $stockRepo->find((int)$row['stockItemId']);
                }
                if (!$stock && !empty($row['stockItemName'])) {
                    $stock = new \App\Entity\StockItem();
                    $stock->setName($row['stockItemName']);
                    $stock->setUnit('kg');
                    $stock->setQuantityAvailable('0.00');
                    $em->persist($stock);
                }
                if (!$stock) { continue; }
                $ing = new RecipeIngredient();
                $ing->setStockItem($stock);
                $ing->setQuantityRequired((string)$row['quantityRequired']);
                $recipe->addIngredient($ing);
                $em->persist($ing);
            }
        }
        $em->flush();
        return $this->json($this->serializeRecipe($recipe));
    }

    #[Route('/{id}', methods: ['DELETE'])]
    #[IsGranted('recipes.delete')]
    public function delete(int $id, RecipeRepository $repo, EntityManagerInterface $em): JsonResponse
    {
        $recipe = $repo->find($id);
        if (!$recipe) { return $this->json(['error' => 'Not found'], 404); }
        $em->remove($recipe);
        $em->flush();
        return $this->json(['status' => 'deleted']);
    }

    private function serializeRecipe(Recipe $r): array
    {
        $ingredients = [];
        foreach ($r->getIngredients() as $ing) {
            $stockItem = $ing->getStockItem();
            $ingredients[] = [
                'id' => $ing->getId(),
                'recipeId' => $r->getId(),
                'stockItemId' => $stockItem?->getId(),
                'quantityRequired' => $ing->getQuantityRequired(),
                'stockItem' => $stockItem ? [
                    'id' => $stockItem->getId(),
                    'name' => $stockItem->getName(),
                    'unit' => $stockItem->getUnit(),
                    'pricePerUnit' => $stockItem->getPricePerUnit(),
                    'supplier' => $stockItem->getSupplier(),
                ] : null,
            ];
        }

        return [
            'id' => $r->getId(),
            'name' => $r->getName(),
            'description' => $r->getDescription(),
            'portions' => $r->getPortions(),
            'portionWeight' => $r->getPortionWeight() !== null ? (float) $r->getPortionWeight() : null,
            'reservationFoodId' => $r->getReservationFood()?->getId(),
            'ingredients' => $ingredients,
            'createdAt' => $r->getCreatedAt()->format(DATE_ATOM),
            'updatedAt' => $r->getUpdatedAt()->format(DATE_ATOM),
        ];
    }
}
