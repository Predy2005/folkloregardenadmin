import type { PaymentSummary } from "@shared/types";

export interface PaymentSummaryCardsProps {
  readonly paymentSummary: PaymentSummary | undefined;
  readonly summaryLoading: boolean;
  readonly isAnyInvoiceMutationPending: boolean;
  readonly linkedEvent: { id: number; name: string; hasCashbox: boolean } | null;
  readonly currentCurrency?: string;
  readonly onOpenConfirm: (method: string) => void;
  readonly onOpenEditDialog: () => void;
  readonly onCreateInvoice: (type: "DEPOSIT" | "FINAL", percent?: number) => void;
}
