<?php
declare(strict_types=1);

namespace App\Controller;

use App\Entity\CompanySettings;
use App\Repository\CompanySettingsRepository;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Annotation\Route;
use Symfony\Component\Security\Http\Attribute\IsGranted;

#[Route('/api/company-settings')]
#[IsGranted('IS_AUTHENTICATED_FULLY')]
class CompanySettingsController extends AbstractController
{
    public function __construct(
        private CompanySettingsRepository $repository,
        private EntityManagerInterface $entityManager,
    ) {
    }

    #[Route('', methods: ['GET'])]
    public function get(): JsonResponse
    {
        $settings = $this->repository->getOrCreateDefault();

        return new JsonResponse($this->toArray($settings));
    }

    #[Route('', methods: ['PUT'])]
    public function update(Request $request): JsonResponse
    {
        $data = json_decode($request->getContent(), true);

        $settings = $this->repository->getOrCreateDefault();

        // Základní informace
        if (isset($data['companyName'])) {
            $settings->setCompanyName($data['companyName']);
        }
        if (isset($data['street'])) {
            $settings->setStreet($data['street']);
        }
        if (isset($data['city'])) {
            $settings->setCity($data['city']);
        }
        if (isset($data['zipcode'])) {
            $settings->setZipcode($data['zipcode']);
        }
        if (isset($data['country'])) {
            $settings->setCountry($data['country']);
        }
        if (isset($data['ico'])) {
            $settings->setIco($data['ico']);
        }
        if (isset($data['dic'])) {
            $settings->setDic($data['dic']);
        }

        // Kontaktní údaje
        if (isset($data['email'])) {
            $settings->setEmail($data['email']);
        }
        if (isset($data['phone'])) {
            $settings->setPhone($data['phone']);
        }
        if (isset($data['web'])) {
            $settings->setWeb($data['web']);
        }

        // Bankovní údaje
        if (isset($data['bankAccount'])) {
            $settings->setBankAccount($data['bankAccount']);
        }
        if (isset($data['bankCode'])) {
            $settings->setBankCode($data['bankCode']);
        }
        if (isset($data['bankName'])) {
            $settings->setBankName($data['bankName']);
        }
        if (isset($data['iban'])) {
            $settings->setIban($data['iban']);
        }
        if (isset($data['swift'])) {
            $settings->setSwift($data['swift']);
        }

        // Fakturační nastavení - ostré faktury
        if (isset($data['invoicePrefix'])) {
            $settings->setInvoicePrefix($data['invoicePrefix']);
        }
        if (isset($data['invoiceNextNumber'])) {
            $settings->setInvoiceNextNumber((int) $data['invoiceNextNumber']);
        }

        // Fakturační nastavení - zálohové faktury
        if (isset($data['depositInvoicePrefix'])) {
            $settings->setDepositInvoicePrefix($data['depositInvoicePrefix']);
        }
        if (isset($data['depositInvoiceNextNumber'])) {
            $settings->setDepositInvoiceNextNumber((int) $data['depositInvoiceNextNumber']);
        }

        if (isset($data['invoiceDueDays'])) {
            $settings->setInvoiceDueDays((int) $data['invoiceDueDays']);
        }
        if (isset($data['defaultVatRate'])) {
            $settings->setDefaultVatRate((int) $data['defaultVatRate']);
        }

        // Ostatní
        if (isset($data['logoBase64'])) {
            $settings->setLogoBase64($data['logoBase64']);
        }
        if (isset($data['invoiceFooterText'])) {
            $settings->setInvoiceFooterText($data['invoiceFooterText']);
        }
        if (isset($data['registrationInfo'])) {
            $settings->setRegistrationInfo($data['registrationInfo']);
        }
        if (isset($data['isVatPayer'])) {
            $settings->setIsVatPayer((bool) $data['isVatPayer']);
        }
        if (array_key_exists('mainCashboxHidden', $data)) {
            $settings->setMainCashboxHidden((bool) $data['mainCashboxHidden']);
        }
        if (isset($data['defaultCurrency'])) {
            $settings->setDefaultCurrency($data['defaultCurrency']);
        }
        if (isset($data['enabledCurrencies']) && is_array($data['enabledCurrencies'])) {
            $settings->setEnabledCurrencies($data['enabledCurrencies']);
        }

        $settings->setUpdatedAt(new \DateTime());

        $this->entityManager->persist($settings);
        $this->entityManager->flush();

        return new JsonResponse($this->toArray($settings));
    }

