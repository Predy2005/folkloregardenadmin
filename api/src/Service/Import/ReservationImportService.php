<?php
declare(strict_types=1);

namespace App\Service\Import;

use App\Entity\Contact;
use App\Entity\Partner;
use App\Entity\PricingDefault;
use App\Entity\Reservation;
use App\Entity\ReservationPerson;
use App\Repository\ContactRepository;
use App\Repository\PartnerRepository;
use App\Repository\ReservationRepository;
use App\Repository\ReservationTypeRepository;
use App\Service\AutoEventService;
use Doctrine\ORM\EntityManagerInterface;

/**
 * Takes a parsed Excel reservation draft (from {@see ImportReservationsCommand})
 * and persists it as a real Reservation, creating Contacts/Partners on the fly
 * according to the rules:
 *
 *  - Partner is created/found for sections CESTOVKY/PRŮVODCI/HOTELY (B2B).
 *  - Contact is always created/found per company (1 contact, N reservations).
 *  - Price chain: excel → partner → system default.
 *  - Existing reservation with same natural key is updated when content
 *    differs (hash comparison), otherwise skipped.
 */
class ReservationImportService
{
    public function __construct(
        private readonly EntityManagerInterface $em,
        private readonly ContactRepository $contactRepository,
        private readonly PartnerRepository $partnerRepository,
        private readonly ReservationRepository $reservationRepository,
        private readonly ReservationTypeRepository $reservationTypeRepository,
        private readonly AutoEventService $autoEventService,
    ) {
    }

    /** Map Excel section → Partner.partnerType. */
    private const SECTION_TO_PARTNER_TYPE = [
        'CESTOVKY' => 'DISTRIBUTOR',
        'HOTELY'   => 'HOTEL',
        'PRŮVODCI' => 'OTHER',
    ];

    /** Sections that should auto-create a Partner record. */
    private const PARTNER_SECTIONS = ['CESTOVKY', 'HOTELY', 'PRŮVODCI'];

    /**
     * Import a single draft.
     *
     * @param array<string,mixed> $draft Output of ImportReservationsCommand::buildDraft()
     * @return array{action: 'created'|'updated'|'skipped', reservationId: ?int, message: string}
     */
    public function importDraft(array $draft): array
    {
        $company = trim((string) ($draft['raw']['company'] ?? ''));
        if ($company === '') {
            return ['action' => 'skipped', 'reservationId' => null, 'message' => 'Žádné jméno firmy'];
        }

        // Natural key: date|venue|rowNumber — guarantees 1:1 with Excel cell.
        $importKey = sprintf(
            '%s|%s|R%d',
            $draft['date']->format('Y-m-d'),
            $draft['venue'],
            $draft['rowNumber'] ?? 0
        );
        $contentHash = $this->hashDraft($draft);
        $existing = $this->findReservationByImportKey($importKey);

        if ($existing !== null) {
            $existingHash = $existing->getContactNote() && preg_match('/\[hash:([a-f0-9]{16})\]/', $existing->getContactNote(), $m)
                ? $m[1]
                : null;
            if ($existingHash === $contentHash) {
                return ['action' => 'skipped', 'reservationId' => $existing->getId(), 'message' => 'Beze změny'];
            }
            // Content changed → update in place
            $this->applyDraftToReservation($existing, $draft, $contentHash, $importKey);
            $this->em->flush();
            return ['action' => 'updated', 'reservationId' => $existing->getId(), 'message' => 'Aktualizováno'];
        }

        // Create new
        $reservation = new Reservation();
        $reservation->setCreatedAt(new \DateTime());
        $this->applyDraftToReservation($reservation, $draft, $contentHash, $importKey);
        $this->em->persist($reservation);
        $this->em->flush();

        try {
            $this->autoEventService->syncReservationToEvent($reservation);
        } catch (\Throwable $e) {
            // non-fatal
        }

        return ['action' => 'created', 'reservationId' => $reservation->getId(), 'message' => 'Vytvořeno'];
    }

    /**
     * Hash that captures all import-relevant fields. Used to detect whether
     * an Excel row has changed since the last import.
     */
    private function hashDraft(array $draft): string
    {
        $payload = [
            'date' => $draft['date']->format('Y-m-d'),
            'venue' => $draft['venue'],
            'section' => $draft['section'],
            'pax' => $draft['pax'],
            'free' => $draft['free'],
            'company' => $draft['raw']['company'] ?? null,
            'menu' => $draft['raw']['menu'] ?? null,
            'drinks' => $draft['raw']['drinks'] ?? null,
            'platba' => $draft['raw']['platba'] ?? null,
            'pickup' => $draft['raw']['pickup'] ?? null,
            'kontakt' => $draft['raw']['kontakt'] ?? null,
            'narodnost' => $draft['raw']['narodnost'] ?? null,
            'hotel' => $draft['raw']['hotel'] ?? null,
            'poznamky' => $draft['raw']['poznamky'] ?? null,
            'zalohovka' => $draft['raw']['zalohovka'] ?? null,
        ];
        return substr(md5(json_encode($payload, JSON_UNESCAPED_UNICODE)), 0, 16);
    }

