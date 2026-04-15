<?php
declare(strict_types=1);

namespace App\Service;

use App\Entity\CompanySettings;
use App\Entity\Invoice;
use App\Repository\CompanySettingsRepository;
use Doctrine\ORM\EntityManagerInterface;
use Psr\Log\LoggerInterface;
use Symfony\Component\Mailer\Exception\TransportExceptionInterface;
use Symfony\Component\Mime\Email;

class InvoiceEmailService
{
    public function __construct(
        private EntityManagerInterface $entityManager,
        private CompanySettingsRepository $companySettingsRepository,
        private SafeMailerService $safeMailer,
        private LoggerInterface $logger,
    ) {
    }

    /**
     * Generuje QR kód pro platbu v SPD formátu (Short Payment Descriptor)
     * Formát: SPD*1.0*ACC:IBAN*AM:CASTKA*CC:MENA*X-VS:VARSYMBOL*MSG:ZPRAVA
     */
    public function generateQrPaymentData(Invoice $invoice, ?CompanySettings $settings = null): string
    {
        if ($settings === null) {
            $settings = $this->companySettingsRepository->getDefault();
        }

        if ($settings === null || !$settings->getIban()) {
            return '';
        }

        $parts = [
            'SPD*1.0',
            'ACC:' . str_replace(' ', '', $settings->getIban()),
            'AM:' . number_format((float) $invoice->getTotal(), 2, '.', ''),
            'CC:' . $invoice->getCurrency(),
            'X-VS:' . $invoice->getVariableSymbol(),
            'MSG:Faktura ' . $invoice->getInvoiceNumber(),
        ];

        // Přidej jméno příjemce (max 35 znaků)
        $recipientName = mb_substr($settings->getCompanyName(), 0, 35);
        $parts[] = 'RN:' . $recipientName;

        return implode('*', $parts);
    }

