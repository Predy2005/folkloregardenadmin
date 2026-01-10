<?php

namespace App\Service;

use App\Entity\Reservation;
use Psr\Log\LoggerInterface;
use Symfony\Component\Mailer\Exception\TransportExceptionInterface;
use Symfony\Component\Mime\Email;

class ReservationEmailService
{
    private SafeMailerService $mailer;
    private string $adminEmail;
    private LoggerInterface $logger;

    public function __construct(SafeMailerService $mailer, string $adminEmail, LoggerInterface $logger)
    {
        $this->mailer = $mailer;
        $this->adminEmail = $adminEmail;
        $this->logger = $logger;
    }

    public function sendReservationConfirmation(Reservation $reservation): bool
    {
        $totalPrice = 0;
        $personsHtml = '';
        foreach ($reservation->getPersons() as $person) {
            $totalPrice += $person->getPrice();
            $personsHtml .= sprintf(
                '<tr><td>%s</td><td>%s</td><td>%s Kč</td></tr>',
                htmlspecialchars($person->getType()),
                htmlspecialchars($person->getMenu()),
                htmlspecialchars($person->getPrice())
            );
        }

        if ($reservation->isTransferSelected() && $reservation->getTransferCount()) {
            $totalPrice += $reservation->getTransferCount() * 300;
        }

        $invoiceHtml = $reservation->isInvoiceSameAsContact()
            ? '<p>Stejné jako kontaktní údaje</p>'
            : sprintf(
                '<p><strong>Jméno:</strong> %s</p>
                 <p><strong>Firma:</strong> %s</p>
                 <p><strong>IČ:</strong> %s</p>
                 <p><strong>DIČ:</strong> %s</p>
                 <p><strong>E-mail:</strong> %s</p>
                 <p><strong>Telefon:</strong> %s</p>',
                htmlspecialchars($reservation->getInvoiceName() ?? ''),
                htmlspecialchars($reservation->getInvoiceCompany() ?? ''),
                htmlspecialchars($reservation->getInvoiceIc() ?? ''),
                htmlspecialchars($reservation->getInvoiceDic() ?? ''),
                htmlspecialchars($reservation->getInvoiceEmail() ?? ''),
                htmlspecialchars($reservation->getInvoicePhone() ?? '')
            );

        $transferHtml = $reservation->isTransferSelected()
            ? sprintf(
                '<div class="section">
                    <h2>Transfer</h2>
                    <p><strong>Počet osob:</strong> %s</p>
                    <p><strong>Adresa:</strong> %s</p>
                    <p><strong>Cena za transfer:</strong> %s Kč</p>
                </div>',
                htmlspecialchars($reservation->getTransferCount()),
                htmlspecialchars($reservation->getTransferAddress() ?? ''),
                htmlspecialchars($reservation->getTransferCount() * 300)
            )
            : '';

        $contactNoteHtml = $reservation->getContactNote()
            ? sprintf('<p><strong>Poznámka:</strong> %s</p>', htmlspecialchars($reservation->getContactNote()))
            : '';

        $htmlContent = sprintf(
            '<!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <style>
                    body { font-family: Arial, sans-serif; color: #333; }
                    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                    .header { background: #f8f8f8; padding: 10px; text-align: center; }
                    .section { margin: 20px 0; }
                    .section h2 { color: #007bff; }
                    table { width: 100%%; border-collapse: collapse; }
                    th, td { padding: 8px; border: 1px solid #ddd; text-align: left; }
                    .total { font-weight: bold; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>Potvrzení rezervace č. %s</h1>
                    </div>
                    <div class="section">
                        <h2>Kontaktní údaje</h2>
                        <p><strong>Jméno:</strong> %s</p>
                        <p><strong>E-mail:</strong> %s</p>
                        <p><strong>Telefon:</strong> %s</p>
                        <p><strong>Národnost:</strong> %s</p>
                        %s
                    </div>
                    <div class="section">
                        <h2>Fakturační údaje</h2>
                        %s
                    </div>
                    %s
                    <div class="section">
                        <h2>Osoby</h2>
                        <table>
                            <thead>
                                <tr>
                                    <th>Typ</th>
                                    <th>Menu</th>
                                    <th>Cena</th>
                                </tr>
                            </thead>
                            <tbody>
                                %s
                            </tbody>
                        </table>
                    </div>
                    <div class="section total">
                        <p><strong>Celková cena:</strong> %s Kč</p>
                        <p><strong>Datum rezervace:</strong> %s</p>
                        <p><strong>Status:</strong> %s</p>
                    </div>
                    <p>Děkujeme za Vaši rezervaci. V případě dotazů nás kontaktujte na %s.</p>
                </div>
            </body>
            </html>',
            htmlspecialchars($reservation->getId()),
            htmlspecialchars($reservation->getContactName()),
            htmlspecialchars($reservation->getContactEmail()),
            htmlspecialchars($reservation->getContactPhone()),
            htmlspecialchars($reservation->getContactNationality()),
            $contactNoteHtml,
            $invoiceHtml,
            $transferHtml,
            $personsHtml,
            htmlspecialchars($totalPrice),
            htmlspecialchars($reservation->getDate()->format('d.m.Y H:i')),
            htmlspecialchars($reservation->getStatus()),
            htmlspecialchars($this->adminEmail)
        );

        $email = (new Email())
            ->from('info@czechmuselweek.cz')
            ->to($reservation->getContactEmail())
            ->subject('Potvrzení rezervace č. ' . $reservation->getId())
            ->html($htmlContent);

        try {
            $this->mailer->send($email);
            $this->logger->info('E-mail s potvrzením rezervace č. ' . $reservation->getId() . ' byl úspěšně odeslán na ' . $reservation->getContactEmail());
            return true;
        } catch (TransportExceptionInterface $e) {
            $this->logger->error('Chyba při odesílání e-mailu pro rezervaci č. ' . $reservation->getId() . ': ' . $e->getMessage());
            return false;
        }
    }
}