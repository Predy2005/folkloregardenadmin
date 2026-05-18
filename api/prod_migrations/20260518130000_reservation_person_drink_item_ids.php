<?php

declare(strict_types=1);

/**
 * Produkční migrace — ReservationPerson.drink_item_ids JSON sloupec.
 *
 * Zrcadlí Doctrine migraci Version20260518130000. Umožňuje hostovi mít více
 * vybraných nápojů (welcome drink combo: víno + medovina + sodovka apod.).
 * `drink_item_id` (FK) zůstává pro zpětnou kompatibilitu — drží první ID z arraye.
 *
 * IDEMPOTENTNÍ — information_schema.columns check.
 * DATA-SAFE — defaultní NULL, existující řádky nedotčené (legacy single drink
 * stále funguje přes drink_item_id).
 */

return function (ProductionMigrationRunner $runner) {
    $runner->migrate(
        'DoctrineMigrations\\Version20260518130000',
        'ReservationPerson — drink_item_ids JSON column',
        function (PDO $db, ProductionMigrationRunner $r) {
            $db->exec(<<<'SQL'
                DO $$
                BEGIN
                    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                                    WHERE table_name = 'reservation_person' AND column_name = 'drink_item_ids') THEN
                        ALTER TABLE reservation_person ADD COLUMN drink_item_ids JSON DEFAULT NULL;
                    END IF;
                END $$;
            SQL);
            $r->log('  • reservation_person: drink_item_ids JSON sloupec OK');

            $count = (int) $db->query("SELECT COUNT(*) FROM reservation_person")->fetchColumn();
            $r->log("  • celkem reservation_person řádků nedotčeno: {$count}");
        }
    );
};
