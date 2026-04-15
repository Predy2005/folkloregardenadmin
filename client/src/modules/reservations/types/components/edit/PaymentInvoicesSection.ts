import type { Invoice, PaymentSummary } from "@shared/types";
import type { UseMutationResult } from "@tanstack/react-query";

export interface PaymentInvoicesSectionProps {
  readonly reservationId: number;
  readonly paymentSummary: PaymentSummary | undefined;
  readonly summaryLoading: boolean;
  readonly invoices: Invoice[] | undefined;
  readonly invoicesLoading: boolean;
  readonly currentCurrency?: string;
  // Mutations
  readonly markPaidMutation: UseMutationResult<unknown, Error, { paymentMethod: string; cashboxTarget?: string }, unknown>;
  readonly markInvoicePaidMutation: UseMutationResult<unknown, Error, number, unknown>;
  readonly isAnyInvoiceMutationPending: boolean;
  // Invoice dialog
  readonly setInvoiceDialogType: (type: "DEPOSIT" | "FINAL") => void;
  readonly setInvoiceDialogPercent: (percent: number) => void;
  readonly setInvoiceDialogOpen: (open: boolean) => void;
}
