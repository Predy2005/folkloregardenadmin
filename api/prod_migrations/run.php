<?php

declare(strict_types=1);

/**
 * Entry point — spustí všechny čekající produkční migrace v tomto adresáři.
 *
 * Použití:
 *   CLI:     php api/prod_migrations/run.php
 *   CLI 1:   php api/prod_migrations/run.php 20260423100000          # jen jedna
 *   Browser: https://api.folkloregarden.cz/prod_migrations/run.php?token=XXX
 *   Browser: ?token=XXX&only=20260423100000                          # jen jedna
 *
 * Token čte z .env(.local) proměnné PROD_MIGRATION_TOKEN.
 * Pokud tam není, HTTP přístup je zakázaný — jen CLI.
 *
 * Každá migrace je idempotentní (kontroluje doctrine_migration_versions),
 * takže opakované spuštění nic nerozbije.
 */

require __DIR__ . '/_runner.php';

$only = null;
if (\PHP_SAPI === 'cli') {
    $only = $argv[1] ?? null;
} else {
    $only = isset($_GET['only']) ? (string)$_GET['only'] : null;
}

$runner = new ProductionMigrationRunner();

$files = glob(__DIR__ . '/[0-9]*_*.php');
if ($files === false || $files === []) {
    $runner->log('Žádné migrační soubory nenalezeny.');
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
