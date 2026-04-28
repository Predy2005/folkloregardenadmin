<?php
declare(strict_types=1);

namespace App\Controller;

use App\Entity\PartnerCategory;
use App\Repository\PartnerCategoryRepository;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Annotation\Route;
use Symfony\Component\Security\Http\Attribute\IsGranted;

/**
 * CRUD na kategorie partnerů (číselník — Cestovní kancelář, Průvodce, Hotel,
 * Ostatní, …). Slug se generuje z názvu, ale jde i ručně přebít.
 */
#[Route('/api/partner-categories')]
class PartnerCategoryController extends AbstractController
{
    public function __construct(
        private readonly PartnerCategoryRepository $repo,
        private readonly EntityManagerInterface $em,
    ) {}

    #[Route('', methods: ['GET'])]
    #[IsGranted('IS_AUTHENTICATED_FULLY')]
    public function list(Request $request): JsonResponse
    {
        $activeOnly = $request->query->getBoolean('activeOnly', false);
        return $this->json(array_map(fn(PartnerCategory $c) => $this->serialize($c), $this->repo->findOrdered($activeOnly)));
    }

    #[Route('', methods: ['POST'])]
    #[IsGranted('partners.update')]
    public function create(Request $request): JsonResponse
    {
        $data = json_decode($request->getContent(), true) ?? [];
        $name = trim((string)($data['name'] ?? ''));
        if ($name === '') {
            return $this->json(['error' => 'Název je povinný'], Response::HTTP_BAD_REQUEST);
        }
        $slug = $this->normalizeSlug((string)($data['slug'] ?? ''), $name);

        if ($this->repo->findOneBy(['slug' => $slug])) {
            return $this->json(['error' => "Kategorie se slug '$slug' už existuje"], Response::HTTP_CONFLICT);
        }

        $c = new PartnerCategory();
        $c->setName($name);
        $c->setSlug($slug);
        $c->setDisplayOrder((int)($data['displayOrder'] ?? 0));
        $c->setIsActive((bool)($data['isActive'] ?? true));
        $this->em->persist($c);
        $this->em->flush();

        return $this->json($this->serialize($c), Response::HTTP_CREATED);
    }

    #[Route('/{id}', methods: ['PUT', 'PATCH'], requirements: ['id' => '\d+'])]
    #[IsGranted('partners.update')]
    public function update(int $id, Request $request): JsonResponse
    {
        $c = $this->repo->find($id);
        if (!$c) return $this->json(['error' => 'Nenalezeno'], Response::HTTP_NOT_FOUND);

        $data = json_decode($request->getContent(), true) ?? [];
        if (array_key_exists('name', $data)) {
            $name = trim((string)$data['name']);
            if ($name !== '') $c->setName($name);
        }
        if (array_key_exists('slug', $data)) {
            $slug = $this->normalizeSlug((string)$data['slug'], $c->getName());
            $existing = $this->repo->findOneBy(['slug' => $slug]);
            if ($existing && $existing->getId() !== $c->getId()) {
                return $this->json(['error' => "Slug '$slug' už používá jiná kategorie"], Response::HTTP_CONFLICT);
            }
            $c->setSlug($slug);
        }
        if (array_key_exists('displayOrder', $data)) $c->setDisplayOrder((int)$data['displayOrder']);
        if (array_key_exists('isActive', $data)) $c->setIsActive((bool)$data['isActive']);

        $this->em->flush();
        return $this->json($this->serialize($c));
    }

    #[Route('/{id}', methods: ['DELETE'], requirements: ['id' => '\d+'])]
    #[IsGranted('partners.update')]
    public function delete(int $id): JsonResponse
    {
        $c = $this->repo->find($id);
        if (!$c) return $this->json(['status' => 'gone']);
        $this->em->remove($c);
        $this->em->flush();
        // Partneři se slug-em této kategorie nezmizí — jen jejich badge přestane být v dropdownu.
        return $this->json(['status' => 'deleted']);
    }

    private function serialize(PartnerCategory $c): array
    {
        return [
            'id' => $c->getId(),
            'name' => $c->getName(),
            'slug' => $c->getSlug(),
            'displayOrder' => $c->getDisplayOrder(),
            'isActive' => $c->isActive(),
            'createdAt' => $c->getCreatedAt()->format(\DateTimeInterface::ATOM),
        ];
    }

    private function normalizeSlug(string $slugInput, string $nameFallback): string
    {
        $raw = $slugInput !== '' ? $slugInput : $nameFallback;
        // Diakritika pryč, mezery → underscore, jen alfanumerika + underscore, uppercase.
        $ascii = iconv('UTF-8', 'ASCII//TRANSLIT//IGNORE', $raw) ?: $raw;
        $clean = preg_replace('/[^A-Za-z0-9]+/', '_', $ascii) ?? '';
        $clean = trim($clean, '_');
        return strtoupper($clean !== '' ? $clean : 'CATEGORY');
    }
}