    /**
     * Odešle fakturu zákazníkovi emailem
     */
    public function sendInvoiceEmail(Invoice $invoice): bool
    {
        $customerEmail = $invoice->getCustomerEmail();
        if (!$customerEmail) {
            throw new \RuntimeException('Zákazník nemá uvedený e-mail.');
        }

        $settings = $this->companySettingsRepository->getDefault();
        $supplierEmail = $settings?->getEmail() ?? 'info@folkloregarden.cz';

        // Sestavení položek pro email
        $itemsHtml = '';
        foreach ($invoice->getItems() as $item) {
            $itemsHtml .= sprintf(
                '<tr><td>%s</td><td style="text-align:right">%d</td><td style="text-align:right">%s Kč</td><td style="text-align:right">%s Kč</td></tr>',
                htmlspecialchars($item['description'] ?? ''),
                (int) ($item['quantity'] ?? 1),
                number_format((float) ($item['unitPrice'] ?? 0), 2, ',', ' '),
                number_format((float) ($item['total'] ?? 0), 2, ',', ' ')
            );
        }

        $htmlContent = sprintf(
            '<!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <style>
                    body { font-family: Arial, sans-serif; color: #333; line-height: 1.6; }
                    .container { max-width: 700px; margin: 0 auto; padding: 20px; }
                    .header { background: linear-gradient(135deg, #6366f1 0%%, #a855f7 100%%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
                    .header h1 { margin: 0; font-size: 24px; }
                    .content { background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; }
                    .section { margin: 20px 0; background: white; padding: 20px; border-radius: 8px; border: 1px solid #e5e7eb; }
                    .section h2 { color: #6366f1; font-size: 16px; margin-top: 0; border-bottom: 2px solid #e5e7eb; padding-bottom: 10px; }
                    .row { display: flex; justify-content: space-between; margin-bottom: 8px; }
                    .label { color: #6b7280; }
                    .value { font-weight: 600; }
                    table { width: 100%%; border-collapse: collapse; margin-top: 10px; }
                    th, td { padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: left; }
                    th { background: #f3f4f6; font-weight: 600; }
                    .totals { margin-top: 20px; text-align: right; }
                    .totals .row { justify-content: flex-end; gap: 40px; }
                    .total-final { font-size: 20px; color: #6366f1; }
                    .bank-info { background: #fef3c7; padding: 15px; border-radius: 8px; border: 1px solid #fcd34d; }
                    .qr-section { text-align: center; margin-top: 20px; }
                    .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 14px; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>Faktura č. %s</h1>
                    </div>
                    <div class="content">
                        <div class="section">
                            <h2>Dodavatel</h2>
                            <p><strong>%s</strong></p>
                            <p>%s</p>
                            <p>%s %s</p>
                            <p>IČO: %s%s</p>
                        </div>
                        <div class="section">
                            <h2>Odběratel</h2>
                            <p><strong>%s</strong></p>
                            %s
                            %s
                            %s
                        </div>
                        <div class="section">
                            <h2>Položky</h2>
                            <table>
                                <thead>
                                    <tr>
                                        <th>Popis</th>
                                        <th style="text-align:right">Množství</th>
                                        <th style="text-align:right">Cena/ks</th>
                                        <th style="text-align:right">Celkem</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    %s
                                </tbody>
                            </table>
                            <div class="totals">
                                <div class="row">
                                    <span class="label">Základ:</span>
                                    <span class="value">%s Kč</span>
                                </div>
                                <div class="row">
                                    <span class="label">DPH %d%%:</span>
                                    <span class="value">%s Kč</span>
                                </div>
                                <div class="row total-final">
                                    <span>Celkem:</span>
                                    <span><strong>%s %s</strong></span>
                                </div>
                            </div>
                        </div>
                        <div class="section bank-info">
                            <h2>Platební údaje</h2>
                            <p><strong>Číslo účtu:</strong> %s</p>
                            <p><strong>IBAN:</strong> %s</p>
                            <p><strong>Variabilní symbol:</strong> %s</p>
                            <p><strong>Částka k úhradě:</strong> %s %s</p>
                            <p><strong>Datum splatnosti:</strong> %s</p>
                        </div>
                        %s
                    </div>
                    <div class="footer">
                        <p>Tato faktura byla vygenerována automaticky. V případě dotazů nás kontaktujte na %s.</p>
                        <p>© %s %s</p>
                    </div>
                </div>
            </body>
            </html>',
            htmlspecialchars($invoice->getInvoiceNumber()),
            // Dodavatel
            htmlspecialchars($invoice->getSupplierName()),
            htmlspecialchars($invoice->getSupplierStreet() ?? ''),
            htmlspecialchars($invoice->getSupplierZipcode() ?? ''),
            htmlspecialchars($invoice->getSupplierCity() ?? ''),
            htmlspecialchars($invoice->getSupplierIco() ?? ''),
            $invoice->getSupplierDic() ? ' | DIČ: ' . htmlspecialchars($invoice->getSupplierDic()) : '',
            // Odběratel
            htmlspecialchars($invoice->getCustomerName()),
            $invoice->getCustomerCompany() ? '<p>' . htmlspecialchars($invoice->getCustomerCompany()) . '</p>' : '',
            $invoice->getCustomerStreet() ? '<p>' . htmlspecialchars($invoice->getCustomerStreet()) . '</p><p>' . htmlspecialchars($invoice->getCustomerZipcode() ?? '') . ' ' . htmlspecialchars($invoice->getCustomerCity() ?? '') . '</p>' : '',
            $invoice->getCustomerIco() ? '<p>IČO: ' . htmlspecialchars($invoice->getCustomerIco()) . ($invoice->getCustomerDic() ? ' | DIČ: ' . htmlspecialchars($invoice->getCustomerDic()) : '') . '</p>' : '',
            // Položky
            $itemsHtml,
            // Totals
            number_format((float) $invoice->getSubtotal(), 2, ',', ' '),
            $invoice->getVatRate(),
            number_format((float) $invoice->getVatAmount(), 2, ',', ' '),
            number_format((float) $invoice->getTotal(), 2, ',', ' '),
            htmlspecialchars($invoice->getCurrency()),
            // Platební údaje
            htmlspecialchars($invoice->getSupplierBankAccount() ?? ''),
            htmlspecialchars($invoice->getSupplierIban() ?? ''),
            htmlspecialchars($invoice->getVariableSymbol()),
            number_format((float) $invoice->getTotal(), 2, ',', ' '),
            htmlspecialchars($invoice->getCurrency()),
            $invoice->getDueDate()->format('d.m.Y'),
            // QR kód info
            $invoice->getQrPaymentData() ? '<div class="qr-section"><p><strong>Pro rychlou platbu naskenujte QR kód ve své bankovní aplikaci:</strong></p><p style="font-size:12px;color:#6b7280;word-break:break-all;">' . htmlspecialchars($invoice->getQrPaymentData()) . '</p></div>' : '',
            // Footer
            htmlspecialchars($supplierEmail),
            date('Y'),
            htmlspecialchars($invoice->getSupplierName())
        );

        $email = (new Email())
            ->from($supplierEmail)
            ->to($customerEmail)
            ->subject('Faktura č. ' . $invoice->getInvoiceNumber())
            ->html($htmlContent);

        try {
            $this->safeMailer->send($email);
            $this->logger->info('Faktura č. ' . $invoice->getInvoiceNumber() . ' byla úspěšně odeslána na ' . $customerEmail);

            // Automaticky označ jako odeslanou
            if ($invoice->getStatus() === 'DRAFT') {
                $invoice->setStatus('SENT');
                $invoice->setUpdatedAt(new \DateTime());
                $this->entityManager->flush();
            }

            return true;
        } catch (TransportExceptionInterface $e) {
            $this->logger->error('Chyba při odesílání faktury č. ' . $invoice->getInvoiceNumber() . ': ' . $e->getMessage());
            throw new \RuntimeException('Nepodařilo se odeslat e-mail: ' . $e->getMessage());
        }
    }
}
