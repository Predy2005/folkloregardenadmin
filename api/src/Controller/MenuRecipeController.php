<?php

declare(strict_types=1);

namespace App\Controller;

use App\Entity\MenuRecipe;
use App\Entity\Recipe;
use App\Entity\ReservationFoods;
use App\Repository\MenuRecipeRepository;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Annotation\Route;
use Symfony\Component\Security\Http\Attribute\IsGranted;

#[Route('/api/menu-recipes')]
class MenuRecipeController extends AbstractController
{
    public function __construct(
        private readonly EntityManagerInterface $em,
        private readonly MenuRecipeRepository $menuRecipeRepo,
    ) {
    }

    /**
     * GET /api/menu-recipes?reservationFoodId={id}
     * GET /api/menu-recipes?all=1  (returns all, for recipe page)
     */
    #[Route('', name: 'menu_recipes_list', methods: ['GET'])]
    #[IsGranted('foods.read')]
    public function list(Request $request): JsonResponse
    {
        $foodId = $request->query->getInt('reservationFoodId');
        $all = $request->query->getBoolean('all');

        if ($all) {
            $menuRecipes = $this->menuRecipeRepo->findAll();
            return $this->json(array_map([$this, 'normalize'], $menuRecipes));
        }

        if (!$foodId) {
            return $this->json(['error' => 'reservationFoodId is required'], 400);
        }

        $menuRecipes = $this->menuRecipeRepo->findByFoodId($foodId);

        return $this->json(array_map([$this, 'normalize'], $menuRecipes));
    }

    /**
     * POST /api/menu-recipes
     */
    #[Route('', name: 'menu_recipes_create', methods: ['POST'])]
    #[IsGranted('foods.create')]
    public function create(Request $request): JsonResponse
    {
        $data = json_decode($request->getContent(), true);

        $food = $this->em->getRepository(ReservationFoods::class)->find($data['reservationFoodId'] ?? 0);
        $recipe = $this->em->getRepository(Recipe::class)->find($data['recipeId'] ?? 0);

        if (!$food || !$recipe) {
            return $this->json(['error' => 'ReservationFood or Recipe not found'], 404);
        }

        // Check for duplicate
        $existing = $this->menuRecipeRepo->findOneBy([
            'reservationFood' => $food,
            'recipe' => $recipe,
        ]);
        if ($existing) {
            return $this->json(['error' => 'This recipe is already linked to this menu'], 409);
        }

        $mr = new MenuRecipe();
        $mr->setReservationFood($food);
        $mr->setRecipe($recipe);

        if (isset($data['portionsPerServing'])) {
            $mr->setPortionsPerServing((string) $data['portionsPerServing']);
        }
        if (isset($data['courseType'])) {
            $mr->setCourseType($data['courseType']);
        }

        $this->em->persist($mr);
        $this->em->flush();

        return $this->json($this->normalize($mr), 201);
    }

    /**
     * PUT /api/menu-recipes/{id}
     */
    #[Route('/{id}', name: 'menu_recipes_update', methods: ['PUT'])]
    #[IsGranted('foods.update')]
    public function update(int $id, Request $request): JsonResponse
    {
        $mr = $this->menuRecipeRepo->find($id);
        if (!$mr) {
            return $this->json(['error' => 'MenuRecipe not found'], 404);
        }

        $data = json_decode($request->getContent(), true);

        if (isset($data['portionsPerServing'])) {
            $mr->setPortionsPerServing((string) $data['portionsPerServing']);
        }
        if (array_key_exists('courseType', $data)) {
            $mr->setCourseType($data['courseType']);
        }

        $this->em->flush();

        return $this->json($this->normalize($mr));
    }

    /**
     * DELETE /api/menu-recipes/{id}
     */
    #[Route('/{id}', name: 'menu_recipes_delete', methods: ['DELETE'])]
    #[IsGranted('foods.delete')]
    public function delete(int $id): JsonResponse
    {
        $mr = $this->menuRecipeRepo->find($id);
        if (!$mr) {
            return $this->json(['error' => 'MenuRecipe not found'], 404);
        }

        $this->em->remove($mr);
        $this->em->flush();

        return $this->json(['success' => true]);
    }

    /**
     * POST /api/menu-recipes/bulk
     * Body: { reservationFoodId: number, recipes: [{recipeId, portionsPerServing?, courseType?}] }
     */
    #[Route('/bulk', name: 'menu_recipes_bulk', methods: ['POST'])]
    #[IsGranted('foods.create')]
    public function bulk(Request $request): JsonResponse
    {
        $data = json_decode($request->getContent(), true);
        $foodId = $data['reservationFoodId'] ?? 0;
        $recipes = $data['recipes'] ?? [];

        $food = $this->em->getRepository(ReservationFoods::class)->find($foodId);
        if (!$food) {
            return $this->json(['error' => 'ReservationFood not found'], 404);
        }

        $created = [];
        foreach ($recipes as $recipeData) {
            $recipe = $this->em->getRepository(Recipe::class)->find($recipeData['recipeId'] ?? 0);
            if (!$recipe) {
                continue;
            }

            $existing = $this->menuRecipeRepo->findOneBy([
                'reservationFood' => $food,
                'recipe' => $recipe,
            ]);
            if ($existing) {
                continue;
            }

            $mr = new MenuRecipe();
            $mr->setReservationFood($food);
            $mr->setRecipe($recipe);

            if (isset($recipeData['portionsPerServing'])) {
                $mr->setPortionsPerServing((string) $recipeData['portionsPerServing']);
            }
            if (isset($recipeData['courseType'])) {
                $mr->setCourseType($recipeData['courseType']);
            }

            $this->em->persist($mr);
            $created[] = $mr;
        }

        $this->em->flush();

        return $this->json(array_map([$this, 'normalize'], $created), 201);
    }

    private function normalize(MenuRecipe $mr): array
    {
        $recipe = $mr->getRecipe();
        $food = $mr->getReservationFood();

        return [
            'id' => $mr->getId(),
            'reservationFoodId' => $food?->getId(),
            'recipeId' => $recipe?->getId(),
            'portionsPerServing' => (float) $mr->getPortionsPerServing(),
            'courseType' => $mr->getCourseType(),
            'createdAt' => $mr->getCreatedAt()->format(\DateTimeInterface::ATOM),
            'recipe' => $recipe ? [
                'id' => $recipe->getId(),
                'name' => $recipe->getName(),
                'description' => $recipe->getDescription(),
                'portions' => $recipe->getPortions(),
            ] : null,
            'reservationFood' => $food ? [
                'id' => $food->getId(),
                'name' => $food->getName(),
            ] : null,
        ];
    }
}
