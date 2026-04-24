<?php

declare(strict_types=1);

namespace App\Service\Push;

use Firebase\JWT\JWT;
use Psr\Log\LoggerInterface;
use Psr\Log\NullLogger;
use Symfony\Component\HttpClient\HttpClient;
use Symfony\Contracts\HttpClient\HttpClientInterface;

/**
 * Tenký klient pro Firebase Cloud Messaging HTTP v1 API.
 *
 * Sám si generuje OAuth 2.0 access token ze service-account JWT (RS256)
 * a cachuje ho do skončení procesu (≈ 1 h).
 *
 * Konfigurace (env):
 *   FCM_PROJECT_ID             – id projektu (z service account JSON: "project_id")
 *   FCM_SERVICE_ACCOUNT_FILE   – cesta k service account JSON souboru
 *   nebo
 *   FCM_SERVICE_ACCOUNT_JSON   – JSON inline (pro cloud deploy bez persistent FS)
 *
 * Metody:
 *   sendToToken(token, title, body, data) → int HTTP status
 *   sendToTokens([tokens], title, body, data) → { successes, failures[], invalidTokens[] }
 *
 * `invalidTokens` obsahuje FCM tokeny, které server označil za
 * `UNREGISTERED` nebo `INVALID_ARGUMENT` — volající by je měl smazat z DB.
 */
class FcmClient
{
    private const OAUTH_TOKEN_ENDPOINT = 'https://oauth2.googleapis.com/token';
    private const OAUTH_SCOPE = 'https://www.googleapis.com/auth/firebase.messaging';
    private const TOKEN_TTL_SECONDS = 3600;

    private HttpClientInterface $http;
    private LoggerInterface $logger;
    private ?string $cachedAccessToken = null;
    private int $cachedAccessTokenExpiresAt = 0;
    /** @var array{client_email: string, private_key: string, project_id: string}|null */
    private ?array $serviceAccount = null;

    public function __construct(
        private readonly ?string $projectId,
        private readonly ?string $serviceAccountFile,
        private readonly ?string $serviceAccountJson,
        ?HttpClientInterface $http = null,
        ?LoggerInterface $logger = null,
    ) {
        $this->http = $http ?? HttpClient::create();
        $this->logger = $logger ?? new NullLogger();
    }

    public function isConfigured(): bool
    {
        try {
            $this->loadServiceAccount();
            return true;
        } catch (\Throwable) {
            return false;
        }
    }

    /**
     * Pošle jeden push na jeden token.
     * Vrací `true` = accepted; `false` = token je invalidní (UNREGISTERED) — smaž ho z DB.
     * Výjimku hází jen při nečekané chybě (konfigurační, sítové s 5xx).
     */
    public function sendToToken(string $fcmToken, string $title, string $body, array $data = []): bool
    {
        $result = $this->send($fcmToken, $title, $body, $data);
        return $result['status'] === 'ok';
    }

    /**
     * Pošle stejný push na seznam tokenů — jeden HTTP request per token
     * (HTTP v1 API nemá multicast; v1 batch endpoint byl deprecated 2024-06).
     *
     * @param string[] $fcmTokens
     * @return array{successes: int, failures: int, invalidTokens: array<string>}
     */
    public function sendToTokens(array $fcmTokens, string $title, string $body, array $data = []): array
    {
        $successes = 0;
        $failures = 0;
        $invalid = [];
        foreach ($fcmTokens as $token) {
            try {
                $res = $this->send($token, $title, $body, $data);
                if ($res['status'] === 'ok') {
                    $successes++;
                } elseif ($res['status'] === 'invalid_token') {
                    $failures++;
                    $invalid[] = $token;
                } else {
                    $failures++;
                }
            } catch (\Throwable $e) {
                $failures++;
                $this->logger->warning('FCM send failed (will not retry here): ' . $e->getMessage());
            }
        }
        return ['successes' => $successes, 'failures' => $failures, 'invalidTokens' => $invalid];
    }

    // ─── Interní ─────────────────────────────────────────────────────────