    /**
     * Find a reservation that was previously imported with the given key
     * (date|venue|rowNumber). The key is stored as `[importKey:...]` in
     * contactNote so it survives across runs.
     */
    private function findReservationByImportKey(string $importKey): ?Reservation
    {
        $qb = $this->reservationRepository->createQueryBuilder('r')
            ->where('r.contactNote LIKE :marker')
            ->setParameter('marker', '%[importKey:' . $importKey . ']%')
            ->setMaxResults(1);
        return $qb->getQuery()->getOneOrNullResult();
    }

    /**
     * Apply a parsed draft onto a Reservation entity (create or update path).
     */
    private function applyDraftToReservation(Reservation $reservation, array $draft, string $contentHash, string $importKey): void
    {
        $raw = $draft['raw'];
        $payment = $draft['parsedPayment'];

        // Date + status
        $reservation->setDate(new \DateTime($draft['date']->format('Y-m-d')));
        $reservation->setStatus($draft['status']);

        // Reservation type — use "Klasická" by default; voucher only when really matched
        if ($reservation->getReservationType() === null) {
            $type = $this->reservationTypeRepository->findOneBy(['code' => 'classic'])
                ?? $this->reservationTypeRepository->findOneBy([]);
            $reservation->setReservationType($type);
        }

        // Resolve contact + partner first (we need their fields below)
        $contact = $this->findOrCreateContact($raw, $draft['parsedContact']);
        $partner = $this->maybeFindOrCreatePartner($draft['section'], $raw, $contact);

        // Apply contact data to reservation.
        // IMPORTANT: contactName is always the raw company string from Excel
        // column A — this is what findExistingReservation matches on, so it
        // must stay stable across runs (do not overwrite with contact.name).
        $company = (string) ($raw['company'] ?? '');
        $reservation->setContactName($company);
        $reservation->setContactEmail($contact->getEmail() ?? '');
        $reservation->setContactPhone($contact->getPhone() ?? ($draft['parsedContact']['phone'] ?? ''));
        $reservation->setContactNationality($raw['narodnost'] ?? '');
        $reservation->setClientComeFrom($draft['section']);
        $reservation->setAgreement(true);

        if ($partner !== null) {
            $reservation->setPartnerId($partner->getId());
        }

        // Build contactNote that aggregates Excel-specific bits + import markers
        $noteParts = [];
        if (!empty($raw['hotel'])) $noteParts[] = "Hotel: {$raw['hotel']}";
        if (!empty($raw['platba'])) $noteParts[] = "Platba: {$raw['platba']}";
        if (!empty($raw['zalohovka'])) $noteParts[] = "Zálohovka: {$raw['zalohovka']}";
        if (!empty($raw['pickup'])) $noteParts[] = "Pickup: " . ($draft['pickup'] ?? $raw['pickup']);
        if (!empty($raw['poznamky'])) $noteParts[] = "Poznámky: {$raw['poznamky']}";
        $noteParts[] = "[importKey:$importKey] [hash:$contentHash]";
        $reservation->setContactNote(implode("\n", $noteParts));

        // Invoice fields from contact/partner
        $reservation->setInvoiceSameAsContact(false);
        $reservation->setInvoiceCompany($contact->getCompany() ?? $company);
        $reservation->setInvoiceName($contact->getInvoiceName() ?? $contact->getName() ?? $company);
        $reservation->setInvoiceEmail($contact->getInvoiceEmail() ?? $contact->getEmail());
        $reservation->setInvoicePhone($contact->getInvoicePhone() ?? $contact->getPhone());
        $reservation->setInvoiceIc($contact->getInvoiceIc() ?? ($partner?->getIc()));
        $reservation->setInvoiceDic($contact->getInvoiceDic() ?? ($partner?->getDic()));

        // Payment method + currency
        if ($payment['paymentMethod']) {
            $reservation->setPaymentMethod($payment['paymentMethod']);
        }
        $currency = $payment['currency'] ?? $partner?->getCurrency() ?? 'CZK';
        $reservation->setCurrency($currency);

        // Resolve per-person price: excel → partner → default
        $unitPrice = $this->resolveUnitPrice($payment['price'], $partner);

        // Wipe existing persons (for update path) and recreate
        foreach ($reservation->getPersons() as $existingPerson) {
            $this->em->remove($existingPerson);
        }
        $reservation->getPersons()->clear();

        // Add paid persons
        $totalPaid = 0;
        for ($i = 0; $i < $draft['pax']; $i++) {
            $person = $this->buildPerson($draft, $unitPrice, false, $currency);
            $person->setReservation($reservation);
            $reservation->addPerson($person);
            $this->em->persist($person);
            $totalPaid += $unitPrice;
        }
        // Add free (complimentary) persons
        for ($i = 0; $i < $draft['free']; $i++) {
            $person = $this->buildPerson($draft, 0.0, true, $currency);
            $person->setReservation($reservation);
            $reservation->addPerson($person);
            $this->em->persist($person);
        }

        $reservation->setTotalPrice(number_format($totalPaid, 2, '.', ''));

        $reservation->setUpdatedAt(new \DateTime());
    }

