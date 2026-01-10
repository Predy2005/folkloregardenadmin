<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Auto-generated Migration: Please modify to your needs!
 */
final class Version20251113113124 extends AbstractMigration
{
    public function getDescription(): string
    {
        return '';
    }

    public function up(Schema $schema): void
    {
        // this up() migration is auto-generated, please modify it to your needs
        $this->addSql(<<<'SQL'
            CREATE TABLE contact (id SERIAL NOT NULL, name VARCHAR(255) NOT NULL, email VARCHAR(255) DEFAULT NULL, phone VARCHAR(50) DEFAULT NULL, company VARCHAR(255) DEFAULT NULL, note TEXT DEFAULT NULL, source_reservation_id INT DEFAULT NULL, created_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL, updated_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL, PRIMARY KEY(id))
        SQL);
        $this->addSql(<<<'SQL'
            CREATE INDEX contact_email_idx ON contact (email)
        SQL);
        $this->addSql(<<<'SQL'
            CREATE INDEX contact_phone_idx ON contact (phone)
        SQL);
        $this->addSql(<<<'SQL'
            DROP INDEX idx_staff_attendance_date
        SQL);
        $this->addSql(<<<'SQL'
            DROP INDEX idx_staff_attendance_member
        SQL);
        $this->addSql(<<<'SQL'
            DROP INDEX idx_staff_member_active
        SQL);
        $this->addSql(<<<'SQL'
            DROP INDEX idx_staff_member_position
        SQL);
        $this->addSql(<<<'SQL'
            DROP INDEX idx_staff_member_role_role
        SQL);
        $this->addSql(<<<'SQL'
            DROP INDEX idx_staff_member_role_member
        SQL);
        $this->addSql(<<<'SQL'
            DROP INDEX idx_staff_reservation_assignment_reservation
        SQL);
        $this->addSql(<<<'SQL'
            DROP INDEX idx_staff_reservation_assignment_member
        SQL);
    }

    public function down(Schema $schema): void
    {
        // this down() migration is auto-generated, please modify it to your needs
        $this->addSql(<<<'SQL'
            CREATE SCHEMA public
        SQL);
        $this->addSql(<<<'SQL'
            DROP TABLE contact
        SQL);
        $this->addSql(<<<'SQL'
            CREATE INDEX idx_staff_member_role_role ON staff_member_role (staff_role_id)
        SQL);
        $this->addSql(<<<'SQL'
            CREATE INDEX idx_staff_member_role_member ON staff_member_role (staff_member_id)
        SQL);
        $this->addSql(<<<'SQL'
            CREATE INDEX idx_staff_member_active ON staff_member (is_active)
        SQL);
        $this->addSql(<<<'SQL'
            CREATE INDEX idx_staff_member_position ON staff_member (position)
        SQL);
        $this->addSql(<<<'SQL'
            CREATE INDEX idx_staff_attendance_date ON staff_attendance (attendance_date)
        SQL);
        $this->addSql(<<<'SQL'
            CREATE INDEX idx_staff_attendance_member ON staff_attendance (staff_member_id)
        SQL);
        $this->addSql(<<<'SQL'
            CREATE INDEX idx_staff_reservation_assignment_reservation ON staff_reservation_assignment (reservation_id)
        SQL);
        $this->addSql(<<<'SQL'
            CREATE INDEX idx_staff_reservation_assignment_member ON staff_reservation_assignment (staff_member_id)
        SQL);
    }
}
