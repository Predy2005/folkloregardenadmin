<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260518113035 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'StaffingFormula — tiers JSON column (range-based staff count instead of linear ratio)';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('ALTER TABLE staffing_formulas ADD tiers JSON DEFAULT NULL');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('ALTER TABLE staffing_formulas DROP COLUMN IF EXISTS tiers');
    }
}
