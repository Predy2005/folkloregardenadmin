import { Button } from '@/shared/components/ui/button';
import { FormLabel } from '@/shared/components/ui/form';
import { Textarea } from '@/shared/components/ui/textarea';
import type { AiAssistantTabProps } from '@modules/reservations/types/components/form/AiAssistantTab';

export function AiAssistantTab({
  aiInput,
  setAiInput,
  aiJson,
  aiError,
  aiLoading,
  onAnalyze,
  onApply,
  aiConfigured,
}: AiAssistantTabProps) {
  return (
    <div className="space-y-4">
      {!aiConfigured && (
        <div className="p-3 rounded-md bg-yellow-100 text-yellow-900 text-sm">
          AI není nakonfigurováno. Žádné AI servery nejsou dostupné.
        </div>
      )}

      <div className="space-y-2">
        <FormLabel>Vložte e‑mail / konverzaci ke zpracování</FormLabel>
        <Textarea
          value={aiInput}
          onChange={(e) => setAiInput(e.target.value)}
          placeholder="Sem vložte text e‑mailu…"
          className="min-h-48"
          data-testid="ai-input-text"
        />
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="secondary"
            onClick={onAnalyze}
            disabled={aiLoading}
            data-testid="ai-button-analyze"
          >
            {aiLoading ? 'Analýza…' : 'Analyzovat AI'}
          </Button>
          <Button
            type="button"
            onClick={onApply}
            disabled={!aiJson}
            data-testid="ai-button-apply"
          >
            Použít do formuláře
          </Button>
        </div>
      </div>

      {aiError && (
        <div className="p-3 rounded-md bg-destructive/10 text-destructive" data-testid="ai-error">
          {aiError}
        </div>
      )}

      {aiJson && (
        <div className="space-y-2">
          <FormLabel>Náhled AI JSON</FormLabel>
          <pre className="p-3 bg-muted rounded-md overflow-auto text-xs max-h-64" data-testid="ai-json-preview">
            {JSON.stringify(aiJson, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
