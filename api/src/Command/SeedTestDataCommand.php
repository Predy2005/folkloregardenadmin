<?php

namespace App\Command;

use App\Entity\CashMovement;
use App\Entity\Cashbox;
use App\Entity\Contact;
use App\Entity\Event;
use App\Entity\EventBeverage;
use App\Entity\EventGuest;
use App\Entity\EventInvoice;
use App\Entity\EventMenu;
use App\Entity\EventSpace;
use App\Entity\EventStaffAssignment;
use App\Entity\EventTable;
use App\Entity\EventVoucher;
use App\Entity\Invoice;
use App\Entity\Partner;
use App\Entity\Payment;
use App\Entity\Reservation;
use App\Entity\ReservationFoods;
use App\Entity\ReservationPerson;
use App\Entity\StaffAttendance;
use App\Entity\StaffingFormula;
use App\Entity\StaffMember;
use App\Entity\StaffRole;
use App\Entity\Voucher;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\Console\Attribute\AsCommand;
use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Input\InputOption;
use Symfony\Component\Console\Output\OutputInterface;
use Symfony\Component\Console\Style\SymfonyStyle;

#[AsCommand(
    name: 'app:seed-test-data',
    description: 'Seeds comprehensive test data for full system testing',
)]
class SeedTestDataCommand extends Command
{
    private EntityManagerInterface $entityManager;
    private SymfonyStyle $io;

    // Pricing tiers by group size
    private const PRICING_TIERS = [
        ['min' => 1, 'max' => 10, 'pricePerPerson' => 990],      // Small group - premium
        ['min' => 11, 'max' => 30, 'pricePerPerson' => 890],     // Medium group
        ['min' => 31, 'max' => 60, 'pricePerPerson' => 850],     // Large group
        ['min' => 61, 'max' => 100, 'pricePerPerson' => 820],    // Very large
        ['min' => 101, 'max' => 200, 'pricePerPerson' => 790],   // Huge group - discount
        ['min' => 201, 'max' => 500, 'pricePerPerson' => 750],   // Mega group - max discount
    ];

    // Nationalities for guest diversity
    private const NATIONALITIES = [
        'CZ' => 'Czech',
        'SK' => 'Slovak',
        'DE' => 'German',
        'AT' => 'Austrian',
        'PL' => 'Polish',
        'US' => 'American',
        'GB' => 'British',
        'FR' => 'French',
        'IT' => 'Italian',
        'ES' => 'Spanish',
        'JP' => 'Japanese',
        'CN' => 'Chinese',
        'KR' => 'Korean',
        'IL' => 'Israeli',
        'RU' => 'Russian',
        'UA' => 'Ukrainian',
        'NL' => 'Dutch',
        'BE' => 'Belgian',
    ];

    // Staff positions with hourly rates
    private const STAFF_POSITIONS = [
        'MANAGER' => ['rate' => 450, 'fixed' => 3500, 'description' => 'Event Manager'],
        'COORDINATOR' => ['rate' => 350, 'fixed' => 2500, 'description' => 'Event Coordinator'],
        'HEAD_CHEF' => ['rate' => 400, 'fixed' => 3000, 'description' => 'Head Chef'],
        'CHEF' => ['rate' => 300, 'fixed' => null, 'description' => 'Chef'],
        'SOUS_CHEF' => ['rate' => 280, 'fixed' => null, 'description' => 'Sous Chef'],
        'PREP_COOK' => ['rate' => 200, 'fixed' => null, 'description' => 'Prep Cook'],
        'HEAD_WAITER' => ['rate' => 280, 'fixed' => 2000, 'description' => 'Head Waiter'],
        'WAITER' => ['rate' => 220, 'fixed' => null, 'description' => 'Waiter'],
        'BARTENDER' => ['rate' => 250, 'fixed' => null, 'description' => 'Bartender'],
        'HOSTESS' => ['rate' => 200, 'fixed' => null, 'description' => 'Hostess'],
        'MUSICIAN' => ['rate' => 500, 'fixed' => 4000, 'description' => 'Musician/Performer'],
        'DANCER' => ['rate' => 400, 'fixed' => 3000, 'description' => 'Folklore Dancer'],
        'SOUND_TECH' => ['rate' => 350, 'fixed' => 2500, 'description' => 'Sound Technician'],
        'PHOTOGRAPHER' => ['rate' => 450, 'fixed' => 4000, 'description' => 'Photographer'],
        'SECURITY' => ['rate' => 250, 'fixed' => null, 'description' => 'Security'],
        'CLEANER' => ['rate' => 180, 'fixed' => null, 'description' => 'Cleaning Staff'],
        'DRIVER' => ['rate' => 280, 'fixed' => null, 'description' => 'Transfer Driver'],
    ];

    public function __construct(EntityManagerInterface $entityManager)
    {
        parent::__construct();
        $this->entityManager = $entityManager;
    }

    protected function configure(): void
    {
        $this
            ->addOption('clear', null, InputOption::VALUE_NONE, 'Clear existing test data before seeding')
            ->addOption('dry-run', null, InputOption::VALUE_NONE, 'Show what would be created without persisting');
    }

    protected function execute(InputInterface $input, OutputInterface $output): int
    {
        $this->io = new SymfonyStyle($input, $output);
        $dryRun = $input->getOption('dry-run');

        $this->io->title('Seeding Comprehensive Test Data');

        if ($input->getOption('clear')) {
            $this->clearTestData();
        }

        // 1. Seed staffing formulas
        $this->io->section('1. Creating Staffing Formulas');
        $formulas = $this->seedStaffingFormulas();

        // 2. Seed staff roles
        $this->io->section('2. Creating Staff Roles');
        $staffRoles = $this->seedStaffRoles();

        // 3. Seed staff members
        $this->io->section('3. Creating Staff Members');
        $staffMembers = $this->seedStaffMembers($staffRoles);

        // 4. Seed partners
        $this->io->section('4. Creating Partners');
        $partners = $this->seedPartners();

        // 5. Seed vouchers
        $this->io->section('5. Creating Vouchers');
        $vouchers = $this->seedVouchers($partners);

        // 6. Seed contacts
        $this->io->section('6. Creating Contacts');
        $contacts = $this->seedContacts();

        // 7. Get food items
        $this->io->section('7. Loading Food Items');
        $foods = $this->entityManager->getRepository(ReservationFoods::class)->findAll();
        if (empty($foods)) {
            $this->io->warning('No food items found. Run app:seed-foods first.');
            return Command::FAILURE;
        }
        $this->io->text(sprintf('Found %d food items', count($foods)));

        // 8. Seed comprehensive reservations with events
        $this->io->section('8. Creating Test Reservations with Events');
        $this->seedComprehensiveReservations($foods, $staffMembers, $contacts, $vouchers, $formulas);

        if (!$dryRun) {
            $this->entityManager->flush();
            $this->io->success('All test data has been seeded successfully!');
        } else {
            $this->io->warning('Dry run - no data was persisted');
        }

        $this->printSummary();

        return Command::SUCCESS;
    }

    private function clearTestData(): void
    {
        $this->io->text('Clearing existing test data...');

        // Clear in correct order due to foreign keys
        $tables = [
            'EventStaffAssignment',
            'EventGuest',
            'EventMenu',
            'EventBeverage',
            'EventTable',
            'EventSpace',
            'EventVoucher',
            'EventInvoice',
            'EventSchedule',
            'StaffAttendance',
            'CashMovement',
            'CashboxClosure',
            'Cashbox',
            'Payment',
            'Invoice',
            'ReservationPerson',
            'Event',
            'Reservation',
            'VoucherRedemption',
            'Voucher',
            'CommissionLog',
            'Partner',
            'StaffMember',
            'StaffRole',
            'StaffingFormula',
            'Contact',
        ];

        foreach ($tables as $entity) {
            try {
                $this->entityManager->createQuery("DELETE FROM App\\Entity\\{$entity}")->execute();
            } catch (\Exception $e) {
                // Table might not exist or be empty
            }
        }

        $this->io->text('Test data cleared.');
    }

