<?php

declare(strict_types=1);

/**
 * Produkční migrace — DrinkItem.is_welcome_drink bool flag.
 *
 * Zrcadlí Doctrine migraci Version20260518120000. Přidává `is_welcome_drink`
 * BOOLEAN na `drink_item` — flag pro filtrování nápojů nabízených jako welcome
 * drink v rezervacích (host s `drinkOption = welcome`).
 *
 * IDEMPOTENTNÍ — information_schema.columns check.
 * DATA-SAFE — defaultní hodnota false; existující řádky dostanou false (nejsou
 * žádné welcome drinks dokud admin nezaškrtne v `/drinks`).
 */

return function (ProductionMigrationRunner $runner) {
    $runner->migrate(
        'DoctrineMigrations\\Version20260518120000',
        'DrinkItem — is_welcome_drink bool flag',
        function (PDO $db, ProductionMigrationRunner $r) {
            $db->exec(<<<'SQL'
                DO $$
                BEGIN
                    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                                    WHERE table_name = 'drink_item' AND column_name = 'is_welcome_drink') THEN
                        ALTER TABLE drink_item ADD COLUMN is_welcome_drink BOOLEAN DEFAULT false NOT NULL;
                    END IF;
                END $$;
            SQL);
            $r->log('  • drink_item: is_welcome_drink sloupec OK');

            $count = (int) $db->query("SELECT COUNT(*) FROM drink_item")->fetchColumn();
            $r->log("  • celkem drink_item řádků nedotčeno: {$count}");
        }
    );
};
