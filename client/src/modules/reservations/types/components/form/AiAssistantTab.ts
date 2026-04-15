export interface AiAssistantTabProps {
  readonly aiInput: string;
  readonly setAiInput: (val: string) => void;
  readonly aiJson: Record<string, unknown> | null;
  readonly aiError: string | null;
  readonly aiLoading: boolean;
  readonly onAnalyze: () => void;
  readonly onApply: () => void;
  readonly aiConfigured: boolean;
}
