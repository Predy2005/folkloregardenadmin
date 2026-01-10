<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Auto-generated Migration: Please modify to your needs!
 */
final class Version20260109143658 extends AbstractMigration
{
    public function getDescription(): string
    {
        return '';
    }

    public function up(Schema $schema): void
    {
        // Invoice fields
        $this->addSql(<<<'SQL'
            ALTER TABLE invoice ADD invoice_type VARCHAR(20) NOT NULL DEFAULT 'FINAL'
        SQL);
        $this->addSql(<<<'SQL'
            ALTER TABLE invoice ADD deposit_percent NUMERIC(5, 2) DEFAULT NULL
        SQL);
        $this->addSql(<<<'SQL'
            ALTER TABLE invoice ADD paid_at DATE DEFAULT NULL
        SQL);

        // Reservation payment fields
        $this->addSql(<<<'SQL'
            ALTER TABLE reservation ADD source VARCHAR(20) DEFAULT 'WEB'
        SQL);
        $this->addSql(<<<'SQL'
            ALTER TABLE reservation ADD payment_method VARCHAR(50) DEFAULT NULL
        SQL);
        $this->addSql(<<<'SQL'
            ALTER TABLE reservation ADD payment_status VARCHAR(20) DEFAULT 'UNPAID'
        SQL);
        $this->addSql(<<<'SQL'
            ALTER TABLE reservation ADD deposit_percent NUMERIC(5, 2) DEFAULT '25.00'
        SQL);
        $this->addSql(<<<'SQL'
            ALTER TABLE reservation ADD deposit_amount NUMERIC(12, 2) DEFAULT NULL
        SQL);
        $this->addSql(<<<'SQL'
            ALTER TABLE reservation ADD total_price NUMERIC(12, 2) DEFAULT NULL
        SQL);
        $this->addSql(<<<'SQL'
            ALTER TABLE reservation ADD paid_amount NUMERIC(12, 2) DEFAULT '0.00'
        SQL);
        $this->addSql(<<<'SQL'
            ALTER TABLE reservation ADD payment_note TEXT DEFAULT NULL
        SQL);

        // Update existing reservations - detect source and payment status from existing data
        $this->addSql(<<<'SQL'
            UPDATE reservation SET source = 'WEB' WHERE source IS NULL
        SQL);
        $this->addSql(<<<'SQL'
            UPDATE reservation SET payment_status =
                CASE
                    WHEN status = 'PAID' THEN 'PAID'
                    WHEN status = 'WAITING_PAYMENT' THEN 'UNPAID'
                    ELSE 'UNPAID'
                END
            WHERE payment_status IS NULL
        SQL);
        $this->addSql(<<<'SQL'
            UPDATE reservation SET payment_method = 'ONLINE'
            WHERE payment_method IS NULL AND EXISTS (
                SELECT 1 FROM payment WHERE payment.reservation_id = reservation.id
            )
        SQL);
    }

    public function down(Schema $schema): void
    {
        // this down() migration is auto-generated, please modify it to your needs
        $this->addSql(<<<'SQL'
            CREATE SCHEMA public
        SQL);
        $this->addSql(<<<'SQL'
            ALTER TABLE reservation DROP source
        SQL);
        $this->addSql(<<<'SQL'
            ALTER TABLE reservation DROP payment_method
        SQL);
        $this->addSql(<<<'SQL'
            ALTER TABLE reservation DROP payment_status
        SQL);
        $this->addSql(<<<'SQL'
            ALTER TABLE reservation DROP deposit_percent
        SQL);
        $this->addSql(<<<'SQL'
            ALTER TABLE reservation DROP deposit_amount
        SQL);
        $this->addSql(<<<'SQL'
            ALTER TABLE reservation DROP total_price
        SQL);
        $this->addSql(<<<'SQL'
            ALTER TABLE reservation DROP paid_amount
        SQL);
        $this->addSql(<<<'SQL'
            ALTER TABLE reservation DROP payment_note
        SQL);
        $this->addSql(<<<'SQL'
            ALTER TABLE invoice DROP invoice_type
        SQL);
        $this->addSql(<<<'SQL'
            ALTER TABLE invoice DROP deposit_percent
        SQL);
        $this->addSql(<<<'SQL'
            ALTER TABLE invoice DROP paid_at
        SQL);
    }
}
