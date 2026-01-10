<?php

namespace App\Controller;

use App\Entity\StaffingFormula;
use App\Repository\StaffingFormulaRepository;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Annotation\Route;
use Symfony\Component\Security\Http\Attribute\IsGranted;

#[Route('/api/staffing-formulas')]
class StaffingFormulaController extends AbstractController
{
    public function __construct(private readonly EntityManagerInterface $em)
    {
    }

    #[Route('', name: 'staffing_formula_list', methods: ['GET'])]
    #[IsGranted('staffing_formulas.read')]
    public function list(Request $request, StaffingFormulaRepository $repo): JsonResponse
    {
        $enabled = $request->query->get('enabled');
        $category = $request->query->get('category');

        $criteria = [];
        if ($enabled !== null) {
            $criteria['enabled'] = filter_var($enabled, FILTER_VALIDATE_BOOLEAN);
        }
        if ($category !== null) {
            $criteria['category'] = (string)$category;
        }

        $items = empty($criteria) ? $repo->findBy([], ['category' => 'ASC']) : $repo->findBy($criteria, ['category' => 'ASC']);

        $data = array_map(fn(StaffingFormula $f) => $this->toArray($f), $items);
        return $this->json($data);
    }

    #[Route('', name: 'staffing_formula_create', methods: ['POST'])]
    #[IsGranted('staffing_formulas.create')]
    public function create(Request $request): JsonResponse
    {
        $data = json_decode($request->getContent(), true) ?? [];
        if (!isset($data['category'], $data['ratio'])) {
            return $this->json(['error' => 'Missing required fields: category, ratio'], 400);
        }
        $ratio = (int)$data['ratio'];
        if ($ratio <= 0) {
            return $this->json(['error' => 'ratio must be > 0'], 400);
        }

        $item = new StaffingFormula();
        $item->setCategory((string)$data['category'])
            ->setRatio($ratio)
            ->setEnabled(isset($data['enabled']) ? (bool)$data['enabled'] : true)
            ->setDescription($data['description'] ?? null);

        $this->em->persist($item);
        $this->em->flush();

        return $this->json(['status' => 'created', 'id' => $item->getId()], 201);
    }

    #[Route('/{id}', name: 'staffing_formula_detail', methods: ['GET'])]
    #[IsGranted('staffing_formulas.read')]
    public function detail(int $id, StaffingFormulaRepository $repo): JsonResponse
    {
        $item = $repo->find($id);
        if (!$item) {
            return $this->json(['error' => 'Not found'], 404);
        }
        return $this->json($this->toArray($item));
    }

    #[Route('/{id}', name: 'staffing_formula_update', methods: ['PUT', 'PATCH'])]
    #[IsGranted('staffing_formulas.update')]
    public function update(int $id, Request $request, StaffingFormulaRepository $repo): JsonResponse
    {
        $item = $repo->find($id);
        if (!$item) {
            return $this->json(['error' => 'Not found'], 404);
        }

        $data = json_decode($request->getContent(), true) ?? [];
        if (isset($data['category'])) {
            $item->setCategory((string)$data['category']);
        }
        if (isset($data['ratio'])) {
            $ratio = (int)$data['ratio'];
            if ($ratio <= 0) {
                return $this->json(['error' => 'ratio must be > 0'], 400);
            }
            $item->setRatio($ratio);
        }
        if (isset($data['enabled'])) {
            $item->setEnabled((bool)$data['enabled']);
        }
        if (array_key_exists('description', $data)) {
            $item->setDescription($data['description']);
        }

        $this->em->flush();
        return $this->json(['status' => 'updated']);
    }

    #[Route('/{id}', name: 'staffing_formula_delete', methods: ['DELETE'])]
    #[IsGranted('staffing_formulas.delete')]
    public function delete(int $id, StaffingFormulaRepository $repo): JsonResponse
    {
        $item = $repo->find($id);
        if (!$item) {
            return $this->json(['error' => 'Not found'], 404);
        }
        $this->em->remove($item);
        $this->em->flush();
        return $this->json(['status' => 'deleted']);
    }

    #[Route('/recommendation', name: 'staffing_formula_recommendation', methods: ['GET'])]
    #[IsGranted('staffing_formulas.read')]
    public function recommendByGuests(Request $request, StaffingFormulaRepository $repo): JsonResponse
    {
        $guests = (int)($request->query->get('guests') ?? 0);
        if ($guests <= 0) {
            return $this->json(['error' => 'Query param guests must be a positive integer'], 400);
        }
        $enabled = $repo->findEnabled();
        $result = [];
        $total = 0;
        foreach ($enabled as $f) {
            $required = (int)ceil($guests / max(1, $f->getRatio()));
            $result[] = [
                'category' => $f->getCategory(),
                'ratio' => $f->getRatio(),
                'enabled' => $f->isEnabled(),
                'required' => $required,
            ];
            $total += $required;
        }
        return $this->json([
            'guests' => $guests,
            'totalRequired' => $total,
            'byCategory' => $result,
        ]);
    }

    private function toArray(StaffingFormula $f): array
    {
        return [
            'id' => $f->getId(),
            'category' => $f->getCategory(),
            'ratio' => $f->getRatio(),
            'enabled' => $f->isEnabled(),
            'description' => $f->getDescription(),
            'createdAt' => $f->getCreatedAt()->format(DATE_ATOM),
            'updatedAt' => $f->getUpdatedAt()->format(DATE_ATOM),
        ];
    }
}
