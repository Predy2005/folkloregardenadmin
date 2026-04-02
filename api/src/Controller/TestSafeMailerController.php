<?php

namespace App\Controller;

use App\Service\SafeMailerService;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Mime\Email;
use Symfony\Component\Routing\Annotation\Route;

/**
 * Testovaci controller pro overeni SafeMailerService.
 * V DEV prostredi se emaily presmeruji na bezpecnou adresu.
 */
class TestSafeMailerController extends AbstractController
{
    public function __construct(
        private SafeMailerService $safeMailer,
        private string $appEnv
    ) {
    }

    #[Route('/api/test/safe-mailer', name: 'test_safe_mailer', methods: ['GET', 'POST'])]
    public function testSafeMailer(Request $request): JsonResponse
    {
        if ($this->appEnv === 'prod') {
            return new JsonResponse(['error' => 'Test endpoints are disabled in production'], JsonResponse::HTTP_FORBIDDEN);
        }

        // Defaultni testovaci prijemce - simuluje skutecneho zakaznika
        $testRecipient = $request->get('email', 'zakaznik@example.com');
        $testCc = $request->get('cc', 'kopie@example.com');

        $email = (new Email())
            ->from('info@folkloregarden.cz')
            ->to($testRecipient)
            ->cc($testCc)
            ->subject('Test SafeMailerService - ' . date('Y-m-d H:i:s'))
            ->html($this->buildTestEmailHtml($testRecipient, $testCc));

        try {
            $this->safeMailer->send($email);

            return new JsonResponse([
                'status' => 'success',
                'message' => 'Testovaci email odeslan',
                'environment' => $this->appEnv,
                'is_dev' => $this->safeMailer->isDevEnvironment(),
                'original_recipient' => $testRecipient,
                'original_cc' => $testCc,
                'actual_recipient' => $this->safeMailer->isDevEnvironment()
                    ? $this->safeMailer->getDevSafeEmail()
                    : $testRecipient,
                'note' => $this->safeMailer->isDevEnvironment()
                    ? 'Email byl presmerovan na bezpecnou adresu (DEV MODE)'
                    : 'POZOR: Email byl odeslan na skutecnou adresu (PRODUCTION MODE)!'
            ]);
        } catch (\Exception $e) {
            return new JsonResponse([
                'status' => 'error',
                'message' => 'Chyba pri odesilani emailu: ' . $e->getMessage(),
                'environment' => $this->appEnv,
            ], JsonResponse::HTTP_INTERNAL_SERVER_ERROR);
        }
    }

    #[Route('/api/test/safe-mailer/status', name: 'test_safe_mailer_status', methods: ['GET'])]
    public function status(): JsonResponse
    {
        if ($this->appEnv === 'prod') {
            return new JsonResponse(['error' => 'Test endpoints are disabled in production'], JsonResponse::HTTP_FORBIDDEN);
        }

        return new JsonResponse([
            'environment' => $this->appEnv,
            'is_dev' => $this->safeMailer->isDevEnvironment(),
            'safe_email' => $this->safeMailer->getDevSafeEmail(),
            'email_redirect_active' => $this->safeMailer->isDevEnvironment(),
            'message' => $this->safeMailer->isDevEnvironment()
                ? 'Emaily jsou presmerovany na bezpecnou adresu - OK'
                : 'POZOR: Emaily jdou na skutecne prijemce!'
        ]);
    }

    private function buildTestEmailHtml(string $recipient, string $cc): string
    {
        $env = $this->appEnv;
        $isDev = $this->safeMailer->isDevEnvironment() ? 'ANO' : 'NE';
        $safeEmail = $this->safeMailer->getDevSafeEmail();
        $time = date('Y-m-d H:i:s');

        return <<<HTML
        <!DOCTYPE html>
        <html lang="cs">
        <head>
            <meta charset="UTF-8">
            <title>Test SafeMailerService</title>
        </head>
        <body style="font-family: Arial, sans-serif; padding: 20px;">
            <h1 style="color: #2563eb;">Test SafeMailerService</h1>

            <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h2>Informace o prostredi</h2>
                <table style="width: 100%; border-collapse: collapse;">
                    <tr>
                        <td style="padding: 8px; border-bottom: 1px solid #ddd;"><strong>Prostredi (APP_ENV):</strong></td>
                        <td style="padding: 8px; border-bottom: 1px solid #ddd;">{$env}</td>
                    </tr>
                    <tr>
                        <td style="padding: 8px; border-bottom: 1px solid #ddd;"><strong>DEV rezim aktivni:</strong></td>
                        <td style="padding: 8px; border-bottom: 1px solid #ddd;">{$isDev}</td>
                    </tr>
                    <tr>
                        <td style="padding: 8px; border-bottom: 1px solid #ddd;"><strong>Bezpecna adresa:</strong></td>
                        <td style="padding: 8px; border-bottom: 1px solid #ddd;">{$safeEmail}</td>
                    </tr>
                    <tr>
                        <td style="padding: 8px; border-bottom: 1px solid #ddd;"><strong>Cas odeslani:</strong></td>
                        <td style="padding: 8px; border-bottom: 1px solid #ddd;">{$time}</td>
                    </tr>
                </table>
            </div>

            <div style="background: #fef3c7; padding: 20px; border-radius: 8px; border: 2px solid #f59e0b; margin: 20px 0;">
                <h2 style="color: #92400e;">Puvodni prijemci (pred presmerovanim)</h2>
                <p><strong>TO:</strong> {$recipient}</p>
                <p><strong>CC:</strong> {$cc}</p>
            </div>

            <p style="color: #6b7280; font-size: 14px;">
                Tento email byl odeslan jako test SafeMailerService.<br>
                Pokud vidite tento email na adrese <strong>{$safeEmail}</strong>, presmerovani funguje spravne.
            </p>
        </body>
        </html>
        HTML;
    }
}
