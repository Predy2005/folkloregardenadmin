<?php

namespace App\Controller;

use App\Entity\PaygateTransaction;
use App\Entity\Payment;
use App\Repository\PaymentRepository;
use App\Repository\ReservationRepository;
use Comgate\SDK\Entity\Codes\CurrencyCode;
use Comgate\SDK\Entity\Codes\PaymentMethodCode;
use Comgate\SDK\Entity\Codes\RequestCode;
use Comgate\SDK\Entity\Money;
use Comgate\SDK\Logging\FileLogger;
use DateTime;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Annotation\Route;
use Symfony\Component\Security\Http\Attribute\IsGranted;
use Symfony\Contracts\HttpClient\HttpClientInterface;
use Comgate\SDK\Entity\PaymentNotification;
use Comgate\SDK\Entity\Codes\PaymentStatusCode;
use Comgate\SDK\Exception\ApiException;
use Comgate\SDK\Comgate;

class PaymentController extends AbstractController
{
    private EntityManagerInterface $entityManager;
    private HttpClientInterface $httpClient;

    public function __construct(EntityManagerInterface $entityManager, HttpClientInterface $httpClient)
    {
        $this->entityManager = $entityManager;
        $this->httpClient = $httpClient;
    }


    #[Route('/api/payment/create', name: 'api_payment_create', methods: ['POST'])]
    #[IsGranted('reservations.create')]
    public function create(Request $request): JsonResponse
    {
        $data = json_decode($request->getContent(), true);

        if (!isset($data['price'], $data['label'], $data['refId'])) {
            return $this->json(['error' => 'Missing required data'], 400);
        }

        $client = Comgate::defaults()
            ->setMerchant($this->getParameter('comgate.merchant_id'))
            ->setSecret($this->getParameter('comgate.secret_key'))
            ->createClient();

        $reservation = $this->entityManager->getRepository(\App\Entity\Reservation::class)->find($data['refId']);
        if (!$reservation) {
            return $this->json(['error' => 'Reservation not found'], 404);
        }

        if (empty($data['email'])) {
            return $this->json(['error' => 'Missing name or email'], 400);
        }

        $amount = (int)$data['price']; // předpokládáme, že už je v haléřích

        $payment = new \Comgate\SDK\Entity\Payment();
        $payment
            ->setPrice(Money::ofInt($amount))
            ->setCurrency(CurrencyCode::CZK)
            ->setLabel('folkloregarden.cz - rezervace' . $data['refId'])
            ->setReferenceId($data['refId'])
            ->setEmail($data['email'])
            ->addMethod(PaymentMethodCode::ALL)
            ->setTest(false)
            ->setRedirect();


        try {
            $createPaymentResponse = $client->createPayment($payment);
            if ($createPaymentResponse->getCode() === RequestCode::OK) {
                $redirect = $createPaymentResponse->getRedirect();

                if (!$redirect) {
                    return $this->json(['error' => 'Chybí URL pro přesměrování na platební bránu'], 500);
                }

                $created = new DateTime();
                $newPayment = new Payment();
                $newPayment->setTransactionId($createPaymentResponse->getTransId());
                $newPayment->setReservationReference($data['refId']);
                $newPayment->setAmount((float)$data['price'] / 100);  // Convert from cents to CZK
                $newPayment->setStatus('CREATED');
                $newPayment->setCreatedAt($created);
                $newPayment->setUpdatedAt($created);
                $newPayment->setReservation($reservation);
                $this->entityManager->persist($newPayment);
                $this->entityManager->flush();

                return $this->json([
                    'message' => 'Payment created successfully',
                    'redirect' => $createPaymentResponse->getRedirect()
                ]);
            } else {
                return $this->json([
                    'message' => $createPaymentResponse->getMessage()
                ], 400);  // Or other appropriate HTTP status code
            }
        } catch (ApiException $e) {
            error_log('Comgate error: ' . $e->getMessage());
            return $this->json([
                'message' => $e->getMessage()
            ], 500);  // Internal server error status code
        }
    }

