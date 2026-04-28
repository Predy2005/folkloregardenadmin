<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Mění default sloupce `event.duration_minutes` ze 120 na 150 minut.
 * Existující záznamy zůstávají beze změny — default se uplatní jen u nových.
 */
final class Version20260428121513 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Change default of event.duration_minutes from 120 to 150';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('ALTER TABLE event ALTER duration_minutes SET DEFAULT 150');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('ALTER TABLE event ALTER duration_minutes SET DEFAULT 120');
    }
}
