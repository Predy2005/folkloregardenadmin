import type { Invoice } from "@shared/types";
import type { UseMutationResult } from "@tanstack/react-query";

export interface InvoiceListSectionProps {
  readonly invoices: Invoice[] | undefined;
  readonly isLoading: boolean;
  readonly markInvoicePaidMutation: UseMutationResult<unknown, Error, number>;
}
