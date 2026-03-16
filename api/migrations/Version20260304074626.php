<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Auto-generated Migration: Please modify to your needs!
 */
final class Version20260304074626 extends AbstractMigration
{
    public function getDescription(): string
    {
        return '';
    }

    public function up(Schema $schema): void
    {
        // this up() migration is auto-generated, please modify it to your needs
        $this->addSql(<<<'SQL'
            CREATE TABLE reservation_type (id SERIAL NOT NULL, name VARCHAR(100) NOT NULL, code VARCHAR(50) NOT NULL, color VARCHAR(20) NOT NULL, is_system BOOLEAN NOT NULL, sort_order INT NOT NULL, created_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL, updated_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL, PRIMARY KEY(id))
        SQL);
        $this->addSql(<<<'SQL'
            CREATE UNIQUE INDEX UNIQ_9AE79A4177153098 ON reservation_type (code)
        SQL);
        $this->addSql(<<<'SQL'
            ALTER TABLE reservation ADD reservation_type_id INT DEFAULT NULL
        SQL);
        $this->addSql(<<<'SQL'
            ALTER TABLE reservation ADD CONSTRAINT FK_42C84955A2D93716 FOREIGN KEY (reservation_type_id) REFERENCES reservation_type (id) NOT DEFERRABLE INITIALLY IMMEDIATE
        SQL);
        $this->addSql(<<<'SQL'
            CREATE INDEX IDX_42C84955A2D93716 ON reservation (reservation_type_id)
        SQL);

        // Seed default reservation types
        $this->addSql(<<<'SQL'
            INSERT INTO reservation_type (name, code, color, is_system, sort_order, created_at, updated_at)
            VALUES ('Standardní', 'standard', '#3b82f6', true, 0, NOW(), NOW())
        SQL);
        $this->addSql(<<<'SQL'
            INSERT INTO reservation_type (name, code, color, is_system, sort_order, created_at, updated_at)
            VALUES ('Voucher', 'voucher', '#f59e0b', true, 1, NOW(), NOW())
        SQL);

        // Set all existing reservations to "Standardní"
        $this->addSql(<<<'SQL'
            UPDATE reservation SET reservation_type_id = (SELECT id FROM reservation_type WHERE code = 'standard')
        SQL);
    }

    public function down(Schema $schema): void
    {
        // this down() migration is auto-generated, please modify it to your needs
        $this->addSql(<<<'SQL'
            CREATE SCHEMA public
        SQL);
        $this->addSql(<<<'SQL'
            ALTER TABLE reservation DROP CONSTRAINT FK_42C84955A2D93716
        SQL);
        $this->addSql(<<<'SQL'
            DROP TABLE reservation_type
        SQL);
        $this->addSql(<<<'SQL'
            DROP INDEX IDX_42C84955A2D93716
        SQL);
        $this->addSql(<<<'SQL'
            ALTER TABLE reservation DROP reservation_type_id
        SQL);
    }
}
