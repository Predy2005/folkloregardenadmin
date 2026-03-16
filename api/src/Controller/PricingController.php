<?php

namespace App\Controller;

use App\Entity\PricingDefault;
use App\Entity\PricingDateOverride;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Annotation\Route;

#[Route('/api/pricing')]
class PricingController extends AbstractController
{
    public function __construct(
        private EntityManagerInterface $em
    ) {}

    // ─── Default Pricing ───────────────────────────────────────────────────────

    #[Route('/defaults', name: 'api_pricing_defaults_get', methods: ['GET'])]
    public function getDefaults(): JsonResponse
    {
        $defaults = $this->em->getRepository(PricingDefault::class)->findOneBy([]);

        if (!$defaults) {
            // Return empty defaults if none exist
            return $this->json([
                'id' => null,
                'adultPrice' => 0.00,
                'childPrice' => 0.00,
                'infantPrice' => 0.00,
                'includeMeal' => true,
            ]);
        }

        return $this->json([
            'id' => $defaults->getId(),
            'adultPrice' => (float)$defaults->getAdultPrice(),
            'childPrice' => (float)$defaults->getChildPrice(),
            'infantPrice' => (float)$defaults->getInfantPrice(),
            'includeMeal' => $defaults->isIncludeMeal(),
            'createdAt' => $defaults->getCreatedAt()->format('c'),
            'updatedAt' => $defaults->getUpdatedAt()->format('c'),
        ]);
    }

    #[Route('/defaults', name: 'api_pricing_defaults_update', methods: ['PUT'])]
    public function updateDefaults(Request $request): JsonResponse
    {
        $data = json_decode($request->getContent(), true);

        $defaults = $this->em->getRepository(PricingDefault::class)->findOneBy([]);

        if (!$defaults) {
            $defaults = new PricingDefault();
        }

        if (isset($data['adultPrice'])) {
            $defaults->setAdultPrice((string)$data['adultPrice']);
        }
        if (isset($data['childPrice'])) {
            $defaults->setChildPrice((string)$data['childPrice']);
        }
        if (isset($data['infantPrice'])) {
            $defaults->setInfantPrice((string)$data['infantPrice']);
        }
        if (isset($data['includeMeal'])) {
            $defaults->setIncludeMeal((bool)$data['includeMeal']);
        }

        $this->em->persist($defaults);
        $this->em->flush();

        return $this->json([
            'id' => $defaults->getId(),
            'adultPrice' => (float)$defaults->getAdultPrice(),
            'childPrice' => (float)$defaults->getChildPrice(),
            'infantPrice' => (float)$defaults->getInfantPrice(),
            'includeMeal' => $defaults->isIncludeMeal(),
            'createdAt' => $defaults->getCreatedAt()->format('c'),
            'updatedAt' => $defaults->getUpdatedAt()->format('c'),
        ]);
    }

    // ─── Date Overrides ────────────────────────────────────────────────────────

    #[Route('/date-overrides', name: 'api_pricing_date_overrides_list', methods: ['GET'])]
    public function listDateOverrides(): JsonResponse
    {
        $overrides = $this->em->getRepository(PricingDateOverride::class)
            ->findBy([], ['date' => 'ASC']);

        $result = array_map(fn($o) => [
            'id' => $o->getId(),
            'date' => $o->getDate()->format('Y-m-d'),
            'adultPrice' => (float)$o->getAdultPrice(),
            'childPrice' => (float)$o->getChildPrice(),
            'infantPrice' => (float)$o->getInfantPrice(),
            'includeMeal' => $o->isIncludeMeal(),
            'reason' => $o->getReason(),
            'createdAt' => $o->getCreatedAt()->format('c'),
            'updatedAt' => $o->getUpdatedAt()->format('c'),
        ], $overrides);

        return $this->json($result);
    }

    #[Route('/date-overrides', name: 'api_pricing_date_overrides_create', methods: ['POST'])]
    public function createDateOverride(Request $request): JsonResponse
    {
        $data = json_decode($request->getContent(), true);

        if (!isset($data['date'])) {
            return $this->json(['error' => 'Date is required'], 400);
        }

        $override = new PricingDateOverride();
        $override->setDate(new \DateTime($data['date']));

        if (isset($data['adultPrice'])) {
            $override->setAdultPrice((string)$data['adultPrice']);
        }
        if (isset($data['childPrice'])) {
            $override->setChildPrice((string)$data['childPrice']);
        }
        if (isset($data['infantPrice'])) {
            $override->setInfantPrice((string)$data['infantPrice']);
        }
        if (isset($data['includeMeal'])) {
            $override->setIncludeMeal((bool)$data['includeMeal']);
        }
        if (isset($data['reason'])) {
            $override->setReason($data['reason']);
        }

        $this->em->persist($override);
        $this->em->flush();

        return $this->json([
            'id' => $override->getId(),
            'date' => $override->getDate()->format('Y-m-d'),
            'adultPrice' => (float)$override->getAdultPrice(),
            'childPrice' => (float)$override->getChildPrice(),
            'infantPrice' => (float)$override->getInfantPrice(),
            'includeMeal' => $override->isIncludeMeal(),
            'reason' => $override->getReason(),
            'createdAt' => $override->getCreatedAt()->format('c'),
            'updatedAt' => $override->getUpdatedAt()->format('c'),
        ], 201);
    }

