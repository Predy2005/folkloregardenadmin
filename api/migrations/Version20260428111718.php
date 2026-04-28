<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Uvolňuje NOT NULL na `reservation.contact_email`. Email rezervace je nově
 * volitelný — kontakty importované z xlsx někdy email nemají a bez tohohle
 * by je nešlo aktualizovat.
 */
final class Version20260428111718 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Make reservation.contact_email nullable';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('ALTER TABLE reservation ALTER contact_email DROP NOT NULL');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('ALTER TABLE reservation ALTER contact_email SET NOT NULL');
    }
}
