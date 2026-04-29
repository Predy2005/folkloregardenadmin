<?php

declare(strict_types=1);

/**
 * Seed existujícího Excel TODO listu jako tickety.
 * Mirror Version20260429120800. Idempotentní — INSERT jen na prázdnou tabulku.
 */

return function (ProductionMigrationRunner $runner) {
    $runner->migrate(
        'DoctrineMigrations\\Version20260429120800',
        'Seed existing Excel TODO items into ticket table',
        function (PDO $db, ProductionMigrationRunner $r) {
            $items = [
                ['Plánky stolů — chybí prostor v editaci eventu',
                 'V editaci eventu v sekci plánek stolu nevidím tam nějaký prostor (LUCKA: dodat správně šablony).',
                 'OPEN', 'HIGH', 'BUG', 'events'],
                ['Akce — koordinátor: filtrovat jen koordinátorky/manažerky',
                 'Pri výběru personálu na akci je nyní celý personál — má nabízet jen pozice COORDINATOR / MANAGER.',
                 'RESOLVED', 'NORMAL', 'IMPROVEMENT', 'events'],
                ['Rezervace — počet hostů: automaticky nula nelze přepsat',
                 'V číselném poli je nula a po kliknutí kurzor skočí za ni. Po kliknutí má označit celé číslo.',
                 'RESOLVED', 'NORMAL', 'BUG', 'reservations'],
                ['Druhy rezervací — víc než klasická a voucher',
                 'V /reservation-types nastavit další druhy rezervací podle potřeb provozu.',
                 'RESOLVED', 'NORMAL', 'FEATURE', 'reservations'],
                ['Rezervace — hromadná úprava počtu hostů',
                 'Když chceme umazat 30 osob, musí se mazat jednotlivě. Hromadná akce na úpravu počtu hostů.',
                 'RESOLVED', 'HIGH', 'FEATURE', 'reservations'],
                ['Plánek akce — špatně nahrané šablony',
                 'Šablony plánků jsou špatně. Lucka dodá správné podklady.',
                 'WAITING_FOR_INFO', 'NORMAL', 'BUG', 'events'],
                ['Plánek akce — viditelné jen národnost u stolu',
                 'Po kliknutí na stůl je vidět obsazení. Manažerka usazuje hosty podle plánku, nemůže klikat na všechny stoly. Jméno musí být vidět i bez kliknutí.',
                 'OPEN', 'HIGH', 'IMPROVEMENT', 'events'],
                ['Rezervace — pole pro jméno objednavatele z CK',
                 'CK+ není kam přidat jméno člověka, který objednal. Přidat orderedBy.',
                 'RESOLVED', 'NORMAL', 'FEATURE', 'reservations'],
                ['AI analýza — email Noalway 28/4',
                 'AI parser nezachytil datum 28/4. Při rezervaci načítat data z partnera v pravém horním rohu.',
                 'RESOLVED', 'NORMAL', 'BUG', 'reservations'],
                ['Personál — přidání: code 500',
                 'Pri zadávání nového člena hlásí chyba 500. Příčina: prázdný email + UNIQUE constraint.',
                 'RESOLVED', 'CRITICAL', 'BUG', 'staff'],
                ['Menu — kolonka pro alergie / poznámku',
                 'Přidat k volbě menu poznámku pro alergie/omezení/bez hub atd.',
                 'RESOLVED', 'NORMAL', 'FEATURE', 'foods'],
                ['Druhy partnerů — rozdělit na CK / Průvodce / Hotel / Ostatní',
                 'Místo HOTEL/RECEPTION/DISTRIBUTOR/OTHER dynamický číselník.',
                 'RESOLVED', 'NORMAL', 'FEATURE', 'partners'],
                ['Partneři — info o platbě (proforma / faktura po akci / cash)',
                 'U partnerů kolonka jak budou platit. Veronika doplní detaily.',
                 'WAITING_FOR_INFO', 'NORMAL', 'FEATURE', 'partners'],
                ['Partneři — víc kontaktních emailů (4+)',
                 'Možnost přidat víc kontaktů na partnera.',
                 'RESOLVED', 'NORMAL', 'FEATURE', 'partners'],
                ['AI analýza — Ernesto Travel',
                 'AI parser vrátil "neočekávaný formát". Schema musí být tolerantnější (nullable date).',
                 'RESOLVED', 'HIGH', 'BUG', 'reservations'],
                ['Akce — default čas 19:30, doba 150 min',
                 'Automaticky nastavit čas a dobu trvání pro Folklore Show.',
                 'RESOLVED', 'NORMAL', 'IMPROVEMENT', 'events'],
                ['Rezervace — default drink ALL INCLUSIVE → Neomezeně',
                 'Default all inclusive + přejmenování labelu na "Neomezeně".',
                 'RESOLVED', 'NORMAL', 'IMPROVEMENT', 'reservations'],
                ['Rezervace — vyhodit povinný email/telefon',
                 'Někdy nemáme jedno z toho — zrušit povinnost.',
                 'RESOLVED', 'NORMAL', 'IMPROVEMENT', 'reservations'],
                ['Modul TODO list pro hlášení chyb',
                 'Místo Excelu modul v systému: nadpis, text, screenshoty (Ctrl+V), komentáře, změna stavu. Bonus: auto-detekce.',
                 'IN_PROGRESS', 'HIGH', 'FEATURE', 'tickets'],
            ];

            // Insert jen pokud zatim neexistuje žádný manuální ticket
            $check = $db->query("SELECT COUNT(*) AS cnt FROM ticket WHERE source = 'MANUAL'");
            $existing = (int)($check->fetch(PDO::FETCH_ASSOC)['cnt'] ?? 0);
            if ($existing > 0) {
                $r->log("  • seed přeskočen — už existuje {$existing} manuálních ticketů");
                return;
            }

            $insert = $db->prepare(<<<'SQL'
                INSERT INTO ticket (title, description, status, priority, type, source, module, occurrence_count, created_at, updated_at, resolved_at)
                VALUES (
                    CAST(:title AS VARCHAR), CAST(:description AS TEXT),
                    CAST(:status AS VARCHAR), CAST(:priority AS VARCHAR),
                    CAST(:type AS VARCHAR), 'MANUAL', CAST(:module AS VARCHAR),
                    1, NOW(), NOW(),
                    CASE WHEN :status IN ('RESOLVED','CLOSED','WONTFIX') THEN NOW() ELSE NULL END
                )
            SQL);
            $count = 0;
            foreach ($items as [$title, $desc, $status, $prio, $type, $module]) {
                $insert->execute([
                    'title' => $title, 'description' => $desc, 'status' => $status,
                    'priority' => $prio, 'type' => $type, 'module' => $module,
                ]);
                $count++;
            }
            $r->log("  • Seed {$count} ticketů z Excel TODO listu OK");
        }
    );
};
