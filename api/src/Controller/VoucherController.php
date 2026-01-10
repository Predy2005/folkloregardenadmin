<?php

namespace App\Controller;

use App\Entity\CommissionLog;
use App\Entity\Reservation;
use App\Entity\Voucher;
use App\Entity\VoucherRedemption;
use App\Repository\CommissionLogRepository;
use App\Repository\PartnerRepository;
use App\Repository\ReservationRepository;
use App\Repository\VoucherRedemptionRepository;
use App\Repository\VoucherRepository;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Annotation\Route;
use Symfony\Component\Security\Http\Attribute\IsGranted;

#[Route('/api/voucher')]
class VoucherController extends AbstractController
{
    public function __construct(private readonly EntityManagerInterface $em)
    {
    }

    #[Route('', methods: ['GET'])]
    #[IsGranted('vouchers.read')]
    public function list(VoucherRepository $repo): JsonResponse
    {
        $list = $repo->findBy([], ['id' => 'DESC']);
        $data = array_map(function (Voucher $v) {
            return [
                'id' => $v->getId(),
                'code' => $v->getCode(),
                'partnerId' => $v->getPartner()?->getId(),
                'voucherType' => $v->getVoucherType(),
                'discountValue' => $v->getDiscountValue(),
                'maxUses' => $v->getMaxUses(),
                'currentUses' => $v->getCurrentUses(),
                'validFrom' => $v->getValidFrom()?->format('Y-m-d'),
                'validTo' => $v->getValidTo()?->format('Y-m-d'),
                'isActive' => $v->isActive(),
            ];
        }, $list);
        return $this->json($data);
    }

    #[Route('/{id}', methods: ['GET'])]
    #[IsGranted('vouchers.read')]
    public function detail(int $id, VoucherRepository $repo, VoucherRedemptionRepository $redRepo): JsonResponse
    {
        $v = $repo->find($id);
        if (!$v) { return $this->json(['error' => 'Not found'], 404); }
        $reds = $redRepo->findBy(['voucher' => $v], ['redeemedAt' => 'DESC']);
        return $this->json([
            'id' => $v->getId(),
            'code' => $v->getCode(),
            'partnerId' => $v->getPartner()?->getId(),
            'voucherType' => $v->getVoucherType(),
            'discountValue' => $v->getDiscountValue(),
            'maxUses' => $v->getMaxUses(),
            'currentUses' => $v->getCurrentUses(),
            'validFrom' => $v->getValidFrom()?->format('Y-m-d'),
            'validTo' => $v->getValidTo()?->format('Y-m-d'),
            'isActive' => $v->isActive(),
            'notes' => $v->getNotes(),
            'createdAt' => $v->getCreatedAt()->format(DATE_ATOM),
            'updatedAt' => $v->getUpdatedAt()->format(DATE_ATOM),
            'redemptions' => array_map(function (VoucherRedemption $r) {
                return [
                    'id' => $r->getId(),
                    'redeemedAt' => $r->getRedeemedAt()->format(DATE_ATOM),
                    'reservationId' => $r->getReservation()?->getId(),
                    'discountApplied' => $r->getDiscountApplied(),
                    'originalAmount' => $r->getOriginalAmount(),
                    'finalAmount' => $r->getFinalAmount(),
                ];
            }, $reds)
        ]);
    }

    #[Route('', methods: ['POST'])]
    #[IsGranted('vouchers.create')]
    public function create(Request $req, PartnerRepository $partnerRepo, VoucherRepository $repo): JsonResponse
    {
        $d = json_decode($req->getContent(), true) ?? [];
        foreach (['code','voucherType'] as $k) {
            if (!isset($d[$k])) return $this->json(['error' => 'Missing '.$k], 400);
        }
        $v = new Voucher();
        $v->setCode($d['code'])
          ->setVoucherType($d['voucherType'])
          ->setDiscountValue(isset($d['discountValue']) ? (string)$d['discountValue'] : null)
          ->setMaxUses((int)($d['maxUses'] ?? 1))
          ->setCurrentUses((int)($d['currentUses'] ?? 0))
          ->setIsActive((bool)($d['isActive'] ?? true))
          ->setNotes($d['notes'] ?? null);
        if (!empty($d['partnerId'])) {
            $p = $partnerRepo->find((int)$d['partnerId']);
            if ($p) $v->setPartner($p);
        }
        if (!empty($d['validFrom'])) $v->setValidFrom(new \DateTime($d['validFrom']));
        if (!empty($d['validTo'])) $v->setValidTo(new \DateTime($d['validTo']));
        $this->em->persist($v);
        $this->em->flush();
        return $this->json(['status' => 'created', 'id' => $v->getId()], 201);
    }