    private function seedStaffingFormulas(): array
    {
        $formulas = [];
        $data = [
            // Event type => [waiter ratio, chef ratio, coordinator ratio, bartender ratio]
            ['category' => 'waiter', 'FOLKLORE_SHOW' => 12, 'WEDDING' => 8, 'CORPORATE' => 15, 'PRIVATE_EVENT' => 10],
            ['category' => 'chef', 'FOLKLORE_SHOW' => 25, 'WEDDING' => 20, 'CORPORATE' => 30, 'PRIVATE_EVENT' => 20],
            ['category' => 'coordinator', 'FOLKLORE_SHOW' => 50, 'WEDDING' => 40, 'CORPORATE' => 60, 'PRIVATE_EVENT' => 50],
            ['category' => 'bartender', 'FOLKLORE_SHOW' => 30, 'WEDDING' => 25, 'CORPORATE' => 40, 'PRIVATE_EVENT' => 30],
            ['category' => 'hostess', 'FOLKLORE_SHOW' => 40, 'WEDDING' => 30, 'CORPORATE' => 50, 'PRIVATE_EVENT' => 40],
            ['category' => 'security', 'FOLKLORE_SHOW' => 80, 'WEDDING' => 100, 'CORPORATE' => 100, 'PRIVATE_EVENT' => 80],
        ];

        foreach ($data as $row) {
            $staffCategory = $row['category'];
            unset($row['category']);

            foreach ($row as $eventType => $ratio) {
                $formula = new StaffingFormula();
                $formula->setCategory("{$staffCategory}_{$eventType}");
                $formula->setRatio($ratio);
                $formula->setEnabled(true);
                $formula->setDescription("1 {$staffCategory} per {$ratio} guests for {$eventType}");

                $this->entityManager->persist($formula);
                $formulas["{$staffCategory}_{$eventType}"] = $formula;
            }
        }

        $this->io->text(sprintf('Created %d staffing formulas', count($formulas)));
        return $formulas;
    }

    private function seedStaffRoles(): array
    {
        $roles = [];

        foreach (self::STAFF_POSITIONS as $code => $data) {
            $role = new StaffRole();
            $role->setName($code);
            $role->setDescription($data['description']);
            // StaffRole uses guestsRatio instead of hourlyRate
            $role->setGuestsRatio(10); // Default ratio

            $this->entityManager->persist($role);
            $roles[$code] = $role;
        }

        $this->io->text(sprintf('Created %d staff roles', count($roles)));
        return $roles;
    }

    private function seedStaffMembers(array $staffRoles): array
    {
        $members = [];

        $staffData = [
            // Managers & Coordinators
            ['firstName' => 'Jan', 'lastName' => 'Novák', 'position' => 'MANAGER', 'email' => 'jan.novak@folkloregarden.cz'],
            ['firstName' => 'Marie', 'lastName' => 'Svobodová', 'position' => 'MANAGER', 'email' => 'marie.svobodova@folkloregarden.cz'],
            ['firstName' => 'Petr', 'lastName' => 'Dvořák', 'position' => 'COORDINATOR', 'email' => 'petr.dvorak@folkloregarden.cz'],
            ['firstName' => 'Lucie', 'lastName' => 'Černá', 'position' => 'COORDINATOR', 'email' => 'lucie.cerna@folkloregarden.cz'],
            ['firstName' => 'Tomáš', 'lastName' => 'Procházka', 'position' => 'COORDINATOR', 'email' => 'tomas.prochazka@folkloregarden.cz'],

            // Kitchen Staff
            ['firstName' => 'František', 'lastName' => 'Kuchař', 'position' => 'HEAD_CHEF', 'email' => 'frantisek.kuchar@folkloregarden.cz'],
            ['firstName' => 'Pavel', 'lastName' => 'Veselý', 'position' => 'CHEF', 'email' => 'pavel.vesely@folkloregarden.cz'],
            ['firstName' => 'Martin', 'lastName' => 'Horák', 'position' => 'CHEF', 'email' => 'martin.horak@folkloregarden.cz'],
            ['firstName' => 'Jakub', 'lastName' => 'Němec', 'position' => 'SOUS_CHEF', 'email' => 'jakub.nemec@folkloregarden.cz'],
            ['firstName' => 'David', 'lastName' => 'Marek', 'position' => 'SOUS_CHEF', 'email' => 'david.marek@folkloregarden.cz'],
            ['firstName' => 'Ondřej', 'lastName' => 'Pokorný', 'position' => 'PREP_COOK', 'email' => 'ondrej.pokorny@folkloregarden.cz'],
            ['firstName' => 'Jiří', 'lastName' => 'Král', 'position' => 'PREP_COOK', 'email' => 'jiri.kral@folkloregarden.cz'],
            ['firstName' => 'Michal', 'lastName' => 'Růžička', 'position' => 'PREP_COOK', 'email' => 'michal.ruzicka@folkloregarden.cz'],

            // Service Staff
            ['firstName' => 'Eva', 'lastName' => 'Benešová', 'position' => 'HEAD_WAITER', 'email' => 'eva.benesova@folkloregarden.cz'],
            ['firstName' => 'Anna', 'lastName' => 'Fialová', 'position' => 'HEAD_WAITER', 'email' => 'anna.fialova@folkloregarden.cz'],
            ['firstName' => 'Kateřina', 'lastName' => 'Sedláčková', 'position' => 'WAITER', 'email' => 'katerina.sedlackova@folkloregarden.cz'],
            ['firstName' => 'Tereza', 'lastName' => 'Zemanová', 'position' => 'WAITER', 'email' => 'tereza.zemanova@folkloregarden.cz'],
            ['firstName' => 'Monika', 'lastName' => 'Kolářová', 'position' => 'WAITER', 'email' => 'monika.kolarova@folkloregarden.cz'],
            ['firstName' => 'Barbora', 'lastName' => 'Vaňková', 'position' => 'WAITER', 'email' => 'barbora.vankova@folkloregarden.cz'],
            ['firstName' => 'Hana', 'lastName' => 'Kopecká', 'position' => 'WAITER', 'email' => 'hana.kopecka@folkloregarden.cz'],
            ['firstName' => 'Petra', 'lastName' => 'Vlčková', 'position' => 'WAITER', 'email' => 'petra.vlckova@folkloregarden.cz'],
            ['firstName' => 'Nikola', 'lastName' => 'Musilová', 'position' => 'WAITER', 'email' => 'nikola.musilova@folkloregarden.cz'],
            ['firstName' => 'Veronika', 'lastName' => 'Konečná', 'position' => 'WAITER', 'email' => 'veronika.konecna@folkloregarden.cz'],

            // Bar Staff
            ['firstName' => 'Lukáš', 'lastName' => 'Barták', 'position' => 'BARTENDER', 'email' => 'lukas.bartak@folkloregarden.cz'],
            ['firstName' => 'Vojtěch', 'lastName' => 'Holub', 'position' => 'BARTENDER', 'email' => 'vojtech.holub@folkloregarden.cz'],
            ['firstName' => 'Daniel', 'lastName' => 'Urban', 'position' => 'BARTENDER', 'email' => 'daniel.urban@folkloregarden.cz'],

            // Front of House
            ['firstName' => 'Simona', 'lastName' => 'Krásná', 'position' => 'HOSTESS', 'email' => 'simona.krasna@folkloregarden.cz'],
            ['firstName' => 'Kristýna', 'lastName' => 'Malá', 'position' => 'HOSTESS', 'email' => 'kristyna.mala@folkloregarden.cz'],
            ['firstName' => 'Adéla', 'lastName' => 'Novotná', 'position' => 'HOSTESS', 'email' => 'adela.novotna@folkloregarden.cz'],

            // Entertainment
            ['firstName' => 'Josef', 'lastName' => 'Houslista', 'position' => 'MUSICIAN', 'email' => 'josef.houslista@folkloregarden.cz'],
            ['firstName' => 'Karel', 'lastName' => 'Harmonikář', 'position' => 'MUSICIAN', 'email' => 'karel.harmonikar@folkloregarden.cz'],
            ['firstName' => 'Václav', 'lastName' => 'Cymbálník', 'position' => 'MUSICIAN', 'email' => 'vaclav.cymbalnik@folkloregarden.cz'],
            ['firstName' => 'Alena', 'lastName' => 'Tanečnice', 'position' => 'DANCER', 'email' => 'alena.tanecnice@folkloregarden.cz'],
            ['firstName' => 'Lenka', 'lastName' => 'Folklorní', 'position' => 'DANCER', 'email' => 'lenka.folklorni@folkloregarden.cz'],
            ['firstName' => 'Zuzana', 'lastName' => 'Krojovaná', 'position' => 'DANCER', 'email' => 'zuzana.krojovana@folkloregarden.cz'],
            ['firstName' => 'Marek', 'lastName' => 'Zvukař', 'position' => 'SOUND_TECH', 'email' => 'marek.zvukar@folkloregarden.cz'],
            ['firstName' => 'Roman', 'lastName' => 'Fotograf', 'position' => 'PHOTOGRAPHER', 'email' => 'roman.fotograf@folkloregarden.cz'],

            // Security & Support
            ['firstName' => 'Radek', 'lastName' => 'Silný', 'position' => 'SECURITY', 'email' => 'radek.silny@folkloregarden.cz'],
            ['firstName' => 'Stanislav', 'lastName' => 'Ostraha', 'position' => 'SECURITY', 'email' => 'stanislav.ostraha@folkloregarden.cz'],
            ['firstName' => 'Jaroslava', 'lastName' => 'Čistá', 'position' => 'CLEANER', 'email' => 'jaroslava.cista@folkloregarden.cz'],
            ['firstName' => 'Božena', 'lastName' => 'Uklízečka', 'position' => 'CLEANER', 'email' => 'bozena.uklizecka@folkloregarden.cz'],
            ['firstName' => 'Miroslav', 'lastName' => 'Řidič', 'position' => 'DRIVER', 'email' => 'miroslav.ridic@folkloregarden.cz'],
            ['firstName' => 'Vladimír', 'lastName' => 'Šofér', 'position' => 'DRIVER', 'email' => 'vladimir.sofer@folkloregarden.cz'],
        ];

        foreach ($staffData as $data) {
            $member = new StaffMember();
            $member->setFirstName($data['firstName']);
            $member->setLastName($data['lastName']);
            $member->setEmail($data['email']);
            $member->setPhone('+420' . rand(600000000, 799999999));
            $member->setPosition($data['position']);
            $member->setHourlyRate((string)self::STAFF_POSITIONS[$data['position']]['rate']);
            if (self::STAFF_POSITIONS[$data['position']]['fixed']) {
                $member->setFixedRate((string)self::STAFF_POSITIONS[$data['position']]['fixed']);
            }
            $member->setIsActive(true);
            $member->setDateOfBirth(new \DateTime(sprintf('-%d years', rand(22, 55))));
            $member->setAddress('Praha ' . rand(1, 10) . ', ' . rand(10000, 19999));
            $member->setEmergencyContact('Rodinný příslušník');
            $member->setEmergencyPhone('+420' . rand(600000000, 799999999));

            $this->entityManager->persist($member);
            $members[$data['position']][] = $member;
        }

        $this->io->text(sprintf('Created %d staff members', count($staffData)));
        return $members;
    }

