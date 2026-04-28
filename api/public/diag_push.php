<?php

declare(strict_types=1);

/**
 * JEDNORÁZOVÝ DIAGNOSTICKÝ SKRIPT — po použití SMAŽTE.
 *
 * Účel: zjistit, proč push notifikace nedorazí na mobil.
 *   1. Vypíše všechny user_device záznamy v DB (kdo má registrovaný push token)
 *   2. Volitelně pošle test push na konkrétní userId přes Expo Push Service
 *
 * Auth: PROD_MIGRATION_TOKEN (stejný jako pro migrace).
 *
 * Použití:
 *   https://apifolklore.testujeme.online/diag_push.php?token=XXX
 *   https://apifolklore.testujeme.online/diag_push.php?token=XXX&test=1&userId=13
 *
 * BEZPEČNOST:
 *   - Token je povinný.
 *   - Vypisuje jen prefix Expo tokenu, ne celý.
 *   - Po dokončení diagnostiky soubor smažte.
 */

header('Content-Type: text/plain; charset=utf-8');

// ─── ENV loader (stejné jako diag_pin.php / _runner.php) ─────────────────
/** @var array<string, string>|null */
$DOTENV_CACHE = null;

function loadDotenv(): array
{
    global $DOTENV_CACHE;
    if ($DOTENV_CACHE !== null) {
        return $DOTENV_CACHE;
    }
    $map = [];
    foreach (['/.env', '/.env.local'] as $rel) {
        $path = realpath(__DIR__ . '/..' . $rel);
        if (!$path || !is_readable($path)) {
            continue;
        }
        $lines = file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) ?: [];
        foreach ($lines as $line) {
            $line = trim($line);
            if ($line === '' || $line[0] === '#' || !str_contains($line, '=')) {
                continue;
            }
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
    if (!str_contains($value, '${')) {
        return $value;
    }
    $map = loadDotenv();
    return preg_replace_callback(
        '/\$\{([A-Z_][A-Z0-9_]*)\}/i',
        function ($m) use ($map) {
            $k = $m[1];
            if (!empty($_ENV[$k])) {
                return (string)$_ENV[$k];
            }
            $v = getenv($k);
            if ($v !== false && $v !== '') {
                return (string)$v;
            }
            return $map[$k] ?? $m[0];
        },
        $value
    );
}

function readEnv(string $key): ?string
{
    if (!empty($_ENV[$key])) {
        return expandEnvVars((string)$_ENV[$key]);
    }
    $v = getenv($key);
    if ($v !== false && $v !== '') {
        return expandEnvVars((string)$v);
    }
    $map = loadDotenv();
    if (array_key_exists($key, $map)) {
        return expandEnvVars($map[$key]);
    }
    return null;
}

// ─── Token auth ──────────────────────────────────────────────────────────
$expected = readEnv('PROD_MIGRATION_TOKEN');
$provided = $_GET['token'] ?? $_SERVER['HTTP_X_MIGRATION_TOKEN'] ?? null;
if (!$expected || !is_string($provided) || !hash_equals($expected, $provided)) {
    http_response_code(403);
    echo "403 Forbidden — chybný/chybějící token.\n";
    exit;
}

// ─── DB connect ──────────────────────────────────────────────────────────
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

// ─── Sloupec existuje? ───────────────────────────────────────────────────
$tableExists = (bool)$db->query(<<<'SQL'
    SELECT 1 FROM information_schema.tables WHERE table_name = 'user_device'
SQL)->fetchColumn();

echo "═══════════════════════════════════════════════════════════════\n";
echo " DIAG PUSH — produkční diagnostika push notifikací\n";
echo "═══════════════════════════════════════════════════════════════\n\n";

if (!$tableExists) {
    echo "⚠ Tabulka 'user_device' neexistuje.\n";
    echo "  → Migrace mobile_auth nebyla aplikována.\n";
    exit;
}

// ─── Vypíšeme všechny zaregistrované zařízení ────────────────────────────
$rows = $db->query(<<<'SQL'
    SELECT ud.id, ud.user_id, u.username, ud.platform, ud.device_name,
           ud.fcm_token, ud.created_at, ud.last_seen_at
      FROM user_device ud
      JOIN "user" u ON u.id = ud.user_id
     ORDER BY ud.last_seen_at DESC
SQL)->fetchAll();

echo "Zaregistrovaná zařízení v DB:\n";
echo "─────────────────────────────────────────────────────────────────\n";

if ($rows === false || $rows === []) {
    echo "(žádná) ⚠\n\n";
    echo "Pokud testuješ na Expo Go: push notifikace v Expo Go SDK 53+\n";
    echo "NEFUNGUJÍ. Mobilní app to detekuje a registraci přeskočí.\n";
    echo "Řešení: postavit EAS Development Build a otestovat na něm.\n";
    exit;
}

foreach ($rows as $r) {
    $tokenPrefix = substr((string)$r['fcm_token'], 0, 28);
    $isExpo = str_starts_with((string)$r['fcm_token'], 'ExponentPushToken[');
    printf(
        "  user_id=%-4s  user=%-30s  platform=%-7s  %s\n",
        (string)$r['user_id'],
        (string)($r['username'] ?? ''),
        (string)$r['platform'],
        $isExpo ? '✓ Expo token' : '⚠ NE-Expo token (FCM/APNs raw — nebude fungovat přes ExpoPushService)'
    );
    printf("            token=%s…\n", $tokenPrefix);
    printf("            device=%s\n", (string)($r['device_name'] ?? '∅'));
    printf("            created=%s   last_seen=%s\n",
        (string)$r['created_at'], (string)$r['last_seen_at']);
    echo "\n";
}

echo "─────────────────────────────────────────────────────────────────\n";
echo "Celkem: " . count($rows) . " zařízení.\n\n";

// ─── Volitelný test push ─────────────────────────────────────────────────
$testUserId = isset($_GET['userId']) ? (int)$_GET['userId'] : 0;
$wantTest = isset($_GET['test']) && $_GET['test'] === '1';

if (!$wantTest || $testUserId <= 0) {
    echo "Tip: pro test push přidej &test=1&userId=N do URL.\n";
    exit;
}

$userDevices = array_filter($rows, fn($r) => (int)$r['user_id'] === $testUserId);
if ($userDevices === []) {
    echo "⚠ User #{$testUserId} nemá žádné zaregistrované zařízení.\n";
    exit;
}

$tokens = array_map(fn($r) => (string)$r['fcm_token'], $userDevices);

echo "─────────────────────────────────────────────────────────────────\n";
echo "Test push pro user #{$testUserId} (" . count($tokens) . " zařízení)…\n\n";

$payload = array_map(fn($t) => [
    'to' => $t,
    'sound' => 'default',
    'title' => 'Test notifikace',
    'body' => 'Tato push byla odeslána z diag_push.php — funguje!',
    'data' => ['type' => 'staff_assignment', 'eventId' => 0],
], $tokens);

$ch = curl_init('https://exp.host/--/api/v2/push/send');
curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_HTTPHEADER => [
        'Content-Type: application/json',
        'Accept: application/json',
        'Accept-Encoding: gzip, deflate',
    ],
    CURLOPT_POSTFIELDS => json_encode($payload),
    CURLOPT_POST => true,
    CURLOPT_TIMEOUT => 10,
]);
$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$err = curl_error($ch);
curl_close($ch);

