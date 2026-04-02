<?php

namespace App\Controller;

use App\Service\SafeMailerService;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\Mime\Email;
use Symfony\Component\Routing\Annotation\Route;
use App\Enum\FoodMenu;

class TestReservationEmailController extends AbstractController
{
    private SafeMailerService $mailer;
    private string $appEnv;

    public function __construct(SafeMailerService $mailer, string $appEnv)
    {
        $this->mailer = $mailer;
        $this->appEnv = $appEnv;
    }

    #[Route('/api/test/reservation-email', name: 'test_reservation_email', methods: ['GET'])]
    public function testReservationEmail(): JsonResponse
    {
        if ($this->appEnv === 'prod') {
            return new JsonResponse(['error' => 'Test endpoints are disabled in production'], JsonResponse::HTTP_FORBIDDEN);
        }

        // Testovací data simulující přijatý JSON request
        $testData = [
            'date' => '2025-06-15',
            'contact' => [
                'name' => 'Jan Novák',
                'email' => 'jan.novak@example.com',
                'phone' => '+420123456789',
                'nationality' => 'Česká',
                'note' => 'Pozdní příjezd'
            ],
            'invoice' => [
                'sameAsContact' => false,
                'name' => 'Firma s.r.o.',
                'company' => 'Firma s.r.o.',
                'ico' => 'CZ12345678',
                'dic' => 'CZ1234567890',
                'email' => 'fakturace@firma.cz',
                'phone' => '+420987654321'
            ],
            'transfer' => [
                'selected' => true,
                'count' => 3,
                'address' => 'Hlavní 123, Praha'
            ],
            'persons' => [
                [
                    'type' => 'adult',
                    'menu' => 11,
                    'price' => 1250
                ],
                [
                    'type' => 'child',
                    'menu' => 10,
                    'price' => 800
                ],
                [
                    'type' => 'infant',
                    'menu' => 0,
                    'price' => 0
                ]
            ],
            'agreement' => true,
            'withPayment' => true,
            'paymentMethod' => 'CARD'
        ];

        // Generování testovacího ID rezervace
        $resId = rand(1000, 9999);
        $date = $testData['date'];
        $contactName = $testData['contact']['name'];
        $contactEmail = $testData['contact']['email'];
        $contactPhone = $testData['contact']['phone'];
        $contactNationality = $testData['contact']['nationality'];

        $invoiceSame = $testData['invoice']['sameAsContact'] ?? false;
        $invoiceLabel = $invoiceSame ? 'Ano' : 'Ne';
        $invoiceName = $invoiceSame ? $contactName : ($testData['invoice']['company'] ?? '');
        $invoiceCompany = $testData['invoice']['company'] ?? '';
        $invoiceIco = $testData['invoice']['ico'] ?? '';
        $invoiceDic = $testData['invoice']['dic'] ?? '';

        // Sestavení řádků pro osoby
        $personsRows = '';
        foreach ($testData['persons'] as $i => $person) {
            $idx = $i + 1;
            $menuCode = (string)$person['menu'];
            $menu = FoodMenu::tryFrom($menuCode) ?? FoodMenu::NONE;
            $foodLabel = $menu->getLabel();
            $foodPrice = $menu->getPrice();
            $personLabels = [
                'adult' => 'Dospělých osob - 1250 Kč / osoba',
                'child' => 'Dětí 3 – 12 let - 800 Kč / osoba',
                'infant' => 'Dětí 0 – 2 roky - 0 Kč / osoba',
            ];
            $personLabel = $personLabels[$person['type']] ?? $person['type'];
            $personsRows .= <<<ROW
                    <tr>
                      <td>{$idx}</td>
                      <td>{$personLabel}</td>
                      <td>{$foodLabel}</td>
                      <td style="text-align:right;">{$foodPrice} Kč</td>
                    </tr>
                    ROW;
        }

        // Případný transfer
        $transferRow = '';
        $transferPrice = 0;
        if (!empty($testData['transfer']['selected'])) {
            $transferPrice = ($testData['transfer']['count'] ?? 0) * 300;
            $transferRow = <<<TRF
                <tr>
                    <td colspan="3" style="padding:8px;border:1px solid #ddd;text-align:right;">
                        <strong>Transfer ({$testData['transfer']['count']}×300 Kč):</strong>
                    </td>
                    <td style="padding:8px;border:1px solid #ddd;text-align:right;">{$transferPrice} Kč</td>
                </tr>
                <tr><td>Adresa:</td><td colspan="3">{$testData['transfer']['address']}</td></tr>
            TRF;
        }

        // Výpočet celkové ceny
        $total = array_sum(array_map(
                fn($p) => $p['price'] + (FoodMenu::tryFrom((string)$p['menu'])?->getPrice() ?? 0),
                $testData['persons']
            )) + $transferPrice;
        // Hlavní HTML e-mail (identická struktura jako v původním kódu)
        $html = <<<HTML
        <!DOCTYPE html>
        <html lang="cs">
        <head>
            <meta charset="UTF-8">
            <title>Potvrzení rezervace č. {$resId}</title>
        </head>
        <body style="font-family:Arial,sans-serif;color:#333;line-height:1.4;">
            <h2 style="color:#2a7fd4;">Potvrzení rezervace č. {$resId}</h2>
            <p><strong>Datum představení:</strong> {$date}</p>
        
            <h3>Kontaktní údaje</h3>
            <table style="width:100%;border-collapse:collapse;margin-bottom:20px;">
                <tr><td><strong>Jméno:</strong></td><td>{$contactName}</td></tr>
                <tr><td><strong>E-mail:</strong></td><td>{$contactEmail}</td></tr>
                <tr><td><strong>Telefon:</strong></td><td>{$contactPhone}</td></tr>
                <tr><td><strong>Národnost:</strong></td><td>{$contactNationality}</td></tr>
            </table>
        
            <h3>Fakturační údaje</h3>
            <table style="width:100%;border-collapse:collapse;margin-bottom:20px;">
                <tr><td><strong>Stejné jako kontakt:</strong></td><td>{$invoiceLabel}</td></tr>
                <tr><td><strong>Jméno / Společnost:</strong></td><td>{$invoiceName}</td></tr>
                <tr><td><strong>IČO:</strong></td><td>{$invoiceIco}</td></tr>
                <tr><td><strong>DIČ:</strong></td><td>{$invoiceDic}</td></tr>
            </table>
        
            <h3>Osoby a jídla</h3>
            <table style="width:100%;border:1px solid #ddd;border-collapse:collapse;margin-bottom:20px;">
                <thead>
                    <tr style="background:#f0f0f0;">
                        <th style="padding:8px;border:1px solid #ddd;">#</th>
                        <th style="padding:8px;border:1px solid #ddd;">Typ</th>
                        <th style="padding:8px;border:1px solid #ddd;">Jídlo</th>
                        <th style="padding:8px;border:1px solid #ddd;">Cena (Kč)</th>
                    </tr>
                </thead>
                <tbody>
                    {$personsRows}
                    {$transferRow}
                </tbody>
            </table>
        
            <h3>Celková cena: <span style="color:#2a7fd4;">{$total} Kč</span></h3>
            <p>Děkujeme za vaši rezervaci. Těšíme se na vás!</p>
        </body>
        </html>
        HTML;

        // Odeslání testovacího e-mailu
        $email = (new Email())
            ->from('info@folkloregarden.cz')
            ->to('info@servispc-liberec.cz')
            ->cc($testData['contact']['email'])
            ->subject('Test: Potvrzení rezervace č. ' . $resId)
            ->html($html);

        try {
            $this->mailer->send($email);
            return new JsonResponse(['status' => 'Testovací e-mail odeslán', 'reservationId' => $resId], JsonResponse::HTTP_OK);
        } catch (\Exception $e) {
            error_log('Chyba při odesílání testovacího emailu: ' . $e->getMessage());
            return new JsonResponse(['error' => 'Chyba při odesílání testovacího e-mailu'], JsonResponse::HTTP_INTERNAL_SERVER_ERROR);
        }
    }
}