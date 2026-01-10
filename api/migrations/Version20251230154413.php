<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Auto-generated Migration: Please modify to your needs!
 */
final class Version20251230154413 extends AbstractMigration
{
    public function getDescription(): string
    {
        return '';
    }

    public function up(Schema $schema): void
    {
        // this up() migration is auto-generated, please modify it to your needs
        $this->addSql(<<<'SQL'
            CREATE TABLE company_settings (id SERIAL NOT NULL, code VARCHAR(50) NOT NULL, company_name VARCHAR(255) NOT NULL, street VARCHAR(255) NOT NULL, city VARCHAR(255) NOT NULL, zipcode VARCHAR(20) NOT NULL, country VARCHAR(100) DEFAULT NULL, ico VARCHAR(50) NOT NULL, dic VARCHAR(50) DEFAULT NULL, email VARCHAR(255) DEFAULT NULL, phone VARCHAR(50) DEFAULT NULL, web VARCHAR(255) DEFAULT NULL, bank_account VARCHAR(50) DEFAULT NULL, bank_code VARCHAR(10) DEFAULT NULL, bank_name VARCHAR(255) DEFAULT NULL, iban VARCHAR(50) DEFAULT NULL, swift VARCHAR(20) DEFAULT NULL, invoice_prefix VARCHAR(20) NOT NULL, invoice_next_number INT NOT NULL, invoice_due_days INT NOT NULL, default_vat_rate INT NOT NULL, logo_base64 TEXT DEFAULT NULL, invoice_footer_text TEXT DEFAULT NULL, registration_info VARCHAR(255) DEFAULT NULL, is_vat_payer BOOLEAN NOT NULL, created_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL, updated_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL, PRIMARY KEY(id))
        SQL);
        $this->addSql(<<<'SQL'
            CREATE UNIQUE INDEX UNIQ_FDD2B5A877153098 ON company_settings (code)
        SQL);
        $this->addSql(<<<'SQL'
            CREATE TABLE invoice (id SERIAL NOT NULL, reservation_id INT DEFAULT NULL, created_by_id INT DEFAULT NULL, invoice_number VARCHAR(50) NOT NULL, issue_date DATE NOT NULL, due_date DATE NOT NULL, taxable_date DATE DEFAULT NULL, status VARCHAR(20) NOT NULL, supplier_name VARCHAR(255) NOT NULL, supplier_street VARCHAR(255) NOT NULL, supplier_city VARCHAR(255) NOT NULL, supplier_zipcode VARCHAR(20) NOT NULL, supplier_ico VARCHAR(50) NOT NULL, supplier_dic VARCHAR(50) DEFAULT NULL, supplier_email VARCHAR(255) DEFAULT NULL, supplier_phone VARCHAR(50) DEFAULT NULL, supplier_bank_account VARCHAR(255) DEFAULT NULL, supplier_bank_name VARCHAR(255) DEFAULT NULL, supplier_iban VARCHAR(50) DEFAULT NULL, supplier_swift VARCHAR(20) DEFAULT NULL, customer_name VARCHAR(255) NOT NULL, customer_company VARCHAR(255) DEFAULT NULL, customer_street VARCHAR(255) DEFAULT NULL, customer_city VARCHAR(255) DEFAULT NULL, customer_zipcode VARCHAR(20) DEFAULT NULL, customer_ico VARCHAR(50) DEFAULT NULL, customer_dic VARCHAR(50) DEFAULT NULL, customer_email VARCHAR(255) DEFAULT NULL, customer_phone VARCHAR(50) DEFAULT NULL, subtotal NUMERIC(12, 2) NOT NULL, vat_amount NUMERIC(12, 2) NOT NULL, vat_rate INT NOT NULL, total NUMERIC(12, 2) NOT NULL, currency VARCHAR(10) NOT NULL, variable_symbol VARCHAR(50) NOT NULL, qr_payment_data TEXT DEFAULT NULL, items JSON NOT NULL, note TEXT DEFAULT NULL, created_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL, updated_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL, PRIMARY KEY(id))
        SQL);
        $this->addSql(<<<'SQL'
            CREATE UNIQUE INDEX UNIQ_906517442DA68207 ON invoice (invoice_number)
        SQL);
        $this->addSql(<<<'SQL'
            CREATE INDEX IDX_90651744B83297E7 ON invoice (reservation_id)
        SQL);
        $this->addSql(<<<'SQL'
            CREATE INDEX IDX_90651744B03A8386 ON invoice (created_by_id)
        SQL);
        $this->addSql(<<<'SQL'
            ALTER TABLE invoice ADD CONSTRAINT FK_90651744B83297E7 FOREIGN KEY (reservation_id) REFERENCES reservation (id) ON DELETE SET NULL NOT DEFERRABLE INITIALLY IMMEDIATE
        SQL);
        $this->addSql(<<<'SQL'
            ALTER TABLE invoice ADD CONSTRAINT FK_90651744B03A8386 FOREIGN KEY (created_by_id) REFERENCES "user" (id) ON DELETE SET NULL NOT DEFERRABLE INITIALLY IMMEDIATE
        SQL);
        $this->addSql(<<<'SQL'
            ALTER TABLE reservation ADD invoice_street VARCHAR(255) DEFAULT NULL
        SQL);
        $this->addSql(<<<'SQL'
            ALTER TABLE reservation ADD invoice_city VARCHAR(255) DEFAULT NULL
        SQL);
        $this->addSql(<<<'SQL'
            ALTER TABLE reservation ADD invoice_zipcode VARCHAR(20) DEFAULT NULL
        SQL);
        $this->addSql(<<<'SQL'
            ALTER TABLE reservation ADD invoice_country VARCHAR(100) DEFAULT NULL
        SQL);
    }

    public function down(Schema $schema): void
    {
        // this down() migration is auto-generated, please modify it to your needs
        $this->addSql(<<<'SQL'
            CREATE SCHEMA public
        SQL);
        $this->addSql(<<<'SQL'
            ALTER TABLE invoice DROP CONSTRAINT FK_90651744B83297E7
        SQL);
        $this->addSql(<<<'SQL'
            ALTER TABLE invoice DROP CONSTRAINT FK_90651744B03A8386
        SQL);
        $this->addSql(<<<'SQL'
            DROP TABLE company_settings
        SQL);
        $this->addSql(<<<'SQL'
            DROP TABLE invoice
        SQL);
        $this->addSql(<<<'SQL'
            ALTER TABLE reservation DROP invoice_street
        SQL);
        $this->addSql(<<<'SQL'
            ALTER TABLE reservation DROP invoice_city
        SQL);
        $this->addSql(<<<'SQL'
            ALTER TABLE reservation DROP invoice_zipcode
        SQL);
        $this->addSql(<<<'SQL'
            ALTER TABLE reservation DROP invoice_country
        SQL);
    }
}
