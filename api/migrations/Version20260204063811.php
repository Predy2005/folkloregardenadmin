<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Auto-generated Migration: Please modify to your needs!
 */
final class Version20260204063811 extends AbstractMigration
{
    public function getDescription(): string
    {
        return '';
    }

    public function up(Schema $schema): void
    {
        // this up() migration is auto-generated, please modify it to your needs
        $this->addSql(<<<'SQL'
            CREATE TABLE event_staff_requirements (id SERIAL NOT NULL, event_id INT NOT NULL, category VARCHAR(50) NOT NULL, required_count INT NOT NULL, is_manual_override BOOLEAN DEFAULT false NOT NULL, staff_role_id INT DEFAULT NULL, created_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL, updated_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL, PRIMARY KEY(id))
        SQL);
        $this->addSql(<<<'SQL'
            CREATE INDEX IDX_CF0A6B5671F7E88B ON event_staff_requirements (event_id)
        SQL);
        $this->addSql(<<<'SQL'
            CREATE UNIQUE INDEX UNIQ_CF0A6B5671F7E88B64C19C1 ON event_staff_requirements (event_id, category)
        SQL);
        $this->addSql(<<<'SQL'
            ALTER TABLE event_staff_requirements ADD CONSTRAINT FK_CF0A6B5671F7E88B FOREIGN KEY (event_id) REFERENCES event (id) ON DELETE CASCADE NOT DEFERRABLE INITIALLY IMMEDIATE
        SQL);
    }

    public function down(Schema $schema): void
    {
        // this down() migration is auto-generated, please modify it to your needs
        $this->addSql(<<<'SQL'
            CREATE SCHEMA public
        SQL);
        $this->addSql(<<<'SQL'
            ALTER TABLE event_staff_requirements DROP CONSTRAINT FK_CF0A6B5671F7E88B
        SQL);
        $this->addSql(<<<'SQL'
            DROP TABLE event_staff_requirements
        SQL);
    }
}