    private function seedPartners(): array
    {
        $partners = [];

        $partnerData = [
            ['name' => 'Hotel Sax', 'type' => 'HOTEL', 'commission' => 15.0],
            ['name' => 'Hotel Josef', 'type' => 'HOTEL', 'commission' => 12.0],
            ['name' => 'Mama Shelter Prague', 'type' => 'HOTEL', 'commission' => 10.0],
            ['name' => 'Hotel U Prince', 'type' => 'HOTEL', 'commission' => 18.0],
            ['name' => 'Hilton Prague', 'type' => 'HOTEL', 'commission' => 8.0],
            ['name' => 'Prague City Tourism', 'type' => 'DISTRIBUTOR', 'commission' => 20.0],
            ['name' => 'GetYourGuide', 'type' => 'DISTRIBUTOR', 'commission' => 25.0],
            ['name' => 'Viator', 'type' => 'DISTRIBUTOR', 'commission' => 22.0],
            ['name' => 'Recepce Petra', 'type' => 'RECEPTION', 'commission' => 30.0],
            ['name' => 'Concierge Jan', 'type' => 'RECEPTION', 'commission' => 35.0],
        ];

        foreach ($partnerData as $data) {
            $partner = new Partner();
            $partner->setName($data['name']);
            $partner->setPartnerType($data['type']);
            $partner->setCommissionRate((string)$data['commission']);
            $partner->setContactPerson('Kontaktní osoba');
            $partner->setEmail(strtolower(str_replace(' ', '', $data['name'])) . '@partner.cz');
            $partner->setPhone('+420' . rand(200000000, 299999999));
            $partner->setPaymentMethod('BANK_TRANSFER');
            $partner->setIsActive(true);

            $this->entityManager->persist($partner);
            $partners[] = $partner;
        }

        $this->io->text(sprintf('Created %d partners', count($partners)));
        return $partners;
    }

    private function seedVouchers(array $partners): array
    {
        $vouchers = [];
        $voucherTypes = ['PERCENTAGE', 'FIXED_AMOUNT', 'FREE_ENTRY'];

        for ($i = 1; $i <= 20; $i++) {
            $voucher = new Voucher();
            $voucher->setCode('VOUCHER-' . strtoupper(substr(md5((string)$i), 0, 8)));
            $voucherType = $voucherTypes[array_rand($voucherTypes)];
            $voucher->setVoucherType($voucherType);

            // Set discount value based on type
            if ($voucherType === 'PERCENTAGE') {
                $voucher->setDiscountValue((string)rand(5, 30));
            } elseif ($voucherType === 'FIXED_AMOUNT') {
                $voucher->setDiscountValue((string)(rand(100, 500)));
            }
            // FREE_ENTRY doesn't need discount value

            $voucher->setIsActive(rand(0, 1) === 1);
            $voucher->setMaxUses(rand(1, 100));
            $voucher->setCurrentUses(0);
            $voucher->setValidFrom(new \DateTime('-1 month'));
            $voucher->setValidTo(new \DateTime(sprintf('+%d months', rand(1, 12))));

            if (!empty($partners) && rand(0, 1) === 1) {
                $voucher->setPartner($partners[array_rand($partners)]);
            }

            $this->entityManager->persist($voucher);
            $vouchers[] = $voucher;
        }

        $this->io->text(sprintf('Created %d vouchers', count($vouchers)));
        return $vouchers;
    }

    private function seedContacts(): array
    {
        $contacts = [];

        $contactData = [
            ['name' => 'Hans Müller', 'email' => 'hans.mueller@gmail.com', 'company' => 'Müller GmbH', 'country' => 'DE'],
            ['name' => 'Sarah Johnson', 'email' => 'sarah.johnson@outlook.com', 'company' => 'Johnson Inc.', 'country' => 'US'],
            ['name' => 'Pierre Dubois', 'email' => 'pierre.dubois@orange.fr', 'company' => 'Dubois SA', 'country' => 'FR'],
            ['name' => 'Giuseppe Rossi', 'email' => 'giuseppe.rossi@libero.it', 'company' => 'Rossi SpA', 'country' => 'IT'],
            ['name' => 'Yuki Tanaka', 'email' => 'yuki.tanaka@yahoo.co.jp', 'company' => 'Tanaka Corp', 'country' => 'JP'],
            ['name' => 'Wei Chen', 'email' => 'wei.chen@qq.com', 'company' => 'Chen Trading', 'country' => 'CN'],
            ['name' => 'David Cohen', 'email' => 'david.cohen@gmail.com', 'company' => 'Cohen Tours', 'country' => 'IL'],
            ['name' => 'Piotr Kowalski', 'email' => 'piotr.kowalski@wp.pl', 'company' => 'Kowalski Sp.', 'country' => 'PL'],
            ['name' => 'Jan Horváth', 'email' => 'jan.horvath@azet.sk', 'company' => 'Horváth s.r.o.', 'country' => 'SK'],
            ['name' => 'Wolfgang Gruber', 'email' => 'wolfgang.gruber@a1.at', 'company' => 'Gruber AG', 'country' => 'AT'],
            ['name' => 'František Novotný', 'email' => 'frantisek.novotny@seznam.cz', 'company' => 'Novotný a.s.', 'country' => 'CZ'],
            ['name' => 'Oleksandr Shevchenko', 'email' => 'oleksandr.s@ukr.net', 'company' => null, 'country' => 'UA'],
            ['name' => 'Min-jun Kim', 'email' => 'minjun.kim@naver.com', 'company' => 'Kim Travel', 'country' => 'KR'],
            ['name' => 'James Williams', 'email' => 'james.williams@bbc.co.uk', 'company' => 'Williams Ltd', 'country' => 'GB'],
            ['name' => 'Carmen García', 'email' => 'carmen.garcia@telefonica.es', 'company' => 'García SL', 'country' => 'ES'],
        ];

        foreach ($contactData as $data) {
            $contact = new Contact();
            $contact->setName($data['name']);
            $contact->setEmail($data['email']);
            // emailNormalized is auto-computed via lifecycle callback
            $contact->setPhone('+' . rand(1, 99) . rand(100000000, 999999999));
            $contact->setCompany($data['company']);
            $contact->setClientComeFrom('Google');

            $this->entityManager->persist($contact);
            $contacts[$data['country']][] = $contact;
        }

        $this->io->text(sprintf('Created %d contacts', count($contactData)));
        return $contacts;
    }

