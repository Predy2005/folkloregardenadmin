<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Auto-generated Migration: Please modify to your needs!
 */
final class Version20260319120158 extends AbstractMigration
{
    public function getDescription(): string
    {
        return '';
    }

    public function up(Schema $schema): void
    {
        // this up() migration is auto-generated, please modify it to your needs
        $this->addSql(<<<'SQL'
            ALTER TABLE partner ADD pricing_model VARCHAR(20) DEFAULT 'DEFAULT' NOT NULL
        SQL);
        $this->addSql(<<<'SQL'
            ALTER TABLE partner ADD flat_price_adult NUMERIC(10, 2) DEFAULT NULL
        SQL);
        $this->addSql(<<<'SQL'
            ALTER TABLE partner ADD flat_price_child NUMERIC(10, 2) DEFAULT NULL
        SQL);
        $this->addSql(<<<'SQL'
            ALTER TABLE partner ADD flat_price_infant NUMERIC(10, 2) DEFAULT NULL
        SQL);
        $this->addSql(<<<'SQL'
            ALTER TABLE partner ADD custom_menu_prices JSON DEFAULT NULL
        SQL);
        $this->addSql(<<<'SQL'
            ALTER TABLE partner ADD billing_period VARCHAR(20) DEFAULT 'PER_RESERVATION' NOT NULL
        SQL);
        $this->addSql(<<<'SQL'
            ALTER TABLE partner ADD billing_email VARCHAR(255) DEFAULT NULL
        SQL);
        $this->addSql(<<<'SQL'
            ALTER TABLE partner ADD invoice_company VARCHAR(255) DEFAULT NULL
        SQL);
        $this->addSql(<<<'SQL'
            ALTER TABLE partner ADD invoice_street VARCHAR(255) DEFAULT NULL
        SQL);
        $this->addSql(<<<'SQL'
            ALTER TABLE partner ADD invoice_city VARCHAR(255) DEFAULT NULL
        SQL);
        $this->addSql(<<<'SQL'
            ALTER TABLE partner ADD invoice_zipcode VARCHAR(20) DEFAULT NULL
        SQL);
        $this->addSql(<<<'SQL'
            ALTER TABLE partner ADD detection_emails JSON DEFAULT NULL
        SQL);
        $this->addSql(<<<'SQL'
            ALTER TABLE partner ADD detection_keywords JSON DEFAULT NULL
        SQL);
    }

    public function down(Schema $schema): void
    {
        // this down() migration is auto-generated, please modify it to your needs
        $this->addSql(<<<'SQL'
            CREATE SCHEMA public
        SQL);
        $this->addSql(<<<'SQL'
            ALTER TABLE partner DROP pricing_model
        SQL);
        $this->addSql(<<<'SQL'
            ALTER TABLE partner DROP flat_price_adult
        SQL);
        $this->addSql(<<<'SQL'
            ALTER TABLE partner DROP flat_price_child
        SQL);
        $this->addSql(<<<'SQL'
            ALTER TABLE partner DROP flat_price_infant
        SQL);
        $this->addSql(<<<'SQL'
            ALTER TABLE partner DROP custom_menu_prices
        SQL);
        $this->addSql(<<<'SQL'
            ALTER TABLE partner DROP billing_period
        SQL);
        $this->addSql(<<<'SQL'
            ALTER TABLE partner DROP billing_email
        SQL);
        $this->addSql(<<<'SQL'
            ALTER TABLE partner DROP invoice_company
        SQL);
        $this->addSql(<<<'SQL'
            ALTER TABLE partner DROP invoice_street
        SQL);
        $this->addSql(<<<'SQL'
            ALTER TABLE partner DROP invoice_city
        SQL);
        $this->addSql(<<<'SQL'
            ALTER TABLE partner DROP invoice_zipcode
        SQL);
        $this->addSql(<<<'SQL'
            ALTER TABLE partner DROP detection_emails
        SQL);
        $this->addSql(<<<'SQL'
            ALTER TABLE partner DROP detection_keywords
        SQL);
    }
}