    private function buildPerson(array $draft, float $price, bool $isFree, string $currency): ReservationPerson
    {
        $person = new ReservationPerson();
        $person->setType('adult'); // Excel doesn't distinguish age categories
        // Pick first menu segment as the person's menu (most common case)
        $menuLabel = $draft['menu'][0]['label'] ?? ($draft['raw']['menu'] ?? '');
        $person->setMenu($menuLabel);
        $person->setPrice(number_format($price, 2, '.', ''));
        $person->setNationality($draft['raw']['narodnost'] ?? null);
        $person->setCurrency($currency);
        $person->setIsFree($isFree);
        if ($draft['drinks']) {
            $person->setDrinkOption($draft['drinks']);
        }
        return $person;
    }

    /**
     * Resolve per-person price from the parsed payment, partner pricing, or
     * the system default — in that order.
     */
    private function resolveUnitPrice(?float $excelPrice, ?Partner $partner): float
    {
        if ($excelPrice !== null && $excelPrice > 0) {
            return $excelPrice;
        }
        if ($partner !== null) {
            if ($partner->getPricingModel() === 'FLAT' && $partner->getFlatPriceAdult()) {
                return (float) $partner->getFlatPriceAdult();
            }
        }
        $default = $this->em->getRepository(PricingDefault::class)->findOneBy([]);
        return $default ? (float) $default->getAdultPrice() : 1250.0;
    }

    /**
     * Find a contact by company-name match, otherwise create one.
     * Idempotent: importing the same company twice returns the same record.
     */
    private function findOrCreateContact(array $raw, array $parsedContact): Contact
    {
        $company = trim((string) ($raw['company'] ?? ''));
        $email = $parsedContact['email'] ?? null;
        $phone = $parsedContact['phone'] ?? null;

        // Try to match by company name first (most common for B2B)
        $contact = null;
        if ($company !== '') {
            $contact = $this->contactRepository->findOneBy(['company' => $company])
                ?? $this->contactRepository->findOneBy(['name' => $company]);
        }

        if ($contact === null) {
            $contact = new Contact();
            $contact->setName($parsedContact['name'] ?? $company);
            $contact->setCompany($company);
            $contact->setEmail($email);
            $contact->setPhone($phone);
            $this->em->persist($contact);
            // Flush so the entity gets an ID before any reservation references it
            $this->em->flush();
        } else {
            // Backfill missing fields
            if (!$contact->getPhone() && $phone) $contact->setPhone($phone);
            if (!$contact->getEmail() && $email) $contact->setEmail($email);
        }

        return $contact;
    }

    /**
     * Create a Partner if the section is B2B (CESTOVKY/HOTELY/PRŮVODCI) and
     * the company doesn't already have one.
     */
    private function maybeFindOrCreatePartner(?string $section, array $raw, Contact $contact): ?Partner
    {
        if ($section === null || !in_array($section, self::PARTNER_SECTIONS, true)) {
            return null;
        }
        $company = trim((string) ($raw['company'] ?? ''));
        if ($company === '') return null;

        $partner = $this->partnerRepository->findOneBy(['name' => $company]);
        if ($partner !== null) return $partner;

        $partner = new Partner();
        $partner->setName($company);
        $partner->setPartnerType(self::SECTION_TO_PARTNER_TYPE[$section] ?? 'OTHER');
        $partner->setContactPerson($contact->getName());
        $partner->setEmail($contact->getEmail());
        $partner->setPhone($contact->getPhone());
        $partner->setIsActive(true);
        $partner->setPricingModel('DEFAULT');
        $partner->setBillingPeriod('PER_RESERVATION');
        $this->em->persist($partner);
        $this->em->flush();

        return $partner;
    }
}
