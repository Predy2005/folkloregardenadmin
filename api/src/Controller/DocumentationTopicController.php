<?php

declare(strict_types=1);

namespace App\Controller;

use App\Entity\DocumentationTopic;
use App\Repository\DocumentationTopicRepository;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Annotation\Route;
use Symfony\Component\Security\Http\Attribute\IsGranted;

#[Route('/api/documentation-topics')]
#[IsGranted('ROLE_ADMIN')]
class DocumentationTopicController extends AbstractController
{
    #[Route('', methods: ['GET'])]
    public function list(DocumentationTopicRepository $repo): JsonResponse
    {
        $items = $repo->findBy([], ['category' => 'ASC', 'title' => 'ASC']);
        return $this->json(array_map([$this, 'toArray'], $items));
    }

    #[Route('/{id}', methods: ['GET'], requirements: ['id' => '\d+'])]
    public function detail(DocumentationTopic $topic): JsonResponse
    {
        return $this->json($this->toArray($topic));
    }

    #[Route('', methods: ['POST'])]
    public function create(Request $request, EntityManagerInterface $em, DocumentationTopicRepository $repo): JsonResponse
    {
        $data = json_decode($request->getContent(), true) ?? [];
        $slug = self::slug((string)($data['slug'] ?? $data['title'] ?? ''));
        if ($slug === '') {
            return $this->json(['error' => 'slug/title je povinný'], 400);
        }
        if ($repo->findBySlug($slug)) {
            return $this->json(['error' => 'Slug už existuje'], 409);
        }
        $t = new DocumentationTopic();
        $this->hydrate($t, $data, $slug);
        $em->persist($t);
        $em->flush();
        return $this->json($this->toArray($t), 201);
    }

    #[Route('/{id}', methods: ['PUT', 'PATCH'], requirements: ['id' => '\d+'])]
    public function update(DocumentationTopic $topic, Request $request, EntityManagerInterface $em): JsonResponse
    {
        $data = json_decode($request->getContent(), true) ?? [];
        $this->hydrate($topic, $data, $topic->getSlug());
        $em->flush();
        return $this->json($this->toArray($topic));
    }

    #[Route('/{id}', methods: ['DELETE'], requirements: ['id' => '\d+'])]
    public function delete(DocumentationTopic $topic, EntityManagerInterface $em): JsonResponse
    {
        $em->remove($topic);
        $em->flush();
        return $this->json(['status' => 'deleted']);
    }

    private function hydrate(DocumentationTopic $t, array $data, string $slug): void
    {
        $t->setSlug($slug);
        $t->setTitle((string)($data['title'] ?? $t->getId() ? $t->getTitle() : 'Bez názvu'));
        $t->setCategory((string)($data['category'] ?? 'general'));
        $t->setContent((string)($data['content'] ?? ''));
        $t->setKeywords(array_values(array_filter(array_map('strval', (array)($data['keywords'] ?? [])))));
        $t->setRelatedRoutes(array_values(array_filter(array_map('strval', (array)($data['relatedRoutes'] ?? [])))));
    }

    private function toArray(DocumentationTopic $t): array
    {
        return [
            'id' => $t->getId(),
            'slug' => $t->getSlug(),
            'title' => $t->getTitle(),
            'category' => $t->getCategory(),
            'content' => $t->getContent(),
            'keywords' => $t->getKeywords(),
            'relatedRoutes' => $t->getRelatedRoutes(),
            'updatedAt' => $t->getUpdatedAt()->format(\DateTimeInterface::ATOM),
        ];
    }

    private static function slug(string $s): string
    {
        $s = iconv('UTF-8', 'ASCII//TRANSLIT', $s);
        $s = strtolower((string)$s);
        $s = preg_replace('/[^a-z0-9]+/', '-', $s) ?? '';
        return trim($s, '-');
    }
}