if ($response === false) {
    echo "✗ Síťová chyba: {$err}\n";
    exit;
}

echo "HTTP {$httpCode}\n";
echo "Odpověď Expo Push Service:\n";

$decoded = json_decode((string)$response, true);
if (is_array($decoded)) {
    echo json_encode($decoded, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE) . "\n";

    $data = $decoded['data'] ?? [];
    if (is_array($data)) {
        $okCount = 0;
        $errCount = 0;
        foreach ($data as $item) {
            if (($item['status'] ?? '') === 'ok') {
                $okCount++;
            } else {
                $errCount++;
                $errType = $item['details']['error'] ?? '';
                if ($errType === 'DeviceNotRegistered') {
                    echo "\n⚠ DeviceNotRegistered — token je mrtvý (uživatel app smazal,\n";
                    echo "  nebo token vypršel). Registrace v authStore by měla token\n";
                    echo "  obnovit při dalším loginu.\n";
                }
            }
        }
        echo "\n→ Úspěšné: {$okCount}, Chybové: {$errCount}\n";
        if ($okCount > 0) {
            echo "✓ Push byly přijaté Expo Push Service. Pokud nedorazily na mobil:\n";
            echo "   • Expo Go (SDK 53+) — push v něm nefungují, použij Dev Build\n";
            echo "   • Telefon má vypnuté notifikace pro app v systémových settings\n";
            echo "   • Telefon je offline / FCM/APNs problém u Googlu/Applu\n";
        }
    }
} else {
    echo $response . "\n";
}
