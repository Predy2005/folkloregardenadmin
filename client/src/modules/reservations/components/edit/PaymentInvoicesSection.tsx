import { useQuery } from "@tanstack/react-query";
import { api } from "@/shared/lib/api";
import { PaymentSummaryCards } from "./PaymentSummaryCards";
import { InvoicesList } from "./InvoicesList";
import { PaymentEditForm } from "./PaymentEditForm";
import type { PaymentInvoicesSectionProps } from "@modules/reservations/types/components/edit/PaymentInvoicesSection";

export type { PaymentInvoicesSectionProps };

export function PaymentInvoicesSection({
  reservationId,
  paymentSummary,
  summaryLoading,
  invoices,
  invoicesLoading,
  currentCurrency,
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
    currentCurrency,
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
        currentCurrency={currentCurrency}
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
