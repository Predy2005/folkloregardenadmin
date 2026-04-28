<?php

declare(strict_types=1);

/**
 * user.mobile_pin_lookup_hash + unique index — mirror Version20260427070000.
 *
 * Globální unikátnost PINu pro PIN-only mobilní login (bez identifieru).
 * IDEMPOTENTNÍ. Pouze ADD COLUMN + CREATE UNIQUE INDEX — žádná data nepřijdou k úhoně.
 *
 * Pozn.: existující PINy přestanou fungovat (lookup_hash je NULL → user nebude
 * dohledatelný). Admin musí v CRM PIN znovu uložit, čímž se lookup_hash dopočítá.
 */

return function (ProductionMigrationRunner $runner) {
    $runner->migrate(
        'DoctrineMigrations\\Version20260427070000',
        'user.mobile_pin_lookup_hash + unique index (global PIN uniqueness for PIN-only mobile login)',
        function (PDO $db, ProductionMigrationRunner $r) {
            $db->exec(<<<'SQL'
                DO $$
                BEGIN
                    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                                    WHERE table_name = 'user' AND column_name = 'mobile_pin_lookup_hash') THEN
                        ALTER TABLE "user" ADD COLUMN mobile_pin_lookup_hash VARCHAR(64) DEFAULT NULL;
                    END IF;

                    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'uniq_user_mobile_pin_lookup_hash') THEN
                        CREATE UNIQUE INDEX uniq_user_mobile_pin_lookup_hash ON "user" (mobile_pin_lookup_hash);
                    END IF;
                END $$;
            SQL);
            $r->log('  • user.mobile_pin_lookup_hash + unique index OK');
        }
    );
};
