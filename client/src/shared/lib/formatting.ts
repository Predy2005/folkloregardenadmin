/**
 * Centralized formatting utilities for currency, dates, and numbers.
 * Supports multi-currency with cached formatters per currency code.
 */

export const LOCALE = "cs-CZ";
export const DEFAULT_CURRENCY = "CZK";

// Locale mapping per currency for optimal formatting
const CURRENCY_LOCALES: Record<string, string> = {
  CZK: "cs-CZ",
  EUR: "de-DE",
  USD: "en-US",
  GBP: "en-GB",
};

// Cache formatters to avoid re-creating Intl.NumberFormat on every call
const formatterCache = new Map<string, Intl.NumberFormat>();

function getFormatter(currency: string): Intl.NumberFormat {
  let formatter = formatterCache.get(currency);
  if (!formatter) {
    const locale = CURRENCY_LOCALES[currency] ?? LOCALE;
    formatter = new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
      minimumFractionDigits: currency === "CZK" ? 0 : 2,
      maximumFractionDigits: currency === "CZK" ? 0 : 2,
    });
    formatterCache.set(currency, formatter);
  }
  return formatter;
}

/**
 * Format a number as currency.
 * Defaults to CZK for backwards compatibility.
 *
 * @example formatCurrency(1250)           // "1 250 Kč"
 * @example formatCurrency(1250, "EUR")    // "1.250,00 €"
 * @example formatCurrency(1250, "USD")    // "$1,250.00"
 */
export function formatCurrency(value: number | string | undefined | null, currency?: string): string {
  const num = typeof value === "string" ? parseFloat(value) || 0 : value ?? 0;
  return getFormatter(currency ?? DEFAULT_CURRENCY).format(num);
}

/**
 * Get currency symbol for compact display.
 *
 * @example getCurrencySymbol("CZK") // "Kč"
 * @example getCurrencySymbol("EUR") // "€"
 */
export function getCurrencySymbol(currency: string): string {
  const symbols: Record<string, string> = {
    CZK: "Kč",
    EUR: "\u20AC",
    USD: "$",
    GBP: "\u00A3",
  };
  return symbols[currency] ?? currency;
}

/**
 * Format a number with Czech locale (no currency symbol).
 */
export function formatNumber(value: number): string {
  return value.toLocaleString(LOCALE);
}

// ── Date formatting ──────────────────────────────────────────────────────

/**
 * Format a date string or Date as DD.MM.YYYY
 * @example formatDate("2026-04-09") // "09.04.2026"
 * @example formatDate(new Date())   // "09.04.2026"
 */
export function formatDate(value: string | Date | null | undefined): string {
  if (!value) return "–";
  const d = typeof value === "string" ? new Date(value) : value;
  if (isNaN(d.getTime())) return "–";
  return d.toLocaleDateString(LOCALE, { day: "2-digit", month: "2-digit", year: "numeric" });
}

/**
 * Format a date string or Date as DD.MM.YYYY HH:mm
 * @example formatDateTime("2026-04-09T14:30:00") // "09.04.2026 14:30"
 */
export function formatDateTime(value: string | Date | null | undefined): string {
  if (!value) return "–";
  const d = typeof value === "string" ? new Date(value) : value;
  if (isNaN(d.getTime())) return "–";
  return d.toLocaleDateString(LOCALE, {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

/**
 * Format time only HH:mm
 * @example formatTime("2026-04-09T14:30:00") // "14:30"
 */
export function formatTime(value: string | Date | null | undefined): string {
  if (!value) return "–";
  const d = typeof value === "string" ? new Date(value) : value;
  if (isNaN(d.getTime())) return "–";
  return d.toLocaleTimeString(LOCALE, { hour: "2-digit", minute: "2-digit" });
}

/**
 * Format a date as relative (dnes, včera, zítra) or DD.MM.YYYY
 */
export function formatRelativeDate(value: string | Date | null | undefined): string {
  if (!value) return "–";
  const d = typeof value === "string" ? new Date(value) : value;
  if (isNaN(d.getTime())) return "–";
  const now = new Date();
  const diffDays = Math.floor((d.getTime() - now.getTime()) / 86400000);
  if (diffDays === 0) return "Dnes";
  if (diffDays === -1) return "Včera";
  if (diffDays === 1) return "Zítra";
  return formatDate(d);
}