    #[Route('/{id}', methods: ['PUT','PATCH'])]
    #[IsGranted('vouchers.update')]
    public function update(int $id, Request $req, PartnerRepository $partnerRepo, VoucherRepository $repo): JsonResponse
    {
        $v = $repo->find($id);
        if (!$v) return $this->json(['error' => 'Not found'], 404);
        $d = json_decode($req->getContent(), true) ?? [];
        if (isset($d['code'])) $v->setCode($d['code']);
        if (isset($d['voucherType'])) $v->setVoucherType($d['voucherType']);
        if (array_key_exists('discountValue',$d)) $v->setDiscountValue($d['discountValue'] !== null ? (string)$d['discountValue'] : null);
        if (isset($d['maxUses'])) $v->setMaxUses((int)$d['maxUses']);
        if (isset($d['currentUses'])) $v->setCurrentUses((int)$d['currentUses']);
        if (array_key_exists('isActive',$d)) $v->setIsActive((bool)$d['isActive']);
        if (isset($d['notes'])) $v->setNotes($d['notes']);
        if (array_key_exists('partnerId',$d)) {
            $p = $d['partnerId'] ? $partnerRepo->find((int)$d['partnerId']) : null;
            $v->setPartner($p);
        }
        if (array_key_exists('validFrom',$d)) $v->setValidFrom($d['validFrom'] ? new \DateTime($d['validFrom']) : null);
        if (array_key_exists('validTo',$d)) $v->setValidTo($d['validTo'] ? new \DateTime($d['validTo']) : null);
        $this->em->flush();
        return $this->json(['status' => 'updated']);
    }

    #[Route('/{id}', methods: ['DELETE'])]
    #[IsGranted('vouchers.delete')]
    public function delete(int $id, VoucherRepository $repo): JsonResponse
    {
        $v = $repo->find($id);
        if (!$v) return $this->json(['error' => 'Not found'], 404);
        $this->em->remove($v);
        $this->em->flush();
        return $this->json(['status' => 'deleted']);
    }

    #[Route('/redeem', methods: ['POST'])]
    #[IsGranted('vouchers.redeem')]
    public function redeem(
        Request $req,
        VoucherRepository $voucherRepo,
        ReservationRepository $reservationRepo,
        VoucherRedemptionRepository $redRepo,
        CommissionLogRepository $commissionRepo,
        PartnerRepository $partnerRepo
    ): JsonResponse {
        $d = json_decode($req->getContent(), true) ?? [];
        $now = new \DateTime();
        $voucher = null;
        if (!empty($d['code'])) {
            $voucher = $voucherRepo->findOneBy(['code' => $d['code']]);
        } elseif (!empty($d['voucherId'])) {
            $voucher = $voucherRepo->find((int)$d['voucherId']);
        }
        if (!$voucher) return $this->json(['error' => 'Voucher not found'], 404);
        if (!$voucher->isActive()) return $this->json(['error' => 'Voucher inactive'], 400);
        if ($voucher->getValidFrom() && $now < $voucher->getValidFrom()) return $this->json(['error' => 'Voucher not yet valid'], 400);
        if ($voucher->getValidTo() && $now > $voucher->getValidTo()) return $this->json(['error' => 'Voucher expired'], 400);
        if ($voucher->getCurrentUses() >= $voucher->getMaxUses()) return $this->json(['error' => 'Voucher usage limit reached'], 400);
        if (!isset($d['originalAmount'])) return $this->json(['error' => 'Missing originalAmount'], 400);

        $original = (float)$d['originalAmount'];
        $discount = 0.0;
        switch ($voucher->getVoucherType()) {
            case 'PERCENTAGE':
                $discount = $original * ((float)($voucher->getDiscountValue() ?? 0)) / 100.0;
                break;
            case 'FIXED_AMOUNT':
                $discount = (float)($voucher->getDiscountValue() ?? 0);
                break;
            case 'FREE_ENTRY':
                $discount = $original;
                break;
            default:
                $discount = 0.0;
        }
        if ($discount > $original) $discount = $original;
        $final = max(0.0, $original - $discount);

        $red = new VoucherRedemption();
        $red->setVoucher($voucher)
            ->setOriginalAmount((string)$original)
            ->setDiscountApplied((string)$discount)
            ->setFinalAmount((string)$final)
            ->setRedeemedAt($now)
            ->setNotes($d['notes'] ?? null);
        if (!empty($d['reservationId'])) {
            $res = $reservationRepo->find((int)$d['reservationId']);
            if ($res) $red->setReservation($res);
        }
        $this->em->persist($red);

        // Commission log for partner if defined
        if ($voucher->getPartner()) {
            $p = $voucher->getPartner();
            $log = new CommissionLog();
            $log->setPartner($p)
                ->setVoucher($voucher)
                ->setReservation(isset($res) ? $res : null)
                ->setCommissionType('VOUCHER_REDEMPTION')
                ->setBaseAmount((string)$final);
            $rate = $p->getCommissionRate() ? (float)$p->getCommissionRate() : 0.0;
            if ($rate > 0) {
                $log->setCommissionRate((string)$rate);
                $log->setCommissionAmount((string)round($final * $rate / 100.0, 2));
            } else {
                $fixed = (float)$p->getCommissionAmount();
                $log->setCommissionAmount((string)round($fixed, 2));
            }
            $this->em->persist($log);
        }

        $this->em->flush();
        return $this->json([
            'status' => 'redeemed',
            'redemptionId' => $red->getId(),
            'discountApplied' => $red->getDiscountApplied(),
            'finalAmount' => $red->getFinalAmount(),
        ], 201);
    }
}
