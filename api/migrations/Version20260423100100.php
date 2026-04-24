<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Mobile auth: refresh token storage for mobile-app token rotation.
 */
final class Version20260423100100 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Mobile auth: refresh_token table (plaintext opaque tokens with unique index, per-user, per-device binding).';
    }

    public function up(Schema $schema): void
    {
        $this->addSql(<<<'SQL'
            CREATE TABLE refresh_token (
                id           SERIAL PRIMARY KEY,
                user_id      INT          NOT NULL,
                token        VARCHAR(128) NOT NULL,
                device_id    VARCHAR(255) DEFAULT NULL,
                expires_at   TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL,
                revoked_at   TIMESTAMP(0) WITHOUT TIME ZONE DEFAULT NULL,
                created_at   TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL,
                last_used_at TIMESTAMP(0) WITHOUT TIME ZONE DEFAULT NULL
            )
        SQL);
        $this->addSql('ALTER TABLE refresh_token ADD CONSTRAINT fk_refresh_token_user FOREIGN KEY (user_id) REFERENCES "user" (id) ON DELETE CASCADE');
        $this->addSql('CREATE UNIQUE INDEX uniq_refresh_token_token ON refresh_token (token)');
        $this->addSql('CREATE INDEX idx_refresh_token_user ON refresh_token (user_id)');
        $this->addSql('CREATE INDEX idx_refresh_token_device ON refresh_token (device_id)');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('DROP TABLE IF EXISTS refresh_token');
    }
}
