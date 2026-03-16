import { useQuery } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/shared/components/ui/dialog';
import { Separator } from '@/shared/components/ui/separator';
import { api } from '@/shared/lib/api';
import { useInvoiceMutations } from '../hooks/useInvoiceMutations';
import {
  ReservationInfoSection,
  PersonListSection,
  PaymentSummarySection,
  InvoiceListSection,
} from './detail';
import type { Reservation, Invoice, PaymentSummary } from '@shared/types';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reservation: Reservation | null;
};

export function ReservationDetailDialog({ open, onOpenChange, reservation }: Props) {
  // Fetch payment summary for this reservation
  const { data: paymentSummary, isLoading: summaryLoading } = useQuery({
    queryKey: ['/api/reservations', reservation?.id, 'payment-summary'],
    queryFn: () => api.get<PaymentSummary>(`/api/reservations/${reservation?.id}/payment-summary`),
    enabled: !!reservation?.id && open,
  });

  // Fetch invoices for this reservation
  const { data: invoices, isLoading: invoicesLoading } = useQuery({
    queryKey: ['/api/invoices/reservation', reservation?.id],
    queryFn: () => api.get<Invoice[]>(`/api/invoices/reservation/${reservation?.id}`),
    enabled: !!reservation?.id && open,
  });

  const {
    createDepositMutation,
    createFinalMutation,
    markPaidMutation,
    markInvoicePaidMutation,
    isAnyPending: isAnyMutationPending,
  } = useInvoiceMutations(reservation?.id);

  const handleCreateDepositInvoice = (percent: number = 25) => {
    if (reservation?.id) {
      createDepositMutation.mutate({ percent });
    }
  };

  const handleCreateFinalInvoice = () => {
    if (reservation?.id) {
      createFinalMutation.mutate();
    }
  };

  const handleMarkAsPaid = (method: string = 'CASH') => {
    if (reservation?.id) {
      markPaidMutation.mutate({ paymentMethod: method });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-serif">Detail rezervace #{reservation?.id}</DialogTitle>
        </DialogHeader>

        {reservation && (
          <div className="space-y-6">
            <ReservationInfoSection reservation={reservation} />

            <PersonListSection reservation={reservation} />

            <Separator />

            <PaymentSummarySection
              paymentSummary={paymentSummary}
              isLoading={summaryLoading}
              isAnyMutationPending={isAnyMutationPending}
              onCreateDeposit={handleCreateDepositInvoice}
              onCreateFinalInvoice={handleCreateFinalInvoice}
              onMarkAsPaid={handleMarkAsPaid}
              isDepositPending={createDepositMutation.isPending}
              isFinalPending={createFinalMutation.isPending}
              isMarkPaidPending={markPaidMutation.isPending}
            />

            <Separator />

            <InvoiceListSection
              invoices={invoices}
              isLoading={invoicesLoading}
              markInvoicePaidMutation={markInvoicePaidMutation}
            />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