    #[Route('/payment/notify', name: 'payment_notify', methods: ['POST'])]
    #[Route('/api/payment/notify', name: 'api_payment_notify', methods: ['POST'])]
    public function notify(Request $request, PaymentRepository $repo, ReservationRepository $reservationRepository): JsonResponse
    {
        $data = $request->request->all();
        $notification = PaymentNotification::createFrom($data);
        $transactionId = $notification->getTransactionId();

        try {
            $client = Comgate::defaults()
                ->setMerchant($this->getParameter('comgate.merchant_id'))
                ->setSecret($this->getParameter('comgate.secret_key'))
                ->createClient();

            $paymentStatusResponse = $client->getStatus($transactionId);
            $payment = $repo->findOneBy(['transactionId' => $transactionId]);

            // If payment not found, create it from notification data
            if (!$payment) {
                // Extract reference ID from notification data
                $refId = $data['refId'] ?? null;

                if (!$refId) {
                    file_put_contents(__DIR__ . '/comgate-error.log', 'Missing refId in notification data' . PHP_EOL, FILE_APPEND);
                    return $this->json(['message' => 'Missing refId in notification data'], 400);
                }

                // Find the associated reservation
                $reservation = $reservationRepository->find($refId);
                if (!$reservation) {
                    file_put_contents(__DIR__ . '/comgate-error.log', 'Reservation not found for refId: ' . $refId . PHP_EOL, FILE_APPEND);
                    return $this->json(['message' => 'Reservation not found'], 400);
                }

                // Create new payment
                $payment = new Payment();
                $payment->setTransactionId($transactionId);
                $payment->setReservationReference($refId);
                $payment->setAmount((float)($data['price'] ?? 0) / 100); // Convert from cents to currency units
                $payment->setCreatedAt(new \DateTime());
                $payment->setUpdatedAt(new \DateTime());
                $payment->setReservation($reservation);

                // Set initial status from notification data
                $initialStatus = $data['status'] ?? PaymentStatusCode::PENDING;
                $payment->setStatus($initialStatus);

                // Log the creation of a new payment from notification
                error_log('Created payment from notification: transId=' . $transactionId . ', refId=' . $refId . ', status=' . $initialStatus);
            }

            switch ($paymentStatusResponse->getStatus()) {
                case PaymentStatusCode::PAID:
                    $payment->setStatus(PaymentStatusCode::PAID);
                    break;
                case PaymentStatusCode::CANCELLED:
                    $payment->setStatus(PaymentStatusCode::CANCELLED);
                    break;
                case PaymentStatusCode::AUTHORIZED:
                    $payment->setStatus(PaymentStatusCode::AUTHORIZED);
                    break;
            }

            $this->entityManager->persist($payment);
            $this->entityManager->flush();

            return $this->json(['message' => 'OK']);

        } catch (ApiException $e) {
            error_log('Comgate error: ' . $e->getMessage());
        } catch (\Throwable $e) {
            error_log('Comgate error: ' . $e->getMessage());
        }

        return $this->json(['message' => 'OK']);
    }

