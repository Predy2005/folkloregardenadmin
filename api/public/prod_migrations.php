<?php

declare(strict_types=1);

/**
 * Web entry pro produkční migrace. Žije v `public/` (Symfony webroot)
 * a deleguje do `../prod_migrations/`.
 *
 * **Bezpečnost:** vyžaduje `?token=XXX` shodný s `PROD_MIGRATION_TOKEN`
 * z `api/.env.local`. Bez tokenu vrací 403. Logiku auth má `_runner.php`.
 *
 * **Použití:**
 *   https://apifolklore.testujeme.online/prod_migrations.php?token=XXX
 *   https://apifolklore.testujeme.online/prod_migrations.php?token=XXX&only=20260423100000
 *
 * **Smazat po deployi:** tento soubor by neměl zbytečně vyset na produkci.
 *   Po úspěšném migrování ho buď smaž, nebo vyprázdni `PROD_MIGRATION_TOKEN`
 *   v .env.local (runner pak HTTP přístup zakáže).
 */

require __DIR__ . '/../prod_migrations/_runner.php';

$only = isset($_GET['only']) ? (string) $_GET['only'] : null;

$runner = new ProductionMigrationRunner();

$files = glob(__DIR__ . '/../prod_migrations/[0-9]*_*.php');
if ($files === false || $files === []) {
    $runner->log('Žádné migrační soubory nenalezeny.');
    $runner->finish();
    exit(0);
}
sort($files);

foreach ($files as $file) {
    $base = basename($file, '.php');
    if ($only !== null && $only !== '' && !str_contains($base, $only)) {
        continue;
    }
    $migration = require $file;
    if (!is_callable($migration)) {
        $runner->log("✗ {$base}: neplatný migrační soubor (musí vracet closure).");
        continue;
    }
    $migration($runner);
}

$runner->finish();
