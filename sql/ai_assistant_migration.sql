-- ============================================================================
-- AI Assistant — migrační SQL skript pro produkční databázi
-- ============================================================================
-- Odpovídá Doctrine migracím:
--   Version20260415090000 — documentation_topic + assistant_action_log
--   Version20260415090100 — seed výchozích dokumentačních témat
--   Version20260415090200 — assistant_conversation
--
-- Kompatibilní i se staršími PostgreSQL — NEPOUŽÍVÁ `IF NOT EXISTS` na
-- indexech ani `ON CONFLICT`. Skript nejprve dropne případné pozůstatky
-- předchozího pokusu (tyto tabulky jsou NOVÉ, žádná data se neztratí).
--
-- Před spuštěním: ZÁLOHA PRODUKCE!  pg_dump folkloregardencz > backup.sql
-- Spuštění:       psql -U folkloregardenadmin -d folkloregardencz -f sql/ai_assistant_migration.sql
--                 (nebo v Admineru vložit obsah a Spustit)
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- 0) Úklid (pokud předchozí pokus selhal uprostřed) — tabulky jsou NOVÉ.
-- ----------------------------------------------------------------------------
DROP TABLE IF EXISTS assistant_conversation;
DROP TABLE IF EXISTS assistant_action_log;
DROP TABLE IF EXISTS documentation_topic;

-- ----------------------------------------------------------------------------
-- 1) documentation_topic — znalostní báze pro AI asistenta
-- ----------------------------------------------------------------------------
CREATE TABLE documentation_topic (
    id             SERIAL PRIMARY KEY,
    slug           VARCHAR(120) NOT NULL,
    title          VARCHAR(200) NOT NULL,
    category       VARCHAR(80)  NOT NULL,
    content        TEXT         NOT NULL,
    keywords       JSON         NOT NULL,
    related_routes JSON         NOT NULL,
    created_at     TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL,
    updated_at     TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL
);

CREATE UNIQUE INDEX uniq_doc_topic_slug    ON documentation_topic (slug);
CREATE        INDEX doc_topic_slug_idx     ON documentation_topic (slug);
CREATE        INDEX doc_topic_category_idx ON documentation_topic (category);

-- ----------------------------------------------------------------------------
-- 2) assistant_action_log — audit destruktivních akcí (preview → confirm/reject)
-- ----------------------------------------------------------------------------
CREATE TABLE assistant_action_log (
    id          SERIAL PRIMARY KEY,
    action_id   VARCHAR(64) NOT NULL,
    user_id     INT         DEFAULT NULL,
    tool_name   VARCHAR(80) NOT NULL,
    status      VARCHAR(20) NOT NULL,
    params      JSON        NOT NULL,
    result      JSON        DEFAULT NULL,
    preview     TEXT        DEFAULT NULL,
    created_at  TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL,
    executed_at TIMESTAMP(0) WITHOUT TIME ZONE DEFAULT NULL
);

CREATE UNIQUE INDEX uniq_aal_action_id ON assistant_action_log (action_id);
CREATE        INDEX aal_action_id_idx  ON assistant_action_log (action_id);
CREATE        INDEX aal_user_idx       ON assistant_action_log (user_id);
CREATE        INDEX aal_created_idx    ON assistant_action_log (created_at);

-- ----------------------------------------------------------------------------
-- 3) assistant_conversation — historie konverzací chatbota
-- ----------------------------------------------------------------------------
CREATE TABLE assistant_conversation (
    id         SERIAL PRIMARY KEY,
    user_id    INT          DEFAULT NULL,
    title      VARCHAR(200) NOT NULL,
    messages   JSON         NOT NULL,
    created_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL,
    updated_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL
);

CREATE INDEX ac_user_idx    ON assistant_conversation (user_id);
CREATE INDEX ac_updated_idx ON assistant_conversation (updated_at);

-- ----------------------------------------------------------------------------
-- 4) SEED výchozích dokumentačních témat.
--    Obsah lze dále upravovat v UI: /help-topics (Správa → Nápověda (AI)).
-- ----------------------------------------------------------------------------
INSERT INTO documentation_topic (slug, title, category, content, keywords, related_routes, created_at, updated_at) VALUES
('navigation-overview', 'Mapa systému a boční menu', 'navigace',
 E'Hlavní moduly systému:\n- Dashboard (/) — statistiky, tržby, grafy\n- Rezervace (/reservations) — zákaznické rezervace\n- Akce (/events) — plánování eventů\n- Platby (/payments) — Comgate platby\n- Faktury (/invoices) — vystavování faktur\n- Adresář (/contacts) — CRM kontakty\n- Jídla (/foods), Nápoje (/drinks), Cenník (/pricing)\n- Sklad (/stock-items, /recipes, /stock-movements, /stock-requirements, /stock/receive)\n- Partneři (/partners), Vouchery (/vouchers), Provize (/commission-logs)\n- Personál (/staff), Docházka (/staff-attendance), Vzorce (/staffing-formulas)\n- Areál (/venue/buildings, /venue/templates, designér)\n- Pokladna (/cashbox), Doprava (/transport)\n- Správa (/users, /roles, /settings, /pricing, /disabled-dates, /reservation-types, /cash-categories)',
 '["navigace","menu","mapa","přehled","moduly","kde najdu"]',
 '["/"]', NOW(), NOW()),

