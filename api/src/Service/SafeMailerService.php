<?php

declare(strict_types=1);

namespace App\Service;

use Psr\Log\LoggerInterface;
use Symfony\Component\Mailer\MailerInterface;
use Symfony\Component\Mailer\Exception\TransportExceptionInterface;
use Symfony\Component\Mime\Email;
use Symfony\Component\Mime\Address;

/**
 * Bezpecny wrapper pro odesilani emailu.
 * V DEV prostredi presmeruje VSECHNY emaily na bezpecnou adresu.
 * Tim se zamezi omylnemu odeslani emailu skutecnym zakaznikum.
 */
class SafeMailerService
{
    private const DEV_SAFE_EMAIL = 'info@servispc-liberec.cz';

    public function __construct(
        private MailerInterface $mailer,
        private LoggerInterface $logger,
        private string $appEnv
    ) {
    }

    /**
     * Odesle email. V DEV prostredi presmeruje na bezpecnou adresu.
     */
    public function send(Email $email): void
    {
        if ($this->isDevEnvironment()) {
            $email = $this->redirectToDev($email);
        }

        $this->mailer->send($email);
    }

    /**
     * Zkontroluje zda jsme v DEV prostredi.
     */
    public function isDevEnvironment(): bool
    {
        return in_array($this->appEnv, ['dev', 'test'], true);
    }

    /**
     * Presmeruje vsechny prijemce emailu na bezpecnou DEV adresu.
     * Puvodni prijemci jsou pridani do predmetu a tela emailu.
     */
    private function redirectToDev(Email $email): Email
    {
        // Ulozime puvodni prijemce
        $originalTo = $this->formatAddresses($email->getTo());
        $originalCc = $this->formatAddresses($email->getCc());
        $originalBcc = $this->formatAddresses($email->getBcc());

        // Logovani pro audit
        $this->logger->warning('[DEV MODE] Email presmerovan na bezpecnou adresu', [
            'original_to' => $originalTo,
            'original_cc' => $originalCc,
            'original_bcc' => $originalBcc,
            'subject' => $email->getSubject(),
            'redirected_to' => self::DEV_SAFE_EMAIL,
        ]);

        // Sestaveni informace o puvodnim prijemci
        $devInfo = sprintf(
            "\n\n---\n[DEV MODE] Puvodni prijemci:\nTO: %s\nCC: %s\nBCC: %s\n---",
            $originalTo ?: '(zadni)',
            $originalCc ?: '(zadni)',
            $originalBcc ?: '(zadni)'
        );

        // Upraveni predmetu
        $newSubject = '[DEV TEST] ' . $email->getSubject() . ' | Puvodni: ' . ($originalTo ?: 'N/A');

        // Vytvorime novy email s presmerovanymi adresami
        $safeEmail = (new Email())
            ->from($email->getFrom()[0] ?? new Address(self::DEV_SAFE_EMAIL))
            ->to(self::DEV_SAFE_EMAIL)
            ->subject($newSubject);

        // Pridame puvodni obsah + info o presmerovani
        if ($email->getHtmlBody()) {
            $htmlDevInfo = str_replace("\n", "<br>", htmlspecialchars($devInfo));
            $safeEmail->html($email->getHtmlBody() . '<div style="background:#ffebee;padding:10px;margin-top:20px;border:2px solid #f44336;border-radius:4px;">' . $htmlDevInfo . '</div>');
        }

        if ($email->getTextBody()) {
            $safeEmail->text($email->getTextBody() . $devInfo);
        }

        // Pokud neni zadne telo, pridame alespon textove
        if (!$email->getHtmlBody() && !$email->getTextBody()) {
            $safeEmail->text('(Prazdny email)' . $devInfo);
        }

        // Zkopirujeme prilohy
        foreach ($email->getAttachments() as $attachment) {
            $safeEmail->attach($attachment->getBody(), $attachment->getName(), $attachment->getMediaType() . '/' . $attachment->getMediaSubtype());
        }

        return $safeEmail;
    }

    /**
     * Formatuje pole Address objektu na citelny retezec.
     */
    private function formatAddresses(array $addresses): string
    {
        if (empty($addresses)) {
            return '';
        }

        return implode(', ', array_map(function ($address) {
            if ($address instanceof Address) {
                $name = $address->getName();
                $email = $address->getAddress();
                return $name ? "$name <$email>" : $email;
            }
            return (string) $address;
        }, $addresses));
    }

    /**
     * Getter pro bezpecnou DEV email adresu.
     */
    public function getDevSafeEmail(): string
    {
        return self::DEV_SAFE_EMAIL;
    }
}