    /**
     * @return array{status: 'ok'|'invalid_token'|'other', httpStatus: int, body?: string}
     */
    private function send(string $fcmToken, string $title, string $body, array $data): array
    {
        $sa = $this->loadServiceAccount();
        $accessToken = $this->getAccessToken();
        $projectId = $this->projectId ?: $sa['project_id'];

        $url = sprintf('https://fcm.googleapis.com/v1/projects/%s/messages:send', $projectId);

        // FCM data musí být mapa string→string (i pro numerické hodnoty).
        $stringData = [];
        foreach ($data as $k => $v) {
            if ($v === null) continue;
            $stringData[(string)$k] = is_scalar($v) ? (string)$v : json_encode($v, JSON_UNESCAPED_UNICODE);
        }

        $payload = [
            'message' => [
                'token' => $fcmToken,
                'notification' => [
                    'title' => $title,
                    'body' => $body,
                ],
                'data' => (object)$stringData, // `(object)` zajistí {} místo [] při prázdném
            ],
        ];

        $response = $this->http->request('POST', $url, [
            'headers' => [
                'Authorization' => 'Bearer ' . $accessToken,
                'Content-Type' => 'application/json; charset=UTF-8',
            ],
            'json' => $payload,
            'timeout' => 10,
        ]);

        $status = $response->getStatusCode();
        if ($status >= 200 && $status < 300) {
            return ['status' => 'ok', 'httpStatus' => $status];
        }

        // Zkusíme dekódovat chybu
        $errorBody = '';
        try {
            $errorBody = $response->getContent(false);
        } catch (\Throwable) {
        }

        // FCM vrací 404 NOT_FOUND nebo 400 INVALID_ARGUMENT pro mrtvé tokeny
        if ($status === 404
            || str_contains($errorBody, 'UNREGISTERED')
            || str_contains($errorBody, 'registration-token-not-registered')
            || (str_contains($errorBody, 'INVALID_ARGUMENT') && str_contains($errorBody, 'token'))
        ) {
            $this->logger->info('FCM token invalid, will be removed', ['status' => $status]);
            return ['status' => 'invalid_token', 'httpStatus' => $status, 'body' => $errorBody];
        }

        $this->logger->warning('FCM send failed', [
            'status' => $status,
            'body' => $errorBody,
        ]);
        return ['status' => 'other', 'httpStatus' => $status, 'body' => $errorBody];
    }

    private function getAccessToken(): string
    {
        if ($this->cachedAccessToken !== null && time() < $this->cachedAccessTokenExpiresAt - 60) {
            return $this->cachedAccessToken;
        }

        $sa = $this->loadServiceAccount();
        $now = time();
        $claims = [
            'iss' => $sa['client_email'],
            'scope' => self::OAUTH_SCOPE,
            'aud' => self::OAUTH_TOKEN_ENDPOINT,
            'iat' => $now,
            'exp' => $now + self::TOKEN_TTL_SECONDS,
        ];

        $assertion = JWT::encode($claims, $sa['private_key'], 'RS256');

        $response = $this->http->request('POST', self::OAUTH_TOKEN_ENDPOINT, [
            'body' => [
                'grant_type' => 'urn:ietf:params:oauth:grant-type:jwt-bearer',
                'assertion' => $assertion,
            ],
            'timeout' => 10,
        ]);

        $status = $response->getStatusCode();
        if ($status < 200 || $status >= 300) {
            throw new \RuntimeException('OAuth2 token request failed: ' . $response->getContent(false));
        }

        $json = $response->toArray(false);
        if (empty($json['access_token'])) {
            throw new \RuntimeException('OAuth2 response missing access_token.');
        }

        $this->cachedAccessToken = (string)$json['access_token'];
        $expiresIn = (int)($json['expires_in'] ?? self::TOKEN_TTL_SECONDS);
        $this->cachedAccessTokenExpiresAt = $now + $expiresIn;

        return $this->cachedAccessToken;
    }

    /**
     * @return array{client_email: string, private_key: string, project_id: string}
     */
    private function loadServiceAccount(): array
    {
        if ($this->serviceAccount !== null) {
            return $this->serviceAccount;
        }

        $raw = null;
        if ($this->serviceAccountJson && trim($this->serviceAccountJson) !== '') {
            $raw = $this->serviceAccountJson;
        } elseif ($this->serviceAccountFile && is_readable($this->serviceAccountFile)) {
            $raw = file_get_contents($this->serviceAccountFile);
        }

        if (!$raw) {
            throw new \RuntimeException(
                'FCM není nakonfigurované: chybí FCM_SERVICE_ACCOUNT_FILE nebo FCM_SERVICE_ACCOUNT_JSON v .env.'
            );
        }

        $decoded = json_decode((string)$raw, true);
        if (!is_array($decoded)) {
            throw new \RuntimeException('Service account JSON je neplatný: ' . json_last_error_msg());
        }
        foreach (['client_email', 'private_key', 'project_id'] as $required) {
            if (empty($decoded[$required])) {
                throw new \RuntimeException("Service account JSON neobsahuje pole \"$required\".");
            }
        }

        return $this->serviceAccount = [
            'client_email' => (string)$decoded['client_email'],
            'private_key' => (string)$decoded['private_key'],
            'project_id' => (string)$decoded['project_id'],
        ];
    }
}
