<?php

declare(strict_types=1);

/**
 * JEDNORÁZOVÝ DIAGNOSTICKÝ SKRIPT — po použití SMAŽTE.
 *
 * Účel: zjistit, proč PIN-only login na produkci selhává.
 * Spočítá HMAC-SHA256 z předaného PINu a APP_SECRET, načte z DB všechny
 * uživatele s aktivním PINem a porovná. Také ukáže prefix APP_SECRET,
 * aby šlo ověřit, že APP_SECRET na produkci je ten správný.
 *
 * Auth: vyžaduje stejný PROD_MIGRATION_TOKEN jako prod_migrations runner.
 *
 * Použití:
 *   https://apifolklore.testujeme.online/diag_pin.php?token=XXX&pin=820520
 *
 * BEZPEČNOST:
 *   - Nikdy nezobrazuje plain APP_SECRET, jen prefix(4)+suffix(4)+délku.
 *   - Nezobrazuje plain PIN v žádné formě, kterou by si někdo mohl uložit.
 *   - Po dokončení diagnostiky soubor smažte: rm api/public/diag_pin.php
 */

header('Content-Type: text/plain; charset=utf-8');

// ─── 1) ENV loader s `${VAR}` expansion (stejné chování jako _runner.php) ─
/** @var array<string, string>|null */
$DOTENV_CACHE = null;

/** @return array<string, string> */
function loadDotenv(): array
{
    global $DOTENV_CACHE;
    if ($DOTENV_CACHE !== null) return $DOTENV_CACHE;
    $map = [];
    foreach (['/.env', '/.env.local'] as $rel) {
        $path = realpath(__DIR__ . '/..' . $rel);
        if (!$path || !is_readable($path)) continue;
        $lines = file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) ?: [];
        foreach ($lines as $line) {
            $line = trim($line);
            if ($line === '' || $line[0] === '#' || !str_contains($line, '=')) continue;
            [$k, $v] = explode('=', $line, 2);
            $k = trim($k);
            $v = trim($v);
            if (strlen($v) >= 2 && ($v[0] === '"' || $v[0] === "'") && $v[strlen($v) - 1] === $v[0]) {
                $v = substr($v, 1, -1);
            }
            $map[$k] = $v;
        }
    }
    return $DOTENV_CACHE = $map;
}

function expandEnvVars(string $value): string
{
    if (!str_contains($value, '${')) return $value;
    $map = loadDotenv();
    return preg_replace_callback(
        '/\$\{([A-Z_][A-Z0-9_]*)\}/i',
        function ($m) use ($map) {
            $k = $m[1];
            if (!empty($_ENV[$k])) return (string)$_ENV[$k];
            $v = getenv($k);
            if ($v !== false && $v !== '') return (string)$v;
            return $map[$k] ?? $m[0];
        },
        $value
    );
}

function readEnv(string $key): ?string
{
    if (!empty($_ENV[$key])) return expandEnvVars((string)$_ENV[$key]);
    $v = getenv($key);
    if ($v !== false && $v !== '') return expandEnvVars((string)$v);
    $map = loadDotenv();
    if (array_key_exists($key, $map)) return expandEnvVars($map[$key]);
    return null;
}

$expected = readEnv('PROD_MIGRATION_TOKEN');
$provided = $_GET['token'] ?? $_SERVER['HTTP_X_MIGRATION_TOKEN'] ?? null;
if (!$expected || !is_string($provided) || !hash_equals($expected, $provided)) {
    http_response_code(403);
    echo "403 Forbidden — chybný/chybějící token.\n";
    exit;
}

// ─── 2) PIN parameter ────────────────────────────────────────────────────
$pin = isset($_GET['pin']) ? (string)$_GET['pin'] : '';
if (!preg_match('/^\d{4,6}$/', $pin)) {
    http_response_code(400);
    echo "400 Bad Request — předej ?pin=NNNN (4-6 číslic).\n";
    exit;
}

// ─── 3) APP_SECRET — totéž, co Symfony injectuje jako %kernel.secret% ────
$appSecret = readEnv('APP_SECRET');
if ($appSecret === null || $appSecret === '') {
    http_response_code(500);
    echo "500 — APP_SECRET není dostupné.\n";
    exit;
}

$secretLen = strlen($appSecret);
$secretFingerprint = sprintf(
    '%s…%s (length=%d, sha256=%s)',
    substr($appSecret, 0, 4),
    substr($appSecret, -4),
    $secretLen,
    substr(hash('sha256', $appSecret), 0, 12)
);

// ─── 4) Spočítej lookup hash stejně jako MobileAccountProvisioningService::computePinLookupHash() ─
$lookupHash = hash_hmac('sha256', $pin, $appSecret);

