<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Auto-generated Migration: Please modify to your needs!
 */
final class Version20260112104521 extends AbstractMigration
{
    public function getDescription(): string
    {
        return '';
    }

    public function up(Schema $schema): void
    {
        // this up() migration is auto-generated, please modify it to your needs
        $this->addSql(<<<'SQL'
            CREATE TABLE reservation_transfer (id SERIAL NOT NULL, reservation_id INT NOT NULL, person_count INT NOT NULL, address VARCHAR(500) NOT NULL, PRIMARY KEY(id))
        SQL);
        $this->addSql(<<<'SQL'
            CREATE INDEX IDX_DD8141D4B83297E7 ON reservation_transfer (reservation_id)
        SQL);
        $this->addSql(<<<'SQL'
            ALTER TABLE reservation_transfer ADD CONSTRAINT FK_DD8141D4B83297E7 FOREIGN KEY (reservation_id) REFERENCES reservation (id) ON DELETE CASCADE NOT DEFERRABLE INITIALLY IMMEDIATE
        SQL);
    }

    public function down(Schema $schema): void
    {
        // this down() migration is auto-generated, please modify it to your needs
        $this->addSql(<<<'SQL'
            CREATE SCHEMA public
        SQL);
        $this->addSql(<<<'SQL'
            ALTER TABLE reservation_transfer DROP CONSTRAINT FK_DD8141D4B83297E7
        SQL);
        $this->addSql(<<<'SQL'
            DROP TABLE reservation_transfer
        SQL);
    }
}
