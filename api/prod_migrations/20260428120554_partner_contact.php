<?php

declare(strict_types=1);

/**
 * partner_contact — mirror Version20260428120554.
 *
 * Vytváří tabulku kontaktních osob u partnera (1 partner → N kontaktů).
 * IDEMPOTENTNÍ — `CREATE TABLE IF NOT EXISTS`, FK i index podmíněně.
 */

return function (ProductionMigrationRunner $runner) {
    $runner->migrate(
        'DoctrineMigrations\\Version20260428120554',
        'Add partner_contact table',
        function (PDO $db, ProductionMigrationRunner $r) {
            $db->exec(<<<'SQL'
                CREATE TABLE IF NOT EXISTS partner_contact (
                    id SERIAL PRIMARY KEY,
                    partner_id INT NOT NULL,
                    first_name VARCHAR(100) NOT NULL,
                    last_name VARCHAR(100) DEFAULT NULL,
                    email VARCHAR(255) DEFAULT NULL,
                    phone VARCHAR(50) DEFAULT NULL,
                    notes TEXT DEFAULT NULL,
                    display_order INT NOT NULL DEFAULT 0,
                    created_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL,
                    updated_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL
                )
            SQL);

            $db->exec('CREATE INDEX IF NOT EXISTS IDX_partner_contact_partner ON partner_contact (partner_id)');

            // FK přidáme jen pokud ještě neexistuje (constraint nemá IF NOT EXISTS)
            $db->exec(<<<'SQL'
                DO $$
                BEGIN
                    IF NOT EXISTS (
                        SELECT 1 FROM information_schema.table_constraints
                        WHERE table_name = 'partner_contact'
                          AND constraint_name = 'FK_partner_contact_partner'
                    ) THEN
                        ALTER TABLE partner_contact
                            ADD CONSTRAINT FK_partner_contact_partner
                            FOREIGN KEY (partner_id) REFERENCES partner (id)
                            ON DELETE CASCADE NOT DEFERRABLE INITIALLY IMMEDIATE;
                    END IF;
                END $$;
            SQL);

            $r->log('  • partner_contact table + FK OK');
        }
    );
};
