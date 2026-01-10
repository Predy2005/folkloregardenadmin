<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Auto-generated Migration: Please modify to your needs!
 */
final class Version20251113115057 extends AbstractMigration
{
    public function getDescription(): string
    {
        return '';
    }

    public function up(Schema $schema): void
    {
        // this up() migration is auto-generated, please modify it to your needs
        $this->addSql(<<<'SQL'
            ALTER TABLE contact ADD email_normalized VARCHAR(255) DEFAULT NULL
        SQL);
        $this->addSql(<<<'SQL'
            ALTER TABLE contact ADD phone_normalized VARCHAR(20) DEFAULT NULL
        SQL);
        $this->addSql(<<<'SQL'
            ALTER TABLE contact ADD invoice_name VARCHAR(255) DEFAULT NULL
        SQL);
        $this->addSql(<<<'SQL'
            ALTER TABLE contact ADD invoice_email VARCHAR(255) DEFAULT NULL
        SQL);
        $this->addSql(<<<'SQL'
            ALTER TABLE contact ADD invoice_phone VARCHAR(50) DEFAULT NULL
        SQL);
        $this->addSql(<<<'SQL'
            ALTER TABLE contact ADD invoice_ic VARCHAR(50) DEFAULT NULL
        SQL);
        $this->addSql(<<<'SQL'
            ALTER TABLE contact ADD invoice_dic VARCHAR(50) DEFAULT NULL
        SQL);
        $this->addSql(<<<'SQL'
            ALTER TABLE contact ADD client_come_from VARCHAR(255) DEFAULT NULL
        SQL);
        $this->addSql(<<<'SQL'
            ALTER TABLE contact ADD billing_street VARCHAR(255) DEFAULT NULL
        SQL);
        $this->addSql(<<<'SQL'
            ALTER TABLE contact ADD billing_city VARCHAR(100) DEFAULT NULL
        SQL);
        $this->addSql(<<<'SQL'
            ALTER TABLE contact ADD billing_zip VARCHAR(20) DEFAULT NULL
        SQL);
        $this->addSql(<<<'SQL'
            ALTER TABLE contact ADD billing_country VARCHAR(100) DEFAULT NULL
        SQL);
        $this->addSql(<<<'SQL'
            CREATE UNIQUE INDEX UNIQ_4C62E638D5AE72C8 ON contact (email_normalized)
        SQL);
        $this->addSql(<<<'SQL'
            CREATE INDEX contact_phone_normalized_idx ON contact (phone_normalized)
        SQL);
    }

    public function down(Schema $schema): void
    {
        // this down() migration is auto-generated, please modify it to your needs
        $this->addSql(<<<'SQL'
            CREATE SCHEMA public
        SQL);
        $this->addSql(<<<'SQL'
            DROP INDEX UNIQ_4C62E638D5AE72C8
        SQL);
        $this->addSql(<<<'SQL'
            DROP INDEX contact_phone_normalized_idx
        SQL);
        $this->addSql(<<<'SQL'
            ALTER TABLE contact DROP email_normalized
        SQL);
        $this->addSql(<<<'SQL'
            ALTER TABLE contact DROP phone_normalized
        SQL);
        $this->addSql(<<<'SQL'
            ALTER TABLE contact DROP invoice_name
        SQL);
        $this->addSql(<<<'SQL'
            ALTER TABLE contact DROP invoice_email
        SQL);
        $this->addSql(<<<'SQL'
            ALTER TABLE contact DROP invoice_phone
        SQL);
        $this->addSql(<<<'SQL'
            ALTER TABLE contact DROP invoice_ic
        SQL);
        $this->addSql(<<<'SQL'
            ALTER TABLE contact DROP invoice_dic
        SQL);
        $this->addSql(<<<'SQL'
            ALTER TABLE contact DROP client_come_from
        SQL);
        $this->addSql(<<<'SQL'
            ALTER TABLE contact DROP billing_street
        SQL);
        $this->addSql(<<<'SQL'
            ALTER TABLE contact DROP billing_city
        SQL);
        $this->addSql(<<<'SQL'
            ALTER TABLE contact DROP billing_zip
        SQL);
        $this->addSql(<<<'SQL'
            ALTER TABLE contact DROP billing_country
        SQL);
    }
}
