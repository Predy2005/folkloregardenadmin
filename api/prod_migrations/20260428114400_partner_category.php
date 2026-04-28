<?php

declare(strict_types=1);

/**
 * partner_category — mirror Version20260428114400.
 *
 * Vytváří číselník kategorií partnerů, seeduje 4 default položky
 * (TRAVEL_AGENCY, GUIDE, HOTEL, OTHER) a přemapuje existující partnery
 * s `partner_type IN ('RECEPTION', 'DISTRIBUTOR')` na 'OTHER'.
 *
 * IDEMPOTENTNÍ. Tabulka i seed se kontrolují před spuštěním.
 */

return function (ProductionMigrationRunner $runner) {
    $runner->migrate(
        'DoctrineMigrations\\Version20260428114400',
        'Add partner_category table and seed 4 default categories',
        function (PDO $db, ProductionMigrationRunner $r) {
            // 1) Tabulka
            $db->exec(<<<'SQL'
                CREATE TABLE IF NOT EXISTS partner_category (
                    id SERIAL PRIMARY KEY,
                    name VARCHAR(100) NOT NULL,
                    slug VARCHAR(50) NOT NULL,
                    display_order INT NOT NULL DEFAULT 0,
                    is_active BOOLEAN NOT NULL DEFAULT true,
                    created_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL
                )
            SQL);

            $db->exec('CREATE UNIQUE INDEX IF NOT EXISTS UNIQ_partner_category_slug ON partner_category (slug)');
            $r->log('  • partner_category table OK');

            // 2) Seed (jen pokud daný slug ještě neexistuje)
            $defaults = [
                ['Cestovní kancelář', 'TRAVEL_AGENCY', 10],
                ['Průvodce',          'GUIDE',         20],
                ['Hotel',             'HOTEL',         30],
                ['Ostatní',           'OTHER',         40],
            ];
            $insert = $db->prepare(<<<'SQL'
                INSERT INTO partner_category (name, slug, display_order, is_active, created_at)
                SELECT :name, :slug, :ord, true, NOW()
                WHERE NOT EXISTS (SELECT 1 FROM partner_category WHERE slug = :slug)
            SQL);
            foreach ($defaults as [$name, $slug, $ord]) {
                $insert->execute(['name' => $name, 'slug' => $slug, 'ord' => $ord]);
            }
            $r->log('  • partner_category seed OK (4 default kategorie)');

            // 3) Re-map starých enum hodnot na OTHER
            $db->exec("UPDATE partner SET partner_type = 'OTHER' WHERE partner_type IN ('RECEPTION', 'DISTRIBUTOR')");
            $r->log('  • partner.partner_type RECEPTION/DISTRIBUTOR → OTHER OK');
        }
    );
};
