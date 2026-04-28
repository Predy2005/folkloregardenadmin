/**
 * Derivace UI role + position label z backendových mobilních rolí.
 *
 * Backend vrací `user.roles: string[]` s hodnotami z
 * `App\Service\MobileAccountProvisioningService`:
 *   - STAFF_WAITER (číšník, obsluha, sál, management, performeři)
 *   - STAFF_COOK   (kuchyně)
 *   - STAFF_DRIVER (řidič)
 *
 * + `user.staffMemberPosition: string | null` — skutečná pozice z CRM
 *   (MANAGER, COORDINATOR, WAITER, BARTENDER, …). Mobilka ji použije pro
 *   přesnější label na profile screenu (místo obecného "Personál").
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

/**
 * Mapování CRM `staff.position` → český popisek.
 * Hodnoty zrcadlí `App\Service\MobileAccountProvisioningService::POSITION_TO_ROLE`.
 */
export const POSITION_LABELS: Record<string, string> = {
  // Sál / obsluha / management
  MANAGER: "Manažer",
  COORDINATOR: "Koordinátor",
  HEAD_WAITER: "Vrchní číšník",
  WAITER: "Číšník / Servírka",
  BARTENDER: "Barman",
  HOSTESS: "Hosteska",
  MUSICIAN: "Muzikant",
  DANCER: "Tanečník",
  SOUND_TECH: "Zvukař",
  PHOTOGRAPHER: "Fotograf",
  SECURITY: "Ochranka",
  CLEANER: "Úklid",
  // Kuchyně
  HEAD_CHEF: "Šéfkuchař",
  CHEF: "Kuchař",
  SOUS_CHEF: "Sous-chef",
  PREP_COOK: "Pomocný kuchař",
  // Řidič
  DRIVER: "Řidič",
};

export function deriveUiRole(roles: readonly string[] | undefined): UiRole {
  if (!roles || roles.length === 0) return null;
  if (roles.includes("STAFF_DRIVER")) return "driver";
  if (roles.includes("STAFF_WAITER") || roles.includes("STAFF_COOK")) {
    return "staff";
  }
  return null;
}

/**
 * Popisek pro UI badge na profile screenu.
 *
 * Priorita:
 *   1) Pokud máme konkrétní `position` z CRM → přesný label ("Manažer", "Číšník", …)
 *   2) Pokud ne, fallback na obecnou roli ("Personál" / "Řidič")
 */
export function getUiRoleLabel(
  role: UiRole,
  position?: string | null,
): string {
  if (position) {
    const upper = position.toUpperCase().trim();
    if (POSITION_LABELS[upper]) return POSITION_LABELS[upper];
  }
  if (role === "driver") return "Řidič";
  if (role === "staff") return "Personál";
  return "Nepřiřazeno";
}
