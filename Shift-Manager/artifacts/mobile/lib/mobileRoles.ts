/**
 * Derivace UI role z backendových mobilních rolí.
 *
 * Backend vrací `user.roles: string[]` s hodnotami z
 * `App\Service\MobileAccountProvisioningService`:
 *   - STAFF_WAITER (číšník, obsluha, sál, management, performeři)
 *   - STAFF_COOK   (kuchyně)
 *   - STAFF_DRIVER (řidič)
 *
 * Mobilka sjednocuje WAITER + COOK na jedinou UI-roli `"staff"` (oba vidí
 * stejný kartový layout eventů, detail se větví server-side podle permissions).
 * DRIVER je samostatná UI-role s jiným seznamem (transporty).
 */

export type UiRole = "staff" | "driver" | null;

export type MobileBackendRole =
  | "STAFF_WAITER"
  | "STAFF_COOK"
  | "STAFF_DRIVER";

export function deriveUiRole(roles: readonly string[] | undefined): UiRole {
  if (!roles || roles.length === 0) return null;
  if (roles.includes("STAFF_DRIVER")) return "driver";
  if (roles.includes("STAFF_WAITER") || roles.includes("STAFF_COOK")) {
    return "staff";
  }
  return null;
}

/** Popisek role pro UI (Profil). */
export function getUiRoleLabel(role: UiRole, backendRoles?: readonly string[]): string {
  if (role === "driver") return "Řidič";
  if (role === "staff") {
    if (backendRoles?.includes("STAFF_COOK")) return "Kuchař";
    if (backendRoles?.includes("STAFF_WAITER")) return "Obsluha / sál";
    return "Personál";
  }
  return "Nepřiřazeno";
}
