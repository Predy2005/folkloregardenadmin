<?php

declare(strict_types=1);

/**
 * Produkční migrace — Partner Swagger UI HTTP Basic Auth credentials.
 *
 * Zrcadlí Doctrine migraci Version20260516100000. Přidává tři sloupce
 * na `partner` pro autentizaci do `/api/doc/partner` Swagger UI:
 *
 *   - swagger_username                   VARCHAR(64)  NULL
 *   - swagger_password_hash              VARCHAR(255) NULL  (bcrypt hash)
 *   - swagger_credentials_generated_at   TIMESTAMP    NULL
 *
 * Plus partial unique index na `swagger_username IS NOT NULL` — username
 * musí být unikátní napříč partnery (Basic Auth lookup), ale partneři bez
 * credentials NULL nekolidují.
 *
 * Plaintext hesla se NIKDY neukládá — `password_hash(..., PASSWORD_BCRYPT)` v PHP.
 *
 * IDEMPOTENTNÍ — kontrola přes information_schema/pg_indexes.
 * DATA-SAFE — pouze ADD COLUMN s defaultem NULL. Žádné existující řádky se nemění.
 */

return function (ProductionMigrationRunner $runner) {
    $runner->migrate(
        'DoctrineMigrations\\Version20260516100000',
        'Partner Swagger UI Basic Auth — swagger_username/password_hash/generated_at on partner',
        function (PDO $db, ProductionMigrationRunner $r) {
            $db->exec(<<<'SQL'
                DO $$
                BEGIN
                    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                                    WHERE table_name = 'partner' AND column_name = 'swagger_username') THEN
                        ALTER TABLE partner ADD COLUMN swagger_username VARCHAR(64) DEFAULT NULL;
                    END IF;

                    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                                    WHERE table_name = 'partner' AND column_name = 'swagger_password_hash') THEN
                        ALTER TABLE partner ADD COLUMN swagger_password_hash VARCHAR(255) DEFAULT NULL;
                    END IF;

                    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                                    WHERE table_name = 'partner' AND column_name = 'swagger_credentials_generated_at') THEN
                        ALTER TABLE partner ADD COLUMN swagger_credentials_generated_at TIMESTAMP(0) WITHOUT TIME ZONE DEFAULT NULL;
                    END IF;
                END $$;
            SQL);
            $r->log('  • partner: swagger_username/password_hash/generated_at sloupce OK');

            $db->exec(<<<'SQL'
                DO $$
                BEGIN
                    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'uniq_partner_swagger_username') THEN
                        CREATE UNIQUE INDEX uniq_partner_swagger_username
                            ON partner (swagger_username)
                            WHERE swagger_username IS NOT NULL;
                    END IF;
                END $$;
            SQL);
            $r->log('  • partner: unique index uniq_partner_swagger_username OK');

            $count = (int) $db->query("SELECT COUNT(*) FROM partner")->fetchColumn();
            $r->log("  • celkem partner řádků nedotčeno: {$count}");
        }
    );
};
