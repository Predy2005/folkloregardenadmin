<?php

namespace App\Controller;

use App\Entity\Partner;
use App\Repository\PartnerRepository;
use App\Repository\CommissionLogRepository;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Annotation\Route;
use Symfony\Component\Security\Http\Attribute\IsGranted;

#[Route('/api/partner')]
class PartnerController extends AbstractController
{
    public function __construct(private readonly EntityManagerInterface $em)
    {
    }

    #[Route('', methods: ['GET'])]
    #[IsGranted('partners.read')]
    public function list(PartnerRepository $repo): JsonResponse
    {
        $partners = $repo->findBy([], ['name' => 'ASC']);
        $data = array_map(function (Partner $p) {
            return [
                'id' => $p->getId(),
                'name' => $p->getName(),
                'partnerType' => $p->getPartnerType(),
                'commissionRate' => $p->getCommissionRate(),
                'commissionAmount' => $p->getCommissionAmount(),
                'paymentMethod' => $p->getPaymentMethod(),
                'bankAccount' => $p->getBankAccount(),
                'ic' => $p->getIc(),
                'dic' => $p->getDic(),
                'isActive' => $p->isActive(),
            ];
        }, $partners);
        return $this->json($data);
    }

    #[Route('', methods: ['POST'])]
    #[IsGranted('partners.create')]
    public function create(Request $request): JsonResponse
    {
        $data = json_decode($request->getContent(), true) ?? [];
        if (!isset($data['name'], $data['partnerType'])) {
            return $this->json(['error' => 'Missing required fields: name, partnerType'], 400);
        }
        $partner = new Partner();
        $partner->setName($data['name'])
            ->setPartnerType($data['partnerType'])
            ->setContactPerson($data['contactPerson'] ?? null)
            ->setEmail($data['email'] ?? null)
            ->setPhone($data['phone'] ?? null)
            ->setAddress($data['address'] ?? null)
            ->setCommissionRate((string)($data['commissionRate'] ?? '0.00'))
            ->setCommissionAmount((string)($data['commissionAmount'] ?? '0.00'))
            ->setPaymentMethod($data['paymentMethod'] ?? null)
            ->setBankAccount($data['bankAccount'] ?? null)
            ->setIc($data['ic'] ?? null)
            ->setDic($data['dic'] ?? null)
            ->setIsActive((bool)($data['isActive'] ?? true))
            ->setNotes($data['notes'] ?? null);

        $this->em->persist($partner);
        $this->em->flush();
        return $this->json(['status' => 'created', 'id' => $partner->getId()], 201);
    }

    #[Route('/{id}', methods: ['GET'])]
    #[IsGranted('partners.read')]
    public function detail(int $id, PartnerRepository $repo): JsonResponse
    {
        $p = $repo->find($id);
        if (!$p) { return $this->json(['error' => 'Not found'], 404); }
        return $this->json([
            'id' => $p->getId(),
            'name' => $p->getName(),
            'partnerType' => $p->getPartnerType(),
            'contactPerson' => $p->getContactPerson(),
            'email' => $p->getEmail(),
            'phone' => $p->getPhone(),
            'address' => $p->getAddress(),
            'commissionRate' => $p->getCommissionRate(),
            'commissionAmount' => $p->getCommissionAmount(),
            'paymentMethod' => $p->getPaymentMethod(),
            'bankAccount' => $p->getBankAccount(),
            'ic' => $p->getIc(),
            'dic' => $p->getDic(),
            'isActive' => $p->isActive(),
            'notes' => $p->getNotes(),
            'createdAt' => $p->getCreatedAt()->format(DATE_ATOM),
            'updatedAt' => $p->getUpdatedAt()->format(DATE_ATOM),
        ]);
    }

    #[Route('/{id}', methods: ['PUT','PATCH'])]
    #[IsGranted('partners.update')]
    public function update(int $id, Request $request, PartnerRepository $repo): JsonResponse
    {
        $p = $repo->find($id);
        if (!$p) { return $this->json(['error' => 'Not found'], 404); }
        $data = json_decode($request->getContent(), true) ?? [];
        if (isset($data['name'])) $p->setName($data['name']);
        if (isset($data['partnerType'])) $p->setPartnerType($data['partnerType']);
        $p->setContactPerson($data['contactPerson'] ?? $p->getContactPerson());
        $p->setEmail($data['email'] ?? $p->getEmail());
        $p->setPhone($data['phone'] ?? $p->getPhone());
        $p->setAddress($data['address'] ?? $p->getAddress());
        if (isset($data['commissionRate'])) $p->setCommissionRate((string)$data['commissionRate']);
        if (isset($data['commissionAmount'])) $p->setCommissionAmount((string)$data['commissionAmount']);
        $p->setPaymentMethod($data['paymentMethod'] ?? $p->getPaymentMethod());
        $p->setBankAccount($data['bankAccount'] ?? $p->getBankAccount());
        $p->setIc($data['ic'] ?? $p->getIc());
        $p->setDic($data['dic'] ?? $p->getDic());
        if (isset($data['isActive'])) $p->setIsActive((bool)$data['isActive']);
        $p->setNotes($data['notes'] ?? $p->getNotes());
        // updatedAt handled by DB trigger in SQL; in app we can set explicitly if needed
        $this->em->flush();
        return $this->json(['status' => 'updated']);
    }

    #[Route('/{id}', methods: ['DELETE'])]
    #[IsGranted('partners.delete')]
    public function delete(int $id, PartnerRepository $repo): JsonResponse
    {
        $p = $repo->find($id);
        if (!$p) { return $this->json(['error' => 'Not found'], 404); }
        $this->em->remove($p);
        $this->em->flush();
        return $this->json(['status' => 'deleted']);
    }

    #[Route('/{id}/commissions', methods: ['GET'])]
    #[IsGranted('partners.read')]
    public function commissions(int $id, PartnerRepository $repo, CommissionLogRepository $logRepo): JsonResponse
    {
        $p = $repo->find($id);
        if (!$p) { return $this->json(['error' => 'Partner not found'], 404); }
        $logs = $logRepo->findBy(['partner' => $p], ['id' => 'DESC']);
        $data = array_map(function($l){
            return [
                'id' => $l->getId(),
                'voucherId' => $l->getVoucher()?->getId(),
                'reservationId' => $l->getReservation()?->getId(),
                'commissionType' => $l->getCommissionType(),
                'baseAmount' => $l->getBaseAmount(),
                'commissionRate' => $l->getCommissionRate(),
                'commissionAmount' => $l->getCommissionAmount(),
                'paymentStatus' => $l->getPaymentStatus(),
                'paymentMethod' => $l->getPaymentMethod(),
                'paidAt' => $l->getPaidAt()?->format(DATE_ATOM),
                'notes' => $l->getNotes(),
                'createdAt' => $l->getCreatedAt()->format(DATE_ATOM),
                'updatedAt' => $l->getUpdatedAt()->format(DATE_ATOM),
            ];
        }, $logs);
        return $this->json($data);
    }
}
