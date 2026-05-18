<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260518120000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'DrinkItem — is_welcome_drink flag (filtruje nápoje nabízené jako welcome drink)';
    }

    public function up(Schema $schema): void
    {
        $this->addSql("ALTER TABLE drink_item ADD is_welcome_drink BOOLEAN DEFAULT false NOT NULL");
    }

    public function down(Schema $schema): void
    {
        $this->addSql('ALTER TABLE drink_item DROP COLUMN IF EXISTS is_welcome_drink');
    }
}
