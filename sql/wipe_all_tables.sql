-- ============================================================================
-- DROP ALL TABLES IN public SCHEMA — DESTRUCTIVE, IRREVERSIBLE
-- ============================================================================
-- Smaže všechny tabulky ve schématu `public` (včetně doctrine_migration_versions)
-- a ignoruje cizí klíče díky CASCADE. Po spuštění je nutné znovu spustit
-- migrace, viz docs/ops/wipe-production-db.md.
--
-- ⚠️  NIKDY NESPOUŠTĚT BEZ AKTUÁLNÍ ZÁLOHY PRODUKCE!
--     pg_dump -Fc "$DATABASE_URL" > backup_$(date +%Y%m%d_%H%M%S).dump
-- ============================================================================

DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT tablename
        FROM pg_tables
        WHERE schemaname = 'public'
    ) LOOP
        EXECUTE 'DROP TABLE IF EXISTS public.' || quote_ident(r.tablename) || ' CASCADE';
    END LOOP;
END $$;

-- Ověření, že je schéma prázdné (ocekávaný výstup: 0 řádků)
SELECT tablename FROM pg_tables WHERE schemaname = 'public';
