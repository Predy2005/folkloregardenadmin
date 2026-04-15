<?php

declare(strict_types=1);

namespace App\Controller;

use App\Entity\ExchangeRate;
use App\Repository\ExchangeRateRepository;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Annotation\Route;
use Symfony\Component\Security\Http\Attribute\IsGranted;

#[Route('/api/exchange-rates')]
#[IsGranted('IS_AUTHENTICATED_FULLY')]
class ExchangeRateController extends AbstractController
{
    public function __construct(
        private readonly EntityManagerInterface $em,
        private readonly ExchangeRateRepository $repo,
    ) {}

    #[Route('', methods: ['GET'])]
    public function list(Request $request): JsonResponse
    {
        $from = $request->query->get('from');
        $to = $request->query->get('to');
        $base = $request->query->get('base');
        $target = $request->query->get('target');

        if ($from && $to) {
            $rates = $this->repo->findByDateRange(
                new \DateTime($from),
                new \DateTime($to),
                $base,
                $target
            );
        } else {
            $rates = $this->repo->findBy([], ['effectiveDate' => 'DESC'], 100);
        }

        return $this->json(array_map(fn(ExchangeRate $r) => $this->serialize($r), $rates));
    }

    #[Route('/latest', methods: ['GET'])]
    public function latest(Request $request): JsonResponse
    {
        $base = $request->query->get('base', 'CZK');
        $target = $request->query->get('target', 'EUR');

        $rate = $this->repo->findRate($base, $target, new \DateTime());
        if (!$rate) {
            return $this->json(['error' => 'Rate not found'], 404);
        }

        return $this->json($this->serialize($rate));
    }

    #[Route('', methods: ['POST'])]
    public function create(Request $request): JsonResponse
    {
        $data = json_decode($request->getContent(), true) ?? [];

        $rate = new ExchangeRate();
        $rate->setBaseCurrency($data['baseCurrency'] ?? 'CZK');
        $rate->setTargetCurrency($data['targetCurrency'] ?? 'EUR');
        $rate->setRate((string) ($data['rate'] ?? '1'));
        $rate->setEffectiveDate(new \DateTime($data['effectiveDate'] ?? 'today'));
        $rate->setSource($data['source'] ?? 'MANUAL');

        $this->em->persist($rate);
        $this->em->flush();

        return $this->json($this->serialize($rate), 201);
    }

    #[Route('/{id}', methods: ['DELETE'])]
    public function delete(int $id): JsonResponse
    {
        $rate = $this->repo->find($id);
        if (!$rate) {
            return $this->json(['error' => 'Not found'], 404);
        }

        $this->em->remove($rate);
        $this->em->flush();

        return $this->json(['ok' => true]);
    }

    private function serialize(ExchangeRate $r): array
    {
        return [
            'id' => $r->getId(),
            'baseCurrency' => $r->getBaseCurrency(),
            'targetCurrency' => $r->getTargetCurrency(),
            'rate' => (float) $r->getRate(),
            'effectiveDate' => $r->getEffectiveDate()->format('Y-m-d'),
            'source' => $r->getSource(),
            'createdAt' => $r->getCreatedAt()->format('c'),
        ];
    }
}
