<?php

declare(strict_types=1);

namespace App\Service\Assistant\Tool;

interface ToolInterface
{
    /** Unique machine name (e.g. "search_reservations"). */
    public function getName(): string;

    /** Short description shown to the LLM. */
    public function getDescription(): string;

    /**
     * JSON-Schema of parameters (OpenAI tool-calling format).
     * @return array<string,mixed>
     */
    public function getParametersSchema(): array;

    /** If true, executes immediately. If false, returns a preview payload that must be confirmed via /api/assistant/confirm. */
    public function isReadOnly(): bool;

    /** Symfony permission name required to use this tool, or null. */
    public function getRequiredPermission(): ?string;

    /**
     * Execute the tool with validated parameters.
     * @param array<string,mixed> $params
     * @return array<string,mixed>
     */
    public function execute(array $params): array;

    /**
     * Build a human-readable preview for destructive tools (null for read-only).
     * @param array<string,mixed> $params
     */
    public function buildPreview(array $params): ?string;
}
