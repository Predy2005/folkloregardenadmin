import { queryClient } from "@/shared/lib/queryClient";

/**
 * Invalidate all reservation-related queries.
 * Use after creating/updating/deleting reservations or related invoices.
 */
export function invalidateReservationQueries(reservationId?: number) {
  queryClient.invalidateQueries({ queryKey: ["/api/reservations"] });
  if (reservationId) {
    queryClient.invalidateQueries({
      queryKey: ["/api/reservations", reservationId],
    });
    queryClient.invalidateQueries({
      queryKey: ["/api/reservations", reservationId, "payment-summary"],
    });
    queryClient.invalidateQueries({
      queryKey: ["/api/invoices/reservation", reservationId],
    });
  }
}

/**
 * Invalidate all invoice-related queries.
 * Use after creating/updating/paying invoices.
 */
export function invalidateInvoiceQueries(reservationId?: number) {
  queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
  if (reservationId) {
    queryClient.invalidateQueries({
      queryKey: ["/api/invoices/reservation", reservationId],
    });
    invalidateReservationQueries(reservationId);
  }
}

/**
 * Invalidate all contact-related queries.
 */
export function invalidateContactQueries(contactId?: number) {
  queryClient.invalidateQueries({ queryKey: ["/api/contacts/all"] });
  if (contactId) {
    queryClient.invalidateQueries({
      queryKey: ["/api/contacts", contactId],
    });
  }
}

/**
 * Invalidate stock-related queries (items + movements).
 */
export function invalidateStockQueries() {
  queryClient.invalidateQueries({ queryKey: ["/api/stock-items"] });
  queryClient.invalidateQueries({ queryKey: ["/api/stock-movements"] });
}