    private function seedComprehensiveReservations(array $foods, array $staffMembers, array $contacts, array $vouchers, array $formulas): void
    {
        // Define test scenarios
        $scenarios = [
            // Scenario 1: Small premium group (10 people) - Czech company event
            [
                'name' => 'Malá firemní akce - Novotný a.s.',
                'type' => 'CORPORATE',
                'totalGuests' => 10,
                'groups' => [
                    ['nationality' => 'CZ', 'adults' => 10, 'children' => 0],
                ],
                'venue' => 'TERASA',
                'paymentStatus' => 'PAID',
                'depositPercent' => 50,
                'daysFromNow' => 7,
            ],
            // Scenario 2: Medium mixed group (35 people) - German tour
            [
                'name' => 'Německý zájezd - Müller GmbH',
                'type' => 'FOLKLORE_SHOW',
                'totalGuests' => 35,
                'groups' => [
                    ['nationality' => 'DE', 'adults' => 28, 'children' => 5],
                    ['nationality' => 'AT', 'adults' => 2, 'children' => 0],
                ],
                'venue' => 'ROUBENKA',
                'paymentStatus' => 'PARTIAL',
                'depositPercent' => 30,
                'daysFromNow' => 14,
            ],
            // Scenario 3: Large wedding (85 people) - International
            [
                'name' => 'Svatba Johnson-Dubois',
                'type' => 'WEDDING',
                'totalGuests' => 85,
                'groups' => [
                    ['nationality' => 'US', 'adults' => 30, 'children' => 5],
                    ['nationality' => 'FR', 'adults' => 25, 'children' => 3],
                    ['nationality' => 'GB', 'adults' => 15, 'children' => 2],
                    ['nationality' => 'CZ', 'adults' => 5, 'children' => 0],
                ],
                'venue' => 'ROUBENKA',
                'paymentStatus' => 'PARTIAL',
                'depositPercent' => 40,
                'daysFromNow' => 30,
            ],
            // Scenario 4: Very large corporate (120 people) - Japanese
            [
                'name' => 'Tanaka Corp Gala Dinner',
                'type' => 'CORPORATE',
                'totalGuests' => 120,
                'groups' => [
                    ['nationality' => 'JP', 'adults' => 100, 'children' => 0],
                    ['nationality' => 'US', 'adults' => 15, 'children' => 0],
                    ['nationality' => 'CZ', 'adults' => 5, 'children' => 0],
                ],
                'venue' => 'ROUBENKA',
                'paymentStatus' => 'UNPAID',
                'depositPercent' => 25,
                'daysFromNow' => 45,
            ],
            // Scenario 5: Huge group (170 people) - Mixed European
            [
                'name' => 'Evropský kongres cestovního ruchu',
                'type' => 'PRIVATE_EVENT',
                'totalGuests' => 170,
                'groups' => [
                    ['nationality' => 'DE', 'adults' => 40, 'children' => 0],
                    ['nationality' => 'FR', 'adults' => 30, 'children' => 0],
                    ['nationality' => 'IT', 'adults' => 25, 'children' => 0],
                    ['nationality' => 'ES', 'adults' => 20, 'children' => 0],
                    ['nationality' => 'NL', 'adults' => 15, 'children' => 0],
                    ['nationality' => 'BE', 'adults' => 15, 'children' => 0],
                    ['nationality' => 'PL', 'adults' => 10, 'children' => 0],
                    ['nationality' => 'CZ', 'adults' => 15, 'children' => 0],
                ],
                'venue' => 'ROUBENKA',
                'paymentStatus' => 'PARTIAL',
                'depositPercent' => 20,
                'daysFromNow' => 60,
            ],
            // Scenario 6: Mega group (220 people) - Israeli tour
            [
                'name' => 'Cohen Tours - Velká skupina',
                'type' => 'FOLKLORE_SHOW',
                'totalGuests' => 220,
                'groups' => [
                    ['nationality' => 'IL', 'adults' => 180, 'children' => 30],
                    ['nationality' => 'US', 'adults' => 10, 'children' => 0],
                ],
                'venue' => 'ROUBENKA',
                'paymentStatus' => 'PARTIAL',
                'depositPercent' => 35,
                'daysFromNow' => 21,
                'specialMenus' => ['SPECIAL_SEMIKOSHER'], // Kosher requirements
            ],
            // Scenario 7: Medium family event (45 people) - Mixed Czech/Slovak
            [
                'name' => 'Rodinná oslava Horváthovcov',
                'type' => 'PRIVATE_EVENT',
                'totalGuests' => 45,
                'groups' => [
                    ['nationality' => 'SK', 'adults' => 25, 'children' => 8],
                    ['nationality' => 'CZ', 'adults' => 10, 'children' => 2],
                ],
                'venue' => 'TERASA',
                'paymentStatus' => 'PAID',
                'depositPercent' => 50,
                'daysFromNow' => 3,
            ],
            // Scenario 8: Past event (completed) - for testing history
            [
                'name' => 'Kowalski Sp. - Vánoční večírek',
                'type' => 'CORPORATE',
                'totalGuests' => 60,
                'groups' => [
                    ['nationality' => 'PL', 'adults' => 50, 'children' => 5],
                    ['nationality' => 'UA', 'adults' => 5, 'children' => 0],
                ],
                'venue' => 'ROUBENKA',
                'paymentStatus' => 'PAID',
                'depositPercent' => 100,
                'daysFromNow' => -14, // Past event
                'status' => 'COMPLETED',
            ],
            // Scenario 9: Korean group with special requirements
            [
                'name' => 'Kim Travel - Seoul Business Club',
                'type' => 'FOLKLORE_SHOW',
                'totalGuests' => 55,
                'groups' => [
                    ['nationality' => 'KR', 'adults' => 50, 'children' => 5],
                ],
                'venue' => 'ROUBENKA',
                'paymentStatus' => 'PARTIAL',
                'depositPercent' => 30,
                'daysFromNow' => 28,
            ],
            // Scenario 10: Chinese large group
            [
                'name' => 'Chen Trading - VIP delegace',
                'type' => 'CORPORATE',
                'totalGuests' => 95,
                'groups' => [
                    ['nationality' => 'CN', 'adults' => 85, 'children' => 0],
                    ['nationality' => 'CZ', 'adults' => 10, 'children' => 0],
                ],
                'venue' => 'ROUBENKA',
                'paymentStatus' => 'UNPAID',
                'depositPercent' => 25,
                'daysFromNow' => 90,
            ],
        ];

        foreach ($scenarios as $index => $scenario) {
            $this->io->text(sprintf('Creating scenario %d: %s (%d guests)', $index + 1, $scenario['name'], $scenario['totalGuests']));
            $this->createFullReservationScenario($scenario, $foods, $staffMembers, $contacts, $vouchers, $formulas, $index);
        }
    }