    #[Route('/api/payment/status/{refId}', name: 'api_payment_status', methods: ['GET'])]
    public function status(string $refId, PaymentRepository $repo): JsonResponse
    {
        $payment = $repo->findOneBy(['refId' => $refId]);

        $merchantId = $this->getParameter('comgate.merchant_id');
        $secretKey = $this->getParameter('comgate.secret_key');
        $client = Comgate::defaults()
            ->setMerchant($merchantId)
            ->setSecret($secretKey)
            ->createClient();


        try {
            $paymentStatusResponse = $client->getStatus($payment->getTransactionId());
            $status = $paymentStatusResponse->getStatus();

            switch ($status) {
                case PaymentStatusCode::PAID:
                    $payment->setStatus(PaymentStatusCode::PAID);

                    $this->entityManager->persist($payment);
                    $this->entityManager->flush();
                    break;
                case PaymentStatusCode::CANCELLED:
                    $payment->setStatus(PaymentStatusCode::CANCELLED);
                    $this->entityManager->persist($payment);
                    $this->entityManager->flush();
                    break;
                case PaymentStatusCode::PENDING:
                    $payment->setStatus(PaymentStatusCode::PENDING);
                    $this->entityManager->persist($payment);
                    $this->entityManager->flush();
                    break;
                case PaymentStatusCode::AUTHORIZED:
                    $payment->setStatus(PaymentStatusCode::AUTHORIZED);
                    $this->entityManager->persist($payment);
                    $this->entityManager->flush();
                    break;
            }
        } catch (ApiException $e) {
            error_log('Payment status check failed: ' . $e->getMessage());
        }


        return $this->json([
            'message' => 'OK'
        ]);
    }


    #[Route('/api/payment/list', name: 'api_payment_list', methods: ['GET'])]
    #[IsGranted('payments.read')]
    public function list(Request $request, PaymentRepository $repo): JsonResponse
    {
        $qb = $repo->createQueryBuilder('p')
            ->leftJoin('p.reservation', 'r')
            ->addSelect('r');

        // Filtraci podle data vytvoření platby
        if ($dateFrom = $request->query->get('dateFrom')) {
            try {
                $qb->andWhere('p.createdAt >= :dateFrom')
                    ->setParameter('dateFrom', new \DateTime($dateFrom));
            } catch (\Exception $e) {
                // řešení chyby konverze data, pokud je nutné
            }
        }
        if ($dateTo = $request->query->get('dateTo')) {
            try {
                $qb->andWhere('p.createdAt <= :dateTo')
                    ->setParameter('dateTo', new \DateTime($dateTo));
            } catch (\Exception $e) {
            }
        }

        // Filtrace podle statusu platby
        if ($status = $request->query->get('status')) {
            $qb->andWhere('p.status = :status')
                ->setParameter('status', $status);
        }

        // Hledání klíčového slova ve vybraných rezervacích
        if ($search = $request->query->get('search')) {
            $qb->andWhere(
                $qb->expr()->orX(
                    'r.contactName LIKE :search',
                    'r.contactEmail LIKE :search',
                    'r.contactPhone LIKE :search',
                    'r.contactNationality LIKE :search',
                    'r.invoiceName LIKE :search',
                    'r.invoiceCompany LIKE :search',
                    'r.invoiceIc LIKE :search',
                    'r.invoiceDic LIKE :search',
                    'r.invoiceEmail LIKE :search',
                    'r.invoicePhone LIKE :search'
                )
            )->setParameter('search', '%' . $search . '%');
        }

        $payments = $qb->getQuery()->getResult();

        $data = array_map(function (\App\Entity\Payment $payment) {
            $reservation = $payment->getReservation();
            $price = 0;
            if ($reservation) {
                $persons = $reservation->getPersons();
                if ($persons) {
                    foreach ($persons as $person) {
                        $price += $person->getPrice();
                    }
                }
            }
            return [
                'id' => $payment->getId(),
                'reservationReference' => $payment->getReservationReference(),
                'amount' => $payment->getAmount(),
                'transactionId' => $payment->getTransactionId(),
                'status' => $payment->getStatus(),
                'createdAt' => $payment->getCreatedAt()?->format('Y-m-d H:i:s'),
                'reservation' => $reservation ? [
                    'id' => $reservation->getId(),
                    'contactName' => $reservation->getContactName(),
                    'contactEmail' => $reservation->getContactEmail(),
                    'contactPhone' => $reservation->getContactPhone(),
                    'contactNationality' => $reservation->getContactNationality(),
                    'contactNote' => $reservation->getContactNote(),
                    'invoiceSameAsContact' => $reservation->isInvoiceSameAsContact(),
                    'invoiceName' => $reservation->getInvoiceName(),
                    'invoiceCompany' => $reservation->getInvoiceCompany(),
                    'invoiceIc' => $reservation->getInvoiceIc(),
                    'invoiceDic' => $reservation->getInvoiceDic(),
                    'invoiceEmail' => $reservation->getInvoiceEmail(),
                    'invoicePhone' => $reservation->getInvoicePhone(),
                    'transferSelected' => $reservation->isTransferSelected(),
                    'transferCount' => $reservation->getTransferCount(),
                    'transferAddress' => $reservation->getTransferAddress(),
                    'agreement' => $reservation->isAgreement(),
                    'createdAt' => $reservation->getCreatedAt()?->format('Y-m-d H:i:s'),
                    'updatedAt' => $reservation->getUpdatedAt()?->format('Y-m-d H:i:s'),
                    'status' => $reservation->getStatus(),
                    'price' => $price,
                ] : null,
            ];
        }, $payments);

        return $this->json($data);
    }


