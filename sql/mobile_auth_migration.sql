-- ============================================================================
-- Mobile Auth — migrační SQL skript pro produkční databázi
-- ============================================================================
-- Odpovídá Doctrine migraci:
--   Version20260423100000 — user.mobile_pin/pin_device_id/pin_enabled,
--                           staff_member.user_id, transport_driver.user_id,
--                           user_device tabulka, event_transport.execution_status.
-- A seedu `app:seed-permissions`:
--   - 7 nových mobilních permission klíčů
--   - 3 nové systémové role (STAFF_WAITER, STAFF_COOK, STAFF_DRIVER)
--   - Napojení role → permission v role_permission
--
-- Skript je IDEMPOTENTNÍ — schéma přes DO-bloky (ADD COLUMN je spuštěno jen
-- pokud sloupec neexistuje), data přes `WHERE NOT EXISTS`. Může se spustit
-- opakovaně bez chyby.
--
-- Před spuštěním: ZÁLOHA PRODUKCE!  pg_dump folkloregardencz > backup.sql
-- Spuštění:       psql -U folkloregardenadmin -d folkloregardencz -f sql/mobile_auth_migration.sql
--                 (nebo v Admineru vložit obsah a Spustit)
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- 1) "user" — mobilní PIN login (idempotentní přes DO-blok)
-- ----------------------------------------------------------------------------
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                    WHERE table_name = 'user' AND column_name = 'mobile_pin') THEN
        ALTER TABLE "user" ADD COLUMN mobile_pin VARCHAR(255) DEFAULT NULL;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                    WHERE table_name = 'user' AND column_name = 'pin_device_id') THEN
        ALTER TABLE "user" ADD COLUMN pin_device_id VARCHAR(255) DEFAULT NULL;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                    WHERE table_name = 'user' AND column_name = 'pin_enabled') THEN
        ALTER TABLE "user" ADD COLUMN pin_enabled BOOLEAN NOT NULL DEFAULT FALSE;
    END IF;
END $$;

-- ----------------------------------------------------------------------------
-- 2) staff_member — vazba na "user" (nullable, unikátní, ON DELETE SET NULL)
-- ----------------------------------------------------------------------------
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                    WHERE table_name = 'staff_member' AND column_name = 'user_id') THEN
        ALTER TABLE staff_member ADD COLUMN user_id INT DEFAULT NULL;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_staff_member_user') THEN
        ALTER TABLE staff_member
            ADD CONSTRAINT fk_staff_member_user
            FOREIGN KEY (user_id) REFERENCES "user" (id) ON DELETE SET NULL;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'uniq_staff_member_user') THEN
        CREATE UNIQUE INDEX uniq_staff_member_user ON staff_member (user_id);
    END IF;
END $$;

-- ----------------------------------------------------------------------------
-- 3) transport_driver — vazba na "user" (nullable, unikátní, ON DELETE SET NULL)
-- ----------------------------------------------------------------------------
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                    WHERE table_name = 'transport_driver' AND column_name = 'user_id') THEN
        ALTER TABLE transport_driver ADD COLUMN user_id INT DEFAULT NULL;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_transport_driver_user') THEN
        ALTER TABLE transport_driver
            ADD CONSTRAINT fk_transport_driver_user
            FOREIGN KEY (user_id) REFERENCES "user" (id) ON DELETE SET NULL;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'uniq_transport_driver_user') THEN
        CREATE UNIQUE INDEX uniq_transport_driver_user ON transport_driver (user_id);
    END IF;
END $$;

-- ----------------------------------------------------------------------------
-- 4) user_device — registr zařízení pro FCM push notifikace
-- ----------------------------------------------------------------------------
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_device') THEN
        CREATE TABLE user_device (
            id           SERIAL PRIMARY KEY,
            user_id      INT          NOT NULL,
            fcm_token    VARCHAR(500) NOT NULL,
            platform     VARCHAR(20)  NOT NULL,
            device_id    VARCHAR(255) DEFAULT NULL,
            device_name  VARCHAR(255) DEFAULT NULL,
            created_at   TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL,
            last_seen_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL
        );
        ALTER TABLE user_device
            ADD CONSTRAINT fk_user_device_user
            FOREIGN KEY (user_id) REFERENCES "user" (id) ON DELETE CASCADE;
        CREATE UNIQUE INDEX uniq_user_device_token ON user_device (fcm_token);
        CREATE        INDEX idx_user_device_user  ON user_device (user_id);
    END IF;
END $$;

