-- ============================================================================
-- Mobile Auth — refresh tokeny (produkční SQL)
-- ============================================================================
-- Odpovídá Doctrine migraci:
--   Version20260423100100 — refresh_token tabulka pro mobilní auth rotaci.
--
-- Skript je IDEMPOTENTNÍ — tabulka a indexy se vytvoří jen pokud neexistují.
--
-- Před spuštěním: ZÁLOHA PRODUKCE!  pg_dump folkloregardencz > backup.sql
-- Spuštění:       psql -U folkloregardenadmin -d folkloregardencz -f sql/mobile_auth_tokens_migration.sql
--                 (nebo v Admineru vložit obsah a Spustit)
--
-- Závislost: sql/mobile_auth_migration.sql (kvůli FK na "user").
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- 1) refresh_token — uložiště pro opaque refresh tokeny s rotací
-- ----------------------------------------------------------------------------
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

-- ----------------------------------------------------------------------------
-- 2) Zápis migrace do doctrine_migration_versions
-- ----------------------------------------------------------------------------
DELETE FROM doctrine_migration_versions
 WHERE version = 'DoctrineMigrations\Version20260423100100';

INSERT INTO doctrine_migration_versions (version, executed_at, execution_time)
VALUES ('DoctrineMigrations\Version20260423100100', NOW(), 0);

COMMIT;

-- ============================================================================
-- Ověření:
--   \d refresh_token
--   SELECT version FROM doctrine_migration_versions
--    WHERE version = 'DoctrineMigrations\Version20260423100100';    -- 1 řádek
-- ============================================================================

-- ============================================================================
-- Cron hygiena (nepovinné — servis čistí i sám při startu, ale doporučeno):
--   DELETE FROM refresh_token
--    WHERE expires_at < NOW() - INTERVAL '30 days'
--       OR revoked_at < NOW() - INTERVAL '30 days';
-- ============================================================================

-- ============================================================================
-- Rollback:
--   BEGIN;
--     DELETE FROM doctrine_migration_versions
--       WHERE version = 'DoctrineMigrations\Version20260423100100';
--     DROP TABLE IF EXISTS refresh_token;
--   COMMIT;
-- ============================================================================
