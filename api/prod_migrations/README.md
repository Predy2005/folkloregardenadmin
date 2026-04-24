# Produkční migrace (PHP)

Tento adresář obsahuje **idempotentní PHP migrační skripty** pro nasazení na ostrý provoz, kde není k dispozici `php bin/console`. Skripty používají pouze nativní PDO (bez Symfony/Doctrine runtime), takže je lze bezpečně spouštět přes CLI nebo přes prohlížeč.

Každá migrace:

- Kontroluje svůj záznam v `doctrine_migration_versions` a pokud už je aplikovaná, **přeskočí ji**.
- Spouští se v **transakci** — při jakékoliv chybě se rollbackne a DB zůstane beze změny.
- Po úspěchu **zapíše** verzi do `doctrine_migration_versions`, takže Doctrine ji už nezopakuje.
- Provádí pouze **aditivní změny** (nová tabulka, nový sloupec, nový řádek). Nic nemaže — produkční data jsou v bezpečí.

## Struktura

```
prod_migrations/
├── _runner.php                         # Sdílený runner (PDO, .env, tracking, auth)
├── run.php                             # Entry point — spustí všechny pending migrace
├── 20260423100000_mobile_auth.php      # Mobilní auth schéma + seed permissions/rolí
├── 20260423100100_refresh_token.php    # refresh_token tabulka
└── README.md
```

**Konvence názvu souboru:** `YYYYMMDDHHmmss_nazev.php` — odpovídá timestampu Doctrine migrace. Skripty se řadí a spouštějí abecedně (tj. chronologicky).

## Spuštění

### CLI (pokud máš SSH)

```bash
# Spustí všechny čekající migrace
php api/prod_migrations/run.php

# Spustí jen konkrétní migraci (substring match názvu souboru)
php api/prod_migrations/run.php 20260423100000
```

### Přes prohlížeč (když nemáš CLI)

1. V `api/.env.local` nastav silný token (≥ 32 znaků, jen pro produkci):
   ```dotenv
   PROD_MIGRATION_TOKEN=zmen-me-na-nahodny-retezec-32plus-znaku
   ```
2. Nahraj složku `api/prod_migrations/` na server (FTP, Git pull, cokoliv).
3. Umožni webový přístup — stačí do `api/public/` přidat symlink nebo proxy skript:
   ```php
   <?php
   // api/public/prod_migrate.php — jednorázový entry (smaž po migraci)
   require __DIR__ . '/../prod_migrations/run.php';
   ```
4. Otevři v prohlížeči:
   ```
   https://api.folkloregarden.cz/prod_migrate.php?token=ZMEN_ME
   ```
5. **Po úspěšné migraci soubor `prod_migrate.php` smaž**, aby zmizel veřejný endpoint.

> Bez nastaveného `PROD_MIGRATION_TOKEN` je HTTP přístup **vypnutý** a vrátí 403 — skript se dá spustit pouze přes CLI. To je bezpečné default.

## Ověření po migraci

Po zaběhnutí skript vypíše přehled (viz logy). Pro další kontrolu:

```sql
-- Verze zapsané Doctrinou i prod runnerem
SELECT version FROM doctrine_migration_versions ORDER BY version DESC LIMIT 10;

-- Konkrétní kontroly pro aktuální sadu:
\d "user"                                   -- mobile_pin, pin_device_id, pin_enabled
\d staff_member                             -- user_id + FK
\d transport_driver                         -- user_id + FK
\d user_device                              -- nová tabulka
\d refresh_token                            -- nová tabulka
\d event_transport                          -- execution_status

SELECT module, action FROM permission WHERE module LIKE 'mobile_%' ORDER BY 1,2;
-- 7 řádků

SELECT name FROM role WHERE name LIKE 'STAFF_%' ORDER BY 1;
-- STAFF_COOK, STAFF_DRIVER, STAFF_WAITER
```

## Workflow pro novou migraci

Pokaždé když přidáš Doctrine migraci (`php bin/console doctrine:migrations:diff`), vytvoř **zároveň** i PHP prod migraci:

1. Zkopíruj šablonu z jiné migrace (např. `20260423100100_refresh_token.php`) a pojmenuj ji `YYYYMMDDHHmmss_nazev.php` — timestamp **musí odpovídat** Doctrine verzi.
2. Uvnitř `closure` přepiš SQL:
   - **Schéma** obal do `DO $$ ... IF NOT EXISTS ... END $$;` bloků (idempotentně).
   - **Seed data** vkládej přes `INSERT ... WHERE NOT EXISTS` nebo `DELETE` + `INSERT` (pokud jde o vazby, které chceš udržovat v souladu se seedem).
3. Na vývoji spusť `php bin/console doctrine:migrations:migrate` — to ověří, že Doctrine migrace sedí.
4. Otestuj prod skript lokálně na kopii produkční DB:
   ```bash
   php api/prod_migrations/run.php
   # Mělo by napsat: "Už aplikováno — přeskočeno." (protože Doctrine ji už zapsal)
   ```
5. V commitu přidej **oba soubory** — `api/migrations/VersionXXX.php` i `api/prod_migrations/XXX_nazev.php`.

## Rollback

Prod skripty nemají rollback záměrně — jsou data-safe a aditivní. Pokud opravdu chceš vrátit změny, udělej to ručně přes SQL (každý původní SQL skript v `sql/` má rollback blok v komentáři).
