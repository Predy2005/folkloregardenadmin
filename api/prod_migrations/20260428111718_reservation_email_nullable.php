<?php

declare(strict_types=1);

/**
 * reservation.contact_email — DROP NOT NULL — mirror Version20260428111718.
 *
 * Email rezervace je nově volitelný (kontakty importované z xlsx někdy email
 * nemají a bez tohohle by jich nešlo aktualizovat).
 *
 * IDEMPOTENTNÍ. Drop NOT NULL pouze pokud constraint ještě platí.
 */

return function (ProductionMigrationRunner $runner) {
    $runner->migrate(
        'DoctrineMigrations\\Version20260428111718',
        'Make reservation.contact_email nullable',
        function (PDO $db, ProductionMigrationRunner $r) {
            $db->exec(<<<'SQL'
                DO $$
                BEGIN
                    IF EXISTS (
                        SELECT 1 FROM information_schema.columns
                        WHERE table_name = 'reservation'
                          AND column_name = 'contact_email'
                          AND is_nullable = 'NO'
                    ) THEN
                        ALTER TABLE reservation ALTER COLUMN contact_email DROP NOT NULL;
                    END IF;
                END $$;
            SQL);
            $r->log('  • reservation.contact_email DROP NOT NULL OK');
        }
    );
};
