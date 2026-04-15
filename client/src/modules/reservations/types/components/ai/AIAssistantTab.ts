import type React from "react";
import type { AiParsedMultiReservation } from "@modules/reservations/utils/ai";

export interface AIAssistantTabProps {
  readonly aiInput: string;
  readonly setAiInput: (value: string) => void;
  readonly aiJson: AiParsedMultiReservation | null;
  readonly aiError: string | null;
  readonly aiLoading: boolean;
  readonly fileProcessing: boolean;
  readonly fileInputRef: React.RefObject<HTMLInputElement>;
  readonly handleFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  readonly handleAiAnalyze: () => void;
  readonly handleAiApply: () => void;
  readonly currency: string;
}
