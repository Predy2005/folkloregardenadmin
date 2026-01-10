<?php

declare(strict_types=1);

namespace App\Controller;

use App\Entity\Contact;
use App\Entity\Reservation;
use App\Repository\ContactRepository;
use App\Repository\ReservationRepository;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Annotation\Route;
use Symfony\Component\Security\Http\Attribute\IsGranted;

#[Route('/api/contacts')]
class ContactController extends AbstractController
{
    #[Route('', methods: ['GET'])]
    #[IsGranted('contacts.read')]
    public function list(Request $request, ContactRepository $repo): JsonResponse
    {
        $q = (string)($request->query->get('q') ?? '');
        $limit = (int)($request->query->get('limit') ?? 50);
        $offset = (int)($request->query->get('offset') ?? 0);
        $result = $repo->search($q, $limit, $offset);
        $items = array_map(fn(Contact $c) => $this->toArray($c), $result['items']);
        return $this->json([
            'items' => $items,
            'total' => $result['total'],
        ]);
    }

    #[Route('/{id}', methods: ['GET'], requirements: ['id' => '\d+'])]
    #[IsGranted('contacts.read')]
    public function show(int $id, ContactRepository $repo): JsonResponse
    {
        $c = $repo->find($id);
        if (!$c) {
            return $this->json(['error' => 'Not found'], 404);
        }
        return $this->json($this->toArray($c));
    }

    #[Route('/{id}/reservations', methods: ['GET'], requirements: ['id' => '\d+'])]
    #[IsGranted('contacts.read')]
    public function reservations(int $id, ContactRepository $contactRepo, ReservationRepository $resRepo): JsonResponse
    {
        $contact = $contactRepo->find($id);
        if (!$contact) {
            return $this->json(['error' => 'Not found'], 404);
        }

        // Search reservations by contact's email or phone (email is most reliable)
        $email = $contact->getEmail();
        $phone = $contact->getPhone();

        if (!$email && !$phone) {
            return $this->json(['items' => [], 'total' => 0]);
        }

        $qb = $resRepo->createQueryBuilder('r');

        $conditions = [];

        if ($email) {
            $conditions[] = 'LOWER(r.contactEmail) = LOWER(:email)';
            $qb->setParameter('email', $email);
        }
        if ($phone) {
            // Use LIKE for phone matching (handles different formats)
            $phoneDigits = preg_replace('/\D/', '', $phone);
            if (strlen($phoneDigits) >= 9) {
                // Match last 9 digits to handle country code variations
                $phoneSuffix = substr($phoneDigits, -9);
                $conditions[] = 'r.contactPhone LIKE :phone';
                $qb->setParameter('phone', '%' . $phoneSuffix);
            }
        }

        if (empty($conditions)) {
            return $this->json(['items' => [], 'total' => 0]);
        }

        $qb->where(implode(' OR ', $conditions));
        $qb->orderBy('r.date', 'DESC');

        $reservations = $qb->getQuery()->getResult();

        $items = array_map(function (Reservation $r) {
            return [
                'id' => $r->getId(),
                'date' => $r->getDate()->format('Y-m-d'),
                'status' => $r->getStatus(),
                'contactName' => $r->getContactName(),
                'contactEmail' => $r->getContactEmail(),
                'contactPhone' => $r->getContactPhone(),
                'personsCount' => $r->getPersons()->count(),
                'totalPrice' => array_reduce($r->getPersons()->toArray(), fn($sum, $p) => $sum + $p->getPrice(), 0),
                'createdAt' => $r->getCreatedAt()->format(DATE_ATOM),
            ];
        }, $reservations);

        return $this->json([
            'items' => $items,
            'total' => count($items),
        ]);
    }

    #[Route('', methods: ['POST'])]
    #[IsGranted('contacts.create')]
    public function create(Request $request, EntityManagerInterface $em): JsonResponse
    {
        $data = json_decode($request->getContent(), true) ?? [];
        $c = new Contact();
        $this->applyData($c, $data);
        $em->persist($c);
        $em->flush();
        return $this->json(['status' => 'created', 'id' => $c->getId()], 201);
    }