('reservations-module', 'Modul Rezervace', 'rezervace',
 E'Rezervace (/reservations): tabulka se jménem, emailem, telefonem, datem, počtem osob, statusem.\nStatusy: RECEIVED, WAITING_PAYMENT, PAID, CONFIRMED, CANCELLED.\nNová: /reservations/new. Editace: /reservations/{id}/edit (záložky Kontakt, Osoby, Platby, Faktury, Doprava, AI asistent).\nImport z emailů/CSV: /reservations/import.\nAI asistent v editaci umí zpracovat text emailu a vyplnit formulář. Partner detection automaticky rozpozná obchodního partnera.',
 '["rezervace","booking","zákazník","klient","novák","platba","import"]',
 '["/reservations","/reservations/new","/reservations/import"]', NOW(), NOW()),

('events-module', 'Modul Akce (Eventy)', 'akce',
 E'Akce (/events): typy Folklorní show, Svatba, Event, Soukromá (Privát).\nStatusy: DRAFT, PLANNED, CONFIRMED, IN_PROGRESS, COMPLETED, CANCELLED.\nNová: /events/new. Editace (/events/{id}/edit) má 9 záložek: Základní info, Hosté, Menu, Nápoje, Harmonogram, Stoly, Personál, Finance, Doprava.\nTablet Event Dashboard (/events/{id}/dashboard) — floor plan s živým obsazením, POS pro prodej jídla/nápojů, bulk seating wizard, integrace s pokladnou akce, staff recommendation.\nWaiter View (/events/{id}/waiter) — zjednodušený pohled pro číšníky.',
 '["akce","event","svatba","show","folklorní","privát","dashboard","waiter","číšník"]',
 '["/events","/events/new"]', NOW(), NOW()),

('payments-invoices', 'Platby a Faktury', 'finance',
 E'Platby (/payments) — Comgate platební brána, sledování transakcí.\nFaktury (/invoices): typy DEPOSIT (zálohová), FINAL (konečná), PARTIAL (dílčí). Statusy DRAFT, SENT, PAID, CANCELLED. Nová /invoices/new, editace /invoices/{id}/edit. Číslovací řada v Správa > Nastavení firmy > Fakturace.',
 '["platba","faktura","comgate","zálohová","invoice","účet"]',
 '["/payments","/invoices","/invoices/new"]', NOW(), NOW()),

('cashbox-module', 'Pokladna', 'finance',
 E'Pokladna (/cashbox). Hlavní pokladna: centrální (lze skrýt v Nastavení firmy > Fakturace). Pokladny akcí: automaticky pro každou akci, napojené na Event Dashboard. Pohyby INCOME/EXPENSE, převody, uzávěrky, auditní log. POS prodeje z Event Dashboardu se automaticky zapisují.',
 '["pokladna","hotovost","cashbox","pohyby","uzávěrka","převod"]',
 '["/cashbox"]', NOW(), NOW()),

('staff-module', 'Personál a docházka', 'personal',
 E'Personál (/staff) — jednotlivci i skupiny/kapely. Nový /staff/new, editace /staff/{id}/edit.\nDocházka (/staff-attendance) — evidence hodin, platby, filtry.\nVzorce (/staffing-formulas) — automatická doporučení počtu personálu podle hostů.',
 '["personál","zaměstnanec","číšník","kuchař","kapela","docházka","hodiny"]',
 '["/staff","/staff-attendance","/staffing-formulas"]', NOW(), NOW()),

('partners-module', 'Partneři, vouchery, provize', 'partneri',
 E'Partneři (/partners): typy Hotel, Recepce, Distributor, Ostatní. Cenové modely Default, Custom, Flat. Automatická detekce partnera v rezervaci. Nový /partners/new, editace /partners/{id}/edit.\nVouchery (/vouchers) — slevové kódy.\nProvizní logy (/commission-logs) — historie provizí.',
 '["partner","hotel","recepce","distributor","voucher","sleva","provize","komise"]',
 '["/partners","/vouchers","/commission-logs"]', NOW(), NOW()),

