<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260415090100 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Seed AI documentation topics (navigation + module descriptions).';
    }

    public function up(Schema $schema): void
    {
        $topics = self::topics();
        foreach ($topics as $t) {
            $this->addSql(
                'INSERT INTO documentation_topic (slug, title, category, content, keywords, related_routes, created_at, updated_at)
                 VALUES (:slug, :title, :category, :content, :keywords, :routes, NOW(), NOW())',
                [
                    'slug' => $t['slug'],
                    'title' => $t['title'],
                    'category' => $t['category'],
                    'content' => $t['content'],
                    'keywords' => json_encode($t['keywords'], JSON_UNESCAPED_UNICODE),
                    'routes' => json_encode($t['routes'], JSON_UNESCAPED_UNICODE),
                ]
            );
        }
    }

    public function down(Schema $schema): void
    {
        $slugs = array_map(fn($t) => "'".$t['slug']."'", self::topics());
        $this->addSql('DELETE FROM documentation_topic WHERE slug IN ('.implode(',', $slugs).')');
    }

    /** @return list<array{slug:string,title:string,category:string,content:string,keywords:list<string>,routes:list<string>}> */
    private static function topics(): array
    {
        return [
            [
                'slug' => 'navigation-overview',
                'title' => 'Mapa systému a boční menu',
                'category' => 'navigace',
                'content' => "Hlavní moduly systému:\n- Dashboard (/) — statistiky, tržby, grafy\n- Rezervace (/reservations) — zákaznické rezervace\n- Akce (/events) — plánování eventů\n- Platby (/payments) — Comgate platby\n- Faktury (/invoices) — vystavování faktur\n- Adresář (/contacts) — CRM kontakty\n- Jídla (/foods), Nápoje (/drinks), Cenník (/pricing)\n- Sklad (/stock-items, /recipes, /stock-movements, /stock-requirements, /stock/receive)\n- Partneři (/partners), Vouchery (/vouchers), Provize (/commission-logs)\n- Personál (/staff), Docházka (/staff-attendance), Vzorce (/staffing-formulas)\n- Areál (/venue/buildings, /venue/templates, designér)\n- Pokladna (/cashbox), Doprava (/transport)\n- Správa (/users, /roles, /settings, /pricing, /disabled-dates, /reservation-types, /cash-categories)",
                'keywords' => ['navigace', 'menu', 'mapa', 'přehled', 'moduly', 'kde najdu'],
                'routes' => ['/'],
            ],
            [
                'slug' => 'reservations-module',
                'title' => 'Modul Rezervace',
                'category' => 'rezervace',
                'content' => "Rezervace (/reservations): tabulka se jménem, emailem, telefonem, datem, počtem osob, statusem.\nStatusy: RECEIVED, WAITING_PAYMENT, PAID, CONFIRMED, CANCELLED.\nNová: /reservations/new. Editace: /reservations/{id}/edit (záložky Kontakt, Osoby, Platby, Faktury, Doprava, AI asistent).\nImport z emailů/CSV: /reservations/import.\nAI asistent v editaci umí zpracovat text emailu a vyplnit formulář. Partner detection automaticky rozpozná obchodního partnera.",
                'keywords' => ['rezervace', 'booking', 'zákazník', 'klient', 'novák', 'platba', 'import'],
                'routes' => ['/reservations', '/reservations/new', '/reservations/import'],
            ],
            [
                'slug' => 'events-module',
                'title' => 'Modul Akce (Eventy)',
                'category' => 'akce',
                'content' => "Akce (/events): typy Folklorní show, Svatba, Event, Soukromá (Privát).\nStatusy: DRAFT, PLANNED, CONFIRMED, IN_PROGRESS, COMPLETED, CANCELLED.\nNová: /events/new. Editace (/events/{id}/edit) má 9 záložek: Základní info, Hosté, Menu, Nápoje, Harmonogram, Stoly, Personál, Finance, Doprava.\nTablet Event Dashboard (/events/{id}/dashboard) — floor plan s živým obsazením, POS pro prodej jídla/nápojů, bulk seating wizard, integrace s pokladnou akce, staff recommendation.\nWaiter View (/events/{id}/waiter) — zjednodušený pohled pro číšníky.",
                'keywords' => ['akce', 'event', 'svatba', 'show', 'folklorní', 'privát', 'dashboard', 'waiter', 'číšník'],
                'routes' => ['/events', '/events/new'],
            ],
            [
                'slug' => 'payments-invoices',
                'title' => 'Platby a Faktury',
                'category' => 'finance',
                'content' => "Platby (/payments) — Comgate platební brána, sledování transakcí.\nFaktury (/invoices): typy DEPOSIT (zálohová), FINAL (konečná), PARTIAL (dílčí). Statusy DRAFT, SENT, PAID, CANCELLED. Nová /invoices/new, editace /invoices/{id}/edit. Číslovací řada v Správa > Nastavení firmy > Fakturace.",
                'keywords' => ['platba', 'faktura', 'comgate', 'zálohová', 'invoice', 'účet'],
                'routes' => ['/payments', '/invoices', '/invoices/new'],
            ],
            [
                'slug' => 'cashbox-module',
                'title' => 'Pokladna',
                'category' => 'finance',
                'content' => "Pokladna (/cashbox). Hlavní pokladna: centrální (lze skrýt v Nastavení firmy > Fakturace). Pokladny akcí: automaticky pro každou akci, napojené na Event Dashboard. Pohyby INCOME/EXPENSE, převody, uzávěrky, auditní log. POS prodeje z Event Dashboardu se automaticky zapisují.",
                'keywords' => ['pokladna', 'hotovost', 'cashbox', 'pohyby', 'uzávěrka', 'převod'],
                'routes' => ['/cashbox'],
            ],
            [
                'slug' => 'staff-module',
                'title' => 'Personál a docházka',
                'category' => 'personal',
                'content' => "Personál (/staff) — jednotlivci i skupiny/kapely. Nový /staff/new, editace /staff/{id}/edit.\nDocházka (/staff-attendance) — evidence hodin, platby, filtry.\nVzorce (/staffing-formulas) — automatická doporučení počtu personálu podle hostů.",
                'keywords' => ['personál', 'zaměstnanec', 'číšník', 'kuchař', 'kapela', 'docházka', 'hodiny'],
                'routes' => ['/staff', '/staff-attendance', '/staffing-formulas'],
            ],
            [
                'slug' => 'partners-module',
                'title' => 'Partneři, vouchery, provize',
                'category' => 'partneri',
                'content' => "Partneři (/partners): typy Hotel, Recepce, Distributor, Ostatní. Cenové modely Default, Custom, Flat. Automatická detekce partnera v rezervaci. Nový /partners/new, editace /partners/{id}/edit.\nVouchery (/vouchers) — slevové kódy.\nProvizní logy (/commission-logs) — historie provizí.",
                'keywords' => ['partner', 'hotel', 'recepce', 'distributor', 'voucher', 'sleva', 'provize', 'komise'],
                'routes' => ['/partners', '/vouchers', '/commission-logs'],
            ],
            [
                'slug' => 'stock-module',
                'title' => 'Sklad a receptury',
                'category' => 'sklad',
                'content' => "Sklad: Položky (/stock-items), Receptury (/recipes), Pohyby (/stock-movements), Požadavky (/stock-requirements), Naskladnění (/stock/receive). Import receptur z Excelu. Požadavky se počítají automaticky z plánovaných akcí.",
                'keywords' => ['sklad', 'zásoby', 'receptura', 'recept', 'ingredience', 'naskladnění', 'příjem'],
                'routes' => ['/stock-items', '/recipes', '/stock-movements', '/stock-requirements', '/stock/receive'],
            ],
            [
                'slug' => 'venue-floorplan',
                'title' => 'Areál a floor plan designér',
                'category' => 'areal',
                'content' => "Areál > Budovy (/venue/buildings) — evidence budov a místností.\nŠablony plánků (/venue/templates) — předdefinovaná rozložení stolů.\nDesignér (/venue/templates/{id}/designer) — vizuální editor na plátně (Konva): kresba polygonů místností, umisťování stolů, rotace, kapacita, drag & drop, bulk operace.",
                'keywords' => ['areál', 'budova', 'místnost', 'stůl', 'plánek', 'floor plan', 'designér', 'šablona'],
                'routes' => ['/venue/buildings', '/venue/templates'],
            ],
            [
                'slug' => 'admin-settings',
                'title' => 'Správa systému a nastavení',
                'category' => 'sprava',
                'content' => "Správa:\n- Uživatelé (/users), Role (/roles) — oprávnění.\n- Nastavení firmy (/settings) — firemní údaje, banka, fakturace.\n- Cenník (/pricing) — výchozí ceny a datové přepisy.\n- Blokované termíny (/disabled-dates) — zakázaná data pro rezervace.\n- Druhy rezervací (/reservation-types), Kategorie pokladny (/cash-categories).",
                'keywords' => ['správa', 'nastavení', 'uživatelé', 'role', 'oprávnění', 'firma', 'ceny', 'cenník', 'blokace'],
                'routes' => ['/settings', '/users', '/roles', '/pricing', '/disabled-dates'],
            ],
            [
                'slug' => 'faq-common',
                'title' => 'Časté dotazy (FAQ)',
                'category' => 'faq',
                'content' => "Q: Kde založím pokladnu?\nA: Hlavní pokladna se vytvoří automaticky. Viditelnost v Správa > Nastavení firmy > Fakturace.\n\nQ: Jak odešlu platbu zákazníkovi?\nA: V detailu rezervace tlačítko Odeslat platební email.\n\nQ: Jak vystavím fakturu?\nA: /invoices/new, vybrat zákazníka a položky.\n\nQ: Jak přidám zaměstnance?\nA: /staff/new nebo požádej AI asistenta „přidej do personálu ...\".\n\nQ: Jak vytvořím floor plan?\nA: 1) /venue/buildings, 2) /venue/templates, 3) Designér šablony.\n\nQ: Kde nastavím údaje na fakturách?\nA: /settings.",
                'keywords' => ['faq', 'otázka', 'dotaz', 'jak', 'kde', 'nastavit', 'začít'],
                'routes' => [],
            ],
        ];
    }
}
