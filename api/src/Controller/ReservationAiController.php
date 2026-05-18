<?php

declare(strict_types=1);

namespace App\Controller;

use App\Service\Assistant\AiGatewayService;
use Psr\Log\LoggerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Annotation\Route;
use Symfony\Component\Security\Http\Attribute\IsGranted;

/**
 * Backend proxy pro AI parser rezervací.
 *
 * Frontend `client/src/modules/reservations/utils/ai.ts` původně volal OpenAI
 * **přímo z prohlížeče** s hardcoded API klíčem v JS bundle (security debt
 * §0.1 / §1.1 v `docs/refactor-todo.md`). Tento controller je minimální BE
 * proxy: FE pošle messages array, BE volá `AiGatewayService` s klíčem z env
 * (`AI_SERVER_1_KEY`) a vrátí AI obsah. Veškerá parsing/cleanup/JSON-repair
 * logika zůstává na FE.
 *
 * Cíl tohoto refactoru: klíč pryč z bundle. Plná migrace prompts/parsing na
 * BE je out of scope (separate PR — `parseMultiReservationWithAI` má ~500
 * řádků deterministic regex parserů + JSON repair logiky).
 */
#[Route('/api/reservations')]
final class ReservationAiController extends AbstractController
{
    public function __construct(
        private readonly AiGatewayService $aiGateway,
        private readonly LoggerInterface $logger,
    ) {}

    /**
     * Proxy pro OpenAI chat-completion. FE pošle `messages` array, BE volá
     * AI gateway s env-uloženým klíčem a vrátí jen `content` + `finishReason`.
     *
     * Request body:
     *   {
     *     "messages": [{"role": "system", "content": "..."}, {"role": "user", "content": "..."}],
     *     "temperature": 0,        // optional, default 0.2
     *     "maxTokens": 4096        // optional, default 2000
     *   }
     *
     * Response:
     *   200 OK { "content": string, "finishReason": string }
     *   400 Bad Request — invalid body (chybí messages, prázdné, špatný formát role)
     *   413 Payload Too Large — celková délka contentu přes 50 000 znaků
     *   502 Bad Gateway — AI server selhal
     */
    #[Route('/ai-proxy', methods: ['POST'])]
    #[IsGranted('reservations.create')]
    public function aiProxy(Request $request): JsonResponse
    {
        $data = json_decode($request->getContent(), true);
        if (!is_array($data)) {
            return $this->json(['error' => 'Invalid JSON body'], Response::HTTP_BAD_REQUEST);
        }

        $messages = $data['messages'] ?? null;
        if (!is_array($messages) || empty($messages)) {
            return $this->json(['error' => 'Pole "messages" je povinné a nesmí být prázdné'], Response::HTTP_BAD_REQUEST);
        }

        $totalLength = 0;
        $normalized = [];
        foreach ($messages as $i => $m) {
            if (!is_array($m) || !isset($m['role'], $m['content'])
                || !is_string($m['role']) || !is_string($m['content'])) {
                return $this->json([
                    'error' => sprintf('messages[%d] musí mít role: string a content: string', $i),
                ], Response::HTTP_BAD_REQUEST);
            }
            if (!in_array($m['role'], ['system', 'user', 'assistant'], true)) {
                return $this->json([
                    'error' => sprintf('messages[%d].role musí být system/user/assistant, dostal "%s"', $i, $m['role']),
                ], Response::HTTP_BAD_REQUEST);
            }
            $totalLength += strlen($m['content']);
            $normalized[] = ['role' => $m['role'], 'content' => $m['content']];
        }

        if ($totalLength > 50_000) {
            return $this->json([
                'error' => sprintf('Celková délka contentu přesáhla 50 000 znaků (dostal %d)', $totalLength),
            ], Response::HTTP_REQUEST_ENTITY_TOO_LARGE);
        }

        $options = [];
        if (isset($data['temperature']) && is_numeric($data['temperature'])) {
            $options['temperature'] = (float) $data['temperature'];
        }
        if (isset($data['maxTokens']) && is_int($data['maxTokens']) && $data['maxTokens'] > 0) {
            $options['max_tokens'] = $data['maxTokens'];
        }

        try {
            $result = $this->aiGateway->chat($normalized, $options);
        } catch (\Throwable $e) {
            $this->logger->error('AI proxy: gateway failed', [
                'exception' => $e->getMessage(),
                'message_count' => count($normalized),
                'total_length' => $totalLength,
            ]);
            return $this->json([
                'error' => 'AI služba je dočasně nedostupná',
            ], Response::HTTP_BAD_GATEWAY);
        }

        // AiGatewayService::chat vrací 'finish_reason' jen v tool-call módu;
        // pro plain chat-completion není v current implementaci k dispozici.
        // FE `aiChatCompletion` ho kontroluje pro detekci truncated odpovědi
        // (finishReason === 'length'). Dokud BE neumí finish_reason exponovat,
        // posíláme prázdný string — FE branch pro truncation zůstane neaktivní.
        return $this->json([
            'content' => $result['content'] ?? '',
            'finishReason' => '',
        ]);
    }
}