    #[Route('/{id}', methods: ['PUT','PATCH'])]
    #[IsGranted('contacts.update')]
    public function update(int $id, Request $request, ContactRepository $repo, EntityManagerInterface $em): JsonResponse
    {
        $c = $repo->find($id);
        if (!$c) { return $this->json(['error' => 'Not found'], 404); }
        $data = json_decode($request->getContent(), true) ?? [];
        $this->applyData($c, $data, true);
        $c->setUpdatedAt(new \DateTime());
        $em->flush();
        return $this->json(['status' => 'updated']);
    }

    #[Route('/{id}', methods: ['DELETE'])]
    #[IsGranted('contacts.delete')]
    public function delete(int $id, ContactRepository $repo, EntityManagerInterface $em): JsonResponse
    {
        $c = $repo->find($id);
        if (!$c) { return $this->json(['error' => 'Not found'], 404); }
        $em->remove($c);
        $em->flush();
        return $this->json(['status' => 'deleted']);
    }

    #[Route('/seed-from-reservations', methods: ['POST'])]
    #[IsGranted('contacts.create')]
    public function seedFromReservations(ReservationRepository $resRepo, ContactRepository $contactRepo, EntityManagerInterface $em): JsonResponse
    {
        // Preload existing contacts into in-memory maps for deduplication within a single run
        $allContacts = $contactRepo->findAll();
        /** @var array<string, Contact> $byEmail */
        $byEmail = [];
        /** @var array<string, Contact> $byPhone */
        $byPhone = [];
        /** @var array<string, Contact> $byNameCompany */
        $byNameCompany = [];
        foreach ($allContacts as $ec) {
            if (!$ec instanceof Contact) continue;
            $en = $ec->getEmailNormalized();
            if ($en) { $byEmail[$en] = $ec; }
            $pn = $ec->getPhoneNormalized();
            if ($pn) { $byPhone[$pn] = $ec; }
            $nk = trim(mb_strtolower($ec->getName() ?? ''));
            $ck = trim(mb_strtolower((string)$ec->getCompany()));
            if ($nk !== '' || $ck !== '') {
                $key = $nk.'|'.$ck;
                if (!isset($byNameCompany[$key])) { $byNameCompany[$key] = $ec; }
            }
        }

        $reservations = $resRepo->findAll();
        $created = 0; $updated = 0;

        foreach ($reservations as $r) {
            if (!$r instanceof Reservation) continue;

            $name = trim((string)$r->getContactName());
            $email = $r->getContactEmail();
            $phone = $r->getContactPhone();
            $company = $r->getInvoiceCompany();
            $note = $r->getContactNote();
            $invoiceName = $r->isInvoiceSameAsContact() ? ($r->getInvoiceName() ?: $name) : $r->getInvoiceName();
            $invoiceEmail = $r->getInvoiceEmail() ?: $email;
            $invoicePhone = $r->getInvoicePhone() ?: $phone;
            $invoiceIc = $r->getInvoiceIc();
            $invoiceDic = $r->getInvoiceDic();
            $clientComeFrom = $r->getClientComeFrom();

            if ($name === '' && !$email && !$phone && !$company) {
                continue; // skip empty
            }

            $emailNorm = Contact::normalizeEmail($email);
            $phoneNorm = Contact::normalizePhone($phone);

            // Dedup: email → phone → fallback (name+company) using in-memory maps (includes newly created contacts in this run)
            $existing = null;
            if ($emailNorm && isset($byEmail[$emailNorm])) {
                $existing = $byEmail[$emailNorm];
            } elseif ($phoneNorm && isset($byPhone[$phoneNorm])) {
                $existing = $byPhone[$phoneNorm];
            } else {
                $nk = $name !== '' ? mb_strtolower($name) : '';
                $ck = $company ? mb_strtolower(trim((string)$company)) : '';
                if ($nk !== '' && $ck !== '') {
                    $key = trim($nk).'|'.trim($ck);
                    if (isset($byNameCompany[$key])) {
                        $existing = $byNameCompany[$key];
                    }
                }
            }

            if (!$existing) {
                $c = new Contact();
                $c->setName($name !== '' ? $name : ($invoiceName ?: ($company ?: 'Kontakt')))
                  ->setEmail($email)
                  ->setPhone($phone)
                  ->setCompany($company)
                  ->setNote($note)
                  ->setInvoiceName($invoiceName)
                  ->setInvoiceEmail($invoiceEmail)
                  ->setInvoicePhone($invoicePhone)
                  ->setInvoiceIc($invoiceIc)
                  ->setInvoiceDic($invoiceDic)
                  ->setClientComeFrom($clientComeFrom)
                  ->setSourceReservationId($r->getId());
                $em->persist($c);

                // Register into maps immediately to prevent duplicates in the same run
                $en = Contact::normalizeEmail($c->getEmail());
                if ($en) { $byEmail[$en] = $c; }
                $pn = Contact::normalizePhone($c->getPhone());
                if ($pn) { $byPhone[$pn] = $c; }
                $nk = trim(mb_strtolower($c->getName() ?? ''));
                $ck = trim(mb_strtolower((string)$c->getCompany()));
                if ($nk !== '' && $ck !== '') { $byNameCompany[$nk.'|'.$ck] = $c; }

                $created++;
            } else {
                $changed = false;
                $assign = function (&$changed, $getter, $setter, $value, $overwrite = false) use ($existing) {
                    $current = $existing->{$getter}();
                    if ($overwrite) {
                        if ($value !== null && $value !== '' && $value !== $current) { $existing->{$setter}($value); $changed = true; }
                    } else {
                        if (($current === null || $current === '') && ($value !== null && $value !== '')) { $existing->{$setter}($value); $changed = true; }
                    }
                };
                // Only fill missing fields by default
                $assign($changed, 'getCompany', 'setCompany', $company);
                $assign($changed, 'getNote', 'setNote', $note);
                $assign($changed, 'getName', 'setName', $name);
                $assign($changed, 'getEmail', 'setEmail', $email);
                $assign($changed, 'getPhone', 'setPhone', $phone);
                $assign($changed, 'getInvoiceName', 'setInvoiceName', $invoiceName);
                $assign($changed, 'getInvoiceEmail', 'setInvoiceEmail', $invoiceEmail);
                $assign($changed, 'getInvoicePhone', 'setInvoicePhone', $invoicePhone);
                $assign($changed, 'getInvoiceIc', 'setInvoiceIc', $invoiceIc);
                $assign($changed, 'getInvoiceDic', 'setInvoiceDic', $invoiceDic);
                $assign($changed, 'getClientComeFrom', 'setClientComeFrom', $clientComeFrom);

                if ($changed) {
                    $existing->setUpdatedAt(new \DateTime());
                    $updated++;
                }

                // Keep maps in sync if email/phone/name/company were just filled in
                $en = Contact::normalizeEmail($existing->getEmail());
                if ($en) { $byEmail[$en] = $existing; }
                $pn = Contact::normalizePhone($existing->getPhone());
                if ($pn) { $byPhone[$pn] = $existing; }
                $nk = trim(mb_strtolower($existing->getName() ?? ''));
                $ck = trim(mb_strtolower((string)$existing->getCompany()));
                if ($nk !== '' && $ck !== '') { $byNameCompany[$nk.'|'.$ck] = $existing; }
            }
        }

        try {
            $em->flush();
        } catch (\Doctrine\DBAL\Exception\UniqueConstraintViolationException $e) {
            // As a fallback, report a friendly error with the conflicting field
            return $this->json([
                'status' => 'error',
                'message' => 'Detekována duplicita kontaktu (pravděpodobně e‑mail nebo telefon). Prosím spusťte migrace/cleanup duplicit a zkuste znovu.',
                'error' => $e->getMessage(),
            ], 409);
        }

        return $this->json(['status' => 'ok', 'created' => $created, 'updated' => $updated]);
    }