-- ----------------------------------------------------------------------------
-- 5) event_transport — stav realizace jízdy (IN_PROGRESS / DONE)
-- ----------------------------------------------------------------------------
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                    WHERE table_name = 'event_transport' AND column_name = 'execution_status') THEN
        ALTER TABLE event_transport ADD COLUMN execution_status VARCHAR(30) DEFAULT NULL;
    END IF;
END $$;

-- ----------------------------------------------------------------------------
-- 6) SEED mobilních permissions (module.action, idempotentní)
-- ----------------------------------------------------------------------------
INSERT INTO permission (module, action, description)
SELECT 'mobile_self', 'read', 'Mobilní aplikace – profil - Zobrazení'
WHERE NOT EXISTS (SELECT 1 FROM permission WHERE module='mobile_self' AND action='read');

INSERT INTO permission (module, action, description)
SELECT 'mobile_events', 'read', 'Mobilní aplikace – přiřazené eventy - Zobrazení'
WHERE NOT EXISTS (SELECT 1 FROM permission WHERE module='mobile_events' AND action='read');

INSERT INTO permission (module, action, description)
SELECT 'mobile_events', 'tables', 'Mobilní aplikace – přiřazené eventy - Stoly a rozsazení'
WHERE NOT EXISTS (SELECT 1 FROM permission WHERE module='mobile_events' AND action='tables');

INSERT INTO permission (module, action, description)
SELECT 'mobile_events', 'menu', 'Mobilní aplikace – přiřazené eventy - Menu a porce'
WHERE NOT EXISTS (SELECT 1 FROM permission WHERE module='mobile_events' AND action='menu');

INSERT INTO permission (module, action, description)
SELECT 'mobile_attendance', 'record', 'Mobilní aplikace – docházka personálu - Záznam'
WHERE NOT EXISTS (SELECT 1 FROM permission WHERE module='mobile_attendance' AND action='record');

INSERT INTO permission (module, action, description)
SELECT 'mobile_transport', 'read', 'Mobilní aplikace – transport řidiče - Zobrazení'
WHERE NOT EXISTS (SELECT 1 FROM permission WHERE module='mobile_transport' AND action='read');

INSERT INTO permission (module, action, description)
SELECT 'mobile_transport', 'update', 'Mobilní aplikace – transport řidiče - Úprava'
WHERE NOT EXISTS (SELECT 1 FROM permission WHERE module='mobile_transport' AND action='update');

-- ----------------------------------------------------------------------------
-- 7) SEED mobilních rolí
-- ----------------------------------------------------------------------------
INSERT INTO role (name, display_name, description, is_system, priority, created_at, updated_at)
SELECT 'STAFF_WAITER', 'Číšník (mobil)',
       'Mobilní role – číšník vidí přiřazené eventy včetně stolů a rozsazení',
       TRUE, 20, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM role WHERE name = 'STAFF_WAITER');

INSERT INTO role (name, display_name, description, is_system, priority, created_at, updated_at)
SELECT 'STAFF_COOK', 'Kuchař (mobil)',
       'Mobilní role – kuchař vidí přiřazené eventy a menu/porce',
       TRUE, 20, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM role WHERE name = 'STAFF_COOK');

INSERT INTO role (name, display_name, description, is_system, priority, created_at, updated_at)
SELECT 'STAFF_DRIVER', 'Řidič (mobil)',
       'Mobilní role – řidič vidí přiřazené transporty a aktualizuje jejich stav',
       TRUE, 20, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM role WHERE name = 'STAFF_DRIVER');

-- ----------------------------------------------------------------------------
-- 8) SEED role_permission — pro čistou re-aplikaci nejdřív smaž existující
--    vazby těchto 3 nových rolí a vlož je znovu podle aktuální konfigurace.
-- ----------------------------------------------------------------------------
DELETE FROM role_permission
 WHERE role_id IN (SELECT id FROM role WHERE name IN ('STAFF_WAITER','STAFF_COOK','STAFF_DRIVER'));

-- STAFF_WAITER → mobile_self.read, mobile_events.read, mobile_events.tables, mobile_attendance.record
INSERT INTO role_permission (role_id, permission_id)
SELECT r.id, p.id
  FROM role r
  CROSS JOIN permission p
 WHERE r.name = 'STAFF_WAITER'
   AND ( (p.module='mobile_self'      AND p.action='read')
      OR (p.module='mobile_events'    AND p.action='read')
      OR (p.module='mobile_events'    AND p.action='tables')
      OR (p.module='mobile_attendance' AND p.action='record') );

