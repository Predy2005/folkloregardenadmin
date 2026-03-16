/**
 * Unified Guest Statistics Model
 *
 * TERMINOLOGY:
 * - "paying guest" (platící host) = guest type is adult/child (has obligation to pay)
 * - "free guest" (neplatící host) = guest type is driver/guide (no payment required)
 * - "paid" (zaplaceno) = reservation payment status is PAID
 * - "present" (přítomen) = guest has checked in at venue
 *
 * These are INDEPENDENT concepts:
 * - A "paying guest" might not have paid yet (reservation unpaid)
 * - A "free guest" is always "paid" (nothing to pay)
 */

// ============================================================================
// GUEST TYPE BREAKDOWN (based on person type in reservation)
// ============================================================================

/**
 * Guest counts by type
 * Derived from ReservationPerson.type
 */
export interface GuestTypeBreakdown {
  // Total guests
  total: number;
  // Paying guests (type = adult | child) - have payment obligation
  paying: number;
  // Free guests (type = driver | guide) - no payment required
  free: number;
  // Detailed breakdown
  adults: number;
  children: number;
  drivers: number;
  guides: number;
}

// ============================================================================
// PRESENCE (CHECK-IN STATUS)
// ============================================================================

/**
 * Check-in/presence status
 * Derived from EventGuest.isPresent
 */
export interface PresenceStatus {
  // Total guests expected
  total: number;
  // Guests physically present (checked in)
  present: number;
  // Guests not yet arrived
  absent: number;
  // Percentage present
  percentage: number;
}

// ============================================================================
// PAYMENT STATUS (from Reservation)
// ============================================================================

/**
 * Payment status summary
 * Calculated from Reservation.paymentStatus and related invoices
 */
export interface PaymentStatus {
  // Money
  totalExpected: number;      // Celková očekávaná částka
  totalPaid: number;          // Zaplaceno
  totalRemaining: number;     // Zbývá zaplatit

  // Guest counts by payment status
  guestsPaid: number;         // Hosté ze zaplacených rezervací
  guestsPartial: number;      // Hosté z částečně zaplacených rezervací
  guestsUnpaid: number;       // Hosté z nezaplacených rezervací

  // Reservation counts
  reservationsPaid: number;
  reservationsPartial: number;
  reservationsUnpaid: number;
}

// ============================================================================
// SPACE BREAKDOWN
// ============================================================================

export interface SpaceGuestData {
  spaceName: string;
  types: GuestTypeBreakdown;
  presence: PresenceStatus;
  nationalityBreakdown: Record<string, number>;
  menuBreakdown: { menuName: string; count: number; surcharge: number }[];
}

// ============================================================================
// RESERVATION GROUP (for check-in UI)
// ============================================================================

export interface ReservationGuestData {
  reservationId: number;
  contactName: string | null;
  contactPhone: string | null;
  contactEmail: string | null;
  nationality: string | null;

  // Guest breakdown
  types: GuestTypeBreakdown;
  presence: PresenceStatus;

  // Payment from reservation
  paymentStatus: "PAID" | "PARTIAL" | "UNPAID";
  paymentMethod: string | null;  // 'CASH' | 'INVOICE' | 'ONLINE'
  totalPrice: number;
  paidAmount: number;

  // For proportional calculation when partial payment
  paidPercentage: number;  // e.g., 50% paid = 0.5
}

// ============================================================================
// COMPLETE EVENT GUEST SUMMARY
// Single source of truth for all guest-related data
// ============================================================================

export interface EventGuestSummary {
  // Aggregate data
  types: GuestTypeBreakdown;
  presence: PresenceStatus;
  payments: PaymentStatus;

  // Breakdown by space
  bySpace: SpaceGuestData[];

  // Breakdown by reservation (for check-in)
  byReservation: ReservationGuestData[];
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Check if guest type requires payment
 */
export function isPayingGuestType(type: string): boolean {
  return type === "adult" || type === "child";
}

/**
 * Check if guest type is free (driver/guide)
 */
export function isFreeGuestType(type: string): boolean {
  return type === "driver" || type === "guide";
}

/**
 * Calculate presence percentage
 */
export function calculatePresencePercentage(present: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((present / total) * 100);
}

/**
 * Calculate how many guests from a reservation are "paid"
 * For partial payments, calculates proportionally
 *
 * Example:
 * - Reservation has 10 paying guests, total 10000 CZK
 * - Paid 5000 CZK (50%)
 * - Returns 5 paid guests
 */
export function calculatePaidGuestsInReservation(
  payingGuestCount: number,
  totalPrice: number,
  paidAmount: number
): number {
  if (totalPrice === 0) return payingGuestCount; // Free reservation = all paid
  if (paidAmount >= totalPrice) return payingGuestCount; // Fully paid
  if (paidAmount === 0) return 0; // Unpaid

  // Partial payment - calculate proportionally
  const paidPercentage = paidAmount / totalPrice;
  return Math.round(payingGuestCount * paidPercentage);
}

/**
 * Aggregate guest type breakdown from multiple sources
 */
export function aggregateGuestTypes(sources: GuestTypeBreakdown[]): GuestTypeBreakdown {
  return sources.reduce(
    (acc, src) => ({
      total: acc.total + src.total,
      paying: acc.paying + src.paying,
      free: acc.free + src.free,
      adults: acc.adults + src.adults,
      children: acc.children + src.children,
      drivers: acc.drivers + src.drivers,
      guides: acc.guides + src.guides,
    }),
    { total: 0, paying: 0, free: 0, adults: 0, children: 0, drivers: 0, guides: 0 }
  );
}

/**
 * Aggregate presence from multiple sources
 */
export function aggregatePresence(sources: PresenceStatus[]): PresenceStatus {
  const total = sources.reduce((sum, s) => sum + s.total, 0);
  const present = sources.reduce((sum, s) => sum + s.present, 0);
  return {
    total,
    present,
    absent: total - present,
    percentage: calculatePresencePercentage(present, total),
  };
}