    #[Route('/init', methods: ['POST'])]
    public function initDefault(Request $request): JsonResponse
    {
        $existing = $this->repository->getDefault();

        if ($existing !== null) {
            return new JsonResponse(
                ['error' => 'Nastavení již existuje, použijte PUT pro aktualizaci'],
                Response::HTTP_CONFLICT
            );
        }

        $data = json_decode($request->getContent(), true);

        $settings = new CompanySettings();
        $settings->setCode('default');
        $settings->setCompanyName($data['companyName'] ?? '');
        $settings->setStreet($data['street'] ?? '');
        $settings->setCity($data['city'] ?? '');
        $settings->setZipcode($data['zipcode'] ?? '');
        $settings->setCountry($data['country'] ?? 'Česká republika');
        $settings->setIco($data['ico'] ?? '');
        $settings->setDic($data['dic'] ?? null);

        // Kontaktní údaje
        $settings->setEmail($data['email'] ?? null);
        $settings->setPhone($data['phone'] ?? null);
        $settings->setWeb($data['web'] ?? null);

        // Bankovní údaje
        $settings->setBankAccount($data['bankAccount'] ?? null);
        $settings->setBankCode($data['bankCode'] ?? null);
        $settings->setBankName($data['bankName'] ?? null);
        $settings->setIban($data['iban'] ?? null);
        $settings->setSwift($data['swift'] ?? null);

        // Fakturační nastavení - ostré faktury
        $settings->setInvoicePrefix($data['invoicePrefix'] ?? 'FG');
        $settings->setInvoiceNextNumber((int) ($data['invoiceNextNumber'] ?? 1));

        // Fakturační nastavení - zálohové faktury
        $settings->setDepositInvoicePrefix($data['depositInvoicePrefix'] ?? 'ZF');
        $settings->setDepositInvoiceNextNumber((int) ($data['depositInvoiceNextNumber'] ?? 1));

        $settings->setInvoiceDueDays((int) ($data['invoiceDueDays'] ?? 14));
        $settings->setDefaultVatRate((int) ($data['defaultVatRate'] ?? 21));

        // Ostatní
        $settings->setLogoBase64($data['logoBase64'] ?? null);
        $settings->setInvoiceFooterText($data['invoiceFooterText'] ?? null);
        $settings->setRegistrationInfo($data['registrationInfo'] ?? null);
        $settings->setIsVatPayer((bool) ($data['isVatPayer'] ?? true));

        $this->entityManager->persist($settings);
        $this->entityManager->flush();

        return new JsonResponse($this->toArray($settings), Response::HTTP_CREATED);
    }

    private function toArray(CompanySettings $settings): array
    {
        return [
            'id' => $settings->getId(),
            'code' => $settings->getCode(),

            // Základní informace
            'companyName' => $settings->getCompanyName(),
            'street' => $settings->getStreet(),
            'city' => $settings->getCity(),
            'zipcode' => $settings->getZipcode(),
            'country' => $settings->getCountry(),
            'ico' => $settings->getIco(),
            'dic' => $settings->getDic(),

            // Kontaktní údaje
            'email' => $settings->getEmail(),
            'phone' => $settings->getPhone(),
            'web' => $settings->getWeb(),

            // Bankovní údaje
            'bankAccount' => $settings->getBankAccount(),
            'bankCode' => $settings->getBankCode(),
            'bankName' => $settings->getBankName(),
            'fullBankAccount' => $settings->getFullBankAccount(),
            'iban' => $settings->getIban(),
            'swift' => $settings->getSwift(),

            // Fakturační nastavení - ostré faktury
            'invoicePrefix' => $settings->getInvoicePrefix(),
            'invoiceNextNumber' => $settings->getInvoiceNextNumber(),

            // Fakturační nastavení - zálohové faktury
            'depositInvoicePrefix' => $settings->getDepositInvoicePrefix(),
            'depositInvoiceNextNumber' => $settings->getDepositInvoiceNextNumber(),

            'invoiceDueDays' => $settings->getInvoiceDueDays(),
            'defaultVatRate' => $settings->getDefaultVatRate(),

            // Ostatní
            'logoBase64' => $settings->getLogoBase64(),
            'invoiceFooterText' => $settings->getInvoiceFooterText(),
            'registrationInfo' => $settings->getRegistrationInfo(),
            'isVatPayer' => $settings->isVatPayer(),

            'mainCashboxHidden' => $settings->isMainCashboxHidden(),

            // Currency
            'defaultCurrency' => $settings->getDefaultCurrency(),
            'enabledCurrencies' => $settings->getEnabledCurrencies(),

            'createdAt' => $settings->getCreatedAt()->format('Y-m-d H:i:s'),
            'updatedAt' => $settings->getUpdatedAt()->format('Y-m-d H:i:s'),
        ];
    }
}
