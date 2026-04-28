<?php

declare(strict_types=1);

/**
 * reservation_foods.notes + .allergens — mirror Version20260428113803.
 *
 * Přidává dvě textová pole k jídlu (interní poznámka pro personál + seznam
 * alergenů). IDEMPOTENTNÍ — ALTER pouze pokud sloupec ještě neexistuje.
 */

return function (ProductionMigrationRunner $runner) {
    $runner->migrate(
        'DoctrineMigrations\\Version20260428113803',
        'Add reservation_foods.notes and .allergens',
        function (PDO $db, ProductionMigrationRunner $r) {
            $db->exec(<<<'SQL'
                DO $$
                BEGIN
                    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                                    WHERE table_name = 'reservation_foods' AND column_name = 'notes') THEN
                        ALTER TABLE reservation_foods ADD COLUMN notes TEXT DEFAULT NULL;
                    END IF;
                    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                                    WHERE table_name = 'reservation_foods' AND column_name = 'allergens') THEN
                        ALTER TABLE reservation_foods ADD COLUMN allergens TEXT DEFAULT NULL;
                    END IF;
                END $$;
            SQL);
            $r->log('  • reservation_foods.notes + .allergens OK');
        }
    );
};
