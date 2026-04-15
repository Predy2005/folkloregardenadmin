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

/**
 * Invalidate all event-related queries.
 */
export function invalidateEventQueries(eventId?: number) {
  queryClient.invalidateQueries({ queryKey: ["/api/events"] });
  if (eventId) {
    queryClient.invalidateQueries({ queryKey: ["/api/events", eventId] });
    queryClient.invalidateQueries({ queryKey: ["event-guests", eventId] });
    queryClient.invalidateQueries({ queryKey: ["floor-plan", eventId] });
    queryClient.invalidateQueries({ queryKey: ["/api/events", eventId, "tables"] });
  }
}

/**
 * Invalidate all cashbox-related queries.
 */
export function invalidateCashboxQueries() {
  queryClient.invalidateQueries({ queryKey: ["/api/cashbox"] });
  queryClient.invalidateQueries({ queryKey: ["/api/cashbox/main"] });
  queryClient.invalidateQueries({ queryKey: ["/api/cashbox/main/movements"] });
  queryClient.invalidateQueries({ queryKey: ["/api/cashbox/main/closures"] });
  queryClient.invalidateQueries({ queryKey: ["/api/cashbox/main/hidden-status"] });
}

/**
 * Invalidate event cashbox queries.
 */
export function invalidateEventCashboxQueries(eventId: number) {
  queryClient.invalidateQueries({ queryKey: ["/api/events", eventId, "cashbox"] });
  queryClient.invalidateQueries({ queryKey: ["/api/events", eventId, "cashbox-movements"] });
  queryClient.invalidateQueries({ queryKey: ["/api/events", eventId, "dashboard"] });
}

/**
 * Invalidate staff-related queries.
 */
export function invalidateStaffQueries() {
  queryClient.invalidateQueries({ queryKey: ["/api/staff"] });
  queryClient.invalidateQueries({ queryKey: ["/api/staff-attendance"] });
}

/**
 * Invalidate food/menu-related queries.
 */
export function invalidateFoodQueries(foodId?: number) {
  queryClient.invalidateQueries({ queryKey: ["/api/reservation-foods"] });
  if (foodId) {
    queryClient.invalidateQueries({ queryKey: ["/api/reservation-foods", foodId] });
  }
}

/**
 * Invalidate transport-related queries.
 */
export function invalidateTransportQueries(companyId?: number) {
  queryClient.invalidateQueries({ queryKey: ["/api/transport"] });
  if (companyId) {
    queryClient.invalidateQueries({ queryKey: ["/api/transport", companyId] });
    queryClient.invalidateQueries({ queryKey: ["/api/transport", companyId, "vehicles"] });
    queryClient.invalidateQueries({ queryKey: ["/api/transport", companyId, "drivers"] });
  }
}

/**
 * Invalidate venue/building queries.
 */
export function invalidateVenueQueries() {
  queryClient.invalidateQueries({ queryKey: ["buildings"] });
  queryClient.invalidateQueries({ queryKey: ["rooms"] });
  queryClient.invalidateQueries({ queryKey: ["floor-plan-templates"] });
}

/**
 * Invalidate partner-related queries.
 */
export function invalidatePartnerQueries(partnerId?: number) {
  queryClient.invalidateQueries({ queryKey: ["/api/partners"] });
  if (partnerId) {
    queryClient.invalidateQueries({ queryKey: ["/api/partners", partnerId] });
  }
}
