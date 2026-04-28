<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * event_staff_assignment.decline_reason — důvod odhlášení personálu
 * z akce přes mobilní app (POST /api/mobile/me/events/{id}/respond
 * s response="DECLINED", reason="...").
 */
final class Version20260427120000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Add event_staff_assignment.decline_reason for mobile decline flow.';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('ALTER TABLE event_staff_assignment ADD COLUMN decline_reason TEXT DEFAULT NULL');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('ALTER TABLE event_staff_assignment DROP COLUMN decline_reason');
    }
}
