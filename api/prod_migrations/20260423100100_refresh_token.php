<?php

declare(strict_types=1);

/**
 * Produkční migrace — refresh_token tabulka pro mobilní auth rotaci.
 *
 * Zrcadlí Doctrine migraci Version20260423100100.
 * Závisí na předchozí 20260423100000_mobile_auth.php (kvůli vazbám User).
 *
 * IDEMPOTENTNÍ — vytváří pouze pokud neexistuje.
 * Data-safe: pouze přidává tabulku.
 */

return function (ProductionMigrationRunner $runner) {
    $runner->migrate(
        'DoctrineMigrations\\Version20260423100100',
        'refresh_token tabulka (opaque tokeny pro mobilní auth, rotace, device binding)',
        function (PDO $db, ProductionMigrationRunner $r) {
            $db->exec(<<<'SQL'
                DO $$
                BEGIN
                    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'refresh_token') THEN
                        CREATE TABLE refresh_token (
                            id           SERIAL PRIMARY KEY,
                            user_id      INT          NOT NULL,
                            token        VARCHAR(128) NOT NULL,
                            device_id    VARCHAR(255) DEFAULT NULL,
                            expires_at   TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL,
                            revoked_at   TIMESTAMP(0) WITHOUT TIME ZONE DEFAULT NULL,
                            created_at   TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL,
                            last_used_at TIMESTAMP(0) WITHOUT TIME ZONE DEFAULT NULL
                        );
                        ALTER TABLE refresh_token
                            ADD CONSTRAINT fk_refresh_token_user
                            FOREIGN KEY (user_id) REFERENCES "user" (id) ON DELETE CASCADE;
                        CREATE UNIQUE INDEX uniq_refresh_token_token  ON refresh_token (token);
                        CREATE        INDEX idx_refresh_token_user   ON refresh_token (user_id);
                        CREATE        INDEX idx_refresh_token_device ON refresh_token (device_id);
                    END IF;
                END $$;
            SQL);
            $r->log('  • refresh_token tabulka + indexy OK');
        }
    );
};
