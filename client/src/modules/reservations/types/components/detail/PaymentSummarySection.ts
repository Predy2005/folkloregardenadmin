import type { PaymentSummary } from "@shared/types";

export interface PaymentSummarySectionProps {
  readonly paymentSummary: PaymentSummary | undefined;
  readonly isLoading: boolean;
  readonly isAnyMutationPending: boolean;
  readonly onCreateDeposit: (percent: number) => void;
  readonly onCreateFinalInvoice: () => void;
  readonly onMarkAsPaid: (method: string) => void;
  readonly isDepositPending: boolean;
  readonly isFinalPending: boolean;
  readonly isMarkPaidPending: boolean;
}
