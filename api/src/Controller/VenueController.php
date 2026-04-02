<?php

namespace App\Controller;

use App\Entity\Building;
use App\Entity\Room;
use App\Entity\FloorPlanTemplate;
use App\Repository\BuildingRepository;
use App\Repository\RoomRepository;
use App\Repository\FloorPlanTemplateRepository;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Annotation\Route;
use Symfony\Component\Security\Http\Attribute\IsGranted;

#[Route('/api/venue')]
#[IsGranted('IS_AUTHENTICATED_FULLY')]
class VenueController extends AbstractController
{
    public function __construct(
        private readonly EntityManagerInterface $em,
        private readonly BuildingRepository $buildingRepo,
        private readonly RoomRepository $roomRepo,
        private readonly FloorPlanTemplateRepository $templateRepo,
    ) {}

    // ─── Buildings ──────────────────────────────────────────────────────

    #[Route('/buildings', methods: ['GET'])]
    public function listBuildings(): JsonResponse
    {
        $buildings = $this->buildingRepo->findAllWithRooms();
        return $this->json(array_map(fn(Building $b) => $this->serializeBuilding($b), $buildings));
    }

    #[Route('/buildings', methods: ['POST'])]
    public function createBuilding(Request $request): JsonResponse
    {
        $data = json_decode($request->getContent(), true);
        $building = new Building();
        $building->setName($data['name'] ?? '');
        $building->setSlug($data['slug'] ?? $this->slugify($data['name'] ?? ''));
        $building->setDescription($data['description'] ?? null);
        $building->setSortOrder($data['sortOrder'] ?? 0);
        $building->setIsActive($data['isActive'] ?? true);

        $this->em->persist($building);
        $this->em->flush();

        return $this->json($this->serializeBuilding($building), 201);
    }

    #[Route('/buildings/{id}', methods: ['PUT'])]
    public function updateBuilding(int $id, Request $request): JsonResponse
    {
        $building = $this->buildingRepo->find($id);
        if (!$building) {
            return $this->json(['error' => 'Building not found'], 404);
        }

        $data = json_decode($request->getContent(), true);
        if (isset($data['name'])) $building->setName($data['name']);
        if (isset($data['slug'])) $building->setSlug($data['slug']);
        if (array_key_exists('description', $data)) $building->setDescription($data['description']);
        if (isset($data['sortOrder'])) $building->setSortOrder($data['sortOrder']);
        if (isset($data['isActive'])) $building->setIsActive($data['isActive']);

        $this->em->flush();

        return $this->json($this->serializeBuilding($building));
    }

    #[Route('/buildings/{id}', methods: ['DELETE'])]
    public function deleteBuilding(int $id): JsonResponse
    {
        $building = $this->buildingRepo->find($id);
        if (!$building) {
            return $this->json(['error' => 'Building not found'], 404);
        }

        $this->em->remove($building);
        $this->em->flush();

        return $this->json(['ok' => true]);
    }

    // ─── Rooms ──────────────────────────────────────────────────────────

    #[Route('/rooms', methods: ['GET'])]
    public function listAllRooms(): JsonResponse
    {
        $rooms = $this->roomRepo->findAllActive();
        return $this->json(array_map(fn(Room $r) => $this->serializeRoom($r), $rooms));
    }

    #[Route('/buildings/{buildingId}/rooms', methods: ['GET'])]
    public function listRooms(int $buildingId): JsonResponse
    {
        $building = $this->buildingRepo->find($buildingId);
        if (!$building) {
            return $this->json(['error' => 'Building not found'], 404);
        }

        $rooms = $building->getRooms()->toArray();
        return $this->json(array_map(fn(Room $r) => $this->serializeRoom($r), $rooms));
    }

