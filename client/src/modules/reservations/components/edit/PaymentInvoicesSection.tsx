import { useQuery } from "@tanstack/react-query";
import { api } from "@/shared/lib/api";
import type { Invoice, PaymentSummary } from "@shared/types";
import type { UseMutationResult } from "@tanstack/react-query";
import { PaymentSummaryCards } from "./PaymentSummaryCards";
import { InvoicesList } from "./InvoicesList";
import { PaymentEditForm } from "./PaymentEditForm";

export interface PaymentInvoicesSectionProps {
  reservationId: number;
  paymentSummary: PaymentSummary | undefined;
  summaryLoading: boolean;
  invoices: Invoice[] | undefined;
  invoicesLoading: boolean;
  // Mutations
  markPaidMutation: UseMutationResult<any, Error, { paymentMethod: string; cashboxTarget?: string }, unknown>;
  markInvoicePaidMutation: UseMutationResult<any, Error, number, unknown>;
  isAnyInvoiceMutationPending: boolean;
  // Invoice dialog
  setInvoiceDialogType: (type: "DEPOSIT" | "FINAL") => void;
  setInvoiceDialogPercent: (percent: number) => void;
  setInvoiceDialogOpen: (open: boolean) => void;
}

export function PaymentInvoicesSection({
  reservationId,
  paymentSummary,
  summaryLoading,
  invoices,
  invoicesLoading,
  markPaidMutation,
  markInvoicePaidMutation,
  isAnyInvoiceMutationPending,
  setInvoiceDialogType,
  setInvoiceDialogPercent,
  setInvoiceDialogOpen,
}: PaymentInvoicesSectionProps) {
  // Linked event info (for cashbox options)
  const { data: linkedEventData } = useQuery<{ event: { id: number; name: string; hasCashbox: boolean } | null }>({
    queryKey: ["/api/reservations", reservationId, "linked-event"],
    queryFn: () => api.get(`/api/reservations/${reservationId}/linked-event`),
  });
  const linkedEvent = linkedEventData?.event ?? null;

  const { openConfirm, openEditDialog, dialogs } = PaymentEditForm({
    reservationId,
    paymentSummary,
    markPaidMutation,
    linkedEvent,
  });

  const handleCreateInvoice = (type: "DEPOSIT" | "FINAL", percent?: number) => {
    setInvoiceDialogType(type);
    if (percent !== undefined) {
      setInvoiceDialogPercent(percent);
    }
    setInvoiceDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Payment Summary */}
      <PaymentSummaryCards
        paymentSummary={paymentSummary}
        summaryLoading={summaryLoading}
        isAnyInvoiceMutationPending={isAnyInvoiceMutationPending}
        linkedEvent={linkedEvent}
        onOpenConfirm={openConfirm}
        onOpenEditDialog={openEditDialog}
        onCreateInvoice={handleCreateInvoice}
      />

      <div className="border-t my-4" />

      {/* Invoices List */}
      <InvoicesList
        reservationId={reservationId}
        invoices={invoices}
        invoicesLoading={invoicesLoading}
        markInvoicePaidMutation={markInvoicePaidMutation}
      />

      {/* Dialogs */}
      {dialogs}
    </div>
  );
}
