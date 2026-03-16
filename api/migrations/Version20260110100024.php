<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Auto-generated Migration: Please modify to your needs!
 */
final class Version20260110100024 extends AbstractMigration
{
    public function getDescription(): string
    {
        return '';
    }

    public function up(Schema $schema): void
    {
        // this up() migration is auto-generated, please modify it to your needs
        $this->addSql(<<<'SQL'
            CREATE TABLE pricing_date_override (id SERIAL NOT NULL, date DATE NOT NULL, adult_price NUMERIC(10, 2) NOT NULL, child_price NUMERIC(10, 2) NOT NULL, infant_price NUMERIC(10, 2) NOT NULL, include_meal BOOLEAN NOT NULL, reason VARCHAR(255) DEFAULT NULL, created_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL, updated_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL, PRIMARY KEY(id))
        SQL);
        $this->addSql(<<<'SQL'
            CREATE TABLE pricing_default (id SERIAL NOT NULL, adult_price NUMERIC(10, 2) NOT NULL, child_price NUMERIC(10, 2) NOT NULL, infant_price NUMERIC(10, 2) NOT NULL, include_meal BOOLEAN NOT NULL, created_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL, updated_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL, PRIMARY KEY(id))
        SQL);
        $this->addSql(<<<'SQL'
            ALTER TABLE company_settings ALTER deposit_invoice_prefix DROP DEFAULT
        SQL);
        $this->addSql(<<<'SQL'
            ALTER TABLE company_settings ALTER deposit_invoice_next_number DROP DEFAULT
        SQL);
    }

    public function down(Schema $schema): void
    {
        // this down() migration is auto-generated, please modify it to your needs
        $this->addSql(<<<'SQL'
            CREATE SCHEMA public
        SQL);
        $this->addSql(<<<'SQL'
            DROP TABLE pricing_date_override
        SQL);
        $this->addSql(<<<'SQL'
            DROP TABLE pricing_default
        SQL);
        $this->addSql(<<<'SQL'
            ALTER TABLE company_settings ALTER deposit_invoice_prefix SET DEFAULT 'ZF'
        SQL);
        $this->addSql(<<<'SQL'
            ALTER TABLE company_settings ALTER deposit_invoice_next_number SET DEFAULT 1
        SQL);
    }
}
