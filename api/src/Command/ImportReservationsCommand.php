<?php
declare(strict_types=1);

namespace App\Command;

use App\Service\Import\ExcelReservationParser;
use App\Service\Import\ExcelReservationReader;
use App\Service\Import\ReservationImportService;
use Symfony\Component\Console\Attribute\AsCommand;
use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Input\InputArgument;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Input\InputOption;
use Symfony\Component\Console\Output\OutputInterface;
use Symfony\Component\Console\Style\SymfonyStyle;

#[AsCommand(
    name: 'app:import:reservations',
    description: 'Načte a (volitelně) naimportuje rezervace z Excel souborů Priprava akce DD_M_YYYY.xlsx',
)]
class ImportReservationsCommand extends Command
{
    public function __construct(
        private readonly ExcelReservationParser $parser,
        private readonly ExcelReservationReader $reader,
        private readonly ReservationImportService $importService,
    ) {
        parent::__construct();
    }

    protected function configure(): void
    {
        $this
            ->addArgument('path', InputArgument::REQUIRED, 'Cesta k souboru nebo složce s xlsx soubory')
            ->addOption('commit', null, InputOption::VALUE_NONE, 'SKUTEČNĚ uložit do DB (jinak jen dry-run)')
            ->addOption('limit', null, InputOption::VALUE_REQUIRED, 'Omezit počet souborů ke zpracování', 0)
            ->addOption('details', 'd', InputOption::VALUE_NONE, 'Vypsat detailní řádky každé rezervace');
    }

    protected function execute(InputInterface $input, OutputInterface $output): int
    {
        $io = new SymfonyStyle($input, $output);
        $path = $input->getArgument('path');
        $limit = (int) $input->getOption('limit');
        $details = (bool) $input->getOption('details');
        $commit = (bool) $input->getOption('commit');
        $dryRun = !$commit;

        if (!file_exists($path)) {
            $io->error("Cesta neexistuje: $path");
            return Command::FAILURE;
        }

        $files = is_dir($path) ? glob(rtrim($path, '/') . '/*.xlsx') : [$path];
        sort($files);
        if ($limit > 0) {
            $files = array_slice($files, 0, $limit);
        }

        $io->title('Import rezervací z Excel souborů');
        $io->writeln(sprintf('Soubory k zpracování: <info>%d</info>', count($files)));
        $io->writeln(sprintf('Režim: <info>%s</info>', $dryRun ? 'DRY-RUN (nic se neuloží)' : 'LIVE'));
        $io->newLine();

        $allDrafts = [];
        $stats = [
            'files' => 0,
            'reservations' => 0,
            'cancelled' => 0,
            'with_price' => 0,
            'no_price' => 0,
            'with_partner_email' => 0,
            'unique_companies' => [],
            'by_section' => [],
            'by_venue' => [],
        ];

        foreach ($files as $file) {
            $stats['files']++;
            $result = $this->reader->readFile($file);
            if ($result['error'] !== null) {
                $io->warning(basename($file) . ': ' . $result['error']);
                continue;
            }
            foreach ($result['drafts'] as $d) {
                $stats['reservations']++;
                if ($d['status'] === 'CANCELLED') $stats['cancelled']++;
                if ($d['parsedPayment']['price'] !== null) $stats['with_price']++;
                else $stats['no_price']++;
                if (!empty($d['raw']['company'])) $stats['unique_companies'][$d['raw']['company']] = true;
                $stats['by_section'][$d['section'] ?? 'NONE'] = ($stats['by_section'][$d['section'] ?? 'NONE'] ?? 0) + 1;
                $stats['by_venue'][$d['venue']] = ($stats['by_venue'][$d['venue']] ?? 0) + 1;
                $allDrafts[] = $d;
            }
        }

        // LIVE import — when --commit is set, persist drafts via the import service.
        $importStats = ['created' => 0, 'updated' => 0, 'skipped' => 0, 'errors' => 0];
        if ($commit) {
            $io->section('LIVE import — zapisuji do DB');
            $progress = $io->createProgressBar(count($allDrafts));
            $progress->start();
            foreach ($allDrafts as $draft) {
                try {
                    $result = $this->importService->importDraft($draft);
                    $importStats[$result['action']] = ($importStats[$result['action']] ?? 0) + 1;
                    if ($details) {
                        $io->writeln(sprintf(' <comment>[%s]</comment> #%s — %s',
                            $result['action'],
                            $result['reservationId'] ?? '?',
                            $result['message']
                        ));
                    }
                } catch (\Throwable $e) {
                    $importStats['errors']++;
                    $io->writeln(' <fg=red>[error]</> ' . $e->getMessage());
                }
                $progress->advance();
            }
            $progress->finish();
            $io->newLine(2);
        }

        if ($details && !$commit) {
            $io->section('Detaily rezervací');
            foreach ($allDrafts as $i => $d) {
                $io->writeln(sprintf(
                    '<comment>[%d]</comment> %s • %s • <info>%s</info> • %d pax (%d free) • %s • %s%s • %s',
                    $i + 1,
                    $d['date']->format('d.m.Y'),
                    $d['venue'],
                    $d['section'] ?? '?',
                    $d['pax'],
                    $d['free'],
                    $d['raw']['company'] ?? '?',
                    $d['parsedPayment']['price'] !== null
                        ? number_format($d['parsedPayment']['price'], 0) . ' ' . ($d['parsedPayment']['currency'] ?? '?')
                        : '— ',
                    $d['parsedPayment']['paymentMethod'] ? ' / ' . $d['parsedPayment']['paymentMethod'] : '',
                    $d['status']
                ));
                if (!empty($d['warnings'])) {
                    foreach ($d['warnings'] as $w) {
                        $io->writeln('   <fg=yellow>⚠ ' . $w . '</>');
                    }
                }
            }
        }

        // Summary
        $io->section('Souhrn');
        $io->definitionList(
            ['Souborů zpracováno' => $stats['files']],
            ['Rezervací nalezeno' => $stats['reservations']],
            ['Storna' => $stats['cancelled']],
            ['S parsovanou cenou' => sprintf('%d (%d%%)', $stats['with_price'], $stats['reservations'] ? round(100 * $stats['with_price'] / $stats['reservations']) : 0)],
            ['Bez ceny v platbě' => $stats['no_price']],
            ['Unikátních firem' => count($stats['unique_companies'])],
        );

        $io->section('Dle zdroje (clientComeFrom)');
        $rows = [];
        foreach ($stats['by_section'] as $sec => $cnt) $rows[] = [$sec, $cnt];
        $io->table(['Sekce', 'Počet'], $rows);

        $io->section('Dle prostoru');
        $rows = [];
        foreach ($stats['by_venue'] as $venue => $cnt) $rows[] = [$venue, $cnt];
        $io->table(['Prostor', 'Počet'], $rows);

        if ($commit) {
            $io->section('Výsledek importu');
            $io->definitionList(
                ['Vytvořeno' => $importStats['created']],
                ['Aktualizováno' => $importStats['updated']],
                ['Přeskočeno (beze změny)' => $importStats['skipped']],
                ['Chyby' => $importStats['errors']],
            );
        }

        $io->success(sprintf(
            'Hotovo. %s %d rezervací. %s',
            $commit ? 'Zpracováno' : 'Připraveno',
            $stats['reservations'],
            $dryRun ? 'Použij --commit pro skutečný import do DB.' : ''
        ));

        return Command::SUCCESS;
    }
}
