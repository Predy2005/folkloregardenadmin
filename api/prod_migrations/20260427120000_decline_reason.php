<?php

declare(strict_types=1);

/**
 * event_staff_assignment.decline_reason — mirror Version20260427120000.
 *
 * IDEMPOTENTNÍ. Pouze ADD COLUMN s DEFAULT NULL — žádná data nepřijdou k úhoně.
 */

return function (ProductionMigrationRunner $runner) {
    $runner->migrate(
        'DoctrineMigrations\\Version20260427120000',
        'Add event_staff_assignment.decline_reason for mobile decline flow',
        function (PDO $db, ProductionMigrationRunner $r) {
            $db->exec(<<<'SQL'
                DO $$
                BEGIN
                    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                                    WHERE table_name = 'event_staff_assignment' AND column_name = 'decline_reason') THEN
                        ALTER TABLE event_staff_assignment ADD COLUMN decline_reason TEXT DEFAULT NULL;
                    END IF;
                END $$;
            SQL);
            $r->log('  • event_staff_assignment.decline_reason OK');
        }
    );
};