-- STAFF_COOK → mobile_self.read, mobile_events.read, mobile_events.menu, mobile_attendance.record
INSERT INTO role_permission (role_id, permission_id)
SELECT r.id, p.id
  FROM role r
  CROSS JOIN permission p
 WHERE r.name = 'STAFF_COOK'
   AND ( (p.module='mobile_self'      AND p.action='read')
      OR (p.module='mobile_events'    AND p.action='read')
      OR (p.module='mobile_events'    AND p.action='menu')
      OR (p.module='mobile_attendance' AND p.action='record') );

-- STAFF_DRIVER → mobile_self.read, mobile_transport.read, mobile_transport.update, mobile_attendance.record
INSERT INTO role_permission (role_id, permission_id)
SELECT r.id, p.id
  FROM role r
  CROSS JOIN permission p
 WHERE r.name = 'STAFF_DRIVER'
   AND ( (p.module='mobile_self'       AND p.action='read')
      OR (p.module='mobile_transport'  AND p.action='read')
      OR (p.module='mobile_transport'  AND p.action='update')
      OR (p.module='mobile_attendance' AND p.action='record') );

-- ----------------------------------------------------------------------------
-- 9) Zápis migrace do doctrine_migration_versions (aby Doctrine znovu nespustil).
-- ----------------------------------------------------------------------------
DELETE FROM doctrine_migration_versions
 WHERE version = 'DoctrineMigrations\Version20260423100000';

INSERT INTO doctrine_migration_versions (version, executed_at, execution_time)
VALUES ('DoctrineMigrations\Version20260423100000', NOW(), 0);

COMMIT;

-- ============================================================================
-- Ověření (spusť samostatně po migraci):
--
-- Schéma:
--   \d "user"                                 -- sloupce mobile_pin, pin_device_id, pin_enabled
--   \d staff_member                           -- sloupec user_id + FK
--   \d transport_driver                       -- sloupec user_id + FK
--   \d user_device                            -- nová tabulka
--   \d event_transport                        -- sloupec execution_status
--
-- Seed:
--   SELECT module, action FROM permission WHERE module LIKE 'mobile_%' ORDER BY 1,2;
--     -- 7 řádků: mobile_attendance.record, mobile_events.menu/read/tables,
--     --         mobile_self.read, mobile_transport.read/update
--
--   SELECT name, display_name, priority FROM role WHERE name LIKE 'STAFF_%' ORDER BY 1;
--     -- 3 řádky: STAFF_COOK, STAFF_DRIVER, STAFF_WAITER
--
--   SELECT r.name AS role_name, p.module || '.' || p.action AS perm
--     FROM role_permission rp
--     JOIN role r       ON r.id = rp.role_id
--     JOIN permission p ON p.id = rp.permission_id
--    WHERE r.name IN ('STAFF_WAITER','STAFF_COOK','STAFF_DRIVER')
--    ORDER BY 1, 2;
--     -- 12 řádků (4 permissions × 3 role)
--
--   SELECT version FROM doctrine_migration_versions
--    WHERE version = 'DoctrineMigrations\Version20260423100000';
--     -- 1 řádek
-- ============================================================================

-- ============================================================================
-- Rollback (SPOUŠTĚT JEN VĚDOMĚ — ztratíte data v user_device a reference na User):
--   BEGIN;
--     DELETE FROM doctrine_migration_versions
--       WHERE version = 'DoctrineMigrations\Version20260423100000';
--     DELETE FROM role_permission
--       WHERE role_id IN (SELECT id FROM role WHERE name IN ('STAFF_WAITER','STAFF_COOK','STAFF_DRIVER'));
--     DELETE FROM role WHERE name IN ('STAFF_WAITER','STAFF_COOK','STAFF_DRIVER');
--     DELETE FROM permission WHERE module LIKE 'mobile_%';
--
--     ALTER TABLE event_transport DROP COLUMN IF EXISTS execution_status;
--     DROP TABLE IF EXISTS user_device;
--     ALTER TABLE transport_driver DROP CONSTRAINT IF EXISTS fk_transport_driver_user;
--     DROP INDEX  IF EXISTS uniq_transport_driver_user;
--     ALTER TABLE transport_driver DROP COLUMN IF EXISTS user_id;
--     ALTER TABLE staff_member DROP CONSTRAINT IF EXISTS fk_staff_member_user;
--     DROP INDEX  IF EXISTS uniq_staff_member_user;
--     ALTER TABLE staff_member DROP COLUMN IF EXISTS user_id;
--     ALTER TABLE "user" DROP COLUMN IF EXISTS pin_enabled;
--     ALTER TABLE "user" DROP COLUMN IF EXISTS pin_device_id;
--     ALTER TABLE "user" DROP COLUMN IF EXISTS mobile_pin;
--   COMMIT;
-- ============================================================================
