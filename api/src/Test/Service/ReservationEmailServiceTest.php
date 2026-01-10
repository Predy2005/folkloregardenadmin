<?php

namespace App\Test\Service;

use App\Entity\Reservation;
use App\Entity\ReservationPerson;
use App\Service\ReservationEmailService;
use App\Service\SafeMailerService;
use PHPUnit\Framework\TestCase;
use Psr\Log\LoggerInterface;
use Symfony\Component\Mime\RawMessage;
use Symfony\Component\Mime\Email;

class ReservationEmailServiceTest extends TestCase
{
    private $mailer;
    private $logger;
    private $adminEmail = 'noreply@example.com';
    private array $sentMessages = [];

    protected function setUp(): void
    {
        // Mock logger
        $this->logger = $this->createMock(LoggerInterface::class);

        // Mock SafeMailerService: zachytí odeslané zprávy do \$this->sentMessages
        $this->sentMessages = [];
        $this->mailer = $this->createMock(SafeMailerService::class);
        $self = $this;
        $this->mailer->method('send')->willReturnCallback(function (RawMessage $message) use ($self) {
            $self->sentMessages[] = $message;
        });
    }

    public function testSendReservationConfirmation(): void
    {
        // Vytvoření testovací rezervace
        $reservation = new Reservation();
        $reservation->setId(123);
        $reservation->setDate(new \DateTime('2025-06-01 18:00:00'));
        $reservation->setContactName('Jan Novák');
        $reservation->setContactEmail('jan.novak@example.com');
        $reservation->setContactPhone('+420123456789');
        $reservation->setContactNationality('CZ');
        $reservation->setContactNote('Prosím o stůl u okna.');
        $reservation->setInvoiceSameAsContact(false);
        $reservation->setInvoiceName('Firma s.r.o.');
        $reservation->setInvoiceCompany('Firma s.r.o.');
        $reservation->setInvoiceIc('CZ12345678');
        $reservation->setInvoiceDic('CZ1234567890');
        $reservation->setInvoiceEmail('fakturace@firma.cz');
        $reservation->setInvoicePhone('+420987654321');
        $reservation->setTransferSelected(true);
        $reservation->setTransferCount(4);
        $reservation->setTransferAddress('Letiště Václava Havla, Praha');
        $reservation->setStatus('WAITING_PAYMENT');
        $reservation->setCreatedAt(new \DateTime());
        $reservation->setUpdatedAt(new \DateTime());

        // Přidání osob
        $person1 = new ReservationPerson();
        $person1->setType('Dospělý');
        $person1->setMenu('Kuřecí menu');
        $person1->setPrice(500);
        $person1->setReservation($reservation);

        $person2 = new ReservationPerson();
        $person2->setType('Dítě');
        $person2->setMenu('Dětské menu');
        $person2->setPrice(200);
        $person2->setReservation($reservation);

        $reservation->getPersons()->add($person1);
        $reservation->getPersons()->add($person2);

        // Vytvoření služby s mockem maileru
        $emailService = new ReservationEmailService($this->mailer, $this->adminEmail, $this->logger);

        // Mock logger pro ověření logování
        $this->logger->expects($this->once())
            ->method('info')
            ->with('E-mail s potvrzením rezervace č. 123 byl úspěšně odeslán na jan.novak@example.com');

        // Odeslání e-mailu
        $result = $emailService->sendReservationConfirmation($reservation);

        // Ověření, že e-mail byl odeslán
        $this->assertTrue($result, 'E-mail měl být úspěšně odeslán');

        // Zachycení odeslaného e-mailu (z mocku)
        $sentMessages = $this->sentMessages;
        $this->assertCount(1, $sentMessages, 'Měl být odeslán jeden e-mail');

        /** @var Email $email */
        $this->assertInstanceOf(Email::class, $sentMessages[0]);
        $email = $sentMessages[0];

        $this->assertEquals('Potvrzení rezervace č. 123', $email->getSubject());
        $this->assertEquals($this->adminEmail, $email->getFrom()[0]->getAddress());
        $this->assertEquals('jan.novak@example.com', $email->getTo()[0]->getAddress());

        // Ověření obsahu e-mailu
        $htmlContent = $email->getHtmlBody();
        $this->assertStringContainsString('Potvrzení rezervace č. 123', $htmlContent);
        $this->assertStringContainsString('Jan Novák', $htmlContent);
        $this->assertStringContainsString('jan.novak@example.com', $htmlContent);
        $this->assertStringContainsString('+420123456789', $htmlContent);
        $this->assertStringContainsString('CZ', $htmlContent);
        $this->assertStringContainsString('Prosím o stůl u okna.', $htmlContent);
        $this->assertStringContainsString('Firma s.r.o.', $htmlContent);
        $this->assertStringContainsString('CZ12345678', $htmlContent);
        $this->assertStringContainsString('CZ1234567890', $htmlContent);
        $this->assertStringContainsString('fakturace@firma.cz', $htmlContent);
        $this->assertStringContainsString('+420987654321', $htmlContent);
        $this->assertStringContainsString('Letiště Václava Havla, Praha', $htmlContent);
        $this->assertStringContainsString('4', $htmlContent);
        $this->assertStringContainsString('1200 Kč', $htmlContent); // 4 * 300 Kč za transfer
        $this->assertStringContainsString('Dospělý', $htmlContent);
        $this->assertStringContainsString('Kuřecí menu', $htmlContent);
        $this->assertStringContainsString('500 Kč', $htmlContent);
        $this->assertStringContainsString('Dítě', $htmlContent);
        $this->assertStringContainsString('Dětské menu', $htmlContent);
        $this->assertStringContainsString('200 Kč', $htmlContent);
        $this->assertStringContainsString('Celková cena: 1900 Kč', $htmlContent); // 500 + 200 + (4 * 300)
        $this->assertStringContainsString('01.06.2025 18:00', $htmlContent);
        $this->assertStringContainsString('WAITING_PAYMENT', $htmlContent);
    }
}