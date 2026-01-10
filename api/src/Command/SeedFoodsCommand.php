<?php

namespace App\Command;

use App\Entity\ReservationFoods;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\Console\Attribute\AsCommand;
use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Output\OutputInterface;

#[AsCommand(
    name: 'app:seed-foods',
    description: 'Vloží předdefinovaný seznam jídel do databáze.',
)]
class SeedFoodsCommand extends Command
{
    private EntityManagerInterface $em;

    public function __construct(EntityManagerInterface $em)
    {
        parent::__construct();
        $this->em = $em;
    }

    protected function execute(InputInterface $input, OutputInterface $output): int
    {
        // [externalId, name, description, price, isChildMenu, surcharge]
        // externalId matches external reservation system foodOptions
        // surcharge = příplatek k základní ceně (0 = v ceně, 75 = příplatek 75 Kč)
        $foods = [
            ['', 'Bez jídla', null, 0, false, 0],                           // noMeal
            ['5', 'Standardní menu - Tradiční', null, 380, false, 0],       // menu_standard_traditional (v ceně)
            ['6', 'Standardní menu - Kuřecí', null, 380, false, 0],         // menu_standard_chicken (v ceně)
            ['7', 'Standardní menu - Vegetariánské', null, 380, false, 0],  // menu_standard_vegetarian (v ceně)
            ['8', 'Speciální menu - Semikošer', null, 455, false, 75],      // menu_special_semikosher (+75 Kč)
            ['9', 'Speciální menu - Vepřové koleno', null, 455, false, 75], // menu_special_porkKnuckle (+75 Kč)
            ['10', 'Speciální menu - Kachna', null, 455, false, 75],        // menu_special_duck (+75 Kč)
            ['11', 'Speciální menu - Kuřecí halal', null, 455, false, 75],  // menu_special_halalChicken (+75 Kč)
            ['12', 'Speciální menu - Losos', null, 455, false, 75],         // menu_special_salmon (+75 Kč)
            ['13', 'Speciální menu - Pstruh', null, 455, false, 75],        // menu_special_trout (+75 Kč)
        ];

        $repo = $this->em->getRepository(ReservationFoods::class);
        $created = 0;
        $updated = 0;

        foreach ($foods as [$externalId, $name, $desc, $price, $isChild, $surcharge]) {
            // Find existing by externalId or name
            $food = $repo->findOneBy(['externalId' => $externalId]);
            if (!$food) {
                $food = $repo->findOneBy(['name' => $name]);
            }

            if ($food) {
                // Update existing
                $food->setExternalId($externalId ?: null)
                    ->setSurcharge($surcharge);
                $updated++;
            } else {
                // Create new
                $food = new ReservationFoods();
                $food->setName($name)
                    ->setDescription($desc)
                    ->setPrice($price)
                    ->setIsChildrenMenu($isChild)
                    ->setExternalId($externalId ?: null)
                    ->setSurcharge($surcharge);
                $this->em->persist($food);
                $created++;
            }
        }

        $this->em->flush();

        $output->writeln("<info>Jídla: vytvořeno $created, aktualizováno $updated</info>");

        return Command::SUCCESS;
    }
}