<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Retroaktivní oprava `event_guest.is_paid` podle `type`:
 *  - driver / guide / infant → false (vždy zdarma, mají cenu 0)
 *  - adult  / child           → true (platící)
 *
 * Bug fix: před tímto byly všechny EventGuests vytvářené sync službou s
 * isPaid=true bez ohledu na type, takže list view eventů ukazoval "0 zdarma"
 * i u skupin s drivery/průvodci. Counting + sync logika je opravena v kódu;
 * tahle migrace dorovná existující data tak, aby `isPaid` flag souhlasil s
 * realitou v UI/exportech, které ho čtou přímo.
 *
 * Změna je čistě datová — žádná schema operace.
 */
final class Version20260430071151 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Backfill event_guest.is_paid by type (driver/guide/infant → false)';
    }

    public function up(Schema $schema): void
    {
        $this->addSql("UPDATE event_guest SET is_paid = false WHERE type IN ('driver', 'guide', 'infant') AND is_paid = true");
        $this->addSql("UPDATE event_guest SET is_paid = true  WHERE type IN ('adult', 'child') AND is_paid = false");
    }

    public function down(Schema $schema): void
    {
        // Reverzní převrácení by data poškodilo (bývalá ručně označená "neplatící"
        // adult/child by se stala "platící"). Záměrně bez rollbacku.
    }
}
