/**
 * Centralized query key factory for event-related queries
 * Ensures type-safe and consistent query keys across the application
 */

export const eventQueryKeys = {
  // Base
  all: ["/api/events"] as const,

  // Single event
  detail: (eventId: number) => [...eventQueryKeys.all, eventId] as const,

  // Manager dashboard
  dashboard: (eventId: number) => [...eventQueryKeys.detail(eventId), "manager-dashboard"] as const,

  // Staff
  staffAssignments: (eventId: number) => [...eventQueryKeys.detail(eventId), "staff-assignments"] as const,

  // Guests - SINGLE SOURCE OF TRUTH
  guestSummary: (eventId: number) => [...eventQueryKeys.detail(eventId), "guest-summary"] as const,

  // Legacy guest endpoints (will be deprecated)
  guestsByReservation: (eventId: number) => [...eventQueryKeys.detail(eventId), "guests-by-reservation"] as const,
  presenceGrouping: (eventId: number) => [...eventQueryKeys.detail(eventId), "presence-grouping"] as const,

  // Vouchers
  vouchers: (eventId: number) => [...eventQueryKeys.detail(eventId), "vouchers"] as const,
};

/**
 * Helper to invalidate all event-related queries
 */
export function getEventInvalidationKeys(eventId: number) {
  return {
    dashboard: eventQueryKeys.dashboard(eventId),
    staffAssignments: eventQueryKeys.staffAssignments(eventId),
    guestsByReservation: eventQueryKeys.guestsByReservation(eventId),
    presenceGrouping: eventQueryKeys.presenceGrouping(eventId),
  };
}