('stock-module', 'Sklad a receptury', 'sklad',
 E'Sklad: Položky (/stock-items), Receptury (/recipes), Pohyby (/stock-movements), Požadavky (/stock-requirements), Naskladnění (/stock/receive). Import receptur z Excelu. Požadavky se počítají automaticky z plánovaných akcí.',
 '["sklad","zásoby","receptura","recept","ingredience","naskladnění","příjem"]',
 '["/stock-items","/recipes","/stock-movements","/stock-requirements","/stock/receive"]', NOW(), NOW()),

('venue-floorplan', 'Areál a floor plan designér', 'areal',
 E'Areál > Budovy (/venue/buildings) — evidence budov a místností.\nŠablony plánků (/venue/templates) — předdefinovaná rozložení stolů.\nDesignér (/venue/templates/{id}/designer) — vizuální editor na plátně (Konva): kresba polygonů místností, umisťování stolů, rotace, kapacita, drag & drop, bulk operace.',
 '["areál","budova","místnost","stůl","plánek","floor plan","designér","šablona"]',
 '["/venue/buildings","/venue/templates"]', NOW(), NOW()),

('admin-settings', 'Správa systému a nastavení', 'sprava',
 E'Správa:\n- Uživatelé (/users), Role (/roles) — oprávnění.\n- Nastavení firmy (/settings) — firemní údaje, banka, fakturace.\n- Cenník (/pricing) — výchozí ceny a datové přepisy.\n- Blokované termíny (/disabled-dates) — zakázaná data pro rezervace.\n- Druhy rezervací (/reservation-types), Kategorie pokladny (/cash-categories).',
 '["správa","nastavení","uživatelé","role","oprávnění","firma","ceny","cenník","blokace"]',
 '["/settings","/users","/roles","/pricing","/disabled-dates"]', NOW(), NOW()),

('faq-common', 'Časté dotazy (FAQ)', 'faq',
 E'Q: Kde založím pokladnu?\nA: Hlavní pokladna se vytvoří automaticky. Viditelnost v Správa > Nastavení firmy > Fakturace.\n\nQ: Jak odešlu platbu zákazníkovi?\nA: V detailu rezervace tlačítko Odeslat platební email.\n\nQ: Jak vystavím fakturu?\nA: /invoices/new, vybrat zákazníka a položky.\n\nQ: Jak přidám zaměstnance?\nA: /staff/new nebo požádej AI asistenta „přidej do personálu ...".\n\nQ: Jak vytvořím floor plan?\nA: 1) /venue/buildings, 2) /venue/templates, 3) Designér šablony.\n\nQ: Kde nastavím údaje na fakturách?\nA: /settings.',
 '["faq","otázka","dotaz","jak","kde","nastavit","začít"]',
 '[]', NOW(), NOW());

-- ----------------------------------------------------------------------------
-- 5) Zápis migrací do doctrine_migration_versions (aby Doctrine znovu nespustil).
--    Smaže případné existující záznamy těchto verzí a vloží nové.
-- ----------------------------------------------------------------------------
DELETE FROM doctrine_migration_versions
 WHERE version IN (
   'DoctrineMigrations\Version20260415090000',
   'DoctrineMigrations\Version20260415090100',
   'DoctrineMigrations\Version20260415090200'
 );

INSERT INTO doctrine_migration_versions (version, executed_at, execution_time) VALUES
    ('DoctrineMigrations\Version20260415090000', NOW(), 0),
    ('DoctrineMigrations\Version20260415090100', NOW(), 0),
    ('DoctrineMigrations\Version20260415090200', NOW(), 0);

COMMIT;

-- ============================================================================
-- Ověření (spusť samostatně po migraci):
--   SELECT COUNT(*) FROM documentation_topic;                         -- 11
--   SELECT COUNT(*) FROM assistant_action_log;                        -- 0
--   SELECT COUNT(*) FROM assistant_conversation;                      -- 0
--   SELECT version FROM doctrine_migration_versions
--    WHERE version LIKE '%Version2026041509%' ORDER BY version;       -- 3 řádky
-- ============================================================================

-- ============================================================================
-- Rollback (SPOUŠTĚT JEN VĚDOMĚ):
--   BEGIN;
--     DELETE FROM doctrine_migration_versions
--       WHERE version IN (
--         'DoctrineMigrations\Version20260415090000',
--         'DoctrineMigrations\Version20260415090100',
--         'DoctrineMigrations\Version20260415090200'
--       );
--     DROP TABLE IF EXISTS assistant_conversation;
--     DROP TABLE IF EXISTS assistant_action_log;
--     DROP TABLE IF EXISTS documentation_topic;
--   COMMIT;
-- ============================================================================
