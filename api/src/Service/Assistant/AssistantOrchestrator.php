<?php

declare(strict_types=1);

namespace App\Service\Assistant;

use App\Entity\AssistantActionLog;
use Doctrine\ORM\EntityManagerInterface;
use Psr\Log\LoggerInterface;
use Symfony\Bundle\SecurityBundle\Security;

/**
 * Runs the chat loop:
 *  1. Send user history + tools to LLM
 *  2. If LLM returns tool_calls, execute them (or stage for confirmation)
 *  3. Feed tool results back to LLM and loop up to N times
 *  4. Return final assistant message + any pending actions requiring confirmation
 */
final class AssistantOrchestrator
{
    private const MAX_ITERATIONS = 4;

    public function __construct(
        private readonly AiGatewayService $ai,
        private readonly ToolRegistry $registry,
        private readonly EntityManagerInterface $em,
        private readonly Security $security,
        private readonly LoggerInterface $logger,
    ) {}

    /**
     * @param list<array{role:string,content:string}> $history User-facing conversation history
     * @param array{currentRoute?:string} $context Optional UI context (current route, etc.)
     * @return array{reply:string, links:list<array<string,mixed>>, pendingActions:list<array<string,mixed>>, meta:array<string,mixed>}
     */
    public function chat(array $history, array $context = []): array
    {
        $systemPrompt = $this->buildSystemPrompt($context);
        $messages = array_merge(
            [['role' => 'system', 'content' => $systemPrompt]],
            $history
        );

        $toolSchemas = $this->registry->buildToolSchemas();
        $pendingActions = [];
        $collectedLinks = [];
        $iterationsUsed = 0;
        $finalContent = '';
        $meta = [];

        for ($i = 0; $i < self::MAX_ITERATIONS; $i++) {
            $iterationsUsed++;
            $response = $this->ai->chat($messages, ['tools' => $toolSchemas]);
            $meta = ['server' => $response['server'], 'model' => $response['model'], 'iterations' => $iterationsUsed];

            $toolCalls = $response['tool_calls'];
            if (empty($toolCalls)) {
                $finalContent = $response['content'] ?? '';
                break;
            }

            // Append the assistant message with tool_calls to keep protocol valid
            $messages[] = [
                'role' => 'assistant',
                'content' => $response['content'] ?? '',
                'tool_calls' => $toolCalls,
            ];

            foreach ($toolCalls as $call) {
                $fn = $call['function'] ?? [];
                $name = (string)($fn['name'] ?? '');
                $args = [];
                if (!empty($fn['arguments']) && is_string($fn['arguments'])) {
                    $decoded = json_decode($fn['arguments'], true);
                    if (is_array($decoded)) $args = $decoded;
                } elseif (is_array($fn['arguments'] ?? null)) {
                    $args = $fn['arguments'];
                }

                $toolResult = $this->runTool($name, $args, $pendingActions, $collectedLinks);

                $messages[] = [
                    'role' => 'tool',
                    'tool_call_id' => (string)($call['id'] ?? ''),
                    'name' => $name,
                    'content' => json_encode($toolResult, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
                ];
            }
        }

        if ($finalContent === '') {
            $finalContent = 'Hotovo.';
        }

        return [
            'reply' => $finalContent,
            'links' => $collectedLinks,
            'pendingActions' => $pendingActions,
            'meta' => $meta,
        ];
    }

    /**
     * @param array<string,mixed> $args
     * @param list<array<string,mixed>> $pendingActions
     * @param list<array<string,mixed>> $collectedLinks
     * @return array<string,mixed>
     */
    private function runTool(string $name, array $args, array &$pendingActions, array &$collectedLinks): array
    {
        $tool = $this->registry->get($name);
        if (!$tool) {
            return ['error' => "Neznámý nástroj: $name"];
        }

        $permission = $tool->getRequiredPermission();
        if ($permission && !$this->security->isGranted($permission)) {
            return ['error' => "Uživatel nemá oprávnění ($permission)."];
        }

        if (!$tool->isReadOnly()) {
            $log = new AssistantActionLog();
            $log->setToolName($name);
            $log->setParams($args);
            $log->setPreview($tool->buildPreview($args));
            $user = $this->security->getUser();
            if (method_exists($user, 'getId')) {
                $log->setUserId((int)$user->getId());
            }
            $this->em->persist($log);
            $this->em->flush();

            $pendingActions[] = [
                'actionId' => $log->getActionId(),
                'tool' => $name,
                'preview' => $log->getPreview(),
                'params' => $args,
            ];

            return [
                'status' => 'pending_confirmation',
                'actionId' => $log->getActionId(),
                'preview' => $log->getPreview(),
                'message' => 'Akce čeká na potvrzení uživatelem. Ve své odpovědi popiš, co se chystá udělat, a informuj uživatele, aby klikl na Potvrdit.',
            ];
        }

        try {
            $result = $tool->execute($args);
            // Harvest links for UI rendering (if tool returned items[].link)
            if (!empty($result['items']) && is_array($result['items'])) {
                foreach ($result['items'] as $it) {
                    if (is_array($it) && isset($it['link'], $it['label'])) {
                        $collectedLinks[] = [
                            'label' => (string)$it['label'],
                            'url' => (string)$it['link'],
                            'meta' => (string)($it['meta'] ?? ''),
                        ];
                    }
                }
            }
            return $result;
        } catch (\Throwable $e) {
            $this->logger->error('Tool {name} failed: {msg}', ['name' => $name, 'msg' => $e->getMessage()]);
            return ['error' => 'Chyba při volání '.$name.': '.$e->getMessage()];
        }
    }

    /** @param array{currentRoute?:string} $context */
    private function buildSystemPrompt(array $context = []): string
    {
        $today = date('Y-m-d');
        $year = date('Y');
        $prompt = <<<PROMPT
Jsi AI asistent pro administrační systém Folklore Garden Admin. Odpovídáš česky, stručně a přátelsky.

DNEŠNÍ DATUM: $today
Když uživatel řekne měsíc bez roku (např. „červen", „září"), doplň aktuální rok $year.
České měsíce → čísla: leden=01, únor=02, březen=03, duben=04, květen=05, červen=06, červenec=07, srpen=08, září=09, říjen=10, listopad=11, prosinec=12.
Pro hledání „akce na červen" použij: search_events(dateFrom="$year-06-01", dateTo="$year-06-30").
Pro „příští týden" spočítej konkrétní data od dnešního dne.

DŮLEŽITÉ PRAVIDLA:
- Pro HLEDÁNÍ v systému (rezervace, akce, kontakty, personál) VŽDY volej odpovídající tool. Nevymýšlej si data.
- Pro NÁPOVĚDU a "jak na to" dotazy volej `get_help_topic`. Nikdy nevymýšlej routy, používej ty, které vrátí tool.
- Pro AKCE (vytvoření kontaktu, rezervace, personálu, rozsazení hostů) volej příslušný tool. Systém si akci zapamatuje a vyžádá od uživatele potvrzení — to je správně a očekávané.
- Pro ANALÝZU akce volej `analyse_event_setup` — vrátí doporučení z historických dat (rozsazení, šablona, prostory, staffing, národnostní rozložení). Použij vždy, když se uživatel ptá „jak to bylo minule", „jak rozsadit", „jaké rozsazení" nebo „příprava akce".
- Pro DOPORUČENÍ parametrů nové akce volej `suggest_next_event`.
- Pro ROZSAZENÍ hostů volej `auto_seat_guests`. Výchozí strategie "smart" využije historii podobných akcí. Nabídni uživateli i alternativní strategie (group_by_reservation, group_by_nationality, mixed) pokud se zeptá.
- Když tool vrátí výsledky, shrň je v přehledné odpovědi. Odkazy piš ve formátu [popisek](/cesta).
- Pokud tool vrátí 0 výsledků, řekni to otevřeně a navrhni alternativní hledání.
- Pokud tool vrátí status `pending_confirmation`, popiš uživateli, co se chystá, a ať klikne na Potvrdit.
- Nepoužívej markdown nadpisy (#) ani tučné písmo. Jen odkazy [text](url) a pomlčkové odrážky.

PROMPT;

        $route = trim((string)($context['currentRoute'] ?? ''));
        if ($route !== '') {
            $prompt .= "\nUŽIVATEL JE AKTUÁLNĚ NA STRÁNCE: $route\n";
            if (preg_match('#^/events/(\d+)(/dashboard|/edit|/waiter)?#', $route, $m)) {
                $prompt .= "Když mluví o „této akci\", „tady\" nebo „aktuálním eventu\", jde o akci ID {$m[1]}. Pro rozsazení hostů použij eventId={$m[1]}.\n";
            } elseif (preg_match('#^/reservations/(\d+)#', $route, $m)) {
                $prompt .= "„Tato rezervace\" = ID {$m[1]}.\n";
            }
        }

        return $prompt;
    }
}
