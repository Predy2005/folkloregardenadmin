<?php

declare(strict_types=1);

/**
 * Profile photo path — staff_member.photo_path + transport_driver.photo_path.
 * Mirror Version20260425160000.
 *
 * IDEMPOTENTNÍ. Pouze ADD COLUMN s DEFAULT NULL — žádná data nepřijdou k úhoně.
 */

return function (ProductionMigrationRunner $runner) {
    $runner->migrate(
        'DoctrineMigrations\\Version20260425160000',
        'staff_member.photo_path + transport_driver.photo_path (mobile profile photo)',
        function (PDO $db, ProductionMigrationRunner $r) {
            $db->exec(<<<'SQL'
                DO $$
                BEGIN
                    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                                    WHERE table_name = 'staff_member' AND column_name = 'photo_path') THEN
                        ALTER TABLE staff_member ADD COLUMN photo_path VARCHAR(500) DEFAULT NULL;
                    END IF;

                    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                                    WHERE table_name = 'transport_driver' AND column_name = 'photo_path') THEN
                        ALTER TABLE transport_driver ADD COLUMN photo_path VARCHAR(500) DEFAULT NULL;
                    END IF;
                END $$;
            SQL);
            $r->log('  • staff_member.photo_path + transport_driver.photo_path OK');
        }
    );
};
