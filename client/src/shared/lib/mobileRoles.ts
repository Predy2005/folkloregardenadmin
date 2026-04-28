/**
 * Mapa staff positions → mobilní role + human-readable popisek.
 * Držet v synchronizaci s `App\Service\MobileAccountProvisioningService::POSITION_TO_ROLE`
 * v backendu (`api/src/Service/MobileAccountProvisioningService.php`).
 *
 * Role jsou tři:
 *  - STAFF_WAITER: sál — vidí eventy + stoly + rozsazení
 *  - STAFF_COOK:   kuchyně — vidí eventy + menu + porce
 *  - STAFF_DRIVER: řidič — vidí transporty + aktualizuje stav jízdy
 */

export type MobileRole = "STAFF_WAITER" | "STAFF_COOK" | "STAFF_DRIVER";

export const POSITION_TO_MOBILE_ROLE: Record<string, MobileRole> = {
  // Kuchyně
  HEAD_CHEF: "STAFF_COOK",
  CHEF: "STAFF_COOK",
  SOUS_CHEF: "STAFF_COOK",
  PREP_COOK: "STAFF_COOK",
  // Řidič
  DRIVER: "STAFF_DRIVER",
  // Sál / služba / správa / performeři — všichni vidí seznam eventů + stoly
  MANAGER: "STAFF_WAITER",
  COORDINATOR: "STAFF_WAITER",
  HEAD_WAITER: "STAFF_WAITER",
  WAITER: "STAFF_WAITER",
  BARTENDER: "STAFF_WAITER",
  HOSTESS: "STAFF_WAITER",
  MUSICIAN: "STAFF_WAITER",
  DANCER: "STAFF_WAITER",
  SOUND_TECH: "STAFF_WAITER",
  PHOTOGRAPHER: "STAFF_WAITER",
  SECURITY: "STAFF_WAITER",
  CLEANER: "STAFF_WAITER",
};

export const MOBILE_ROLE_LABELS: Record<MobileRole, string> = {
  STAFF_WAITER: "Sál (číšník / obsluha)",
  STAFF_COOK: "Kuchyně",
  STAFF_DRIVER: "Řidič",
};

export const MOBILE_ROLE_DESCRIPTIONS: Record<MobileRole, string> = {
  STAFF_WAITER:
    "V mobilce uvidí přiřazené eventy, půdorys sálu, stoly a rozsazení hostů.",
  STAFF_COOK:
    "V mobilce uvidí přiřazené eventy, menu a počty porcí.",
  STAFF_DRIVER:
    "V mobilce uvidí přiřazené transporty a aktualizuje stav jízdy.",
};

/**
 * Vrátí mobilní roli odvozenou z pozice, nebo null pokud je pozice
 * prázdná nebo není v mapě (odpovídá backendové logice).
 */
export function deriveMobileRoleFromPosition(
  position: string | null | undefined,
): MobileRole | null {
  if (!position) return null;
  const key = position.toString().trim().toUpperCase();
  if (key === "") return null;
  return POSITION_TO_MOBILE_ROLE[key] ?? null;
}
