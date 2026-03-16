// Guest Dashboard Types, Interfaces and Constants
// Re-export types from shared for convenience
export type {
  SpaceGuestStats,
  MenuCount,
  MenuByNationality,
  MenuByReservation,
} from "@shared/types";

// Re-export shared constants
export {
  SPACE_COLORS,
  getSpaceColor,
  NATIONALITY_COLORS,
  getNationalityColor,
  NATIONALITY_INFO,
  getNationalityInfo,
} from "@/shared/lib/constants";
export type { NationalityInfo } from "@/shared/lib/constants";

// ============================================================================
// NATIONALITY LABELS (Czech translations)
// ============================================================================

export const NATIONALITY_LABELS: Record<string, string> = {
  CZ: "Cesko",
  SK: "Slovensko",
  EN: "Anglie",
  GB: "Anglie",
  DE: "Nemecko",
  CN: "Cina",
  RU: "Rusko",
  ES: "Spanelsko",
  FR: "Francie",
  IT: "Italie",
  JP: "Japonsko",
  KR: "Korea",
  PL: "Polsko",
  NL: "Holandsko",
  US: "USA",
  OTHER: "Ostatni",
  unknown: "Neznama",
};

export const NATIONALITY_SHORT: Record<string, string> = {
  CZ: "CZ",
  SK: "SK",
  EN: "EN",
  GB: "GB",
  DE: "DE",
  CN: "CN",
  RU: "RU",
  ES: "ES",
  FR: "FR",
  IT: "IT",
  JP: "JP",
  KR: "KR",
  PL: "PL",
  NL: "NL",
  US: "US",
  OTHER: "?",
  unknown: "?",
};

// ============================================================================
// VIEW MODE
// ============================================================================

export type SpaceViewMode = "summary" | "byNationality" | "byReservation";

// ============================================================================
// INTERFACES - Move Guests
// ============================================================================

export interface GuestGroupingInfo {
  byNationality: NationalityGroup[];
  byReservation: ReservationGroup[];
  availableSpaces: string[];
}

export interface NationalityGroup {
  nationality: string;
  count: number;
  guestIds: number[];
  spaces: Record<string, number>;
}

export interface ReservationGroup {
  reservationId: number;
  contactName: string;
  nationality: string | null;
  count: number;
  guestIds: number[];
  spaces: Record<string, number>;
}

export interface SelectedMoveGroup {
  type: "nationality" | "reservation";
  nationality?: string;
  reservationId?: number;
  contactName?: string;
  count: number;
  spaces: Record<string, number>;
}

export interface MoveGuestsParams {
  targetSpace: string;
  nationality?: string;
  reservationId?: number;
  sourceSpace?: string;
  count?: number;
}

export interface MoveGuestsResponse {
  status: string;
  movedCount: number;
  totalMatching: number;
  targetSpace: string;
}

// ============================================================================
// COMPONENT PROPS
// ============================================================================

export interface GuestOverviewCardProps {
  guestsBySpace: import("@shared/types").SpaceGuestStats[];
  eventId: number;
}

export interface SpaceSectionProps {
  space: import("@shared/types").SpaceGuestStats;
  spaceIndex: number;
  isExpanded: boolean;
  onToggle: () => void;
  eventId: number;
  allSpaces: string[];
}

export interface MoveGuestsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  eventId: number;
  spaces: string[];
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

export function getNationalityLabel(code: string): string {
  return NATIONALITY_LABELS[code] || code.toUpperCase();
}

export function getNationalityShort(code: string): string {
  return NATIONALITY_SHORT[code] || code.toUpperCase().slice(0, 2);
}

// getNationalityColor and getSpaceColor are re-exported from @/shared/lib/constants

export interface GuestSummary {
  totalGuests: number;
  paidGuests: number;
  freeGuests: number;
  presentGuests: number;
  spacesCount: number;
}

export function calculateGuestSummary(spaces: import("@shared/types").SpaceGuestStats[]): GuestSummary {
  return {
    totalGuests: spaces.reduce((sum, s) => sum + s.totalGuests, 0),
    paidGuests: spaces.reduce((sum, s) => sum + s.paidGuests, 0),
    freeGuests: spaces.reduce((sum, s) => sum + s.freeGuests, 0),
    presentGuests: spaces.reduce((sum, s) => sum + s.presentGuests, 0),
    spacesCount: spaces.length,
  };
}
