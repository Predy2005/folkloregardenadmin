<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Vytváří `partner_contact` — kontaktní osoby u partnera (CK má víc lidí,
 * kteří řeší různé skupiny). FK na partner s ON DELETE CASCADE.
 */
final class Version20260428120554 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Add partner_contact table';
    }

    public function up(Schema $schema): void
    {
        $this->addSql(<<<'SQL'
            CREATE TABLE partner_contact (
                id SERIAL NOT NULL,
                partner_id INT NOT NULL,
                first_name VARCHAR(100) NOT NULL,
                last_name VARCHAR(100) DEFAULT NULL,
                email VARCHAR(255) DEFAULT NULL,
                phone VARCHAR(50) DEFAULT NULL,
                notes TEXT DEFAULT NULL,
                display_order INT DEFAULT 0 NOT NULL,
                created_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL,
                updated_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL,
                PRIMARY KEY(id)
            )
        SQL);
        $this->addSql('CREATE INDEX IDX_partner_contact_partner ON partner_contact (partner_id)');
        $this->addSql(<<<'SQL'
            ALTER TABLE partner_contact
                ADD CONSTRAINT FK_partner_contact_partner
                FOREIGN KEY (partner_id) REFERENCES partner (id)
                ON DELETE CASCADE NOT DEFERRABLE INITIALLY IMMEDIATE
        SQL);
    }

    public function down(Schema $schema): void
    {
        $this->addSql('DROP TABLE partner_contact');
    }
}
