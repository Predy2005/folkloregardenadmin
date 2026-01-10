<?php
declare(strict_types=1);

namespace App\Controller;

use App\Entity\EventTag;
use App\Repository\EventTagRepository;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Attribute\Route;

#[Route('/api/event-tags')]
class EventTagController extends AbstractController
{
    public function __construct(
        private EntityManagerInterface $em,
        private EventTagRepository $tagRepository,
    ) {}

    /**
     * Seznam všech tagů seřazených podle popularity
     */
    #[Route('', name: 'event_tags_list', methods: ['GET'])]
    public function list(): JsonResponse
    {
        $tags = $this->tagRepository->findAllByPopularity();

        return $this->json(array_map(function (EventTag $tag) {
            return [
                'id' => $tag->getId(),
                'name' => $tag->getName(),
                'usageCount' => $tag->getUsageCount(),
                'createdAt' => $tag->getCreatedAt()->format('Y-m-d H:i:s'),
                'lastUsedAt' => $tag->getLastUsedAt()->format('Y-m-d H:i:s'),
            ];
        }, $tags));
    }

    /**
     * Vyhledání tagů podle prefixu (pro autocomplete)
     */
    #[Route('/search', name: 'event_tags_search', methods: ['GET'])]
    public function search(Request $request): JsonResponse
    {
        $query = $request->query->get('q', '');
        $limit = (int) $request->query->get('limit', 10);

        if (strlen($query) < 1) {
            return $this->json([]);
        }

        $tags = $this->tagRepository->findByPrefix($query, $limit);

        return $this->json(array_map(function (EventTag $tag) {
            return [
                'id' => $tag->getId(),
                'name' => $tag->getName(),
                'usageCount' => $tag->getUsageCount(),
            ];
        }, $tags));
    }

    /**
     * Vytvoření nového tagu
     */
    #[Route('', name: 'event_tags_create', methods: ['POST'])]
    public function create(Request $request): JsonResponse
    {
        $data = json_decode($request->getContent(), true);
        $name = trim($data['name'] ?? '');

        if (empty($name)) {
            return $this->json(['error' => 'Název tagu je povinný'], 400);
        }

        $tag = $this->tagRepository->findOrCreate($name);
        $this->em->persist($tag);
        $this->em->flush();

        return $this->json([
            'id' => $tag->getId(),
            'name' => $tag->getName(),
            'usageCount' => $tag->getUsageCount(),
        ], 201);
    }

    /**
     * Smazání tagu
     */
    #[Route('/{id}', name: 'event_tags_delete', methods: ['DELETE'])]
    public function delete(int $id): JsonResponse
    {
        $tag = $this->tagRepository->find($id);

        if (!$tag) {
            return $this->json(['error' => 'Tag nenalezen'], 404);
        }

        $this->em->remove($tag);
        $this->em->flush();

        return $this->json(['status' => 'deleted']);
    }

    /**
     * Synchronizace tagů z události - uloží nové tagy do databáze
     */
    public function syncTagsFromEvent(array $tags): void
    {
        foreach ($tags as $tagName) {
            $trimmed = trim($tagName);
            if (!empty($trimmed)) {
                $tag = $this->tagRepository->findOrCreate($trimmed);
                $this->em->persist($tag);
            }
        }
        $this->em->flush();
    }
}
