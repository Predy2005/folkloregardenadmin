<?php

declare(strict_types=1);

/**
 * Produkční migrace — StaffingFormula stupňovité pásmo (tiers).
 *
 * Zrcadlí Doctrine migraci Version20260518113035. Přidává `tiers` JSON
 * sloupec na `staffing_formulas` — pásmový výpočet potřebného personálu
 * podle počtu hostů místo lineárního `ratio` (1:N).
 *
 * Formát uložených tiers: list of `{minGuests, maxGuests, staffCount}` kde
 * `maxGuests = null` = "a více" (otevřený horní okraj). Když je sloupec NULL
 * nebo `[]`, výpočet padá na původní `ratio` chování (zpětná kompatibilita).
 *
 * IDEMPOTENTNÍ — `information_schema.columns` check.
 * DATA-SAFE — pouze ADD COLUMN s defaultem NULL. Existující řádky nedotčené,
 * budou dál používat `ratio`. Pásma se vyplní ručně přes admin UI.
 */

return function (ProductionMigrationRunner $runner) {
    $runner->migrate(
        'DoctrineMigrations\\Version20260518113035',
        'StaffingFormula — tiers JSON column on staffing_formulas',
        function (PDO $db, ProductionMigrationRunner $r) {
            $db->exec(<<<'SQL'
                DO $$
                BEGIN
                    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                                    WHERE table_name = 'staffing_formulas' AND column_name = 'tiers') THEN
                        ALTER TABLE staffing_formulas ADD COLUMN tiers JSON DEFAULT NULL;
                    END IF;
                END $$;
            SQL);
            $r->log('  • staffing_formulas: tiers JSON sloupec OK');

            $count = (int) $db->query("SELECT COUNT(*) FROM staffing_formulas")->fetchColumn();
            $r->log("  • celkem staffing_formulas řádků nedotčeno: {$count}");
        }
    );
};
