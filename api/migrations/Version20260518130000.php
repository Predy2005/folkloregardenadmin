<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260518130000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'ReservationPerson — drink_item_ids JSON column (welcome combo: víno+medovina+sodovka jako jeden welcome)';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('ALTER TABLE reservation_person ADD drink_item_ids JSON DEFAULT NULL');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('ALTER TABLE reservation_person DROP COLUMN IF EXISTS drink_item_ids');
    }
}
