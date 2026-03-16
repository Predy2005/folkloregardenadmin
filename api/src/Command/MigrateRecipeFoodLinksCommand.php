<?php

declare(strict_types=1);

namespace App\Command;

use App\Entity\MenuRecipe;
use App\Entity\Recipe;
use App\Repository\MenuRecipeRepository;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\Console\Attribute\AsCommand;
use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Output\OutputInterface;
use Symfony\Component\Console\Style\SymfonyStyle;

#[AsCommand(
    name: 'app:migrate-recipe-food-links',
    description: 'Migrates existing Recipe.reservationFoodId to MenuRecipe junction table (idempotent)',
)]
class MigrateRecipeFoodLinksCommand extends Command
{
    public function __construct(
        private readonly EntityManagerInterface $em,
    ) {
        parent::__construct();
    }

    protected function execute(InputInterface $input, OutputInterface $output): int
    {
        $io = new SymfonyStyle($input, $output);
        $io->title('Migrating Recipe → ReservationFoods links to MenuRecipe');

        $recipeRepo = $this->em->getRepository(Recipe::class);
        $menuRecipeRepo = $this->em->getRepository(MenuRecipe::class);

        $recipes = $recipeRepo->findAll();
        $created = 0;
        $skipped = 0;

        foreach ($recipes as $recipe) {
            $food = $recipe->getReservationFood();
            if (!$food) {
                continue;
            }

            // Check if already migrated
            $existing = $menuRecipeRepo->findOneBy([
                'reservationFood' => $food,
                'recipe' => $recipe,
            ]);

            if ($existing) {
                $io->text("  [skip] {$recipe->getName()} → {$food->getName()} (already exists)");
                $skipped++;
                continue;
            }

            $mr = new MenuRecipe();
            $mr->setReservationFood($food);
            $mr->setRecipe($recipe);
            $mr->setPortionsPerServing('1.00');

            $this->em->persist($mr);
            $created++;
            $io->text("  [created] {$recipe->getName()} → {$food->getName()}");
        }

        $this->em->flush();

        $io->success("Migration complete: {$created} created, {$skipped} skipped");

        return Command::SUCCESS;
    }
}