    #[Route('/buildings/{buildingId}/rooms', methods: ['POST'])]
    public function createRoom(int $buildingId, Request $request): JsonResponse
    {
        $building = $this->buildingRepo->find($buildingId);
        if (!$building) {
            return $this->json(['error' => 'Building not found'], 404);
        }

        $data = json_decode($request->getContent(), true);
        $room = new Room();
        $room->setBuilding($building);
        $room->setName($data['name'] ?? '');
        $room->setSlug($data['slug'] ?? $this->slugify($data['name'] ?? ''));
        $room->setWidthCm($data['widthCm'] ?? 1000);
        $room->setHeightCm($data['heightCm'] ?? 800);
        $room->setCapacityLimit($data['capacityLimit'] ?? null);
        $room->setShapeData($data['shapeData'] ?? null);
        $room->setColor($data['color'] ?? null);
        $room->setSortOrder($data['sortOrder'] ?? 0);
        $room->setIsActive($data['isActive'] ?? true);

        $this->em->persist($room);
        $this->em->flush();

        return $this->json($this->serializeRoom($room), 201);
    }

    #[Route('/rooms/{id}', methods: ['PUT'])]
    public function updateRoom(int $id, Request $request): JsonResponse
    {
        $room = $this->roomRepo->find($id);
        if (!$room) {
            return $this->json(['error' => 'Room not found'], 404);
        }

        $data = json_decode($request->getContent(), true);
        if (isset($data['name'])) $room->setName($data['name']);
        if (isset($data['slug'])) $room->setSlug($data['slug']);
        if (isset($data['widthCm'])) $room->setWidthCm($data['widthCm']);
        if (isset($data['heightCm'])) $room->setHeightCm($data['heightCm']);
        if (array_key_exists('capacityLimit', $data)) $room->setCapacityLimit($data['capacityLimit']);
        if (array_key_exists('shapeData', $data)) $room->setShapeData($data['shapeData']);
        if (array_key_exists('color', $data)) $room->setColor($data['color']);
        if (isset($data['sortOrder'])) $room->setSortOrder($data['sortOrder']);
        if (isset($data['isActive'])) $room->setIsActive($data['isActive']);

        $this->em->flush();

        return $this->json($this->serializeRoom($room));
    }

    #[Route('/rooms/{id}', methods: ['DELETE'])]
    public function deleteRoom(int $id): JsonResponse
    {
        $room = $this->roomRepo->find($id);
        if (!$room) {
            return $this->json(['error' => 'Room not found'], 404);
        }

        $this->em->remove($room);
        $this->em->flush();

        return $this->json(['ok' => true]);
    }

    // ─── Floor Plan Templates ───────────────────────────────────────────

    #[Route('/templates', methods: ['GET'])]
    public function listTemplates(): JsonResponse
    {
        $templates = $this->templateRepo->findBy([], ['name' => 'ASC']);
        return $this->json(array_map(fn(FloorPlanTemplate $t) => $this->serializeTemplate($t), $templates));
    }

    #[Route('/templates/{id}', methods: ['GET'])]
    public function getTemplate(int $id): JsonResponse
    {
        $template = $this->templateRepo->find($id);
        if (!$template) {
            return $this->json(['error' => 'Template not found'], 404);
        }

        return $this->json($this->serializeTemplate($template));
    }

    #[Route('/templates', methods: ['POST'])]
    public function createTemplate(Request $request): JsonResponse
    {
        $data = json_decode($request->getContent(), true);
        $template = new FloorPlanTemplate();
        $template->setName($data['name'] ?? '');
        $template->setDescription($data['description'] ?? null);
        $template->setLayoutData($data['layoutData'] ?? ['tables' => [], 'elements' => []]);
        $template->setIsDefault($data['isDefault'] ?? false);

        if (!empty($data['roomId'])) {
            $room = $this->roomRepo->find($data['roomId']);
            $template->setRoom($room);
        }

        $user = $this->getUser();
        if ($user) {
            $template->setCreatedBy($user);
        }

        $this->em->persist($template);
        $this->em->flush();

        return $this->json($this->serializeTemplate($template), 201);
    }

