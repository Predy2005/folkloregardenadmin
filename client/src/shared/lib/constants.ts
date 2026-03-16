/**
 * Centralized UI constants for colors, labels, and styling
 */

// ============================================================================
// EVENT STATUS (with colors for badges)
// ============================================================================

export const EVENT_STATUS_STYLES: Record<string, { label: string; className: string }> = {
  DRAFT: { label: "Návrh", className: "bg-gray-500" },
  PLANNED: { label: "Naplánováno", className: "bg-blue-500" },
  CONFIRMED: { label: "Potvrzeno", className: "bg-green-500" },
  IN_PROGRESS: { label: "Probíhá", className: "bg-orange-500" },
  COMPLETED: { label: "Dokončeno", className: "bg-purple-500" },
  CANCELLED: { label: "Zrušeno", className: "bg-red-500" },
};

// ============================================================================
// ATTENDANCE STATUS (staff presence tracking)
// ============================================================================

export const ATTENDANCE_STATUS_STYLES: Record<string, { label: string; className: string }> = {
  UNKNOWN: { label: "Neznámý", className: "bg-gray-500" },
  CONFIRMED: { label: "Potvrzen", className: "bg-blue-500" },
  PRESENT: { label: "Přítomen", className: "bg-green-500" },
  ABSENT: { label: "Nepřítomen", className: "bg-red-500" },
  LEFT_EARLY: { label: "Odešel dříve", className: "bg-orange-500" },
};

// ============================================================================
// SPACE COLORS (for venue/room badges)
// ============================================================================

export const SPACE_COLORS = [
  "bg-blue-500",
  "bg-green-500",
  "bg-purple-500",
  "bg-orange-500",
  "bg-pink-500",
  "bg-cyan-500",
] as const;

/** Light tint backgrounds matching SPACE_COLORS for section backgrounds */
export const SPACE_TINTS = [
  { bg: "bg-blue-50/70 dark:bg-blue-950/25",     hover: "hover:bg-blue-100/70 dark:hover:bg-blue-950/35",     border: "border-blue-200 dark:border-blue-800" },
  { bg: "bg-green-50/70 dark:bg-green-950/25",    hover: "hover:bg-green-100/70 dark:hover:bg-green-950/35",   border: "border-green-200 dark:border-green-800" },
  { bg: "bg-purple-50/70 dark:bg-purple-950/25",  hover: "hover:bg-purple-100/70 dark:hover:bg-purple-950/35", border: "border-purple-200 dark:border-purple-800" },
  { bg: "bg-orange-50/70 dark:bg-orange-950/25",  hover: "hover:bg-orange-100/70 dark:hover:bg-orange-950/35", border: "border-orange-200 dark:border-orange-800" },
  { bg: "bg-pink-50/70 dark:bg-pink-950/25",      hover: "hover:bg-pink-100/70 dark:hover:bg-pink-950/35",     border: "border-pink-200 dark:border-pink-800" },
  { bg: "bg-cyan-50/70 dark:bg-cyan-950/25",      hover: "hover:bg-cyan-100/70 dark:hover:bg-cyan-950/35",     border: "border-cyan-200 dark:border-cyan-800" },
] as const;

export function getSpaceColor(index: number): string {
  return SPACE_COLORS[index % SPACE_COLORS.length];
}

export function getSpaceTint(index: number) {
  return SPACE_TINTS[index % SPACE_TINTS.length];
}

// ============================================================================
// RESERVATION COLORS (for reservation tags)
// ============================================================================

export const RESERVATION_COLORS = [
  "bg-indigo-500",
  "bg-teal-500",
  "bg-amber-500",
  "bg-rose-500",
  "bg-emerald-500",
  "bg-violet-500",
] as const;

export function getReservationColor(index: number): string {
  return RESERVATION_COLORS[index % RESERVATION_COLORS.length];
}

// ============================================================================
// NATIONALITY (colors, text contrast, labels)
// ============================================================================

export interface NationalityInfo {
  bg: string;
  text: string;
  name: string;
}

/**
 * Canonical nationality metadata: background color, text color, and Czech name.
 * This is the single source of truth -- all other nationality helpers derive from it.
 */