    #[Route('/date-overrides/{id}', name: 'api_pricing_date_overrides_get', methods: ['GET'])]
    public function getDateOverride(int $id): JsonResponse
    {
        $override = $this->em->getRepository(PricingDateOverride::class)->find($id);

        if (!$override) {
            return $this->json(['error' => 'Date override not found'], 404);
        }

        return $this->json([
            'id' => $override->getId(),
            'date' => $override->getDate()->format('Y-m-d'),
            'adultPrice' => (float)$override->getAdultPrice(),
            'childPrice' => (float)$override->getChildPrice(),
            'infantPrice' => (float)$override->getInfantPrice(),
            'includeMeal' => $override->isIncludeMeal(),
            'reason' => $override->getReason(),
            'createdAt' => $override->getCreatedAt()->format('c'),
            'updatedAt' => $override->getUpdatedAt()->format('c'),
        ]);
    }

    #[Route('/date-overrides/{id}', name: 'api_pricing_date_overrides_update', methods: ['PUT'])]
    public function updateDateOverride(int $id, Request $request): JsonResponse
    {
        $override = $this->em->getRepository(PricingDateOverride::class)->find($id);

        if (!$override) {
            return $this->json(['error' => 'Date override not found'], 404);
        }

        $data = json_decode($request->getContent(), true);

        if (isset($data['date'])) {
            $override->setDate(new \DateTime($data['date']));
        }
        if (isset($data['adultPrice'])) {
            $override->setAdultPrice((string)$data['adultPrice']);
        }
        if (isset($data['childPrice'])) {
            $override->setChildPrice((string)$data['childPrice']);
        }
        if (isset($data['infantPrice'])) {
            $override->setInfantPrice((string)$data['infantPrice']);
        }
        if (isset($data['includeMeal'])) {
            $override->setIncludeMeal((bool)$data['includeMeal']);
        }
        if (isset($data['reason'])) {
            $override->setReason($data['reason']);
        }

        $this->em->flush();

        return $this->json([
            'id' => $override->getId(),
            'date' => $override->getDate()->format('Y-m-d'),
            'adultPrice' => (float)$override->getAdultPrice(),
            'childPrice' => (float)$override->getChildPrice(),
            'infantPrice' => (float)$override->getInfantPrice(),
            'includeMeal' => $override->isIncludeMeal(),
            'reason' => $override->getReason(),
            'createdAt' => $override->getCreatedAt()->format('c'),
            'updatedAt' => $override->getUpdatedAt()->format('c'),
        ]);
    }

    #[Route('/date-overrides/{id}', name: 'api_pricing_date_overrides_delete', methods: ['DELETE'])]
    public function deleteDateOverride(int $id): JsonResponse
    {
        $override = $this->em->getRepository(PricingDateOverride::class)->find($id);

        if (!$override) {
            return $this->json(['error' => 'Date override not found'], 404);
        }

        $this->em->remove($override);
        $this->em->flush();

        return $this->json(['success' => true]);
    }

    // ─── Get price for specific date ───────────────────────────────────────────

    #[Route('/for-date/{date}', name: 'api_pricing_for_date', methods: ['GET'])]
    public function getPriceForDate(string $date): JsonResponse
    {
        $dateObj = new \DateTime($date);

        // Check for date override first
        $override = $this->em->getRepository(PricingDateOverride::class)
            ->findOneBy(['date' => $dateObj]);

        if ($override) {
            return $this->json([
                'source' => 'override',
                'date' => $override->getDate()->format('Y-m-d'),
                'adultPrice' => (float)$override->getAdultPrice(),
                'childPrice' => (float)$override->getChildPrice(),
                'infantPrice' => (float)$override->getInfantPrice(),
                'includeMeal' => $override->isIncludeMeal(),
                'reason' => $override->getReason(),
            ]);
        }

        // Fall back to defaults
        $defaults = $this->em->getRepository(PricingDefault::class)->findOneBy([]);

        if ($defaults) {
            return $this->json([
                'source' => 'default',
                'date' => $date,
                'adultPrice' => (float)$defaults->getAdultPrice(),
                'childPrice' => (float)$defaults->getChildPrice(),
                'infantPrice' => (float)$defaults->getInfantPrice(),
                'includeMeal' => $defaults->isIncludeMeal(),
                'reason' => null,
            ]);
        }

        // No pricing configured
        return $this->json([
            'source' => 'none',
            'date' => $date,
            'adultPrice' => 0.00,
            'childPrice' => 0.00,
            'infantPrice' => 0.00,
            'includeMeal' => true,
            'reason' => null,
        ]);
    }
}