    private function toArray(Contact $c): array
    {
        return [
            'id' => $c->getId(),
            'name' => $c->getName(),
            'email' => $c->getEmail(),
            'phone' => $c->getPhone(),
            'company' => $c->getCompany(),
            'invoiceName' => $c->getInvoiceName(),
            'invoiceEmail' => $c->getInvoiceEmail(),
            'invoicePhone' => $c->getInvoicePhone(),
            'invoiceIc' => $c->getInvoiceIc(),
            'invoiceDic' => $c->getInvoiceDic(),
            'clientComeFrom' => $c->getClientComeFrom(),
            'billingStreet' => $c->getBillingStreet(),
            'billingCity' => $c->getBillingCity(),
            'billingZip' => $c->getBillingZip(),
            'billingCountry' => $c->getBillingCountry(),
            'note' => $c->getNote(),
            'sourceReservationId' => $c->getSourceReservationId(),
            'createdAt' => $c->getCreatedAt()->format(DATE_ATOM),
            'updatedAt' => $c->getUpdatedAt()->format(DATE_ATOM),
        ];
    }

    /** @param array<string,mixed> $data */
    private function applyData(Contact $c, array $data, bool $partial = false): void
    {
        if (!$partial || array_key_exists('name', $data)) $c->setName((string)($data['name'] ?? ''));
        if (!$partial || array_key_exists('email', $data)) $c->setEmail($data['email'] !== '' ? ($data['email'] ?? null) : null);
        if (!$partial || array_key_exists('phone', $data)) $c->setPhone($data['phone'] !== '' ? ($data['phone'] ?? null) : null);
        if (!$partial || array_key_exists('company', $data)) $c->setCompany($data['company'] !== '' ? ($data['company'] ?? null) : null);
        if (!$partial || array_key_exists('note', $data)) $c->setNote($data['note'] !== '' ? ($data['note'] ?? null) : null);
        if (!$partial || array_key_exists('sourceReservationId', $data)) $c->setSourceReservationId(isset($data['sourceReservationId']) ? (int)$data['sourceReservationId'] : null);

        if (!$partial || array_key_exists('invoiceName', $data)) $c->setInvoiceName($data['invoiceName'] !== '' ? ($data['invoiceName'] ?? null) : null);
        if (!$partial || array_key_exists('invoiceEmail', $data)) $c->setInvoiceEmail($data['invoiceEmail'] !== '' ? ($data['invoiceEmail'] ?? null) : null);
        if (!$partial || array_key_exists('invoicePhone', $data)) $c->setInvoicePhone($data['invoicePhone'] !== '' ? ($data['invoicePhone'] ?? null) : null);
        if (!$partial || array_key_exists('invoiceIc', $data)) $c->setInvoiceIc($data['invoiceIc'] !== '' ? ($data['invoiceIc'] ?? null) : null);
        if (!$partial || array_key_exists('invoiceDic', $data)) $c->setInvoiceDic($data['invoiceDic'] !== '' ? ($data['invoiceDic'] ?? null) : null);
        if (!$partial || array_key_exists('clientComeFrom', $data)) $c->setClientComeFrom($data['clientComeFrom'] !== '' ? ($data['clientComeFrom'] ?? null) : null);

        if (!$partial || array_key_exists('billingStreet', $data)) $c->setBillingStreet($data['billingStreet'] !== '' ? ($data['billingStreet'] ?? null) : null);
        if (!$partial || array_key_exists('billingCity', $data)) $c->setBillingCity($data['billingCity'] !== '' ? ($data['billingCity'] ?? null) : null);
        if (!$partial || array_key_exists('billingZip', $data)) $c->setBillingZip($data['billingZip'] !== '' ? ($data['billingZip'] ?? null) : null);
        if (!$partial || array_key_exists('billingCountry', $data)) $c->setBillingCountry($data['billingCountry'] !== '' ? ($data['billingCountry'] ?? null) : null);

        $c->setUpdatedAt(new \DateTime());
    }
}
