<?php

declare(strict_types=1);

/**
 * Sdílený runner pro produkční migrace.
 *
 * Bez Symfony/Doctrine — používá POUZE nativní PDO a parsuje .env ručně,
 * takže se dá zkopírovat samostatně na produkční server a spustit přes
 * CLI (`php run.php`) nebo browser (`run.php?token=...`).
 *
 * Každá migrace:
 *   - Kontroluje svůj záznam v `doctrine_migration_versions` (stejná tabulka,
 *     kterou používá Doctrine Migrations) — pokud už je aplikovaná, přeskočí.
 *   - Spouští se v jedné transakci. Při chybě rollback, DB je beze změny.
 *   - Po úspěchu vloží záznam s NOW() do `doctrine_migration_versions`,
 *     takže Doctrine tu samou migraci znovu nespustí.
 *
 * Bezpečnost:
 *   - CLI: povoleno vždy.
 *   - HTTP: vyžaduje `?token=XXX` nebo header `X-Migration-Token: XXX`.
 *     Token čte z env proměnné `PROD_MIGRATION_TOKEN`. Pokud env není
 *     nastavená, HTTP přístup je zakázaný.
 */
class ProductionMigrationRunner
{
    private PDO $db;
    private bool $isWeb;
    private bool $hasErrors = false;

    public function __construct()
    {
        $this->isWeb = \PHP_SAPI !== 'cli';

        if ($this->isWeb) {
            $this->authorizeWebAccess();
            header('Content-Type: text/plain; charset=utf-8');
            // Průběžné vypisování i přes proxy
            @ini_set('output_buffering', 'off');
            @ini_set('zlib.output_compression', '0');
            while (ob_get_level() > 0) {
                ob_end_flush();
            }
            @ob_implicit_flush(true);
        }

        $this->connect();
        $this->ensureMigrationTable();
    }

    public function migrate(string $version, string $description, callable $up): void
    {
        $this->log('');
        $this->log('────────────────────────────────────────────────────────────────');
        $this->log("➤ {$version}");
        $this->log("  {$description}");

        try {
            if ($this->isVersionApplied($version)) {
                $this->log('  ✓ Už aplikováno — přeskočeno.');
                return;
            }

            $this->db->beginTransaction();
            try {
                $up($this->db, $this);
                $stmt = $this->db->prepare(
                    'INSERT INTO doctrine_migration_versions (version, executed_at, execution_time) VALUES (:v, NOW(), 0)'
                );
                $stmt->execute(['v' => $version]);
                $this->db->commit();
                $this->log('  ✓ Úspěšně aplikováno a zapsáno do doctrine_migration_versions.');
            } catch (\Throwable $e) {
                if ($this->db->inTransaction()) {
                    $this->db->rollBack();
                }
                throw $e;
            }
        } catch (\Throwable $e) {
            $this->hasErrors = true;
            $this->log('  ✗ CHYBA: ' . $e->getMessage());
            $this->log('  ↪ DB rollback proveden, žádná data nezměněna.');
            if ($this->isWeb) {
                http_response_code(500);
            } else {
                fwrite(\STDERR, "Chyba v migraci {$version}: " . $e->getMessage() . "\n");
            }
            // Pokračuj na další migraci — nezastavovat celý běh.
        }
    }

    public function finish(): void
    {
        $this->log('');
        $this->log('────────────────────────────────────────────────────────────────');
        if ($this->hasErrors) {
            $this->log('✗ Dokončeno s CHYBAMI. Zkontroluj výše.');
        } else {
            $this->log('✓ Všechny migrace úspěšně zpracovány.');
        }
    }

    public function log(string $msg): void
    {
        if ($this->isWeb) {
            echo $msg . "\n";
            @flush();
        } else {
            fwrite(\STDOUT, $msg . "\n");
        }
    }

    public function db(): PDO
    {
        return $this->db;
    }

    // ─── Interní ─────────────────────────────────────────────────────────

    private function authorizeWebAccess(): void
    {
        $expected = $this->getEnv('PROD_MIGRATION_TOKEN');
        if (!$expected || trim($expected) === '') {
            $this->httpDeny('Migrace přes HTTP jsou vypnuté. Nastav PROD_MIGRATION_TOKEN v .env.local a zkus to znovu.');
        }
        $provided = $_GET['token']
            ?? $_POST['token']
            ?? ($_SERVER['HTTP_X_MIGRATION_TOKEN'] ?? null);
        if (!is_string($provided) || !hash_equals($expected, $provided)) {
            $this->httpDeny('Chybný nebo chybějící token.');
        }
    }

    private function httpDeny(string $msg): void
    {
        http_response_code(403);
        header('Content-Type: text/plain; charset=utf-8');
        echo "403 Forbidden\n\n{$msg}\n";
        exit;
    }