    private function createFullReservationScenario(array $scenario, array $foods, array $staffMembers, array $contacts, array $vouchers, array $formulas, int $index): void
    {
        $eventDate = new \DateTime(sprintf('%+d days', $scenario['daysFromNow']));

        // Calculate price based on group size
        $pricePerPerson = $this->getPriceForGroupSize($scenario['totalGuests']);
        $basePrice = $scenario['totalGuests'] * $pricePerPerson;

        // Add surcharge for special menus if applicable
        $menuSurcharge = 0;
        if (isset($scenario['specialMenus'])) {
            $menuSurcharge = count($scenario['specialMenus']) * 75 * ($scenario['totalGuests'] * 0.8); // 80% eat special
        }

        $totalPrice = $basePrice + $menuSurcharge;
        $depositAmount = $totalPrice * ($scenario['depositPercent'] / 100);

        // Calculate paid amount based on payment status
        $paidAmount = match($scenario['paymentStatus']) {
            'PAID' => $totalPrice,
            'PARTIAL' => $depositAmount,
            'UNPAID' => 0.0,
            default => 0.0,
        };

        // Create reservation
        $reservation = new Reservation();
        $reservation->setDate($eventDate);
        $reservation->setStatus($scenario['paymentStatus'] === 'PAID' ? 'CONFIRMED' : 'RECEIVED');
        $reservation->setSource('ADMIN');

        // Contact info from first group nationality
        $firstNationality = $scenario['groups'][0]['nationality'];
        $contactName = $this->generateContactName($firstNationality);
        $reservation->setContactName($contactName);
        $reservation->setContactEmail(strtolower(str_replace(' ', '.', $contactName)) . '@example.com');
        $reservation->setContactPhone('+420' . rand(600000000, 799999999));
        $reservation->setContactNationality($firstNationality);
        $reservation->setClientComeFrom(['Google', 'Partner', 'Returning', 'Recommendation'][rand(0, 3)]);

        // Invoice info
        $reservation->setInvoiceSameAsContact(rand(0, 1) === 1);
        if (!$reservation->isInvoiceSameAsContact()) {
            $reservation->setInvoiceName($scenario['name']);
            $reservation->setInvoiceCompany($scenario['name']);
            $reservation->setInvoiceIc((string)rand(10000000, 99999999));
            $reservation->setInvoiceDic('CZ' . rand(10000000, 99999999));
            $reservation->setInvoiceStreet('Ulice ' . rand(1, 100));
            $reservation->setInvoiceCity('Praha');
            $reservation->setInvoiceZipcode((string)rand(10000, 19999));
            $reservation->setInvoiceCountry('CZ');
        }

        // Payment info
        $reservation->setPaymentMethod($paidAmount > 0 ? 'BANK_TRANSFER' : 'INVOICE');
        $reservation->setPaymentStatus($scenario['paymentStatus']);
        $reservation->setDepositPercent((string)$scenario['depositPercent']);
        $reservation->setDepositAmount((string)$depositAmount);
        $reservation->setTotalPrice((string)$totalPrice);
        $reservation->setPaidAmount((string)$paidAmount);
        $reservation->setAgreement(true);

        // Transfer
        $reservation->setTransferSelected(rand(0, 1) === 1);
        if ($reservation->isTransferSelected()) {
            $reservation->setTransferCount(min(3, (int)ceil($scenario['totalGuests'] / 50)));
            $reservation->setTransferAddress('Hotel ' . ['Sax', 'Josef', 'U Prince', 'Hilton'][rand(0, 3)] . ', Praha');
        }

        $this->entityManager->persist($reservation);

        // Create reservation persons (simplified - adults and children)
        $adultFoods = array_filter($foods, fn($f) => !$f->isChildrenMenu());
        $childFoods = array_filter($foods, fn($f) => $f->isChildrenMenu() || $f->getPrice() === 0);

        if (empty($adultFoods)) $adultFoods = $foods;
        if (empty($childFoods)) $childFoods = $foods;

        $adultFoods = array_values($adultFoods);
        $childFoods = array_values($childFoods);

        foreach ($scenario['groups'] as $group) {
            // Adults
            for ($i = 0; $i < $group['adults']; $i++) {
                $person = new ReservationPerson();
                $person->setReservation($reservation);
                $person->setType('adult');
                $food = $adultFoods[array_rand($adultFoods)];
                $person->setMenu($food->getName());
                $person->setPrice((string)($food->getPrice() + $food->getSurcharge()));
                $this->entityManager->persist($person);
            }

            // Children
            for ($i = 0; $i < $group['children']; $i++) {
                $person = new ReservationPerson();
                $person->setReservation($reservation);
                $person->setType('child');
                $food = $childFoods[array_rand($childFoods)];
                $person->setMenu($food->getName());
                $person->setPrice((string)(($food->getPrice() + $food->getSurcharge()) * 0.5)); // 50% for children
                $this->entityManager->persist($person);
            }
        }

        // Create event
        $event = new Event();
        $event->setName($scenario['name']);
        $event->setEventType($scenario['type']);
        $event->setEventDate($eventDate);
        $event->setEventTime(new \DateTime('18:00'));
        $event->setDurationMinutes($scenario['type'] === 'WEDDING' ? 300 : 180);
        $event->setVenue($scenario['venue']);
        $event->setLanguage($firstNationality === 'CZ' || $firstNationality === 'SK' ? 'CZ' : 'EN');

        // Guest counts - guestsTotal is auto-calculated from paid + free
        $totalAdults = array_sum(array_column($scenario['groups'], 'adults'));
        $totalChildren = array_sum(array_column($scenario['groups'], 'children'));
        $event->setGuestsPaid($totalAdults);
        $event->setGuestsFree($totalChildren);
        // guestsTotal is computed automatically

        // Organizer (same as reservation contact)
        $event->setOrganizerPerson($contactName);
        $event->setOrganizerEmail($reservation->getContactEmail());
        $event->setOrganizerPhone($reservation->getContactPhone());
        $event->setOrganizerCompany($scenario['name']);

        // Invoice info
        $event->setInvoiceCompany($scenario['name']);
        $event->setInvoiceIc($reservation->getInvoiceIc() ?? (string)rand(10000000, 99999999));
        $event->setInvoiceDic($reservation->getInvoiceDic());
        $event->setInvoiceAddress('Praha, Česká republika');

        // Pricing
        $event->setTotalPrice((string)$totalPrice);
        $event->setDepositAmount((string)$depositAmount);
        $event->setDepositPaid($scenario['paymentStatus'] !== 'UNPAID');
        $event->setPaymentMethod('BANK_TRANSFER');

        // Status
        $event->setStatus($scenario['status'] ?? ($scenario['daysFromNow'] < 0 ? 'COMPLETED' : 'PLANNED'));
        $event->setEventSubcategory($scenario['type'] === 'FOLKLORE_SHOW' ? 'show' : 'firemni');

        // Catering
        $event->setCateringType('folkloregarden');
        $event->setCateringCommissionPercent('0');

        // Notes
        $event->setNotesStaff('Testovací akce - ' . $scenario['name']);
        $event->setNotesInternal('Vytvořeno automaticky pro testování');
        if (isset($scenario['specialMenus'])) {
            $event->setSpecialRequirements('Speciální strava: ' . implode(', ', $scenario['specialMenus']));
        }

        $event->setReservation($reservation);
        $event->setIsAutoGenerated(false);

        $this->entityManager->persist($event);

        // Create event spaces
        $space = new EventSpace();
        $space->setEvent($event);
        $space->setSpaceName(strtolower($scenario['venue']));
        $this->entityManager->persist($space);

        // Create tables based on group size
        $tableCount = (int)ceil($scenario['totalGuests'] / 8);
        $tables = [];
        for ($t = 1; $t <= $tableCount; $t++) {
            $table = new EventTable();
            $table->setEvent($event);
            $table->setTableName('Stůl ' . $t);
            $table->setRoom(strtolower($scenario['venue']));
            $table->setCapacity(min(8, $scenario['totalGuests'] - (($t - 1) * 8)));
            $table->setPositionX($t * 100);
            $table->setPositionY(($t % 3) * 100);
            $this->entityManager->persist($table);
            $tables[] = $table;
        }

        // Create event guests with nationalities and table assignments
        $guestIndex = 0;
        $tableIndex = 0;
        foreach ($scenario['groups'] as $group) {
            $nationality = self::NATIONALITIES[$group['nationality']] ?? $group['nationality'];

            // Adults
            for ($i = 0; $i < $group['adults']; $i++) {
                $guest = new EventGuest();
                $guest->setEvent($event);
                $guest->setReservation($reservation);
                $guest->setFirstName($this->generateFirstName($group['nationality']));
                $guest->setLastName($this->generateLastName($group['nationality']));
                $guest->setNationality($nationality);
                $guest->setType('adult');
                $guest->setIsPaid(true);
                $guest->setPersonIndex($guestIndex++);
                $guest->setIsPresent($scenario['daysFromNow'] < 0);

                if (!empty($tables)) {
                    $guest->setEventTable($tables[$tableIndex % count($tables)]);
                    if (($guestIndex % 8) === 0) $tableIndex++;
                }

                $this->entityManager->persist($guest);
            }

            // Children
            for ($i = 0; $i < $group['children']; $i++) {
                $guest = new EventGuest();
                $guest->setEvent($event);
                $guest->setReservation($reservation);
                $guest->setFirstName($this->generateFirstName($group['nationality'], true));
                $guest->setLastName($this->generateLastName($group['nationality']));
                $guest->setNationality($nationality);
                $guest->setType('child');
                $guest->setIsPaid(false);
                $guest->setPersonIndex($guestIndex++);
                $guest->setIsPresent($scenario['daysFromNow'] < 0);

                if (!empty($tables)) {
                    $guest->setEventTable($tables[$tableIndex % count($tables)]);
                    if (($guestIndex % 8) === 0) $tableIndex++;
                }

                $this->entityManager->persist($guest);
            }
        }

        // Create event menus
        $menuCounts = [];
        foreach ($foods as $food) {
            $menuCounts[$food->getName()] = 0;
        }

        // Distribute menus based on scenario
        $remainingGuests = $scenario['totalGuests'];
        foreach ($foods as $food) {
            if ($remainingGuests <= 0) break;
            $count = rand(0, min($remainingGuests, (int)($scenario['totalGuests'] / 3)));
            $menuCounts[$food->getName()] = $count;
            $remainingGuests -= $count;
        }

        // Add remaining to first menu
        $firstFood = reset($foods);
        if ($firstFood) {
            $menuCounts[$firstFood->getName()] += $remainingGuests;
        }

        foreach ($foods as $food) {
            if ($menuCounts[$food->getName()] > 0) {
                $menu = new EventMenu();
                $menu->setEvent($event);
                $menu->setMenuName($food->getName());
                $menu->setQuantity($menuCounts[$food->getName()]);
                $menu->setPricePerUnit((string)($food->getPrice() + $food->getSurcharge()));
                $menu->setTotalPrice((string)($menuCounts[$food->getName()] * ($food->getPrice() + $food->getSurcharge())));
                $menu->setServingTime(new \DateTime('19:00'));
                $menu->setReservationFood($food);
                $this->entityManager->persist($menu);
            }
        }

        // Create beverages
        $beverages = [
            ['name' => 'Víno bílé (láhev)', 'unit' => 'bottle', 'price' => 350],
            ['name' => 'Víno červené (láhev)', 'unit' => 'bottle', 'price' => 350],
            ['name' => 'Pivo (0.5l)', 'unit' => 'ks', 'price' => 65],
            ['name' => 'Nealko nápoje', 'unit' => 'ks', 'price' => 45],
            ['name' => 'Káva', 'unit' => 'ks', 'price' => 55],
            ['name' => 'Slivovice (0.04l)', 'unit' => 'ks', 'price' => 85],
        ];

        foreach ($beverages as $bev) {
            $beverage = new EventBeverage();
            $beverage->setEvent($event);
            $beverage->setBeverageName($bev['name']);
            $beverage->setQuantity((int)ceil($scenario['totalGuests'] * rand(5, 15) / 10));
            $beverage->setUnit($bev['unit']);
            $beverage->setPricePerUnit((string)$bev['price']);
            $beverage->setTotalPrice((string)($beverage->getQuantity() * $bev['price']));
            $this->entityManager->persist($beverage);
        }

        // Calculate and assign staff based on formulas
        $this->assignStaffToEvent($event, $scenario, $staffMembers, $formulas);

        // Create invoices
        if ($scenario['paymentStatus'] !== 'UNPAID') {
            // Deposit invoice
            $depositInvoice = $this->createInvoice($reservation, $event, 'DEPOSIT', $depositAmount, $scenario['depositPercent'], $index);
            $this->entityManager->persist($depositInvoice);

            $eventInvoice = new EventInvoice();
            $eventInvoice->setEvent($event);
            $eventInvoice->setInvoice($depositInvoice);
            $eventInvoice->setInvoiceType('deposit');
            $eventInvoice->setOrderNumber(1);
            $this->entityManager->persist($eventInvoice);

            // Create payment for deposit
            if ($paidAmount > 0) {
                $payment = new Payment();
                $payment->setReservation($reservation);
                $payment->setAmount($depositAmount);
                $payment->setStatus('COMPLETED');
                $payment->setTransactionId('TEST-' . strtoupper(substr(md5((string)$index . 'deposit'), 0, 12)));
                $payment->setReservationReference($depositInvoice->getInvoiceNumber());
                $this->entityManager->persist($payment);
            }
        }

        // Final invoice for completed events
        if ($scenario['paymentStatus'] === 'PAID' || ($scenario['status'] ?? '') === 'COMPLETED') {
            $finalAmount = $totalPrice - $depositAmount;
            $finalInvoice = $this->createInvoice($reservation, $event, 'FINAL', $finalAmount, 0, $index);
            $finalInvoice->setStatus('PAID');
            $finalInvoice->setPaidAt($eventDate);
            $this->entityManager->persist($finalInvoice);

            $eventInvoice2 = new EventInvoice();
            $eventInvoice2->setEvent($event);
            $eventInvoice2->setInvoice($finalInvoice);
            $eventInvoice2->setInvoiceType('final');
            $eventInvoice2->setOrderNumber(2);
            $this->entityManager->persist($eventInvoice2);

            // Create payment for final
            $payment2 = new Payment();
            $payment2->setReservation($reservation);
            $payment2->setAmount($finalAmount);
            $payment2->setStatus('COMPLETED');
            $payment2->setTransactionId('TEST-' . strtoupper(substr(md5((string)$index . 'final'), 0, 12)));
            $payment2->setReservationReference($finalInvoice->getInvoiceNumber());
            $this->entityManager->persist($payment2);
        }

        // Add voucher usage for some events
        if (!empty($vouchers) && rand(0, 2) === 0) {
            $voucher = $vouchers[array_rand($vouchers)];
            $eventVoucher = new EventVoucher();
            $eventVoucher->setEvent($event);
            $eventVoucher->setVoucherId($voucher->getId() ?? rand(1, 20));
            $eventVoucher->setQuantity(rand(1, 5));
            $eventVoucher->setValidated($scenario['daysFromNow'] < 0);
            if ($eventVoucher->isValidated()) {
                $eventVoucher->setValidatedAt(new \DateTime());
            }
            $this->entityManager->persist($eventVoucher);
        }
    }

