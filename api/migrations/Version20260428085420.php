<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Přidá sloupec `ordered_by` do tabulky `reservation` — kdo objednávku provedl
 * (typicky zaměstnanec CK / asistent), pokud je odlišný od kontaktní osoby.
 */
final class Version20260428085420 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Add ordered_by column to reservation';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('ALTER TABLE reservation ADD ordered_by TEXT DEFAULT NULL');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('ALTER TABLE reservation DROP ordered_by');
    }
}
