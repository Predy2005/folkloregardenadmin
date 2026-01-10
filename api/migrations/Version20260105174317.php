<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Auto-generated Migration: Please modify to your needs!
 */
final class Version20260105174317 extends AbstractMigration
{
    public function getDescription(): string
    {
        return '';
    }

    public function up(Schema $schema): void
    {
        // this up() migration is auto-generated, please modify it to your needs
        $this->addSql(<<<'SQL'
            ALTER TABLE event ADD is_external_coordinator BOOLEAN DEFAULT false NOT NULL
        SQL);
        $this->addSql(<<<'SQL'
            ALTER TABLE event ADD external_coordinator_name VARCHAR(255) DEFAULT NULL
        SQL);
        $this->addSql(<<<'SQL'
            ALTER TABLE event ADD external_coordinator_email VARCHAR(255) DEFAULT NULL
        SQL);
        $this->addSql(<<<'SQL'
            ALTER TABLE event ADD external_coordinator_phone VARCHAR(50) DEFAULT NULL
        SQL);
        $this->addSql(<<<'SQL'
            ALTER TABLE event ADD external_coordinator_note TEXT DEFAULT NULL
        SQL);
    }

    public function down(Schema $schema): void
    {
        // this down() migration is auto-generated, please modify it to your needs
        $this->addSql(<<<'SQL'
            CREATE SCHEMA public
        SQL);
        $this->addSql(<<<'SQL'
            ALTER TABLE event DROP is_external_coordinator
        SQL);
        $this->addSql(<<<'SQL'
            ALTER TABLE event DROP external_coordinator_name
        SQL);
        $this->addSql(<<<'SQL'
            ALTER TABLE event DROP external_coordinator_email
        SQL);
        $this->addSql(<<<'SQL'
            ALTER TABLE event DROP external_coordinator_phone
        SQL);
        $this->addSql(<<<'SQL'
            ALTER TABLE event DROP external_coordinator_note
        SQL);
    }
}
