<?php

declare(strict_types=1);

/**
 * event.duration_minutes default 120 → 150 — mirror Version20260428121513.
 *
 * IDEMPOTENTNÍ. Cílový stav: `default 150`. Nemění existující data.
 */

return function (ProductionMigrationRunner $runner) {
    $runner->migrate(
        'DoctrineMigrations\\Version20260428121513',
        'Change default of event.duration_minutes to 150',
        function (PDO $db, ProductionMigrationRunner $r) {
            $db->exec('ALTER TABLE event ALTER COLUMN duration_minutes SET DEFAULT 150');
            $r->log('  • event.duration_minutes default = 150 OK');
        }
    );
};