// ─── 5) DB lookup ────────────────────────────────────────────────────────
$dbUrl = readEnv('DATABASE_URL');
if (!$dbUrl) {
    http_response_code(500);
    echo "500 — DATABASE_URL není dostupné.\n";
    exit;
}
$parts = parse_url($dbUrl);
$dsn = sprintf(
    'pgsql:host=%s;port=%d;dbname=%s',
    $parts['host'] ?? 'localhost',
    $parts['port'] ?? 5432,
    isset($parts['path']) ? ltrim($parts['path'], '/') : ''
);
try {
    $db = new PDO(
        $dsn,
        isset($parts['user']) ? urldecode((string)$parts['user']) : null,
        isset($parts['pass']) ? urldecode((string)$parts['pass']) : null,
        [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        ]
    );
} catch (PDOException $e) {
    http_response_code(500);
    echo "500 — DB connect failed: " . $e->getMessage() . "\n";
    exit;
}

// ─── 6) Existuje sloupec mobile_pin_lookup_hash? ─────────────────────────
$colExists = (bool)$db->query(<<<'SQL'
    SELECT 1 FROM information_schema.columns
     WHERE table_name = 'user' AND column_name = 'mobile_pin_lookup_hash'
SQL)->fetchColumn();

// ─── 7) Načti všechny uživatele s aktivním PINem ─────────────────────────
$rows = $db->query(<<<'SQL'
    SELECT id, username, email,
           (mobile_pin IS NOT NULL)             AS has_bcrypt,
           mobile_pin_lookup_hash               AS lookup_hash,
           pin_device_id,
           pin_enabled
      FROM "user"
     WHERE pin_enabled = TRUE OR mobile_pin IS NOT NULL
     ORDER BY id
SQL)->fetchAll();

// ─── 8) Výstup ───────────────────────────────────────────────────────────
echo "═══════════════════════════════════════════════════════════════\n";
echo " DIAG PIN — produkční diagnostika PIN-only loginu\n";
echo "═══════════════════════════════════════════════════════════════\n\n";

echo "APP_SECRET fingerprint:  {$secretFingerprint}\n";
echo "Spočtený lookup_hash:    {$lookupHash}\n\n";

if (!$colExists) {
    echo "⚠ Sloupec 'mobile_pin_lookup_hash' v tabulce \"user\" NEEXISTUJE.\n";
    echo "  → Migrace Version20260427070000 nebyla aplikována.\n";
    echo "  → Spusť: api/prod_migrations/run.php (přes web nebo CLI).\n";
    exit;
}

echo "Sloupec mobile_pin_lookup_hash existuje ✓\n\n";
echo "Uživatelé s aktivním PINem:\n";
echo "─────────────────────────────────────────────────────────────────\n";

if ($rows === false || $rows === []) {
    echo "(žádní)\n";
} else {
    $matched = false;
    foreach ($rows as $r) {
        $hash = $r['lookup_hash'];
        $hashDisplay = $hash === null
            ? '∅ NULL — Doctrine setter neprošel (stale cache?)'
            : (substr((string)$hash, 0, 12) . '…');
        $isMatch = $hash !== null && hash_equals($lookupHash, (string)$hash);
        if ($isMatch) $matched = true;

        printf(
            "  id=%-4s  user=%-30s  bcrypt=%s  pin_enabled=%s\n",
            (string)$r['id'],
            (string)($r['username'] ?? ''),
            $r['has_bcrypt'] ? '✓' : '✗',
            $r['pin_enabled'] ? '✓' : '✗'
        );
        printf("           lookup_hash=%s\n", $hashDisplay);
        printf("           device_id=%s\n", (string)($r['pin_device_id'] ?? '∅'));
        printf("           >>> shoda s předaným PIN: %s\n\n", $isMatch ? 'ANO ✓' : 'ne');
    }

    echo "─────────────────────────────────────────────────────────────────\n";
    if ($matched) {
        echo "✓ PIN nalezen v DB.\n";
        echo "  Pokud login přesto vrací 401, podívej se na:\n";
        echo "   • pin_device_id — jestli není svázaný s jiným zařízením než to, ze kterého testuješ\n";
        echo "   • bcrypt hash v 'mobile_pin' — defense-in-depth check (musí sedět taky)\n";
    } else {
        echo "✗ PIN s předaným kódem ('{$pin}') nenalezen.\n";
        echo "  Možné příčiny:\n";
        echo "   • lookup_hash je NULL → applyPin neprošel (stale Symfony cache na produkci):\n";
        echo "     fix: php bin/console cache:clear --env=prod  (nebo rm -rf var/cache/prod)\n";
        echo "     a znovu nastav PIN v CRM.\n";
        echo "   • APP_SECRET na produkci se liší od toho, kterým byl PIN setnut\n";
        echo "     (ověř fingerprint výše — měl by být stabilní napříč všemi requesty).\n";
        echo "   • v CRM byl nastavený jiný PIN než '{$pin}'.\n";
    }
}
