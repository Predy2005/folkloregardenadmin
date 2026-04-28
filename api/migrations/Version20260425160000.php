<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Profile photos: staff_member.photo_path + transport_driver.photo_path.
 * Cesty k uploaded fotkám (relativní k uploads root).
 */
final class Version20260425160000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Profile photo path on staff_member and transport_driver (mobile profile photo).';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('ALTER TABLE staff_member ADD COLUMN photo_path VARCHAR(500) DEFAULT NULL');
        $this->addSql('ALTER TABLE transport_driver ADD COLUMN photo_path VARCHAR(500) DEFAULT NULL');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('ALTER TABLE staff_member DROP COLUMN photo_path');
        $this->addSql('ALTER TABLE transport_driver DROP COLUMN photo_path');
    }
}