    private function connect(): void
    {
        $url = $this->getEnv('DATABASE_URL');
        if (!$url) {
            $this->fail('DATABASE_URL není nastaveno v prostředí nebo .env(.local).');
        }

        $parts = parse_url($url);
        if (!$parts || !isset($parts['scheme']) || !in_array(strtolower($parts['scheme']), ['postgresql', 'postgres', 'pgsql'], true)) {
            $this->fail('DATABASE_URL musí být PostgreSQL (postgresql://user:pass@host:port/dbname).');
        }

        $host = $parts['host'] ?? 'localhost';
        $port = $parts['port'] ?? 5432;
        $db = isset($parts['path']) ? ltrim($parts['path'], '/') : '';
        $user = isset($parts['user']) ? urldecode((string)$parts['user']) : null;
        $pass = isset($parts['pass']) ? urldecode((string)$parts['pass']) : null;

        if ($db === '') {
            $this->fail('DATABASE_URL neobsahuje název databáze.');
        }

        $dsn = sprintf('pgsql:host=%s;port=%d;dbname=%s', $host, $port, $db);

        try {
            $this->db = new PDO($dsn, $user, $pass, [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            ]);
            $this->log("Připojeno k DB: {$host}:{$port}/{$db}");
        } catch (\PDOException $e) {
            $this->fail('Připojení k databázi selhalo: ' . $e->getMessage());
        }
    }

    private function ensureMigrationTable(): void
    {
        // Tabulka by měla existovat (Doctrine ji vytvoří při prvním migrate),
        // ale pro fresh DB ji případně dozakládáme.
        $this->db->exec(<<<'SQL'
            CREATE TABLE IF NOT EXISTS doctrine_migration_versions (
                version VARCHAR(191) PRIMARY KEY,
                executed_at TIMESTAMP(0) WITHOUT TIME ZONE DEFAULT NULL,
                execution_time INTEGER DEFAULT NULL
            )
        SQL);
    }

    private function isVersionApplied(string $version): bool
    {
        $stmt = $this->db->prepare('SELECT 1 FROM doctrine_migration_versions WHERE version = :v');
        $stmt->execute(['v' => $version]);
        return (bool)$stmt->fetchColumn();
    }

    private function getEnv(string $key): ?string
    {
        // Priorita: reálné env > .env.local > .env. Pro .env.* se cache načítá jednou
        // a teprve potom se v hodnotách rozbalí `${VAR}` reference.
        if (!empty($_ENV[$key])) {
            return $this->expandEnvVars((string)$_ENV[$key]);
        }
        $val = getenv($key);
        if ($val !== false && $val !== '') {
            return $this->expandEnvVars((string)$val);
        }
        $map = $this->loadDotenv();
        if (array_key_exists($key, $map)) {
            return $this->expandEnvVars($map[$key], $map);
        }
        return null;
    }

    /** @var array<string, string>|null */
    private ?array $dotenvCache = null;

    /**
     * @return array<string, string>
     */
    private function loadDotenv(): array
    {
        if ($this->dotenvCache !== null) {
            return $this->dotenvCache;
        }
        $map = [];
        // Načti v pořadí .env → .env.local, takže .local přepíše defaults
        foreach (['.env', '.env.local'] as $rel) {
            $path = realpath(__DIR__ . '/../' . $rel);
            if (!$path || !is_readable($path)) {
                continue;
            }
            $lines = file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) ?: [];
            foreach ($lines as $line) {
                $line = trim($line);
                if ($line === '' || $line[0] === '#') {
                    continue;
                }
                if (!str_contains($line, '=')) {
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
        return $this->dotenvCache = $map;
    }

    /**
     * Expanduje `${VAR}` reference v hodnotě. Hledá nejdřív v reálném env,
     * pak v načteném .env map (druhý argument — předáváme při rekurzi, aby
     * se neopakoval disk lookup).
     *
     * @param array<string,string>|null $map
     */
    private function expandEnvVars(string $value, ?array $map = null): string
    {
        if (!str_contains($value, '${')) {
            return $value;
        }
        $map = $map ?? $this->loadDotenv();
        return preg_replace_callback(
            '/\$\{([A-Z_][A-Z0-9_]*)\}/i',
            function ($m) use ($map) {
                $k = $m[1];
                if (!empty($_ENV[$k])) return (string)$_ENV[$k];
                $v = getenv($k);
                if ($v !== false && $v !== '') return (string)$v;
                return $map[$k] ?? $m[0]; // pokud nenajdeme, necháme placeholder
            },
            $value
        );
    }

    private function fail(string $msg): void
    {
        $this->log('✗ FATAL: ' . $msg);
        if ($this->isWeb) {
            http_response_code(500);
        }
        exit(1);
    }
}