export const NATIONALITY_INFO: Record<string, NationalityInfo> = {
  CZ: { bg: "bg-blue-500", text: "text-white", name: "Česko" },
  SK: { bg: "bg-blue-400", text: "text-white", name: "Slovensko" },
  EN: { bg: "bg-red-500", text: "text-white", name: "Anglie" },
  GB: { bg: "bg-indigo-700", text: "text-white", name: "Británie" },
  DE: { bg: "bg-gray-800", text: "text-yellow-400", name: "Německo" },
  AT: { bg: "bg-red-600", text: "text-white", name: "Rakousko" },
  US: { bg: "bg-red-700", text: "text-white", name: "USA" },
  CN: { bg: "bg-red-600", text: "text-yellow-300", name: "Čína" },
  RU: { bg: "bg-blue-800", text: "text-white", name: "Rusko" },
  ES: { bg: "bg-orange-500", text: "text-white", name: "Španělsko" },
  FR: { bg: "bg-blue-600", text: "text-white", name: "Francie" },
  IT: { bg: "bg-green-600", text: "text-white", name: "Itálie" },
  JP: { bg: "bg-white", text: "text-red-600", name: "Japonsko" },
  KR: { bg: "bg-white", text: "text-blue-800", name: "Korea" },
  PL: { bg: "bg-red-500", text: "text-white", name: "Polsko" },
  NL: { bg: "bg-orange-600", text: "text-white", name: "Nizozemsko" },
  UA: { bg: "bg-yellow-500", text: "text-blue-800", name: "Ukrajina" },
  OTHER: { bg: "bg-gray-500", text: "text-white", name: "Ostatní" },
  unknown: { bg: "bg-gray-400", text: "text-white", name: "Neznámá" },
  default: { bg: "bg-gray-400", text: "text-white", name: "Jiná" },
};

/** Full nationality info (bg + text + name). Handles null/undefined codes. */
export function getNationalityInfo(code: string | null | undefined): NationalityInfo {
  const key = code?.toUpperCase() ?? "default";
  return NATIONALITY_INFO[key] || NATIONALITY_INFO.default;
}

/**
 * Simple bg-color-only map, kept for backward compatibility.
 * Derived from NATIONALITY_INFO so there is a single source of truth.
 */
export const NATIONALITY_COLORS: Record<string, string> = Object.fromEntries(
  Object.entries(NATIONALITY_INFO).map(([k, v]) => [k, v.bg]),
);

/** Returns just the bg class string for a nationality code. */
export function getNationalityColor(code: string): string {
  return NATIONALITY_COLORS[code] || NATIONALITY_COLORS.OTHER;
}

// ============================================================================
// PAYMENT STATUS COLORS
// ============================================================================

export const PAYMENT_STATUS_STYLES: Record<string, { label: string; className: string }> = {
  UNPAID: { label: "Nezaplaceno", className: "bg-red-500" },
  PARTIAL: { label: "Částečně", className: "bg-yellow-500" },
  PAID: { label: "Zaplaceno", className: "bg-green-500" },
  PENDING: { label: "Čeká", className: "bg-yellow-500" },
  CANCELLED: { label: "Zrušeno", className: "bg-gray-500" },
  AUTHORIZED: { label: "Autorizováno", className: "bg-blue-500" },
  CREATED: { label: "Vytvořeno", className: "bg-gray-400" },
};

// ============================================================================
// PAGINATION
// ============================================================================

export const PAGE_SIZE_OPTIONS = [10, 20, 50, 100] as const;

// ============================================================================
// DEFAULTS
// ============================================================================

export const DEFAULT_NATIONALITY = "Česká republika";

export const DEFAULT_PRICES = {
  adult: 1250,
  child: 800,
  infant: 0,
} as const;

/** Person types that don't pay (driver, guide, infant). */
export const FREE_PERSON_TYPES = ["driver", "guide", "infant"] as const;

export function isFreePerson(type: string): boolean {
  return (FREE_PERSON_TYPES as readonly string[]).includes(type);
}

// ============================================================================
// INVOICE STATUS STYLES (for badge rendering)
// ============================================================================

export const INVOICE_STATUS_STYLES: Record<string, { label: string; className: string }> = {
  DRAFT: { label: "Koncept", className: "text-gray-600 border-gray-600" },
  SENT: { label: "Odesláno", className: "text-blue-600 border-blue-600" },
  PAID: { label: "Zaplacena", className: "text-green-600 border-green-600" },
  CANCELLED: { label: "Storno", className: "text-red-600 border-red-600" },
};

export const INVOICE_TYPE_STYLES: Record<string, string> = {
  DEPOSIT: "Záloha",
  FINAL: "Doplatek",
  PARTIAL: "Částečná",
};
