export * from "./guestStats";

import type { StaffingOverview, EventGuest, EventMenu } from "@shared/types";

// ============================================================================
// DASHBOARD DATA (used by StaffTab for fetching manager-dashboard)
// ============================================================================

export interface DashboardData {
  staffing: StaffingOverview;
}

// ============================================================================
// GUEST GROUP (used by GuestsTab for grouping guests by reservation)
// ============================================================================

export interface GuestGroup {
  reservationId: number | null;
  guests: EventGuest[];
  stats: {
    total: number;
    adults: number;
    children: number;
    paid: number;
    present: number;
  };
}

// ============================================================================
// MENU TYPES (used by MenuTab for reservation menu display)
// ============================================================================

export interface ReservationInfo {
  reservationId: number;
  contactName: string;
  contactPhone?: string;
  nationality?: string;
  totalCount: number;
}

export interface MenuGroup {
  reservationId: number;
  contactName?: string;
  items: EventMenu[];
  totalQuantity: number;
  totalPrice: number;
}
