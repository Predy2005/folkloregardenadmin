<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Auto-generated Migration: Please modify to your needs!
 */
final class Version20260105173220 extends AbstractMigration
{
    public function getDescription(): string
    {
        return '';
    }

    public function up(Schema $schema): void
    {
        // this up() migration is auto-generated, please modify it to your needs
        $this->addSql(<<<'SQL'
            CREATE TABLE event_invoice (id SERIAL NOT NULL, event_id INT NOT NULL, invoice_id INT NOT NULL, invoice_type VARCHAR(50) DEFAULT 'deposit' NOT NULL, order_number INT DEFAULT 1 NOT NULL, notes TEXT DEFAULT NULL, created_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL, PRIMARY KEY(id))
        SQL);
        $this->addSql(<<<'SQL'
            CREATE INDEX IDX_1532BEEB71F7E88B ON event_invoice (event_id)
        SQL);
        $this->addSql(<<<'SQL'
            CREATE INDEX IDX_1532BEEB2989F1FD ON event_invoice (invoice_id)
        SQL);
        $this->addSql(<<<'SQL'
            CREATE TABLE event_tag (id SERIAL NOT NULL, name VARCHAR(100) NOT NULL, usage_count INT DEFAULT 1 NOT NULL, created_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL, last_used_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL, PRIMARY KEY(id))
        SQL);
        $this->addSql(<<<'SQL'
            CREATE UNIQUE INDEX unique_tag_name ON event_tag (name)
        SQL);
        $this->addSql(<<<'SQL'
            ALTER TABLE event_invoice ADD CONSTRAINT FK_1532BEEB71F7E88B FOREIGN KEY (event_id) REFERENCES event (id) ON DELETE CASCADE NOT DEFERRABLE INITIALLY IMMEDIATE
        SQL);
        $this->addSql(<<<'SQL'
            ALTER TABLE event_invoice ADD CONSTRAINT FK_1532BEEB2989F1FD FOREIGN KEY (invoice_id) REFERENCES invoice (id) ON DELETE CASCADE NOT DEFERRABLE INITIALLY IMMEDIATE
        SQL);
        $this->addSql(<<<'SQL'
            ALTER TABLE event ADD event_subcategory VARCHAR(50) DEFAULT NULL
        SQL);
        $this->addSql(<<<'SQL'
            ALTER TABLE event ADD event_tags JSON DEFAULT NULL
        SQL);
        $this->addSql(<<<'SQL'
            ALTER TABLE event ADD catering_type VARCHAR(50) DEFAULT NULL
        SQL);
        $this->addSql(<<<'SQL'
            ALTER TABLE event ADD catering_commission_percent NUMERIC(5, 2) DEFAULT NULL
        SQL);
        $this->addSql(<<<'SQL'
            ALTER TABLE event ADD catering_commission_amount NUMERIC(15, 2) DEFAULT NULL
        SQL);
    }

    public function down(Schema $schema): void
    {
        // this down() migration is auto-generated, please modify it to your needs
        $this->addSql(<<<'SQL'
            CREATE SCHEMA public
        SQL);
        $this->addSql(<<<'SQL'
            ALTER TABLE event_invoice DROP CONSTRAINT FK_1532BEEB71F7E88B
        SQL);
        $this->addSql(<<<'SQL'
            ALTER TABLE event_invoice DROP CONSTRAINT FK_1532BEEB2989F1FD
        SQL);
        $this->addSql(<<<'SQL'
            DROP TABLE event_invoice
        SQL);
        $this->addSql(<<<'SQL'
            DROP TABLE event_tag
        SQL);
        $this->addSql(<<<'SQL'
            ALTER TABLE event DROP event_subcategory
        SQL);
        $this->addSql(<<<'SQL'
            ALTER TABLE event DROP event_tags
        SQL);
        $this->addSql(<<<'SQL'
            ALTER TABLE event DROP catering_type
        SQL);
        $this->addSql(<<<'SQL'
            ALTER TABLE event DROP catering_commission_percent
        SQL);
        $this->addSql(<<<'SQL'
            ALTER TABLE event DROP catering_commission_amount
        SQL);
    }
}
