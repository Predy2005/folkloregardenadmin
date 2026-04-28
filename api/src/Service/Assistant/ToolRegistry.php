<?php

declare(strict_types=1);

namespace App\Service\Assistant;

use App\Service\Assistant\Tool\ToolInterface;

final class ToolRegistry
{
    /** @var array<string, ToolInterface> */
    private array $tools = [];

    /** @param iterable<ToolInterface> $tools */
    public function __construct(iterable $tools)
    {
        foreach ($tools as $t) {
            $this->tools[$t->getName()] = $t;
        }
    }

    public function get(string $name): ?ToolInterface
    {
        return $this->tools[$name] ?? null;
    }

    /** @return array<string, ToolInterface> */
    public function all(): array
    {
        return $this->tools;
    }

    /**
     * Build OpenAI tool-calling schema for the LLM.
     * @return list<array<string,mixed>>
     */
    public function buildToolSchemas(): array
    {
        $out = [];
        foreach ($this->tools as $t) {
            $out[] = [
                'type' => 'function',
                'function' => [
                    'name' => $t->getName(),
                    'description' => $t->getDescription(),
                    'parameters' => $t->getParametersSchema(),
                ],
            ];
        }
        return $out;
    }
}