    #[Route('/templates/{id}', methods: ['PUT'])]
    public function updateTemplate(int $id, Request $request): JsonResponse
    {
        $template = $this->templateRepo->find($id);
        if (!$template) {
            return $this->json(['error' => 'Template not found'], 404);
        }

        $data = json_decode($request->getContent(), true);
        if (isset($data['name'])) $template->setName($data['name']);
        if (array_key_exists('description', $data)) $template->setDescription($data['description']);
        if (isset($data['layoutData'])) $template->setLayoutData($data['layoutData']);
        if (isset($data['isDefault'])) $template->setIsDefault($data['isDefault']);

        if (array_key_exists('roomId', $data)) {
            $room = $data['roomId'] ? $this->roomRepo->find($data['roomId']) : null;
            $template->setRoom($room);
        }

        $this->em->flush();

        return $this->json($this->serializeTemplate($template));
    }

    #[Route('/templates/{id}', methods: ['DELETE'])]
    public function deleteTemplate(int $id): JsonResponse
    {
        $template = $this->templateRepo->find($id);
        if (!$template) {
            return $this->json(['error' => 'Template not found'], 404);
        }

        $this->em->remove($template);
        $this->em->flush();

        return $this->json(['ok' => true]);
    }

    #[Route('/templates/{id}/duplicate', methods: ['POST'])]
    public function duplicateTemplate(int $id): JsonResponse
    {
        $source = $this->templateRepo->find($id);
        if (!$source) {
            return $this->json(['error' => 'Template not found'], 404);
        }

        $copy = new FloorPlanTemplate();
        $copy->setName($source->getName() . ' (kopie)');
        $copy->setDescription($source->getDescription());
        $copy->setRoom($source->getRoom());
        $copy->setLayoutData($source->getLayoutData());
        $copy->setIsDefault(false);

        $user = $this->getUser();
        if ($user) {
            $copy->setCreatedBy($user);
        }

        $this->em->persist($copy);
        $this->em->flush();

        return $this->json($this->serializeTemplate($copy), 201);
    }

    // ─── Serializers ────────────────────────────────────────────────────

    private function serializeBuilding(Building $b): array
    {
        return [
            'id' => $b->getId(),
            'name' => $b->getName(),
            'slug' => $b->getSlug(),
            'description' => $b->getDescription(),
            'sortOrder' => $b->getSortOrder(),
            'isActive' => $b->isActive(),
            'rooms' => array_map(fn(Room $r) => $this->serializeRoom($r), $b->getRooms()->toArray()),
            'createdAt' => $b->getCreatedAt()->format('c'),
            'updatedAt' => $b->getUpdatedAt()->format('c'),
        ];
    }

    private function serializeRoom(Room $r): array
    {
        return [
            'id' => $r->getId(),
            'buildingId' => $r->getBuilding()?->getId(),
            'name' => $r->getName(),
            'slug' => $r->getSlug(),
            'widthCm' => $r->getWidthCm(),
            'heightCm' => $r->getHeightCm(),
            'capacityLimit' => $r->getCapacityLimit(),
            'shapeData' => $r->getShapeData(),
            'color' => $r->getColor(),
            'sortOrder' => $r->getSortOrder(),
            'isActive' => $r->isActive(),
            'createdAt' => $r->getCreatedAt()->format('c'),
            'updatedAt' => $r->getUpdatedAt()->format('c'),
        ];
    }

    private function serializeTemplate(FloorPlanTemplate $t): array
    {
        return [
            'id' => $t->getId(),
            'name' => $t->getName(),
            'description' => $t->getDescription(),
            'roomId' => $t->getRoom()?->getId(),
            'layoutData' => $t->getLayoutData(),
            'isDefault' => $t->isDefault(),
            'room' => $t->getRoom() ? $this->serializeRoom($t->getRoom()) : null,
            'createdBy' => $t->getCreatedBy()?->getId(),
            'createdAt' => $t->getCreatedAt()->format('c'),
            'updatedAt' => $t->getUpdatedAt()->format('c'),
        ];
    }

    private function slugify(string $text): string
    {
        $text = transliterator_transliterate('Any-Latin; Latin-ASCII; Lower()', $text);
        $text = preg_replace('/[^a-z0-9]+/', '_', $text);
        return trim($text, '_');
    }
}
