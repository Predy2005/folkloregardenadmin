<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Přidává `notes` a `allergens` k jídlu (`reservation_foods`).
 * - notes: interní poznámka (kuchyň/personál)
 * - allergens: textový seznam alergenů (čárkami oddělený nebo volný popis)
 */
final class Version20260428113803 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Add notes and allergens to reservation_foods';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('ALTER TABLE reservation_foods ADD notes TEXT DEFAULT NULL');
        $this->addSql('ALTER TABLE reservation_foods ADD allergens TEXT DEFAULT NULL');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('ALTER TABLE reservation_foods DROP notes');
        $this->addSql('ALTER TABLE reservation_foods DROP allergens');
    }
}
