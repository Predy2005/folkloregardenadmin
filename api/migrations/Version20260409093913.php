<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Auto-generated Migration: Please modify to your needs!
 */
final class Version20260409093913 extends AbstractMigration
{
    public function getDescription(): string
    {
        return '';
    }

    public function up(Schema $schema): void
    {
        // this up() migration is auto-generated, please modify it to your needs
        $this->addSql(<<<'SQL'
            CREATE TABLE exchange_rate (id SERIAL NOT NULL, base_currency VARCHAR(3) NOT NULL, target_currency VARCHAR(3) NOT NULL, rate NUMERIC(15, 6) NOT NULL, effective_date DATE NOT NULL, source VARCHAR(50) DEFAULT NULL, created_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL, PRIMARY KEY(id))
        SQL);
        $this->addSql(<<<'SQL'
            CREATE UNIQUE INDEX uq_exchange_rate ON exchange_rate (base_currency, target_currency, effective_date)
        SQL);
        $this->addSql(<<<'SQL'
            ALTER TABLE company_settings ADD default_currency VARCHAR(3) DEFAULT 'CZK' NOT NULL
        SQL);
        $this->addSql(<<<'SQL'
            ALTER TABLE company_settings ADD enabled_currencies JSON DEFAULT '["CZK"]' NOT NULL
        SQL);
        $this->addSql(<<<'SQL'
            ALTER TABLE payment ADD currency VARCHAR(3) DEFAULT 'CZK' NOT NULL
        SQL);
        $this->addSql(<<<'SQL'
            ALTER TABLE reservation ADD currency VARCHAR(3) DEFAULT 'CZK' NOT NULL
        SQL);
        $this->addSql(<<<'SQL'
            ALTER TABLE reservation_person ADD currency VARCHAR(3) DEFAULT 'CZK' NOT NULL
        SQL);
    }

    public function down(Schema $schema): void
    {
        // this down() migration is auto-generated, please modify it to your needs
        $this->addSql(<<<'SQL'
            CREATE SCHEMA public
        SQL);
        $this->addSql(<<<'SQL'
            DROP TABLE exchange_rate
        SQL);
        $this->addSql(<<<'SQL'
            ALTER TABLE payment DROP currency
        SQL);
        $this->addSql(<<<'SQL'
            ALTER TABLE reservation_person DROP currency
        SQL);
        $this->addSql(<<<'SQL'
            ALTER TABLE reservation DROP currency
        SQL);
        $this->addSql(<<<'SQL'
            ALTER TABLE company_settings DROP default_currency
        SQL);
        $this->addSql(<<<'SQL'
            ALTER TABLE company_settings DROP enabled_currencies
        SQL);
    }
}
