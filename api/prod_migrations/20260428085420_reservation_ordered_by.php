<?php

declare(strict_types=1);

/**
 * reservation.ordered_by — mirror Version20260428085420.
 *
 * Přidává nepovinné textové pole "kdo objednal" k rezervaci. Slouží pro
 * případ, kdy fyzickou objednávku provedl jiný člověk než kontaktní osoba
 * (typicky zaměstnanec CK, asistent, recepce hotelu).
 *
 * IDEMPOTENTNÍ. Pouze ADD COLUMN s DEFAULT NULL — žádná data nepřijdou k úhoně.
 */

return function (ProductionMigrationRunner $runner) {
    $runner->migrate(
        'DoctrineMigrations\\Version20260428085420',
        'Add reservation.ordered_by',
        function (PDO $db, ProductionMigrationRunner $r) {
            $db->exec(<<<'SQL'
                DO $$
                BEGIN
                    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                                    WHERE table_name = 'reservation' AND column_name = 'ordered_by') THEN
                        ALTER TABLE reservation ADD COLUMN ordered_by TEXT DEFAULT NULL;
                    END IF;
                END $$;
            SQL);
            $r->log('  • reservation.ordered_by OK');
        }
    );
};
