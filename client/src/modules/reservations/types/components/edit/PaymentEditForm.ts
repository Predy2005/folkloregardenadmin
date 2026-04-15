import type { PaymentSummary } from "@shared/types";
import type { UseMutationResult } from "@tanstack/react-query";

export interface PaymentEditFormProps {
  readonly reservationId: number;
  readonly paymentSummary: PaymentSummary | undefined;
  readonly markPaidMutation: UseMutationResult<unknown, Error, { paymentMethod: string; cashboxTarget?: string }, unknown>;
  readonly linkedEvent: { id: number; name: string; hasCashbox: boolean } | null;
  readonly currentCurrency?: string;
}
