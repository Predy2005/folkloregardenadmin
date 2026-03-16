<?php

declare(strict_types=1);

namespace App\Command;

use App\Service\RecipeImportService;
use Symfony\Component\Console\Attribute\AsCommand;
use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Input\InputArgument;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Input\InputOption;
use Symfony\Component\Console\Output\OutputInterface;
use Symfony\Component\Console\Style\SymfonyStyle;
use Symfony\Component\HttpKernel\KernelInterface;

#[AsCommand(
    name: 'app:import-recipes',
    description: 'Imports recipes from XLSX file (reads each sheet as a recipe with ingredients)',
)]
class SeedRecipeDataCommand extends Command
{
    private readonly string $projectDir;

    public function __construct(
        private readonly RecipeImportService $importService,
        KernelInterface $kernel,
    ) {
        parent::__construct();
        $this->projectDir = $kernel->getProjectDir();
    }

    protected function configure(): void
    {
        $this
            ->addArgument('file', InputArgument::OPTIONAL, 'Path to XLSX file', 'podklady/RECEPTURY 2026 - FOLKLORNÍ VEČERY.xlsx')
            ->addOption('skip-sheet', null, InputOption::VALUE_REQUIRED | InputOption::VALUE_IS_ARRAY, 'Sheet names to skip', ['VZOR TABULKY']);
    }

    protected function execute(InputInterface $input, OutputInterface $output): int
    {
        $io = new SymfonyStyle($input, $output);
        $filePath = $input->getArgument('file');
        $skipSheets = $input->getOption('skip-sheet');

        // Resolve relative path
        if (!str_starts_with($filePath, '/')) {
            $filePath = $this->projectDir . '/../' . $filePath;
        }

        if (!file_exists($filePath)) {
            $io->error("File not found: {$filePath}");
            return Command::FAILURE;
        }

        $io->title('Import receptur z XLSX');
        $io->text("Soubor: {$filePath}");

        $result = $this->importService->importFromFile($filePath, $skipSheets);

        if (!empty($result['skipped'])) {
            $io->text('Přeskočené listy: ' . implode(', ', $result['skipped']));
        }

        if (!empty($result['errors'])) {
            foreach ($result['errors'] as $err) {
                $io->warning($err);
            }
        }

        $io->success([
            'Import dokončen',
            "Receptury: {$result['recipes']}",
            "Nové suroviny: {$result['stockItems']}",
            "Ingredience: {$result['ingredients']}",
        ]);

        return Command::SUCCESS;
    }
}
