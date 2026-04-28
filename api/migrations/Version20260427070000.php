<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * user.mobile_pin_lookup_hash + unique index — globální unikátnost PINu.
 *
 * Mobilní login přes /api/mobile/auth/pin-login bez identifieru hledá uživatele
 * podle deterministického HMAC-SHA256 hashe PINu. Bcrypt v `mobile_pin` má
 * per-user salt a hledat podle něj nelze, proto druhý sloupec.
 */
final class Version20260427070000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Add user.mobile_pin_lookup_hash with unique index for global PIN uniqueness (PIN-only mobile login).';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('ALTER TABLE "user" ADD COLUMN mobile_pin_lookup_hash VARCHAR(64) DEFAULT NULL');
        $this->addSql('CREATE UNIQUE INDEX uniq_user_mobile_pin_lookup_hash ON "user" (mobile_pin_lookup_hash)');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('DROP INDEX uniq_user_mobile_pin_lookup_hash');
        $this->addSql('ALTER TABLE "user" DROP COLUMN mobile_pin_lookup_hash');
    }
}