    private function assignStaffToEvent(Event $event, array $scenario, array $staffMembers, array $formulas): void
    {
        $eventType = $scenario['type'];
        $guestCount = $scenario['totalGuests'];

        // Calculate required staff based on formulas
        $staffNeeds = [
            'WAITER' => $this->calculateStaffNeeded('waiter', $eventType, $guestCount, $formulas),
            'CHEF' => $this->calculateStaffNeeded('chef', $eventType, $guestCount, $formulas),
            'COORDINATOR' => max(1, $this->calculateStaffNeeded('coordinator', $eventType, $guestCount, $formulas)),
            'BARTENDER' => $this->calculateStaffNeeded('bartender', $eventType, $guestCount, $formulas),
            'HOSTESS' => max(1, $this->calculateStaffNeeded('hostess', $eventType, $guestCount, $formulas)),
        ];

        // Add supporting staff for large events
        if ($guestCount > 50) {
            $staffNeeds['HEAD_WAITER'] = 1;
            $staffNeeds['HEAD_CHEF'] = 1;
            $staffNeeds['PREP_COOK'] = max(1, (int)($guestCount / 40));
        }

        if ($guestCount > 100) {
            $staffNeeds['MANAGER'] = 1;
            $staffNeeds['SECURITY'] = max(1, $this->calculateStaffNeeded('security', $eventType, $guestCount, $formulas));
            $staffNeeds['SOUS_CHEF'] = 1;
        }

        // Add entertainment for folklore shows
        if ($eventType === 'FOLKLORE_SHOW') {
            $staffNeeds['MUSICIAN'] = rand(2, 4);
            $staffNeeds['DANCER'] = rand(2, 4);
            $staffNeeds['SOUND_TECH'] = 1;
        }

        // Add photographer for weddings
        if ($eventType === 'WEDDING') {
            $staffNeeds['PHOTOGRAPHER'] = 1;
        }

        // Add drivers if transfer selected
        if (rand(0, 1) === 1 && $guestCount > 20) {
            $staffNeeds['DRIVER'] = max(1, (int)($guestCount / 50));
        }

        // Cleaners for all events
        $staffNeeds['CLEANER'] = max(1, (int)($guestCount / 50));

        // Assign staff members
        foreach ($staffNeeds as $position => $needed) {
            if ($needed <= 0) continue;

            $available = $staffMembers[$position] ?? [];
            if (empty($available)) continue;

            for ($i = 0; $i < min($needed, count($available)); $i++) {
                $staff = $available[$i];

                $assignment = new EventStaffAssignment();
                $assignment->setEvent($event);
                $assignment->setStaffMemberId($staff->getId() ?? $i + 1);
                $assignment->setAssignmentStatus('CONFIRMED');
                $assignment->setAttendanceStatus($scenario['daysFromNow'] < 0 ? 'ATTENDED' : 'PENDING');

                // Calculate hours and payment
                $hours = $event->getDurationMinutes() / 60 + 1; // +1 for prep
                $assignment->setHoursWorked((string)$hours);

                $hourlyRate = (float)$staff->getHourlyRate();
                $paymentAmount = $hours * $hourlyRate;
                $assignment->setPaymentAmount((string)$paymentAmount);
                $assignment->setPaymentStatus($scenario['daysFromNow'] < 0 ? 'PAID' : 'PENDING');

                $assignment->setConfirmedAt(new \DateTime('-' . rand(1, 14) . ' days'));
                if ($scenario['daysFromNow'] < 0) {
                    $assignment->setAttendedAt($event->getEventDate());
                }

                $this->entityManager->persist($assignment);
            }
        }
    }

