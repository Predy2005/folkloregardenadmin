<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Auto-generated Migration: Please modify to your needs!
 */
final class Version20260319082139 extends AbstractMigration
{
    public function getDescription(): string
    {
        return '';
    }

    public function up(Schema $schema): void
    {
        // this up() migration is auto-generated, please modify it to your needs
        $this->addSql(<<<'SQL'
            ALTER TABLE staff_attendance ADD is_paid BOOLEAN DEFAULT false NOT NULL
        SQL);
        $this->addSql(<<<'SQL'
            ALTER TABLE staff_attendance ADD paid_at TIMESTAMP(0) WITHOUT TIME ZONE DEFAULT NULL
        SQL);
        $this->addSql(<<<'SQL'
            ALTER TABLE staff_attendance ADD event_id INT DEFAULT NULL
        SQL);
        $this->addSql(<<<'SQL'
            ALTER TABLE staff_attendance ADD payment_amount NUMERIC(15, 2) DEFAULT NULL
        SQL);
        $this->addSql(<<<'SQL'
            ALTER TABLE staff_attendance ADD payment_note VARCHAR(255) DEFAULT NULL
        SQL);
    }

    public function down(Schema $schema): void
    {
        // this down() migration is auto-generated, please modify it to your needs
        $this->addSql(<<<'SQL'
            CREATE SCHEMA public
        SQL);
        $this->addSql(<<<'SQL'
            ALTER TABLE staff_attendance DROP is_paid
        SQL);
        $this->addSql(<<<'SQL'
            ALTER TABLE staff_attendance DROP paid_at
        SQL);
        $this->addSql(<<<'SQL'
            ALTER TABLE staff_attendance DROP event_id
        SQL);
        $this->addSql(<<<'SQL'
            ALTER TABLE staff_attendance DROP payment_amount
        SQL);
        $this->addSql(<<<'SQL'
            ALTER TABLE staff_attendance DROP payment_note
        SQL);
    }
}
