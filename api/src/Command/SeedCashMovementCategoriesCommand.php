<?php
declare(strict_types=1);

namespace App\Command;

use App\Repository\CashMovementCategoryRepository;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\Console\Attribute\AsCommand;
use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Output\OutputInterface;
use Symfony\Component\Console\Style\SymfonyStyle;

#[AsCommand(name: 'app:seed-cash-categories', description: 'Seed default cash movement categories')]
class SeedCashMovementCategoriesCommand extends Command
{
    public function __construct(
        private EntityManagerInterface $em,
        private CashMovementCategoryRepository $categoryRepo,
    ) {
        parent::__construct();
    }

    protected function execute(InputInterface $input, OutputInterface $output): int
    {
        $io = new SymfonyStyle($input, $output);

        $categories = [
            // Expense categories
            ['Číšníci', 'EXPENSE'],
            ['Kuchaři', 'EXPENSE'],
            ['Pomocné síly', 'EXPENSE'],
            ['Tanečníci', 'EXPENSE'],
            ['Muzikanti', 'EXPENSE'],
            ['Moderátor', 'EXPENSE'],
            ['Fotograf', 'EXPENSE'],
            ['Catering', 'EXPENSE'],
            ['Doprava', 'EXPENSE'],
            ['Šperky', 'EXPENSE'],
            ['Výplata personálu', 'EXPENSE'],
            ['Nákup potravin', 'EXPENSE'],
            ['Nájem', 'EXPENSE'],
            ['Energie', 'EXPENSE'],
            ['Vybavení', 'EXPENSE'],

            // Income categories
            ['Online platby', 'INCOME'],
            ['Hotovostní platby', 'INCOME'],
            ['Prodej šperků', 'INCOME'],
            ['Prodej zboží', 'INCOME'],
            ['Platba za rezervaci', 'INCOME'],
            ['Převod z eventu', 'INCOME'],

            // Both
            ['Ostatní', 'BOTH'],
        ];

        $created = 0;
        $existing = 0;

        foreach ($categories as [$name, $type]) {
            $cat = $this->categoryRepo->findOneBy(['name' => $name]);
            if ($cat) {
                $existing++;
                continue;
            }
            $cat = $this->categoryRepo->findOrCreate($name, $type);
            $this->em->persist($cat);
            $created++;
        }

        $this->em->flush();

        $io->success("Seed complete: {$created} created, {$existing} already existed.");

        return Command::SUCCESS;
    }
}
