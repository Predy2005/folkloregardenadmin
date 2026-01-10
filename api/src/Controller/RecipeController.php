<?php
namespace App\Controller;

use App\Entity\Recipe;
use App\Entity\RecipeIngredient;
use App\Repository\RecipeRepository;
use App\Repository\RecipeIngredientRepository;
use App\Repository\ReservationFoodsRepository;
use App\Repository\StockItemRepository;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Annotation\Route;
use Symfony\Component\Security\Http\Attribute\IsGranted;

#[Route('/api/recipes')]
class RecipeController extends AbstractController
{
    #[Route('', methods: ['GET'])]
    #[IsGranted('recipes.read')]
    public function list(RecipeRepository $repo): JsonResponse
    {
        return $this->json($repo->findAll());
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
        if (!empty($data['reservationFoodId'])) {
            $food = $foodsRepo->find((int)$data['reservationFoodId']);
            if ($food) { $recipe->setReservationFood($food); }
        }

        // Ingredients array
        $ingredients = $data['ingredients'] ?? [];
        foreach ($ingredients as $row) {
            if (empty($row['stockItemId']) || !isset($row['quantityRequired'])) { continue; }
            $stock = $stockRepo->find((int)$row['stockItemId']);
            if (!$stock) { continue; }
            $ing = new RecipeIngredient();
            $ing->setStockItem($stock);
            $ing->setQuantityRequired((string)$row['quantityRequired']);
            $recipe->addIngredient($ing);
            $em->persist($ing);
        }

        $em->persist($recipe);
        $em->flush();

        return $this->json(['status' => 'created', 'id' => $recipe->getId()], 201);
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
        if (array_key_exists('reservationFoodId', $data)) {
            $food = $data['reservationFoodId'] ? $foodsRepo->find((int)$data['reservationFoodId']) : null;
            $recipe->setReservationFood($food);
        }
        // Optionally replace ingredients if provided
        if (isset($data['ingredients']) && is_array($data['ingredients'])) {
            foreach ($recipe->getIngredients() as $existing) { $em->remove($existing); }
            $recipe->getIngredients()->clear();
            foreach ($data['ingredients'] as $row) {
                if (empty($row['stockItemId']) || !isset($row['quantityRequired'])) { continue; }
                $stock = $stockRepo->find((int)$row['stockItemId']);
                if (!$stock) { continue; }
                $ing = new RecipeIngredient();
                $ing->setStockItem($stock);
                $ing->setQuantityRequired((string)$row['quantityRequired']);
                $recipe->addIngredient($ing);
                $em->persist($ing);
            }
        }
        $em->flush();
        return $this->json(['status' => 'updated']);
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
}