    private function calculateStaffNeeded(string $category, string $eventType, int $guestCount, array $formulas): int
    {
        $key = "{$category}_{$eventType}";
        if (isset($formulas[$key])) {
            $ratio = $formulas[$key]->getRatio();
            return (int)ceil($guestCount / $ratio);
        }

        // Default ratios if formula not found
        $defaults = [
            'waiter' => 12,
            'chef' => 25,
            'coordinator' => 50,
            'bartender' => 30,
            'hostess' => 40,
            'security' => 80,
        ];

        return (int)ceil($guestCount / ($defaults[$category] ?? 20));
    }

    private function createInvoice(Reservation $reservation, Event $event, string $type, float $amount, float $depositPercent, int $index): Invoice
    {
        $invoice = new Invoice();
        $invoice->setInvoiceNumber(sprintf('FG%d%04d', date('Y'), $index * 2 + ($type === 'FINAL' ? 2 : 1)));
        $invoice->setStatus($type === 'DEPOSIT' ? 'SENT' : 'DRAFT');
        $invoice->setInvoiceType($type);
        $invoice->setIssueDate(new \DateTime());
        $invoice->setDueDate(new \DateTime('+14 days'));
        $invoice->setTaxableDate(new \DateTime());

        if ($type === 'DEPOSIT') {
            $invoice->setDepositPercent((string)$depositPercent);
        }

        // Supplier info
        $invoice->setSupplierName('Folklore Garden s.r.o.');
        $invoice->setSupplierStreet('Karlova 123');
        $invoice->setSupplierCity('Praha 1');
        $invoice->setSupplierZipcode('11000');
        $invoice->setSupplierIco('12345678');
        $invoice->setSupplierDic('CZ12345678');
        $invoice->setSupplierEmail('info@folkloregarden.cz');
        $invoice->setSupplierPhone('+420 123 456 789');
        $invoice->setSupplierBankAccount('1234567890/0100');
        $invoice->setSupplierBankName('Komerční banka');

        // Customer info
        $invoice->setCustomerName($reservation->getInvoiceName() ?? $reservation->getContactName());
        $invoice->setCustomerCompany($reservation->getInvoiceCompany());
        $invoice->setCustomerStreet($reservation->getInvoiceStreet() ?? '');
        $invoice->setCustomerCity($reservation->getInvoiceCity() ?? 'Praha');
        $invoice->setCustomerZipcode($reservation->getInvoiceZipcode() ?? '10000');
        $invoice->setCustomerIco($reservation->getInvoiceIc());
        $invoice->setCustomerDic($reservation->getInvoiceDic());
        $invoice->setCustomerEmail($reservation->getInvoiceEmail() ?? $reservation->getContactEmail());

        // Amounts
        $vatRate = 21;
        $subtotal = $amount / (1 + $vatRate / 100);
        $vatAmount = $amount - $subtotal;

        $invoice->setSubtotal((string)round($subtotal, 2));
        $invoice->setVatRate($vatRate);
        $invoice->setVatAmount((string)round($vatAmount, 2));
        $invoice->setTotal((string)round($amount, 2));
        $invoice->setCurrency('CZK');
        $invoice->setVariableSymbol($invoice->getInvoiceNumber());

        // Items
        $items = [
            [
                'description' => $type === 'DEPOSIT'
                    ? 'Záloha na akci: ' . $event->getName()
                    : 'Doplatek za akci: ' . $event->getName(),
                'quantity' => 1,
                'unit' => 'ks',
                'unitPrice' => round($subtotal, 2),
                'total' => round($subtotal, 2),
            ],
        ];
        $invoice->setItems($items);

        $invoice->setReservation($reservation);

        return $invoice;
    }

    private function getPriceForGroupSize(int $groupSize): int
    {
        foreach (self::PRICING_TIERS as $tier) {
            if ($groupSize >= $tier['min'] && $groupSize <= $tier['max']) {
                return $tier['pricePerPerson'];
            }
        }
        return 750; // Default for very large groups
    }

    private function generateContactName(string $nationality): string
    {
        $names = [
            'CZ' => ['Jan Novák', 'Petr Svoboda', 'Karel Dvořák', 'Marie Procházková'],
            'SK' => ['Ján Horváth', 'Peter Kováč', 'Mária Tóthová', 'Anna Szabóová'],
            'DE' => ['Hans Müller', 'Klaus Schmidt', 'Wolfgang Weber', 'Heike Fischer'],
            'AT' => ['Wolfgang Gruber', 'Franz Huber', 'Johann Wagner', 'Maria Steiner'],
            'PL' => ['Piotr Kowalski', 'Jan Nowak', 'Andrzej Wiśniewski', 'Anna Wójcik'],
            'US' => ['John Smith', 'Michael Johnson', 'Robert Williams', 'Sarah Brown'],
            'GB' => ['James Wilson', 'William Taylor', 'Oliver Davies', 'Emma Thompson'],
            'FR' => ['Pierre Dubois', 'Jean Martin', 'Michel Bernard', 'Marie Laurent'],
            'IT' => ['Giuseppe Rossi', 'Marco Ferrari', 'Antonio Russo', 'Maria Bianchi'],
            'ES' => ['Carlos García', 'Miguel Fernández', 'Antonio López', 'Carmen Martínez'],
            'JP' => ['Yuki Tanaka', 'Hiroshi Yamamoto', 'Kenji Suzuki', 'Akiko Watanabe'],
            'CN' => ['Wei Chen', 'Ming Li', 'Fang Wang', 'Xiu Zhang'],
            'KR' => ['Min-jun Kim', 'Seung-ho Lee', 'Ji-hoon Park', 'Soo-yeon Choi'],
            'IL' => ['David Cohen', 'Moshe Levi', 'Yosef Goldberg', 'Sarah Friedman'],
            'RU' => ['Ivan Petrov', 'Alexei Ivanov', 'Dmitri Smirnov', 'Olga Kuznetsova'],
            'UA' => ['Oleksandr Shevchenko', 'Andriy Kovalenko', 'Mykola Bondarenko', 'Natalia Tkachenko'],
            'NL' => ['Jan de Vries', 'Pieter Jansen', 'Willem van Dijk', 'Maria Bakker'],
            'BE' => ['Jan Peeters', 'Marc Janssens', 'Luc Maes', 'Marie Dubois'],
        ];

        $list = $names[$nationality] ?? $names['CZ'];
        return $list[array_rand($list)];
    }

