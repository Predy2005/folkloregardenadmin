<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Seed existujícího TODO listu (z původního Excel souboru) do tabulky `ticket`.
 * Spouští se jen pokud tabulka je prázdná — neduplikuje při opakovaném migrate.
 */
final class Version20260429120800 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Seed existing TODO items from Excel into ticket table';
    }

    public function up(Schema $schema): void
    {
        // Spustí se jen pokud nejsou žádné manuální tickety — chrání proti duplikaci.
        $this->addSql(<<<'SQL'
            INSERT INTO ticket (title, description, status, priority, type, source, module, occurrence_count, created_at, updated_at, resolved_at)
            SELECT v.title, v.description, v.status, v.priority, v.type, 'MANUAL', v.module, 1, NOW(), NOW(),
                   CASE WHEN v.status IN ('RESOLVED','CLOSED','WONTFIX') THEN NOW() ELSE NULL END
            FROM (VALUES
                ('Plánky stolů — chybí prostor v editaci eventu',
                 'V editaci eventu v sekci plánek stolu nevidím tam nějaký prostor (LUCKA: dodat správně šablony).',
                 'OPEN', 'HIGH', 'BUG', 'events'),
                ('Akce — koordinátor: filtrovat jen koordinátorky/manažerky',
                 'Pri výběru personálu na akci je nyní celý personál — má nabízet jen pozice COORDINATOR / MANAGER. Zda jako filtrace nebo jiný způsob — k upřesnění.',
                 'RESOLVED', 'NORMAL', 'IMPROVEMENT', 'events'),
                ('Rezervace — počet hostů: automaticky nula nelze přepsat',
                 'V číselném poli je nula a po kliknutí kurzor skočí za ni → vznikne třeba 015 místo 15. Po kliknutí má označit celé číslo.',
                 'RESOLVED', 'NORMAL', 'BUG', 'reservations'),
                ('Druhy rezervací — víc než klasická a voucher',
                 'V /reservation-types nastavit další druhy rezervací podle potřeb provozu.',
                 'RESOLVED', 'NORMAL', 'FEATURE', 'reservations'),
                ('Rezervace — hromadná úprava počtu hostů',
                 'Když chceme umazat 30 osob, musí se mazat jednotlivě. Hromadná akce na úpravu počtu hostů.',
                 'RESOLVED', 'HIGH', 'FEATURE', 'reservations'),
                ('Plánek akce — špatně nahrané šablony',
                 'Šablony plánků jsou špatně. Lucka dodá správné podklady.',
                 'WAITING_FOR_INFO', 'NORMAL', 'BUG', 'events'),
                ('Plánek akce — viditelné jen národnost u stolu',
                 'Po kliknutí na stůl je vidět obsazení (jméno, ikona dítěte). Manažerka usazuje hosty podle plánku, nemůže klikat na všechny stoly. Jméno musí být vidět i bez kliknutí.',
                 'OPEN', 'HIGH', 'IMPROVEMENT', 'events'),
                ('Rezervace — pole pro jméno objednavatele z CK',
                 'CK+ není kam přidat jméno člověka, který objednal. Přidat do rezervace odpovědnou osobu za objednávku (orderedBy).',
                 'RESOLVED', 'NORMAL', 'FEATURE', 'reservations'),
                ('AI analýza — email Noalway 28/4 (datum 28/4 + cena)',
                 'AI parser nezachytil datum 28/4 a otázku na cenu 850 Kč u skupiny Noalway. Při rezervaci načítat data z partnera v pravém horním rohu — systém detekuje partnera a zeptá se, zda aplikovat.',
                 'RESOLVED', 'NORMAL', 'BUG', 'reservations'),
                ('Personál — přidání: code 500 při ukládání',
                 'Při zadávání nového člena (pozice, sazby, plat, jméno, telefon) hlásí chyba 500. Příčina: prázdný email + UNIQUE constraint.',
                 'RESOLVED', 'CRITICAL', 'BUG', 'staff'),
                ('Menu — kolonka pro alergie / poznámku',
                 'Přidat k volbě menu poznámku pro alergie/omezení/bez hub atd.',
                 'RESOLVED', 'NORMAL', 'FEATURE', 'foods'),
                ('Druhy partnerů — rozdělit na CK / Průvodce / Hotel / Ostatní',
                 'Místo HOTEL/RECEPTION/DISTRIBUTOR/OTHER chceme: Cestovní kancelář, Průvodce, Hotel, Ostatní — a dynamicky.',
                 'RESOLVED', 'NORMAL', 'FEATURE', 'partners'),
                ('Partneři — info o platbě (proforma / faktura po akci / cash)',
                 'U partnerů kolonka jak budou platit: proforma (zálohová faktura), faktura po akci (důvěryhodní), cash. Veronika doplní detaily.',
                 'WAITING_FOR_INFO', 'NORMAL', 'FEATURE', 'partners'),
                ('Partneři — víc kontaktních emailů (4+)',
                 'Jedna CK má i 4 zaměstnance, každý řeší svoji rezervaci — možnost přidat víc kontaktů na partnera.',
                 'RESOLVED', 'NORMAL', 'FEATURE', 'partners'),
                ('AI analýza — Ernesto Travel: AI vrátila neočekávaný formát',
                 'Email Hello Kamila / 41 people — AI parser vrátil "AI vrátila neočekávaný formát (klíče: contact, reservations)". Schema musí být tolerantnější (nullable date, prázdné reservations).',
                 'RESOLVED', 'HIGH', 'BUG', 'reservations'),
                ('Akce — default čas 19:30, doba 150 min pro Folklore Show',
                 'Automaticky nastavit čas 19:30 a dobu trvání 150 minut.',
                 'RESOLVED', 'NORMAL', 'IMPROVEMENT', 'events'),
                ('Rezervace — default drink balíček ALL INCLUSIVE → "Neomezeně"',
                 'Po vytvoření rezervace mít defaultně all inclusive (klient si pak hromadně upraví). Přejmenovat label "All inclusive" na "Neomezeně".',
                 'RESOLVED', 'NORMAL', 'IMPROVEMENT', 'reservations'),
                ('Rezervace — povinný email + telefon',
                 'Povinné údaje vyhodit — někdy nemáme telefon nebo email. Zrušit povinnost.',
                 'RESOLVED', 'NORMAL', 'IMPROVEMENT', 'reservations'),
                ('Modul TODO list / tickety pro hlášení chyb',
                 'Místo Excelu chceme modul v systému: nadpis, text, screenshoty (Ctrl+V), komentáře, změna stavu. Bonus: auto-detekce systémových chyb.',
                 'IN_PROGRESS', 'HIGH', 'FEATURE', 'tickets')
            ) AS v(title, description, status, priority, type, module)
            WHERE NOT EXISTS (SELECT 1 FROM ticket WHERE source = 'MANUAL' LIMIT 1)
        SQL);
    }

    public function down(Schema $schema): void
    {
        // Žádný rollback — seed je idempotentní (běží jen na prázdné tabulce).
    }
}
