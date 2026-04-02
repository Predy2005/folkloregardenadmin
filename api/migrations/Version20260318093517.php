<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Auto-generated Migration: Please modify to your needs!
 */
final class Version20260318093517 extends AbstractMigration
{
    public function getDescription(): string
    {
        return '';
    }

    public function up(Schema $schema): void
    {
        // this up() migration is auto-generated, please modify it to your needs
        $this->addSql(<<<'SQL'
            CREATE TABLE cashbox_audit_log (id SERIAL NOT NULL, cashbox_id INT DEFAULT NULL, user_id INT DEFAULT NULL, action VARCHAR(50) NOT NULL, entity_type VARCHAR(50) NOT NULL, entity_id INT DEFAULT NULL, change_data JSON DEFAULT NULL, description TEXT DEFAULT NULL, ip_address VARCHAR(45) DEFAULT NULL, created_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL, PRIMARY KEY(id))
        SQL);
        $this->addSql(<<<'SQL'
            CREATE INDEX IDX_FE63E6AFA76ED395 ON cashbox_audit_log (user_id)
        SQL);
        $this->addSql(<<<'SQL'
            CREATE INDEX idx_audit_cashbox ON cashbox_audit_log (cashbox_id)
        SQL);
        $this->addSql(<<<'SQL'
            CREATE INDEX idx_audit_created ON cashbox_audit_log (created_at)
        SQL);
        $this->addSql(<<<'SQL'
            ALTER TABLE cashbox_audit_log ADD CONSTRAINT FK_FE63E6AF61110C8F FOREIGN KEY (cashbox_id) REFERENCES cashbox (id) ON DELETE SET NULL NOT DEFERRABLE INITIALLY IMMEDIATE
        SQL);
        $this->addSql(<<<'SQL'
            ALTER TABLE cashbox_audit_log ADD CONSTRAINT FK_FE63E6AFA76ED395 FOREIGN KEY (user_id) REFERENCES "user" (id) ON DELETE SET NULL NOT DEFERRABLE INITIALLY IMMEDIATE
        SQL);
        $this->addSql(<<<'SQL'
            ALTER TABLE cash_movement ADD updated_at TIMESTAMP(0) WITHOUT TIME ZONE DEFAULT NULL
        SQL);
    }

    public function down(Schema $schema): void
    {
        // this down() migration is auto-generated, please modify it to your needs
        $this->addSql(<<<'SQL'
            CREATE SCHEMA public
        SQL);
        $this->addSql(<<<'SQL'
            ALTER TABLE cashbox_audit_log DROP CONSTRAINT FK_FE63E6AF61110C8F
        SQL);
        $this->addSql(<<<'SQL'
            ALTER TABLE cashbox_audit_log DROP CONSTRAINT FK_FE63E6AFA76ED395
        SQL);
        $this->addSql(<<<'SQL'
            DROP TABLE cashbox_audit_log
        SQL);
        $this->addSql(<<<'SQL'
            ALTER TABLE cash_movement DROP updated_at
        SQL);
    }
}
