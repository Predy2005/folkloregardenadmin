import { useQuery } from "@tanstack/react-query";
import { api } from "@/shared/lib/api";
import type {
  Reservation,
  ReservationFood,
  ReservationType,
  PricingDefault,
  Invoice,
  PaymentSummary,
  TransportCompany,
  DrinkItem,
  Contact,
} from "@shared/types";

export function useReservationData(params: {
  isEdit: boolean;
  reservationId: number | null;
  contactQuery: string;
  contactId: number | null;
}) {
  const { isEdit, reservationId, contactQuery, contactId } = params;

  const { data: foods } = useQuery({
    queryKey: ["/api/reservation-foods"],
    queryFn: () => api.get<ReservationFood[]>("/api/reservation-foods"),
  });

  const { data: pricing } = useQuery<PricingDefault>({
    queryKey: ["/api/pricing/defaults"],
  });

  const { data: reservationTypes } = useQuery({
    queryKey: ["/api/reservation-types"],
    queryFn: () => api.get<ReservationType[]>("/api/reservation-types"),
  });

  const { data: transportCompanies } = useQuery({
    queryKey: ["/api/transport"],
    queryFn: () => api.get<TransportCompany[]>("/api/transport"),
  });

  const { data: drinks } = useQuery<DrinkItem[]>({
    queryKey: ["/api/drinks"],
    queryFn: () => api.get("/api/drinks"),
  });

  const { data: reservation, isLoading: isLoadingReservation } = useQuery({
    enabled: isEdit && !!reservationId,
    queryKey: ["/api/reservations", reservationId],
    queryFn: () => api.get<Reservation>(`/api/reservations/${reservationId}`),
  });

  const { data: contactSearch, isFetching: isSearchingContacts } = useQuery({
    queryKey: ["/api/contacts", contactQuery],
    enabled: contactQuery.trim().length >= 2,
    queryFn: () =>
      api.get<{ items: Contact[]; total: number }>(
        `/api/contacts?q=${encodeURIComponent(contactQuery)}&limit=10`
      ),
  });

  const { data: prefillContact } = useQuery({
    queryKey: ["/api/contacts", contactId],
    enabled: !isEdit && !!contactId,
    queryFn: () => api.get<Contact>(`/api/contacts/${contactId}`),
  });

  const { data: paymentSummary, isLoading: summaryLoading } = useQuery({
    queryKey: ["/api/reservations", reservationId, "payment-summary"],
    queryFn: () => api.get<PaymentSummary>(`/api/reservations/${reservationId}/payment-summary`),
    enabled: isEdit && !!reservationId,
  });

  const { data: invoices, isLoading: invoicesLoading } = useQuery({
    queryKey: ["/api/invoices/reservation", reservationId],
    queryFn: () => api.get<Invoice[]>(`/api/invoices/reservation/${reservationId}`),
    enabled: isEdit && !!reservationId,
  });

  return {
    foods,
    pricing,
    reservationTypes,
    transportCompanies,
    drinks,
    reservation,
    isLoadingReservation,
    contactSearch,
    isSearchingContacts,
    prefillContact,
    paymentSummary,
    summaryLoading,
    invoices,
    invoicesLoading,
  };
}
