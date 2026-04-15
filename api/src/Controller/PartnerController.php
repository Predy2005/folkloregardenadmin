<?php

namespace App\Controller;

use App\Config\SpecialDateRules;
use App\Entity\Partner;
use App\Entity\PricingDefault;
use App\Entity\Reservation;
use App\Repository\PartnerRepository;
use App\Repository\CommissionLogRepository;
use App\Repository\ReservationRepository;
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
                'contactPerson' => $p->getContactPerson(),
                'email' => $p->getEmail(),
                'phone' => $p->getPhone(),
                'currency' => $p->getCurrency(),
                'commissionRate' => $p->getCommissionRate(),
                'commissionAmount' => $p->getCommissionAmount(),
                'paymentMethod' => $p->getPaymentMethod(),
                'bankAccount' => $p->getBankAccount(),
                'ic' => $p->getIc(),
                'dic' => $p->getDic(),
                'isActive' => $p->isActive(),
                'pricingModel' => $p->getPricingModel(),
                'billingPeriod' => $p->getBillingPeriod(),
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

        if (!empty($data['currency'])) $partner->setCurrency($data['currency']);
        if (isset($data['pricingModel'])) $partner->setPricingModel($data['pricingModel']);
        if (isset($data['flatPriceAdult'])) $partner->setFlatPriceAdult((string)$data['flatPriceAdult']);
        if (isset($data['flatPriceChild'])) $partner->setFlatPriceChild((string)$data['flatPriceChild']);
        if (isset($data['flatPriceInfant'])) $partner->setFlatPriceInfant((string)$data['flatPriceInfant']);
        if (isset($data['customMenuPrices'])) $partner->setCustomMenuPrices($data['customMenuPrices']);
        if (isset($data['billingPeriod'])) $partner->setBillingPeriod($data['billingPeriod']);
        if (isset($data['billingEmail'])) $partner->setBillingEmail($data['billingEmail']);
        if (isset($data['invoiceCompany'])) $partner->setInvoiceCompany($data['invoiceCompany']);
        if (isset($data['invoiceStreet'])) $partner->setInvoiceStreet($data['invoiceStreet']);
        if (isset($data['invoiceCity'])) $partner->setInvoiceCity($data['invoiceCity']);
        if (isset($data['invoiceZipcode'])) $partner->setInvoiceZipcode($data['invoiceZipcode']);
        if (isset($data['detectionEmails'])) $partner->setDetectionEmails($data['detectionEmails']);
        if (isset($data['detectionKeywords'])) $partner->setDetectionKeywords($data['detectionKeywords']);

        $this->em->persist($partner);
        $this->em->flush();
        return $this->json(['status' => 'created', 'id' => $partner->getId()], 201);
    }

    #[Route('/detect', methods: ['POST'])]
    #[IsGranted('partners.read')]
    public function detect(Request $request, PartnerRepository $repo): JsonResponse
    {
        $data = json_decode($request->getContent(), true) ?? [];
        $email = $data['email'] ?? null;
        $contactName = $data['contactName'] ?? null;
        $company = $data['company'] ?? null;

        $partners = $repo->findBy(['isActive' => true]);
        $matched = null;

        foreach ($partners as $p) {
            // 1. Check email against detectionEmails (full email or domain match)
            if ($email && $p->getDetectionEmails()) {
                foreach ($p->getDetectionEmails() as $pattern) {
                    if (str_starts_with($pattern, '@')) {
                        // Domain match
                        if (str_ends_with(strtolower($email), strtolower($pattern))) {
                            $matched = $p;
                            break 2;
                        }
                    } else {
                        // Full email match
                        if (strtolower($email) === strtolower($pattern)) {
                            $matched = $p;
                            break 2;
                        }
                    }
                }
            }

            // 2. Check company/contactName against detectionKeywords
            if ($p->getDetectionKeywords()) {
                foreach ($p->getDetectionKeywords() as $keyword) {
                    $kw = strtolower($keyword);
                    if ($company && str_contains(strtolower($company), $kw)) {
                        $matched = $p;
                        break 2;
                    }
                    if ($contactName && str_contains(strtolower($contactName), $kw)) {
                        $matched = $p;
                        break 2;
                    }
                }
            }

            // 3. Check email/IC against partner's own email/ic fields
            if ($email && $p->getEmail() && strtolower($email) === strtolower($p->getEmail())) {
                $matched = $p;
                break;
            }
            if (isset($data['ic']) && $p->getIc() && $data['ic'] === $p->getIc()) {
                $matched = $p;
                break;
            }
        }

        if (!$matched) {
            return $this->json(['partner' => null]);
        }

        $pricingOverrides = $this->buildPricingOverrides($matched);

        return $this->json([
            'partner' => [
                'id' => $matched->getId(),
                'name' => $matched->getName(),
                'partnerType' => $matched->getPartnerType(),
                'contactPerson' => $matched->getContactPerson(),
                'email' => $matched->getEmail(),
                'phone' => $matched->getPhone(),
                'address' => $matched->getAddress(),
                'currency' => $matched->getCurrency(),
                'commissionRate' => $matched->getCommissionRate(),
                'commissionAmount' => $matched->getCommissionAmount(),
                'paymentMethod' => $matched->getPaymentMethod(),
                'bankAccount' => $matched->getBankAccount(),
                'ic' => $matched->getIc(),
                'dic' => $matched->getDic(),
                'isActive' => $matched->isActive(),
                'notes' => $matched->getNotes(),
                'pricingModel' => $matched->getPricingModel(),
                'flatPriceAdult' => $matched->getFlatPriceAdult(),
                'flatPriceChild' => $matched->getFlatPriceChild(),
                'flatPriceInfant' => $matched->getFlatPriceInfant(),
                'customMenuPrices' => $matched->getCustomMenuPrices(),
                'billingPeriod' => $matched->getBillingPeriod(),
                'billingEmail' => $matched->getBillingEmail(),
                'invoiceCompany' => $matched->getInvoiceCompany(),
                'invoiceStreet' => $matched->getInvoiceStreet(),
                'invoiceCity' => $matched->getInvoiceCity(),
                'invoiceZipcode' => $matched->getInvoiceZipcode(),
                'detectionEmails' => $matched->getDetectionEmails(),
                'detectionKeywords' => $matched->getDetectionKeywords(),
                'createdAt' => $matched->getCreatedAt()->format(DATE_ATOM),
                'updatedAt' => $matched->getUpdatedAt()->format(DATE_ATOM),
            ],
            'pricingOverrides' => $pricingOverrides,
        ]);
    }

    #[Route('/{id}/calculate-price', methods: ['POST'])]
    #[IsGranted('partners.read')]
    public function calculatePrice(int $id, Request $request, PartnerRepository $repo): JsonResponse
    {
        $p = $repo->find($id);
        if (!$p) {
            return $this->json(['error' => 'Partner not found'], 404);
        }

        $data = json_decode($request->getContent(), true) ?? [];
        $persons = $data['persons'] ?? [];
        $dateStr = $data['date'] ?? null;

        // Get system default prices
        $pricingDefault = $this->em->getRepository(PricingDefault::class)->findOneBy([]);
        $systemAdult = $pricingDefault ? (float)$pricingDefault->getAdultPrice() : 1250;
        $systemChild = $pricingDefault ? (float)$pricingDefault->getChildPrice() : 800;
        $systemInfant = $pricingDefault ? (float)$pricingDefault->getInfantPrice() : 0;

        // If a date is provided, check SpecialDateRules
        if ($dateStr) {
            try {
                $date = new \DateTime($dateStr);
                $systemAdult = SpecialDateRules::getBasePrice('adult', $date);
                $systemChild = SpecialDateRules::getBasePrice('child', $date);
                $systemInfant = SpecialDateRules::getBasePrice('infant', $date);
            } catch (\Exception $e) {
                // Ignore invalid date, use defaults
            }
        }

        $result = [];
        foreach ($persons as $person) {
            $type = strtolower($person['type'] ?? 'adult');
            $menu = $person['menu'] ?? null;
            $price = 0;

            switch ($p->getPricingModel()) {
                case 'FLAT':
                    $price = match ($type) {
                        'adult' => (float)($p->getFlatPriceAdult() ?? $systemAdult),
                        'child' => (float)($p->getFlatPriceChild() ?? $systemChild),
                        'infant' => (float)($p->getFlatPriceInfant() ?? $systemInfant),
                        default => 0,
                    };
                    break;

                case 'CUSTOM':
                    $menuPrices = $p->getCustomMenuPrices() ?? [];
                    if ($menu && isset($menuPrices[$menu])) {
                        $price = (float)$menuPrices[$menu];
                    } else {
                        // Fallback to system price
                        $price = match ($type) {
                            'adult' => $systemAdult,
                            'child' => $systemChild,
                            'infant' => $systemInfant,
                            default => 0,
                        };
                    }
                    break;

                case 'DEFAULT':
                default:
                    $price = match ($type) {
                        'adult' => $systemAdult,
                        'child' => $systemChild,
                        'infant' => $systemInfant,
                        default => 0,
                    };
                    break;
            }

            $result[] = [
                'type' => $type,
                'menu' => $menu,
                'price' => $price,
            ];
        }

        return $this->json([
            'pricingModel' => $p->getPricingModel(),
            'persons' => $result,
            'total' => array_sum(array_column($result, 'price')),
        ]);
    }

    private function buildPricingOverrides(Partner $p): array
    {
        $overrides = [
            'pricingModel' => $p->getPricingModel(),
        ];

        if ($p->getPricingModel() === 'FLAT') {
            $overrides['adultPrice'] = $p->getFlatPriceAdult() ? (float)$p->getFlatPriceAdult() : null;
            $overrides['childPrice'] = $p->getFlatPriceChild() ? (float)$p->getFlatPriceChild() : null;
            $overrides['infantPrice'] = $p->getFlatPriceInfant() ? (float)$p->getFlatPriceInfant() : null;
        } elseif ($p->getPricingModel() === 'CUSTOM') {
            $overrides['menuPrices'] = $p->getCustomMenuPrices();
        }

        return $overrides;
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
            'currency' => $p->getCurrency(),
            'commissionRate' => $p->getCommissionRate(),
            'commissionAmount' => $p->getCommissionAmount(),
            'paymentMethod' => $p->getPaymentMethod(),
            'bankAccount' => $p->getBankAccount(),
            'ic' => $p->getIc(),
            'dic' => $p->getDic(),
            'isActive' => $p->isActive(),
            'notes' => $p->getNotes(),
            'pricingModel' => $p->getPricingModel(),
            'flatPriceAdult' => $p->getFlatPriceAdult(),
            'flatPriceChild' => $p->getFlatPriceChild(),
            'flatPriceInfant' => $p->getFlatPriceInfant(),
            'customMenuPrices' => $p->getCustomMenuPrices(),
            'billingPeriod' => $p->getBillingPeriod(),
            'billingEmail' => $p->getBillingEmail(),
            'invoiceCompany' => $p->getInvoiceCompany(),
            'invoiceStreet' => $p->getInvoiceStreet(),
            'invoiceCity' => $p->getInvoiceCity(),
            'invoiceZipcode' => $p->getInvoiceZipcode(),
            'detectionEmails' => $p->getDetectionEmails(),
            'detectionKeywords' => $p->getDetectionKeywords(),
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
        if (!empty($data['currency'])) $p->setCurrency($data['currency']);
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
        if (isset($data['pricingModel'])) $p->setPricingModel($data['pricingModel']);
        if (isset($data['flatPriceAdult'])) $p->setFlatPriceAdult((string)$data['flatPriceAdult']);
        if (isset($data['flatPriceChild'])) $p->setFlatPriceChild((string)$data['flatPriceChild']);
        if (isset($data['flatPriceInfant'])) $p->setFlatPriceInfant((string)$data['flatPriceInfant']);
        if (isset($data['customMenuPrices'])) $p->setCustomMenuPrices($data['customMenuPrices']);
        if (isset($data['billingPeriod'])) $p->setBillingPeriod($data['billingPeriod']);
        if (isset($data['billingEmail'])) $p->setBillingEmail($data['billingEmail']);
        if (isset($data['invoiceCompany'])) $p->setInvoiceCompany($data['invoiceCompany']);
        if (isset($data['invoiceStreet'])) $p->setInvoiceStreet($data['invoiceStreet']);
        if (isset($data['invoiceCity'])) $p->setInvoiceCity($data['invoiceCity']);
        if (isset($data['invoiceZipcode'])) $p->setInvoiceZipcode($data['invoiceZipcode']);
        if (isset($data['detectionEmails'])) $p->setDetectionEmails($data['detectionEmails']);
        if (isset($data['detectionKeywords'])) $p->setDetectionKeywords($data['detectionKeywords']);
        // updatedAt handled by DB trigger in SQL; in app we can set explicitly if needed
        $this->em->flush();
        return $this->json(['status' => 'updated']);
    }

    #[Route('/bulk', methods: ['POST'])]
    #[IsGranted('partners.update')]
    public function bulk(Request $request, PartnerRepository $repo): JsonResponse
    {
        $data = json_decode($request->getContent(), true) ?? [];
        $ids = $data['ids'] ?? [];
        $action = $data['action'] ?? null;

        if (empty($ids) || !$action) {
            return $this->json(['error' => 'Missing ids or action'], 400);
        }

        $partners = $repo->findBy(['id' => $ids]);
        $count = 0;

        foreach ($partners as $p) {
            switch ($action) {
                case 'activate':
                    $p->setIsActive(true);
                    $count++;
                    break;
                case 'deactivate':
                    $p->setIsActive(false);
                    $count++;
                    break;
                case 'delete':
                    if (!$this->isGranted('partners.delete')) {
                        return $this->json(['error' => 'Nemáte oprávnění mazat partnery'], 403);
                    }
                    $this->em->remove($p);
                    $count++;
                    break;
            }
        }

        $this->em->flush();
        return $this->json(['status' => 'ok', 'affected' => $count]);
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

    #[Route('/{id}/reservations', methods: ['GET'])]
    #[IsGranted('partners.read')]
    public function partnerReservations(int $id, PartnerRepository $repo, ReservationRepository $reservationRepo): JsonResponse
    {
        $p = $repo->find($id);
        if (!$p) {
            return $this->json(['error' => 'Partner not found'], 404);
        }

        // Find reservations by partnerId
        $reservations = $reservationRepo->findBy(['partnerId' => $id], ['date' => 'DESC']);

        // Also find by detection emails if set
        $detectionEmails = $p->getDetectionEmails() ?? [];
        if (!empty($detectionEmails)) {
            $qb = $reservationRepo->createQueryBuilder('r')
                ->where('r.partnerId IS NULL');

            $orConditions = [];
            foreach ($detectionEmails as $i => $email) {
                $paramName = 'email_' . $i;
                if (str_starts_with($email, '@')) {
                    $orConditions[] = "LOWER(r.contactEmail) LIKE LOWER(:$paramName)";
                    $qb->setParameter($paramName, '%' . strtolower($email));
                } else {
                    $orConditions[] = "LOWER(r.contactEmail) = LOWER(:$paramName)";
                    $qb->setParameter($paramName, strtolower($email));
                }
            }

            if (!empty($orConditions)) {
                $qb->andWhere('(' . implode(' OR ', $orConditions) . ')')
                    ->orderBy('r.date', 'DESC');
                $emailReservations = $qb->getQuery()->getResult();

                // Merge, avoiding duplicates
                $existingIds = array_map(fn($r) => $r->getId(), $reservations);
                foreach ($emailReservations as $er) {
                    if (!in_array($er->getId(), $existingIds)) {
                        $reservations[] = $er;
                    }
                }
            }
        }

        // Sort by date descending
        usort($reservations, fn($a, $b) => $b->getDate() <=> $a->getDate());

        $totalPersons = 0;
        $totalRevenue = 0;
        $items = [];

        foreach ($reservations as $r) {
            $personsCount = $r->getPersons()->count();
            $totalPrice = (float)($r->getTotalPrice() ?? 0);
            $totalPersons += $personsCount;
            $totalRevenue += $totalPrice;

            $items[] = [
                'id' => $r->getId(),
                'date' => $r->getDate()?->format('Y-m-d'),
                'contactName' => $r->getContactName(),
                'contactEmail' => $r->getContactEmail(),
                'personsCount' => $personsCount,
                'totalPrice' => $totalPrice,
                'status' => $r->getStatus(),
            ];
        }

        return $this->json([
            'items' => $items,
            'summary' => [
                'totalReservations' => count($reservations),
                'totalPersons' => $totalPersons,
                'totalRevenue' => $totalRevenue,
            ],
        ]);
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
