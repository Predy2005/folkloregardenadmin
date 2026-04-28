<?php

declare(strict_types=1);

/**
 * Web entry pro Symfony cache clear na produkci (kde nemáš SSH/CLI).
 *
 * **Bezpečnost:** vyžaduje `?token=XXX` shodný s `PROD_MIGRATION_TOKEN`
 * z `api/.env.local`. Bez tokenu vrací 403. Token musí mít ≥ 16 znaků.
 *
 * **Použití:**
 *   https://apifolklore.testujeme.online/cache_clear.php?token=XXX
 *
 * **Co dělá:**
 *   1. Smaže obsah `api/var/cache/prod/` (Symfony container, route cache, …).
 *   2. Smaže obsah `api/var/cache/dev/` (pokud existuje).
 *   3. Pokud je dostupný `opcache_reset()`, zavolá ho — některé hostingy
 *      drží PHP opcache i po deletu cache souborů.
 *   4. Vypíše plain-text log toho co se stalo.
 *
 * **Smazat po použití:** tento soubor by neměl trvale viset na produkci.
 *   Po úspěšném clearu buď smaž soubor, nebo vyprázdni
 *   `PROD_MIGRATION_TOKEN` v .env.local.
 */

header('Content-Type: text/plain; charset=utf-8');

// ─── Auth ────────────────────────────────────────────────────────────────

$expectedToken = readEnv('PROD_MIGRATION_TOKEN');
if ($expectedToken === null || trim($expectedToken) === '') {
    http_response_code(403);
    echo "403 Forbidden\n\nCache clear přes HTTP je vypnutý. Nastav PROD_MIGRATION_TOKEN v .env.local.\n";
    exit;
}

$providedToken = $_GET['token']
    ?? $_POST['token']
    ?? ($_SERVER['HTTP_X_MIGRATION_TOKEN'] ?? null);

if (!is_string($providedToken) || !hash_equals($expectedToken, $providedToken)) {
    http_response_code(403);
    echo "403 Forbidden\n\nChybný nebo chybějící token.\n";
    exit;
}

// ─── Clear ───────────────────────────────────────────────────────────────

$cacheDirs = [
    realpath(__DIR__ . '/../var/cache/prod'),
    realpath(__DIR__ . '/../var/cache/dev'),
];

echo "Symfony cache clear\n";
echo "════════════════════════════════════════════════════════════════\n\n";

$totalRemoved = 0;
$totalErrors = 0;

foreach ($cacheDirs as $dir) {
    if ($dir === false || !is_dir($dir)) {
        continue;
    }

    echo "Mažu: {$dir}\n";
    [$removed, $errors] = clearDirectory($dir);
    echo "  • smazáno {$removed} souborů/složek";
    if ($errors > 0) {
        echo " (chyby: {$errors})";
    }
    echo "\n\n";

    $totalRemoved += $removed;
    $totalErrors += $errors;
}

if ($totalRemoved === 0 && $totalErrors === 0) {
    echo "Cache složky nenalezeny nebo už jsou prázdné.\n\n";
}

// ─── OPcache reset ───────────────────────────────────────────────────────

echo "PHP OPcache:\n";
if (function_exists('opcache_reset')) {
    if (@opcache_reset()) {
        echo "  • opcache_reset() OK\n";
    } else {
        echo "  • opcache_reset() byl zavolán, ale vrátil false (možná OPcache vypnutý)\n";
    }
} else {
    echo "  • opcache_reset() není k dispozici (extension není nainstalovaná nebo zakázaná)\n";
}

if (function_exists('apcu_clear_cache')) {
    @apcu_clear_cache();
    echo "  • apcu_clear_cache() OK\n";
}

echo "\n";
echo "════════════════════════════════════════════════════════════════\n";
if ($totalErrors === 0) {
    echo "✓ Hotovo. Cache vyčištěna, Symfony si ji při dalším requestu znovu vygeneruje.\n";
} else {
    echo "⚠ Hotovo s chybami ({$totalErrors}). Některé soubory se nepodařilo smazat — zkontroluj práva.\n";
    http_response_code(500);
}
echo "\nDOPORUČENÍ: po úspěšném clearu smaž tento soubor nebo vyprázdni PROD_MIGRATION_TOKEN.\n";

// ─── Helpers ─────────────────────────────────────────────────────────────

/**
 * Rekurzivně smaže obsah složky (zachová samotnou složku).
 *
 * @return array{0: int, 1: int} [removedCount, errorCount]
 */
function clearDirectory(string $dir): array
{
    $removed = 0;
    $errors = 0;

    $iterator = new RecursiveIteratorIterator(
        new RecursiveDirectoryIterator($dir, RecursiveDirectoryIterator::SKIP_DOTS),
        RecursiveIteratorIterator::CHILD_FIRST,
    );

    foreach ($iterator as $item) {
        try {
            if ($item->isDir()) {
                if (@rmdir($item->getPathname())) {
                    $removed++;
                } else {
                    $errors++;
                }
            } else {
                if (@unlink($item->getPathname())) {
                    $removed++;
                } else {
                    $errors++;
                }
            }
        } catch (\Throwable) {
            $errors++;
        }
    }

    return [$removed, $errors];
}

/**
 * Načte env proměnnou z reálného prostředí, .env.local nebo .env.
 * Stejný priority order jako _runner.php.
 */
function readEnv(string $key): ?string
{
    if (!empty($_ENV[$key])) return (string)$_ENV[$key];
    $val = getenv($key);
    if ($val !== false && $val !== '') return $val;

    foreach (['.env.local', '.env'] as $file) {
        $path = realpath(__DIR__ . '/../' . $file);
        if ($path === false || !is_readable($path)) continue;

        $lines = file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) ?: [];
        foreach ($lines as $line) {
            $line = trim($line);
            if ($line === '' || $line[0] === '#' || !str_contains($line, '=')) continue;
            [$k, $v] = explode('=', $line, 2);
            if (trim($k) !== $key) continue;
            $v = trim($v);
            if (strlen($v) >= 2 && ($v[0] === '"' || $v[0] === "'") && $v[strlen($v) - 1] === $v[0]) {
                $v = substr($v, 1, -1);
            }
            return $v;
        }
    }

    return null;
}
