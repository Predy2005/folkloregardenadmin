<?php
declare(strict_types=1);

namespace App\Controller;

use App\Entity\CashMovementCategory;
use App\Repository\CashMovementCategoryRepository;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Http\Attribute\IsGranted;

#[Route('/api/cash-movement-categories')]
class CashMovementCategoryController extends AbstractController
{
    public function __construct(
        private EntityManagerInterface $em,
        private CashMovementCategoryRepository $categoryRepo,
    ) {}

    #[Route('', name: 'cash_movement_categories_list', methods: ['GET'])]
    #[IsGranted('cashbox.read')]
    public function list(Request $request): JsonResponse
    {
        $type = $request->query->get('type');
        $categories = $this->categoryRepo->findAllByPopularity($type);

        return $this->json(array_map(fn(CashMovementCategory $c) => $this->serialize($c), $categories));
    }

    #[Route('/autocomplete', name: 'cash_movement_categories_autocomplete', methods: ['GET'])]
    #[IsGranted('cashbox.read')]
    public function autocomplete(Request $request): JsonResponse
    {
        $query = $request->query->get('q', '');
        $type = $request->query->get('type');
        $limit = (int) $request->query->get('limit', 15);

        if (strlen($query) < 1) {
            // Return popular categories when no search term
            $categories = $this->categoryRepo->findAllByPopularity($type);
            $categories = array_slice($categories, 0, $limit);
        } else {
            $categories = $this->categoryRepo->findByPrefix($query, $type, $limit);
        }

        return $this->json(array_map(fn(CashMovementCategory $c) => [
            'id' => $c->getId(),
            'name' => $c->getName(),
            'type' => $c->getType(),
            'usageCount' => $c->getUsageCount(),
        ], $categories));
    }

    #[Route('', name: 'cash_movement_categories_create', methods: ['POST'])]
    #[IsGranted('cashbox.read')]
    public function create(Request $request): JsonResponse
    {
        $data = json_decode($request->getContent(), true);
        $name = trim($data['name'] ?? '');
        $type = $data['type'] ?? 'BOTH';

        if (empty($name)) {
            return $this->json(['error' => 'Název kategorie je povinný'], 400);
        }

        if (!in_array($type, ['INCOME', 'EXPENSE', 'BOTH'], true)) {
            return $this->json(['error' => 'Neplatný typ kategorie'], 400);
        }

        $category = $this->categoryRepo->findOrCreate($name, $type);
        $this->em->persist($category);
        $this->em->flush();

        return $this->json($this->serialize($category), 201);
    }

    #[Route('/{id}', name: 'cash_movement_categories_update', methods: ['PUT'])]
    #[IsGranted('cashbox.update')]
    public function update(int $id, Request $request): JsonResponse
    {
        $category = $this->categoryRepo->find($id);
        if (!$category) {
            return $this->json(['error' => 'Kategorie nenalezena'], 404);
        }

        $data = json_decode($request->getContent(), true);

        if (isset($data['name'])) {
            $name = trim($data['name']);
            if (empty($name)) {
                return $this->json(['error' => 'Název kategorie je povinný'], 400);
            }
            // Check uniqueness
            $existing = $this->categoryRepo->findOneBy(['name' => $name]);
            if ($existing && $existing->getId() !== $category->getId()) {
                return $this->json(['error' => 'Kategorie s tímto názvem již existuje'], 409);
            }
            $category->setName($name);
        }

        if (isset($data['type']) && in_array($data['type'], ['INCOME', 'EXPENSE', 'BOTH'], true)) {
            $category->setType($data['type']);
        }

        $this->em->flush();

        return $this->json($this->serialize($category));
    }

    #[Route('/{id}', name: 'cash_movement_categories_delete', methods: ['DELETE'])]
    #[IsGranted('cashbox.update')]
    public function delete(int $id): JsonResponse
    {
        $category = $this->categoryRepo->find($id);
        if (!$category) {
            return $this->json(['error' => 'Kategorie nenalezena'], 404);
        }

        $this->em->remove($category);
        $this->em->flush();

        return $this->json(['status' => 'deleted']);
    }

    private function serialize(CashMovementCategory $c): array
    {
        return [
            'id' => $c->getId(),
            'name' => $c->getName(),
            'type' => $c->getType(),
            'usageCount' => $c->getUsageCount(),
            'createdAt' => $c->getCreatedAt()->format('Y-m-d H:i:s'),
            'lastUsedAt' => $c->getLastUsedAt()->format('Y-m-d H:i:s'),
        ];
    }
}
