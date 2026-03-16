/**
 * Centralized formatting utilities for currency, dates, and numbers.
 * Replaces 6+ duplicate formatCurrency implementations across the codebase.
 */

export const LOCALE = "cs-CZ";
export const CURRENCY = "CZK";

const currencyFormatter = new Intl.NumberFormat(LOCALE, {
  style: "currency",
  currency: CURRENCY,
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

/**
 * Format a number as Czech currency (CZK).
 * Handles number, string, undefined, and null inputs.
 *
 * @example formatCurrency(1250)  // "1 250 Kč"
 * @example formatCurrency("1250") // "1 250 Kč"
 * @example formatCurrency(undefined) // "0 Kč"
 */
export function formatCurrency(value: number | string | undefined | null): string {
  const num = typeof value === "string" ? parseFloat(value) || 0 : value ?? 0;
  return currencyFormatter.format(num);
}

/**
 * Format a number with Czech locale (no currency symbol).
 *
 * @example formatNumber(1250) // "1 250"
 */
export function formatNumber(value: number): string {
  return value.toLocaleString(LOCALE);
}
