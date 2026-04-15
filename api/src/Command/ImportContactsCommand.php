<?php

declare(strict_types=1);

namespace App\Command;

use App\Entity\Contact;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\Console\Attribute\AsCommand;
use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Input\InputArgument;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Input\InputOption;
use Symfony\Component\Console\Output\OutputInterface;
use Symfony\Component\Console\Style\SymfonyStyle;

#[AsCommand(
    name: 'app:import:contacts',
    description: 'Importuje zákazníky z CSV souboru (Přehled zákazníků) do tabulky contact',
)]
class ImportContactsCommand extends Command
{
    public function __construct(
        private readonly EntityManagerInterface $em,
    ) {
        parent::__construct();
    }

    protected function configure(): void
    {
        $this
            ->addArgument('path', InputArgument::REQUIRED, 'Cesta k CSV souboru (zakaznici.csv)')
            ->addOption('commit', null, InputOption::VALUE_NONE, 'Skutečně uložit do DB (jinak dry-run)')
            ->addOption('skip-existing', null, InputOption::VALUE_NONE, 'Přeskočit záznamy kde název + IČO už existuje');
    }

    protected function execute(InputInterface $input, OutputInterface $output): int
    {
        $io = new SymfonyStyle($input, $output);
        $path = $input->getArgument('path');
        $commit = (bool) $input->getOption('commit');
        $skipExisting = (bool) $input->getOption('skip-existing');

        if (!file_exists($path)) {
            $io->error("Soubor neexistuje: $path");
            return Command::FAILURE;
        }

        $handle = fopen($path, 'r');
        if ($handle === false) {
            $io->error("Nelze otevřít soubor: $path");
            return Command::FAILURE;
        }

        // Read header — strip BOM
        $header = fgetcsv($handle);
        if ($header === false) {
            $io->error('Prázdný soubor');
            fclose($handle);
            return Command::FAILURE;
        }
        $header[0] = ltrim($header[0], "\xEF\xBB\xBF");

        $io->title('Import zákazníků z CSV');
        $io->text($commit ? 'Režim: COMMIT (zápis do DB)' : 'Režim: DRY-RUN (bez zápisu)');

        // Load existing contacts for dedup
        $existingNames = [];
        if ($skipExisting) {
            $existing = $this->em->getRepository(Contact::class)->findAll();
            foreach ($existing as $c) {
                $key = mb_strtolower(trim($c->getName())) . '|' . ($c->getInvoiceIc() ?? '');
                $existingNames[$key] = true;
            }
            $io->text(sprintf('Načteno %d existujících kontaktů pro dedup', count($existingNames)));
        }

        $imported = 0;
        $skipped = 0;
        $errors = [];
        $lineNum = 1;

        while (($row = fgetcsv($handle)) !== false) {
            $lineNum++;

            if (count($row) < 6) {
                $errors[] = "Řádek $lineNum: nedostatek sloupců (" . count($row) . ')';
                continue;
            }

            [$cislo, $nazev, $adresa, $ulice, $psc, $ico] = $row;

            // Clean číslo
            $cislo = trim($cislo, " \t\n\r\0\x0B,\"");

            // Skip garbage rows
            if ($cislo === '' && trim($nazev) === '') {
                $errors[] = "Řádek $lineNum: prázdné číslo i název — přeskočeno";
                $skipped++;
                continue;
            }

            // Skip non-numeric číslo (garbage like 'pk', 'popop', 'xxxxxx')
            $cleanCislo = ltrim($cislo, '+-');
            if ($cleanCislo !== '' && !ctype_digit($cleanCislo)) {
                $errors[] = "Řádek $lineNum: nečíselné číslo '$cislo' (název: '$nazev') — přeskočeno";
                $skipped++;
                continue;
            }

            // Clean name
            $nazev = trim($nazev, " \t\n\r\0\x0B\"");
            if ($nazev === '') {
                $errors[] = "Řádek $lineNum: prázdný název (číslo: '$cislo') — přeskočeno";
                $skipped++;
                continue;
            }

            // Clean other fields
            $adresa = self::cleanField($adresa);
            $ulice = self::cleanField($ulice);
            $psc = self::cleanField($psc);
            $ico = self::cleanField($ico);

            // Dedup check
            if ($skipExisting) {
                $key = mb_strtolower($nazev) . '|' . ($ico ?? '');
                if (isset($existingNames[$key])) {
                    $skipped++;
                    continue;
                }
                $existingNames[$key] = true;
            }

            $contact = new Contact();
            $contact->setName($nazev);
            $contact->setBillingCity($adresa ?: null);
            $contact->setBillingStreet($ulice ?: null);
            $contact->setBillingZip($psc ?: null);
            $contact->setInvoiceIc($ico ?: null);
            $contact->setNote("Import CSV: #$cleanCislo");
            $contact->setClientComeFrom('csv-import');

            if ($commit) {
                $this->em->persist($contact);

                // Flush in batches
                if ($imported % 100 === 0) {
                    $this->em->flush();
                }
            }

            $imported++;
        }

        fclose($handle);

        if ($commit) {
            $this->em->flush();
        }

        $io->success(sprintf(
            '%s %d kontaktů. Přeskočeno: %d. Chyb: %d.',
            $commit ? 'Importováno' : 'Nalezeno k importu',
            $imported,
            $skipped,
            count($errors),
        ));

        if (count($errors) > 0) {
            $io->section('Přeskočené/chybné řádky');
            foreach ($errors as $e) {
                $io->text("  • $e");
            }
        }

        if (!$commit && $imported > 0) {
            $io->note('Spusťte s --commit pro skutečný zápis do DB');
        }

        return Command::SUCCESS;
    }

    private static function cleanField(string $value): string
    {
        return trim($value, " \t\n\r\0\x0B\"");
    }
}
