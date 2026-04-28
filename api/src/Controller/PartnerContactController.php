<?php
declare(strict_types=1);

namespace App\Controller;

use App\Entity\PartnerContact;
use App\Repository\PartnerContactRepository;
use App\Repository\PartnerRepository;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Annotation\Route;
use Symfony\Component\Security\Http\Attribute\IsGranted;

/**
 * Kontaktní osoby partnera (zaměstnanci CK / hotelu / agentury).
 *
 * Routes:
 *   GET    /api/partners/{partnerId}/contacts        — list
 *   POST   /api/partners/{partnerId}/contacts        — create
 *   PUT    /api/partner-contacts/{id}                — update
 *   DELETE /api/partner-contacts/{id}                — delete
 */
class PartnerContactController extends AbstractController
{
    public function __construct(
        private readonly PartnerRepository $partnerRepo,
        private readonly PartnerContactRepository $contactRepo,
        private readonly EntityManagerInterface $em,
    ) {}

    #[Route('/api/partners/{partnerId}/contacts', methods: ['GET'], requirements: ['partnerId' => '\d+'])]
    #[IsGranted('partners.read')]
    public function list(int $partnerId): JsonResponse
    {
        if (!$this->partnerRepo->find($partnerId)) {
            return $this->json(['error' => 'Partner nenalezen'], Response::HTTP_NOT_FOUND);
        }
        return $this->json(array_map(fn(PartnerContact $c) => $this->serialize($c), $this->contactRepo->findByPartnerOrdered($partnerId)));
    }

    #[Route('/api/partners/{partnerId}/contacts', methods: ['POST'], requirements: ['partnerId' => '\d+'])]
    #[IsGranted('partners.update')]
    public function create(int $partnerId, Request $request): JsonResponse
    {
        $partner = $this->partnerRepo->find($partnerId);
        if (!$partner) {
            return $this->json(['error' => 'Partner nenalezen'], Response::HTTP_NOT_FOUND);
        }

        $data = json_decode($request->getContent(), true) ?? [];
        if (trim((string)($data['firstName'] ?? '')) === '') {
            return $this->json(['error' => 'Jméno je povinné'], Response::HTTP_BAD_REQUEST);
        }

        $c = new PartnerContact();
        $c->setPartner($partner);
        $this->applyFields($c, $data);
        $this->em->persist($c);
        $this->em->flush();

        return $this->json($this->serialize($c), Response::HTTP_CREATED);
    }

    #[Route('/api/partner-contacts/{id}', methods: ['PUT', 'PATCH'], requirements: ['id' => '\d+'])]
    #[IsGranted('partners.update')]
    public function update(int $id, Request $request): JsonResponse
    {
        $c = $this->contactRepo->find($id);
        if (!$c) {
            return $this->json(['error' => 'Kontakt nenalezen'], Response::HTTP_NOT_FOUND);
        }
        $data = json_decode($request->getContent(), true) ?? [];
        $this->applyFields($c, $data);
        $this->em->flush();
        return $this->json($this->serialize($c));
    }

    #[Route('/api/partner-contacts/{id}', methods: ['DELETE'], requirements: ['id' => '\d+'])]
    #[IsGranted('partners.update')]
    public function delete(int $id): JsonResponse
    {
        $c = $this->contactRepo->find($id);
        if (!$c) return $this->json(['status' => 'gone']);
        $this->em->remove($c);
        $this->em->flush();
        return $this->json(['status' => 'deleted']);
    }

    private function applyFields(PartnerContact $c, array $data): void
    {
        $emptyToNull = static fn($v) => is_string($v) && trim($v) !== '' ? trim($v) : null;
        if (array_key_exists('firstName', $data)) $c->setFirstName(trim((string)$data['firstName']));
        if (array_key_exists('lastName', $data))  $c->setLastName($emptyToNull($data['lastName']));
        if (array_key_exists('email', $data))     $c->setEmail($emptyToNull($data['email']));
        if (array_key_exists('phone', $data))     $c->setPhone($emptyToNull($data['phone']));
        if (array_key_exists('notes', $data))     $c->setNotes(is_string($data['notes']) && $data['notes'] !== '' ? $data['notes'] : null);
        if (array_key_exists('displayOrder', $data)) $c->setDisplayOrder((int)$data['displayOrder']);
    }

    private function serialize(PartnerContact $c): array
    {
        return [
            'id' => $c->getId(),
            'partnerId' => $c->getPartner()->getId(),
            'firstName' => $c->getFirstName(),
            'lastName' => $c->getLastName(),
            'email' => $c->getEmail(),
            'phone' => $c->getPhone(),
            'notes' => $c->getNotes(),
            'displayOrder' => $c->getDisplayOrder(),
            'createdAt' => $c->getCreatedAt()->format(\DateTimeInterface::ATOM),
            'updatedAt' => $c->getUpdatedAt()->format(\DateTimeInterface::ATOM),
        ];
    }
}
