import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { queryClient } from "@/shared/lib/queryClient";
import { api } from "@/shared/lib/api";
import { successToast, errorToast } from "@/shared/lib/toast-helpers";
import type { EventPaymentOverview, ReservationPaymentSummary } from "@shared/types";
import { Skeleton } from "@/shared/components/ui/skeleton";
import {
  FinanceSummaryCards,
  ReservationPaymentsTable,
  InvoicesTable,
  NoteDialog,
  RecordPaymentDialog,
} from "./finance";

export interface FinanceTabProps {
  eventId: number;
}

export default function FinanceTab({ eventId }: FinanceTabProps) {
  const [noteDialogOpen, setNoteDialogOpen] = useState(false);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [selectedReservation, setSelectedReservation] = useState<ReservationPaymentSummary | null>(null);
  const [noteText, setNoteText] = useState("");
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentNote, setPaymentNote] = useState("");

  const { data: payments, isLoading } = useQuery<EventPaymentOverview>({
    queryKey: ["/api/events", eventId, "payments"],
    queryFn: () => api.get(`/api/events/${eventId}/payments`),
  });

  const updateNoteMutation = useMutation({
    mutationFn: async ({ reservationId, paymentNote }: { reservationId: number; paymentNote: string }) => {
      return await api.put(`/api/events/${eventId}/reservations/${reservationId}/payment-note`, { paymentNote });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/events", eventId, "payments"] });
      successToast("Poznámka byla aktualizována");
      setNoteDialogOpen(false);
      setSelectedReservation(null);
      setNoteText("");
    },
    onError: (error: Error) => {
      errorToast(error);
    },
  });

  const recordPaymentMutation = useMutation({
    mutationFn: async ({ reservationId, amount, note }: { reservationId: number; amount: number; note?: string }) => {
      return await api.post(`/api/events/${eventId}/reservations/${reservationId}/record-payment`, {
        amount,
        note,
        paymentMethod: "CASH",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/events", eventId, "payments"] });
      successToast("Platba byla zaznamenána");
      setPaymentDialogOpen(false);
      setSelectedReservation(null);
      setPaymentAmount("");
      setPaymentNote("");
    },
    onError: (error: Error) => {
      errorToast(error);
    },
  });

  const handleOpenNoteDialog = (reservation: ReservationPaymentSummary) => {
    setSelectedReservation(reservation);
    setNoteText(reservation.paymentNote || "");
    setNoteDialogOpen(true);
  };

  const handleOpenPaymentDialog = (reservation: ReservationPaymentSummary) => {
    setSelectedReservation(reservation);
    setPaymentAmount(reservation.remainingAmount.toString());
    setPaymentNote("");
    setPaymentDialogOpen(true);
  };

  const handleSaveNote = () => {
    if (selectedReservation) {
      updateNoteMutation.mutate({
        reservationId: selectedReservation.reservationId,
        paymentNote: noteText,
      });
    }
  };

  const handleRecordPayment = () => {
    if (selectedReservation && paymentAmount) {
      recordPaymentMutation.mutate({
        reservationId: selectedReservation.reservationId,
        amount: parseFloat(paymentAmount),
        note: paymentNote || undefined,
      });
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!payments) {
    return (
      <div className="text-center text-muted-foreground py-8">
        Nepodařilo se načíst data o platbách
      </div>
    );
  }

  const { reservations, totals, invoices } = payments;

  return (
    <div className="space-y-6">
      <FinanceSummaryCards totals={totals} invoices={invoices} />

      <ReservationPaymentsTable
        reservations={reservations}
        onOpenNoteDialog={handleOpenNoteDialog}
        onOpenPaymentDialog={handleOpenPaymentDialog}
        onInvoiceCreated={() => {
          queryClient.invalidateQueries({ queryKey: ["/api/events", eventId, "payments"] });
        }}
      />

      <InvoicesTable invoices={invoices} />

      <NoteDialog
        open={noteDialogOpen}
        onOpenChange={setNoteDialogOpen}
        reservation={selectedReservation}
        noteText={noteText}
        onNoteTextChange={setNoteText}
        onSave={handleSaveNote}
        isPending={updateNoteMutation.isPending}
      />

      <RecordPaymentDialog
        open={paymentDialogOpen}
        onOpenChange={setPaymentDialogOpen}
        reservation={selectedReservation}
        paymentAmount={paymentAmount}
        onPaymentAmountChange={setPaymentAmount}
        paymentNote={paymentNote}
        onPaymentNoteChange={setPaymentNote}
        onSave={handleRecordPayment}
        isPending={recordPaymentMutation.isPending}
      />
    </div>
  );
}
