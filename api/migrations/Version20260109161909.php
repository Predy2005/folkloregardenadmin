<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Auto-generated Migration: Please modify to your needs!
 */
final class Version20260109161909 extends AbstractMigration
{
    public function getDescription(): string
    {
        return '';
    }

    public function up(Schema $schema): void
    {
        // Deposit invoice fields with defaults
        $this->addSql(<<<'SQL'
            ALTER TABLE company_settings ADD deposit_invoice_prefix VARCHAR(20) NOT NULL DEFAULT 'ZF'
        SQL);
        $this->addSql(<<<'SQL'
            ALTER TABLE company_settings ADD deposit_invoice_next_number INT NOT NULL DEFAULT 1
        SQL);
        // Update existing rows
        $this->addSql(<<<'SQL'
            UPDATE company_settings SET deposit_invoice_prefix = 'ZF', deposit_invoice_next_number = 1 WHERE deposit_invoice_prefix IS NULL
        SQL);
        $this->addSql(<<<'SQL'
            ALTER TABLE invoice ALTER invoice_type DROP DEFAULT
        SQL);
        $this->addSql(<<<'SQL'
            ALTER TABLE reservation ALTER source DROP DEFAULT
        SQL);
        $this->addSql(<<<'SQL'
            ALTER TABLE reservation ALTER payment_status DROP DEFAULT
        SQL);
        $this->addSql(<<<'SQL'
            ALTER TABLE reservation ALTER deposit_percent DROP DEFAULT
        SQL);
        $this->addSql(<<<'SQL'
            ALTER TABLE reservation ALTER paid_amount DROP DEFAULT
        SQL);
    }

    public function down(Schema $schema): void
    {
        // this down() migration is auto-generated, please modify it to your needs
        $this->addSql(<<<'SQL'
            CREATE SCHEMA public
        SQL);
        $this->addSql(<<<'SQL'
            ALTER TABLE invoice ALTER invoice_type SET DEFAULT 'FINAL'
        SQL);
        $this->addSql(<<<'SQL'
            ALTER TABLE reservation ALTER source SET DEFAULT 'WEB'
        SQL);
        $this->addSql(<<<'SQL'
            ALTER TABLE reservation ALTER payment_status SET DEFAULT 'UNPAID'
        SQL);
        $this->addSql(<<<'SQL'
            ALTER TABLE reservation ALTER deposit_percent SET DEFAULT '25.00'
        SQL);
        $this->addSql(<<<'SQL'
            ALTER TABLE reservation ALTER paid_amount SET DEFAULT '0.00'
        SQL);
        $this->addSql(<<<'SQL'
            ALTER TABLE company_settings DROP deposit_invoice_prefix
        SQL);
        $this->addSql(<<<'SQL'
            ALTER TABLE company_settings DROP deposit_invoice_next_number
        SQL);
    }
}
