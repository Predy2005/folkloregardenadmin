<?php

declare(strict_types=1);

/**
 * Produkční migrace pro mobilní autentizaci – schéma + seed.
 *
 * Zrcadlí Doctrine migraci Version20260423100000 + seed mobilních permissions
 * a rolí (STAFF_WAITER / STAFF_COOK / STAFF_DRIVER).
 *
 * IDEMPOTENTNÍ — schéma přes DO-bloky s kontrolou information_schema/pg_constraint/pg_indexes,
 * data přes `INSERT ... WHERE NOT EXISTS`. Dá se spustit opakovaně bez chyby.
 *
 * Data-safe: pouze přidává sloupce/tabulky/řádky. Nic nemaže, žádná produkční
 * data nepřijdou k úhoně.
 */

return function (ProductionMigrationRunner $runner) {
    $runner->migrate(
        'DoctrineMigrations\\Version20260423100000',
        'Mobile auth schema (user.mobile_pin, staff_member.user_id, transport_driver.user_id, user_device, event_transport.execution_status) + 7 mobile permissions + 3 mobile roles (STAFF_WAITER/COOK/DRIVER)',
        function (PDO $db, ProductionMigrationRunner $r) {
            // ─── 1) "user" — mobilní PIN login ────────────────────────────
            $db->exec(<<<'SQL'
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
            SQL);
            $r->log('  • user: PIN pole (mobile_pin, pin_device_id, pin_enabled) OK');

            // ─── 2) staff_member.user_id ─────────────────────────────────
            $db->exec(<<<'SQL'
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
            SQL);
            $r->log('  • staff_member.user_id + FK + unique index OK');

            // ─── 3) transport_driver.user_id ─────────────────────────────
            $db->exec(<<<'SQL'
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
            SQL);
            $r->log('  • transport_driver.user_id + FK + unique index OK');

            // ─── 4) user_device ──────────────────────────────────────────
            $db->exec(<<<'SQL'
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
            SQL);
            $r->log('  • user_device tabulka OK');

            // ─── 5) event_transport.execution_status ─────────────────────
            $db->exec(<<<'SQL'
                DO $$
                BEGIN
                    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                                    WHERE table_name = 'event_transport' AND column_name = 'execution_status') THEN
                        ALTER TABLE event_transport ADD COLUMN execution_status VARCHAR(30) DEFAULT NULL;
                    END IF;
                END $$;
            SQL);
            $r->log('  • event_transport.execution_status OK');

            // ─── 6) Seed mobilních permissions (7 klíčů) ─────────────────
            $permissions = [
                ['mobile_self',       'read',   'Mobilní aplikace – profil - Zobrazení'],
                ['mobile_events',     'read',   'Mobilní aplikace – přiřazené eventy - Zobrazení'],
                ['mobile_events',     'tables', 'Mobilní aplikace – přiřazené eventy - Stoly a rozsazení'],
                ['mobile_events',     'menu',   'Mobilní aplikace – přiřazené eventy - Menu a porce'],
                ['mobile_attendance', 'record', 'Mobilní aplikace – docházka personálu - Záznam'],
                ['mobile_transport',  'read',   'Mobilní aplikace – transport řidiče - Zobrazení'],
                ['mobile_transport',  'update', 'Mobilní aplikace – transport řidiče - Úprava'],
            ];
            $insertPerm = $db->prepare(
                'INSERT INTO permission (module, action, description)
                 SELECT :m, :a, :d
                 WHERE NOT EXISTS (SELECT 1 FROM permission WHERE module = :m AND action = :a)'
            );
            foreach ($permissions as [$m, $a, $d]) {
                $insertPerm->execute(['m' => $m, 'a' => $a, 'd' => $d]);
            }
            $r->log('  • 7 mobilních permissions seed OK');

            // ─── 7) Seed mobilních rolí (3) ──────────────────────────────
            $roles = [
                ['STAFF_WAITER', 'Číšník (mobil)',  'Mobilní role – číšník vidí přiřazené eventy včetně stolů a rozsazení'],
                ['STAFF_COOK',   'Kuchař (mobil)',  'Mobilní role – kuchař vidí přiřazené eventy a menu/porce'],
                ['STAFF_DRIVER', 'Řidič (mobil)',   'Mobilní role – řidič vidí přiřazené transporty a aktualizuje jejich stav'],
            ];
            $insertRole = $db->prepare(
                'INSERT INTO role (name, display_name, description, is_system, priority, created_at, updated_at)
                 SELECT :n, :dn, :d, TRUE, 20, NOW(), NOW()
                 WHERE NOT EXISTS (SELECT 1 FROM role WHERE name = :n)'
            );
            foreach ($roles as [$n, $dn, $d]) {
                $insertRole->execute(['n' => $n, 'dn' => $dn, 'd' => $d]);
            }
            $r->log('  • 3 mobilní role (STAFF_WAITER/COOK/DRIVER) seed OK');

            // ─── 8) Role-permission vazby (pro čistou re-aplikaci) ───────
            $db->exec(<<<'SQL'
                DELETE FROM role_permission
                 WHERE role_id IN (SELECT id FROM role WHERE name IN ('STAFF_WAITER','STAFF_COOK','STAFF_DRIVER'))
            SQL);

            $linkRP = $db->prepare(
                'INSERT INTO role_permission (role_id, permission_id)
                 SELECT r.id, p.id FROM role r
                 CROSS JOIN permission p
                 WHERE r.name = :role
                   AND p.module = :module AND p.action = :action'
            );
            $mappings = [
                ['STAFF_WAITER', 'mobile_self',       'read'],
                ['STAFF_WAITER', 'mobile_events',     'read'],
                ['STAFF_WAITER', 'mobile_events',     'tables'],
                ['STAFF_WAITER', 'mobile_attendance', 'record'],

                ['STAFF_COOK',   'mobile_self',       'read'],
                ['STAFF_COOK',   'mobile_events',     'read'],
                ['STAFF_COOK',   'mobile_events',     'menu'],
                ['STAFF_COOK',   'mobile_attendance', 'record'],

                ['STAFF_DRIVER', 'mobile_self',       'read'],
                ['STAFF_DRIVER', 'mobile_transport',  'read'],
                ['STAFF_DRIVER', 'mobile_transport',  'update'],
                ['STAFF_DRIVER', 'mobile_attendance', 'record'],
            ];
            foreach ($mappings as [$role, $module, $action]) {
                $linkRP->execute(['role' => $role, 'module' => $module, 'action' => $action]);
            }
            $r->log('  • 12 role_permission vazeb OK');
        }
    );
};
