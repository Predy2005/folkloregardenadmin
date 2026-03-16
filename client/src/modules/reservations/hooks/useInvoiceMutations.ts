import { useMutation } from "@tanstack/react-query";
import { api } from "@/shared/lib/api";
import { invalidateInvoiceQueries } from "@/shared/lib/query-helpers";
import { successToast, errorToast } from "@/shared/lib/toast-helpers";
import type { Invoice } from "@shared/types";

/**
 * Shared hook for invoice-related mutations.
 * Extracts duplicated mutation logic from ReservationDetailDialog and ReservationEditPage.
 */
export function useInvoiceMutations(reservationId: number | null | undefined) {
  const invalidateAll = () => {
    invalidateInvoiceQueries(reservationId ?? undefined);
  };

  const createDepositMutation = useMutation({
    mutationFn: ({ percent }: { percent: number }) =>
      api.post<Invoice>(`/api/invoices/create-deposit/${reservationId}`, { percent }),
    onSuccess: () => {
      invalidateAll();
      successToast("Zálohová faktura byla úspěšně vytvořena");
    },
    onError: (error: Error) => errorToast(error),
  });

  const createFinalMutation = useMutation({
    mutationFn: () => api.post<Invoice>(`/api/invoices/create-final/${reservationId}`),
    onSuccess: () => {
      invalidateAll();
      successToast("Ostrá faktura byla úspěšně vytvořena");
    },
    onError: (error: Error) => errorToast(error),
  });

  const markPaidMutation = useMutation({
    mutationFn: ({ paymentMethod, cashboxTarget }: { paymentMethod: string; cashboxTarget?: string }) =>
      api.post(`/api/reservations/${reservationId}/mark-paid`, { paymentMethod, cashboxTarget }),
    onSuccess: (data: any) => {
      invalidateAll();
      const cashboxMsg = data?.cashboxRecorded ? ` (zapsáno do: ${data.cashboxRecorded})` : "";
      successToast(`Rezervace byla označena jako zaplacená${cashboxMsg}`);
    },
    onError: (error: Error) => errorToast(error),
  });

  const markInvoicePaidMutation = useMutation({
    mutationFn: (invoiceId: number) => api.post(`/api/invoices/${invoiceId}/pay`),
    onSuccess: () => {
      invalidateAll();
      successToast("Faktura byla označena jako zaplacená");
    },
    onError: (error: Error) => errorToast(error),
  });

  const createInvoiceMutation = useMutation({
    mutationFn: () => api.post<Invoice>(`/api/invoices/create-from-reservation/${reservationId}`),
    onSuccess: () => {
      invalidateAll();
      successToast("Faktura byla úspěšně vytvořena");
    },
    onError: (error: Error) => errorToast(error),
  });

  const isAnyPending =
    createDepositMutation.isPending ||
    createFinalMutation.isPending ||
    markPaidMutation.isPending ||
    markInvoicePaidMutation.isPending ||
    createInvoiceMutation.isPending;

  return {
    createDepositMutation,
    createFinalMutation,
    markPaidMutation,
    markInvoicePaidMutation,
    createInvoiceMutation,
    isAnyPending,
    invalidateAll,
  };
}
