<?php

declare(strict_types=1);

/**
 * event_guest.is_paid backfill podle type — mirror Version20260430071151.
 *
 * Před fixem v kódu byl `isPaid = true` natvrdo pro všechny nové EventGuests
 * (z `EventGuestSyncService`), takže drivery / průvodci / kojenci se v list
 * view ukazovali jako "platící" → sloupec "zdarma" byl 0. Tahle migrace
 * dorovná existující data tak, aby `is_paid` souhlasil s typem hosta.
 *
 * IDEMPOTENTNÍ — UPDATE má WHERE filtry, takže opakované spuštění nic nemění.
 */

return function (ProductionMigrationRunner $runner) {
    $runner->migrate(
        'DoctrineMigrations\\Version20260430071151',
        'Backfill event_guest.is_paid by type (driver/guide/infant → false)',
        function (PDO $db, ProductionMigrationRunner $r) {
            $stmt = $db->exec(
                "UPDATE event_guest SET is_paid = false
                  WHERE type IN ('driver', 'guide', 'infant')
                    AND is_paid = true"
            );
            $r->log('  • event_guest.is_paid → false pro driver/guide/infant: ' . (int)$stmt . ' řádků');

            $stmt2 = $db->exec(
                "UPDATE event_guest SET is_paid = true
                  WHERE type IN ('adult', 'child')
                    AND is_paid = false"
            );
            $r->log('  • event_guest.is_paid → true pro adult/child: ' . (int)$stmt2 . ' řádků');
        }
    );
};
