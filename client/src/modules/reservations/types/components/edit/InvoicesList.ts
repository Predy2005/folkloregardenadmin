import type { Invoice } from "@shared/types";
import type { UseMutationResult } from "@tanstack/react-query";

export interface InvoicesListProps {
  readonly reservationId: number;
  readonly invoices: Invoice[] | undefined;
  readonly invoicesLoading: boolean;
  readonly markInvoicePaidMutation: UseMutationResult<unknown, Error, number, unknown>;
}