    #[Route('/payment/result', name: 'payment_result', methods: ['POST', 'GET'])]
    public function paymentResult(Request $request, PaymentRepository $repo, ReservationRepository $reservationRepository): Response
    {
        $client = Comgate::defaults()
            ->setMerchant($this->getParameter('comgate.merchant_id'))
            ->setSecret($this->getParameter('comgate.secret_key'))
            ->createClient();

        $data = $request->request->all();
        if (empty($data)) {
            $data = $request->query->all();
        }
        if (empty($data)) {
            parse_str($request->getContent(), $data);
        }
        $statusMessage = 'Neznámý stav platby.';
        $statusClass = 'info';

        try {

            $payment = $repo->findOneBy(['transactionId' => $data['id']]);
            if (!$payment && isset($data['refId'])) {
                $payment = $repo->findOneBy(['reservationReference' => $data['refId']]);
            }

            $paymentStatusResponse = $client->getStatus($data['id']);
            $model = $reservationRepository->find($data['refId']);

            if ($payment) {
                switch ($paymentStatusResponse->getStatus()) {
                    case PaymentStatusCode::PAID:
                        $payment->setStatus(PaymentStatusCode::PAID);
                        $model->setStatus(PaymentStatusCode::PAID);
                        $statusMessage = 'Platba byla úspěšně provedena. Děkujeme!';
                        $statusClass = 'success';
                        break;
                    case PaymentStatusCode::CANCELLED:
                        $payment->setStatus(PaymentStatusCode::CANCELLED);
                        $model->setStatus(PaymentStatusCode::CANCELLED);
                        $statusMessage = 'Platba byla zrušena.';
                        $statusClass = 'danger';
                        break;
                    case PaymentStatusCode::AUTHORIZED:
                        $payment->setStatus(PaymentStatusCode::AUTHORIZED);
                        $model->setStatus(PaymentStatusCode::AUTHORIZED);
                        $statusMessage = 'Platba byla autorizována. Čekáme na dokončení.';
                        $statusClass = 'warning';
                        break;
                }

                $this->entityManager->persist($payment);
                $this->entityManager->persist($model);
                $this->entityManager->flush();
            }

        } catch (ApiException $e) {
            error_log('Comgate error: ' . $e->getMessage());
        } catch (\Throwable $e) {
            error_log('Comgate error: ' . $e->getMessage());
        }

        // ✅ VŽDY vrátit OK, aby Comgate brána skončila úspěšně
        $html = "
            <html>
            <head>
                <title>Výsledek platby</title>
                <style>
                    body { font-family: Arial, sans-serif; background: #f7f7f7; padding: 20px; }
                    .box { background: #fff; border-radius: 8px; padding: 20px; max-width: 500px; margin: 50px auto; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
                    .success { color: green; }
                    .danger { color: red; }
                    .warning { color: orange; }
                    .info { color: #333; }
                    .contact { margin-top: 20px; font-size: 14px; }
                    .back-btn {
                        display: inline-block;
                        margin-top: 24px;
                        padding: 12px 28px;
                        background: #1e7e34;
                        color: #fff;
                        border: none;
                        border-radius: 30px;
                        font-size: 16px;
                        font-weight: bold;
                        text-decoration: none;
                        box-shadow: 0 2px 6px rgba(30,126,52,0.08);
                        transition: background 0.2s;
                    }
                    .back-btn:hover {
                        background: #155d27;
                    }
                </style>
            </head>
            <body>
                <div class='box'>
                    <h2 class='{$statusClass}'>Výsledek platby</h2>
                    <p>{$statusMessage}</p>
                    <p><a href='https://www.folkloregarden.cz/garden/#rezervace' class='back-btn'>Zpět na web</a></p> 
                    <div class='contact'>
                        <h3>Kontakt</h3>
                        <p>Na rohu ulic Na Zlíchově &amp; Nad Konečnou, Praha 5 – Hlubočepy</p>
                        <p>+420 724 334 340</p>
                        <p><a href='mailto:info@folkloregarden.cz'>info@folkloregarden.cz</a></p>
                        <p><a href='https://folkloregarden.cz'>folkloregarden.cz</a></p>
                    </div>
                </div>
            </body>
            </html>
        ";

        return new Response($html, 200, ['Content-Type' => 'text/html']);
    }

    #[Route('/payment/status', name: 'payment_status', methods: ['POST'])]
    public function paymentStatus(Request $request, PaymentRepository $repo): Response
    {
        $transId = $request->get('transId');
        $status = $request->get('status');
        $digest = $request->get('digest');

        if (!$transId || !$status || !$digest) {
            return new Response('Missing data', 400);
        }

        $params = $request->request->all();
        unset($params['digest']);
        ksort($params);
        $queryString = urldecode(http_build_query($params));
        $expectedDigest = hash('sha256', $queryString . $this->getParameter('comgate.secret_key'));

        if (!hash_equals($expectedDigest, $digest)) {
            return new Response('Invalid signature', 403);
        }

        $payment = $repo->findOneBy(['transactionId' => $transId]);

        if (!$payment) {
            return new Response('Payment not found', 404);
        }

        $allowedStatuses = [PaymentStatusCode::PAID, PaymentStatusCode::CANCELLED, PaymentStatusCode::PENDING, PaymentStatusCode::AUTHORIZED];
        if (!in_array($status, $allowedStatuses, true)) {
            return new Response('Invalid payment status', 400);
        }

        $payment->setStatus($status);
        $this->entityManager->flush();

        return new Response('OK');
    }

    #[Route('/api/payment/test-create', name: 'api_payment_test_create', methods: ['GET'])]
    #[IsGranted('ROLE_ADMIN')]
    public function testCreate(): JsonResponse
    {
        $client = Comgate::defaults()
            ->setMerchant($this->getParameter('comgate.merchant_id'))
            ->setSecret($this->getParameter('comgate.secret_key'))
            ->createClient();

        $payment = new \Comgate\SDK\Entity\Payment();
        $payment
            ->setPrice(Money::ofInt(10000)) // 100.00 CZK
            ->setCurrency(CurrencyCode::CZK)
            ->setLabel('Test order')
            ->setReferenceId('test-order-123')
            ->setEmail('customer@example.com')
            ->addMethod(PaymentMethodCode::ALL)
            ->setTest(false);

        try {
            $createPaymentResponse = $client->createPayment($payment);
            if ($createPaymentResponse->getCode() === RequestCode::OK) {
                return $this->json([
                    'redirect' => $createPaymentResponse->getRedirect()
                ]);
            } else {
                return $this->json([
                    'error' => $createPaymentResponse->getMessage()
                ], 400);
            }
        } catch (ApiException $e) {
            return $this->json([
                'error' => $e->getMessage()
            ], 500);
        }
    }
}
