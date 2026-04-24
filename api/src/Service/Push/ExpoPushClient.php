<?php

declare(strict_types=1);

namespace App\Service\Push;

use Psr\Log\LoggerInterface;
use Psr\Log\NullLogger;
use Symfony\Component\HttpClient\HttpClient;
use Symfony\Contracts\HttpClient\HttpClientInterface;

/**
 * Tenký klient pro Expo Push Service (https://exp.host/--/api/v2/push/send).
 *
 * Expo Push Service je wrapper nad FCM (Android) / APNs (iOS). Tokeny mají
 * tvar `ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]` a jsou opaque pro backend
 * — identifikují zařízení u Expo, ne u Google/Apple přímo.
 *
 * Výhoda: žádný Firebase SDK / `google-services.json` na mobilu, Expo Go
 * v dev plně funguje. Nevýhoda: Expo je middleman (občasné výpadky), retries
 * jsou na volajícím.
 *
 * Konfigurace (env):
 *   EXPO_ACCESS_TOKEN – (volitelné) token pro enhanced rate limits;
 *                       bez něj se volá anonymously (stačí pro malý CRM).
 *
 * API docs: https://docs.expo.dev/push-notifications/sending-notifications/
 *
 * Rate limit anonymous: ~100 notifikací/sekundu na IP. S access tokenem vyšší.
 * Request size limit: 100 zpráv na jeden POST.
 */
class ExpoPushClient
{
    private const EXPO_ENDPOINT = 'https://exp.host/--/api/v2/push/send';
    private const MAX_BATCH_SIZE = 100;

    private HttpClientInterface $http;
    private LoggerInterface $logger;

    public function __construct(
        private readonly ?string $accessToken = null,
        ?HttpClientInterface $http = null,
        ?LoggerInterface $logger = null,
    ) {
        $this->http = $http ?? HttpClient::create();
        $this->logger = $logger ?? new NullLogger();
    }

    /**
     * Expo Push Service nepotřebuje žádnou konfiguraci pro anonymous použití —
     * vždy considered configured. Metoda zachovává signaturu FcmClient pro
     * drop-in záměnu.
     */
    public function isConfigured(): bool
    {
        return true;
    }

    /**
     * Pošle jeden push na jeden Expo token.
     * Vrací `true` = accepted; `false` = token je invalidní (DeviceNotRegistered).
     * Výjimku hází při nečekané síťové / 5xx chybě.
     */
    public function sendToToken(string $expoToken, string $title, string $body, array $data = []): bool
    {
        $result = $this->sendToTokens([$expoToken], $title, $body, $data);
        return $result['successes'] === 1;
    }

    /**
     * Pošle stejný push na seznam tokenů v jednom HTTP requestu
     * (Expo podporuje batch až 100 zpráv na request).
     *
     * @param string[] $tokens
     * @param array<string, mixed> $data
     * @return array{
     *   successes: int,
     *   failures: array<int, array{token: string, error: string}>,
     *   invalidTokens: array<int, string>
     * }
     */
    public function sendToTokens(array $tokens, string $title, string $body, array $data = []): array
    {
        $successes = 0;
        $failures = [];
        $invalidTokens = [];

        foreach (array_chunk($tokens, self::MAX_BATCH_SIZE) as $chunk) {
            $messages = array_map(
                fn(string $token) => [
                    'to' => $token,
                    'title' => $title,
                    'body' => $body,
                    'data' => $data,
                    'sound' => 'default',
                    'priority' => 'high',
                    // channelId je povinný na Androidu 8+; Expo defaultuje na "default"
                    // když ho vynecháme, ale explicit je lepší.
                    'channelId' => 'default',
                ],
                $chunk,
            );

            try {
                $headers = [
                    'Accept' => 'application/json',
                    'Accept-Encoding' => 'gzip, deflate',
                    'Content-Type' => 'application/json',
                ];
                if ($this->accessToken !== null && $this->accessToken !== '') {
                    $headers['Authorization'] = 'Bearer ' . $this->accessToken;
                }

                $response = $this->http->request('POST', self::EXPO_ENDPOINT, [
                    'headers' => $headers,
                    'json' => $messages,
                    'timeout' => 10,
                ]);
                $statusCode = $response->getStatusCode();
                $payload = $response->toArray(false);
            } catch (\Throwable $e) {
                $this->logger->error('Expo push HTTP selhal: ' . $e->getMessage());
                foreach ($chunk as $token) {
                    $failures[] = ['token' => $token, 'error' => 'http_error'];
                }
                continue;
            }

            if ($statusCode >= 500) {
                $this->logger->error('Expo push 5xx: ' . $statusCode);
                foreach ($chunk as $token) {
                    $failures[] = ['token' => $token, 'error' => 'server_error_' . $statusCode];
                }
                continue;
            }

            // Response shape: { "data": [ { "status": "ok|error", ... } ] }
            $tickets = $payload['data'] ?? [];
            foreach ($tickets as $idx => $ticket) {
                $token = $chunk[$idx] ?? null;
                if ($token === null) {
                    continue;
                }
                $status = $ticket['status'] ?? 'error';
                if ($status === 'ok') {
                    $successes++;
                    continue;
                }

                $errorCode = $ticket['details']['error'] ?? ($ticket['message'] ?? 'unknown');
                $failures[] = ['token' => $token, 'error' => (string)$errorCode];

                // DeviceNotRegistered = trvale mrtvý token — volající ho smaže z DB.
                // Ostatní (MessageTooBig, InvalidCredentials) jsou opravitelné.
                if ($errorCode === 'DeviceNotRegistered') {
                    $invalidTokens[] = $token;
                }
            }
        }

        return [
            'successes' => $successes,
            'failures' => $failures,
            'invalidTokens' => $invalidTokens,
        ];
    }
}