    private function generateFirstName(string $nationality, bool $isChild = false): string
    {
        $names = [
            'CZ' => $isChild ? ['Tomáš', 'Jakub', 'Anička', 'Eliška'] : ['Jan', 'Petr', 'Karel', 'Marie', 'Eva', 'Anna'],
            'SK' => $isChild ? ['Marek', 'Lukáš', 'Zuzka', 'Lenka'] : ['Ján', 'Peter', 'Mária', 'Anna'],
            'DE' => $isChild ? ['Max', 'Leon', 'Emma', 'Mia'] : ['Hans', 'Klaus', 'Wolfgang', 'Heike', 'Ingrid'],
            'AT' => $isChild ? ['Lukas', 'Felix', 'Anna', 'Sophie'] : ['Wolfgang', 'Franz', 'Johann', 'Maria'],
            'PL' => $isChild ? ['Kacper', 'Szymon', 'Zosia', 'Maja'] : ['Piotr', 'Jan', 'Andrzej', 'Anna', 'Maria'],
            'US' => $isChild ? ['Ethan', 'Liam', 'Emma', 'Olivia'] : ['John', 'Michael', 'Robert', 'Sarah', 'Emily'],
            'GB' => $isChild ? ['Oliver', 'Harry', 'Amelia', 'Isla'] : ['James', 'William', 'Oliver', 'Emma'],
            'FR' => $isChild ? ['Lucas', 'Hugo', 'Emma', 'Léa'] : ['Pierre', 'Jean', 'Michel', 'Marie'],
            'IT' => $isChild ? ['Francesco', 'Lorenzo', 'Sofia', 'Giulia'] : ['Giuseppe', 'Marco', 'Antonio', 'Maria'],
            'ES' => $isChild ? ['Pablo', 'Hugo', 'Lucía', 'Martina'] : ['Carlos', 'Miguel', 'Antonio', 'Carmen'],
            'JP' => $isChild ? ['Haruto', 'Yuto', 'Sakura', 'Hina'] : ['Yuki', 'Hiroshi', 'Kenji', 'Akiko'],
            'CN' => $isChild ? ['Hao', 'Lei', 'Mei', 'Lin'] : ['Wei', 'Ming', 'Fang', 'Xiu'],
            'KR' => $isChild ? ['Ji-ho', 'Min-seo', 'Seo-yeon', 'Ha-yoon'] : ['Min-jun', 'Seung-ho', 'Ji-hoon', 'Soo-yeon'],
            'IL' => $isChild ? ['Noam', 'Ori', 'Noa', 'Shira'] : ['David', 'Moshe', 'Yosef', 'Sarah'],
        ];

        $list = $names[$nationality] ?? $names['CZ'];
        return $list[array_rand($list)];
    }

    private function generateLastName(string $nationality): string
    {
        $names = [
            'CZ' => ['Novák', 'Svoboda', 'Dvořák', 'Procházka', 'Černý', 'Kučera', 'Veselý', 'Horák'],
            'SK' => ['Horváth', 'Kováč', 'Tóth', 'Szabó', 'Balog', 'Molnár', 'Varga'],
            'DE' => ['Müller', 'Schmidt', 'Schneider', 'Fischer', 'Weber', 'Meyer', 'Wagner'],
            'AT' => ['Gruber', 'Huber', 'Wagner', 'Steiner', 'Bauer', 'Berger'],
            'PL' => ['Kowalski', 'Nowak', 'Wiśniewski', 'Wójcik', 'Kowalczyk', 'Kamiński'],
            'US' => ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Miller', 'Davis'],
            'GB' => ['Wilson', 'Taylor', 'Davies', 'Thompson', 'Evans', 'Roberts', 'Walker'],
            'FR' => ['Martin', 'Bernard', 'Dubois', 'Thomas', 'Robert', 'Richard', 'Petit'],
            'IT' => ['Rossi', 'Russo', 'Ferrari', 'Esposito', 'Bianchi', 'Romano', 'Colombo'],
            'ES' => ['García', 'Fernández', 'López', 'Martínez', 'Sánchez', 'Pérez', 'González'],
            'JP' => ['Tanaka', 'Yamamoto', 'Suzuki', 'Watanabe', 'Takahashi', 'Sato', 'Ito'],
            'CN' => ['Wang', 'Li', 'Zhang', 'Liu', 'Chen', 'Yang', 'Huang'],
            'KR' => ['Kim', 'Lee', 'Park', 'Choi', 'Jung', 'Kang', 'Cho'],
            'IL' => ['Cohen', 'Levi', 'Mizrahi', 'Peretz', 'Biton', 'Azulay', 'Friedman'],
        ];

        $list = $names[$nationality] ?? $names['CZ'];
        return $list[array_rand($list)];
    }

    private function printSummary(): void
    {
        $this->io->section('Summary of Created Test Data');

        $this->io->table(
            ['Entity', 'Description'],
            [
                ['Staffing Formulas', '24 formulas (6 categories × 4 event types)'],
                ['Staff Roles', '17 positions from Manager to Cleaner'],
                ['Staff Members', '42 employees across all positions'],
                ['Partners', '10 partners (hotels, distributors, receptionists)'],
                ['Vouchers', '20 discount vouchers'],
                ['Contacts', '15 international contacts'],
                ['Reservations', '10 diverse scenarios (10-220 guests)'],
                ['Events', '10 events with full data'],
                ['Event Guests', 'All guests with nationality & seating'],
                ['Event Menus', 'Food distribution per event'],
                ['Event Beverages', '6 beverage types per event'],
                ['Staff Assignments', 'Calculated based on formulas'],
                ['Invoices', 'Deposit + Final invoices'],
                ['Payments', 'Matching payment records'],
                ['Tables', 'Auto-generated seating plans'],
            ]
        );

        $this->io->section('Pricing Tiers Applied');
        $this->io->table(
            ['Group Size', 'Price per Person'],
            array_map(fn($t) => [$t['min'] . '-' . $t['max'] . ' guests', $t['pricePerPerson'] . ' CZK'], self::PRICING_TIERS)
        );

        $this->io->section('Test Scenarios Overview');
        $this->io->table(
            ['#', 'Event Name', 'Guests', 'Type', 'Payment Status', 'Days from Now'],
            [
                ['1', 'Malá firemní akce', '10', 'CORPORATE', 'PAID', '+7'],
                ['2', 'Německý zájezd', '35', 'FOLKLORE_SHOW', 'PARTIAL', '+14'],
                ['3', 'Svatba Johnson-Dubois', '85', 'WEDDING', 'PARTIAL', '+30'],
                ['4', 'Tanaka Corp Gala', '120', 'CORPORATE', 'UNPAID', '+45'],
                ['5', 'Evropský kongres', '170', 'PRIVATE_EVENT', 'PARTIAL', '+60'],
                ['6', 'Cohen Tours (kosher)', '220', 'FOLKLORE_SHOW', 'PARTIAL', '+21'],
                ['7', 'Rodinná oslava', '45', 'PRIVATE_EVENT', 'PAID', '+3'],
                ['8', 'Vánoční večírek (past)', '60', 'CORPORATE', 'PAID', '-14'],
                ['9', 'Kim Travel Korea', '55', 'FOLKLORE_SHOW', 'PARTIAL', '+28'],
                ['10', 'Chen Trading VIP', '95', 'CORPORATE', 'UNPAID', '+90'],
            ]
        );
    }
}
