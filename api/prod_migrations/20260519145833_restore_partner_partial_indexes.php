<?php

declare(strict_types=1);

/**
 * Produkční migrace — obnova partial unique indexů na partner tabulce.
 *
 * Zrcadlí Doctrine migraci Version20260519145833. Auto-generovaná migrace
 * Version20260518071658 (v `api/migrations/`, NIKDY se nedostala do
 * `prod_migrations/`) dropla indexy `uniq_partner_api_key_hash` a
 * `uniq_partner_swagger_username` při drift cleanup. Lokálně tedy chybí;
 * na produkci by měly stále existovat (Version20260515093000 a
 * Version20260516100000 prod migrace je vytvořily a Version20260518071658
 * tam nikdy neběžela).
 *
 * IDEMPOTENTNÍ — `pg_indexes` check. Na prod kde indexy stále jsou se
 * migrace nedělá nic. Na lokálu / dev kde byly dropnuté je znovu vytvoří.
 */

return function (ProductionMigrationRunner $runner) {
    $runner->migrate(
        'DoctrineMigrations\\Version20260519145833',
        'Recovery — partial unique indexes uniq_partner_api_key_hash + uniq_partner_swagger_username',
        function (PDO $db, ProductionMigrationRunner $r) {
            $db->exec(<<<'SQL'
                DO $$
                BEGIN
                    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'uniq_partner_api_key_hash') THEN
                        CREATE UNIQUE INDEX uniq_partner_api_key_hash
                            ON partner (api_key_hash)
                            WHERE api_key_hash IS NOT NULL;
                    END IF;

                    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'uniq_partner_swagger_username') THEN
                        CREATE UNIQUE INDEX uniq_partner_swagger_username
                            ON partner (swagger_username)
                            WHERE swagger_username IS NOT NULL;
                    END IF;
                END $$;
            SQL);
            $r->log('  • partner: partial unique indexes obnoveny / OK');
        }
    );
};
