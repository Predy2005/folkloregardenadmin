<?php

declare(strict_types=1);

namespace App\Service\Assistant;

use Psr\Log\LoggerInterface;
use Symfony\Contracts\HttpClient\HttpClientInterface;

/**
 * Sends chat-completion requests to the configured AI server.
 *
 * Configure via env (api/.env or .env.local):
 *   AI_SERVER_1_URL, AI_SERVER_1_KEY, AI_SERVER_1_MODEL
 */
final class AiGatewayService
{
    /** @var list<array{url:string,key:string,model:string,label:string}> */
    private array $servers;

    public function __construct(
        private readonly HttpClientInterface $httpClient,
        private readonly LoggerInterface $logger,
        ?string $server1Url = null,
        ?string $server1Key = null,
        ?string $server1Model = null,
    ) {
        $this->servers = [];
        $s1Url = (string)($server1Url ?? '');
        if ($s1Url !== '') {
            $this->servers[] = [
                'url' => rtrim($s1Url, '/'),
                'key' => (string)($server1Key ?? ''),
                'model' => (string)($server1Model ?? ''),
                'label' => 'ai1',
            ];
        }
    }

    /**
     * @param list<array{role:string,content:string}> $messages
     * @param array{tools?:list<array<string,mixed>>, tool_choice?:mixed, temperature?:float, max_tokens?:int} $options
     * @return array{content:?string, tool_calls:list<array<string,mixed>>, server:string, model:string}
     */
    public function chat(array $messages, array $options = []): array
    {
        if (empty($this->servers)) {
            throw new \RuntimeException('No AI servers configured (set AI_SERVER_*_URL env vars).');
        }

        $lastError = null;
        foreach ($this->servers as $server) {
            try {
                $payload = [
                    'model' => $server['model'],
                    'messages' => $messages,
                    'temperature' => $options['temperature'] ?? 0.2,
                    'max_tokens' => $options['max_tokens'] ?? 2000,
                ];
                if (!empty($options['tools'])) {
                    $payload['tools'] = $options['tools'];
                    $payload['tool_choice'] = $options['tool_choice'] ?? 'auto';
                }

                $response = $this->httpClient->request('POST', $server['url'].'/v1/chat/completions', [
                    'headers' => [
                        'Content-Type' => 'application/json',
                        'Authorization' => 'Bearer '.$server['key'],
                    ],
                    'json' => $payload,
                    'timeout' => 240,
                ]);

                $data = $response->toArray(false);
                $message = $data['choices'][0]['message'] ?? null;
                if (!is_array($message)) {
                    throw new \RuntimeException('Malformed AI response from '.$server['label']);
                }

                return [
                    'content' => is_string($message['content'] ?? null) ? $message['content'] : null,
                    'tool_calls' => is_array($message['tool_calls'] ?? null) ? $message['tool_calls'] : [],
                    'server' => $server['label'],
                    'model' => $server['model'],
                ];
            } catch (\Throwable $e) {
                $lastError = $e;
                $this->logger->warning('AI server {label} failed: {msg}', [
                    'label' => $server['label'],
                    'msg' => $e->getMessage(),
                ]);
            }
        }

        throw new \RuntimeException('All AI servers failed: '.($lastError?->getMessage() ?? 'unknown error'), 0, $lastError);
    }
}
