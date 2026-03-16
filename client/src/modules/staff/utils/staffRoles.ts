// typescript
 import { useQuery } from "@tanstack/react-query";
 import { api } from "@/shared/lib/api";

 export interface StaffRole {
   id: number;
   name: string;
   description?: string;
   requiredPerGuests?: number;
   guestsRatio?: number;
   createdAt?: string;
 }

/**
 * České překlady pro staff role
 */
export const STAFF_ROLE_LABELS: Record<string, string> = {
  // Uppercase codes (from database)
  MANAGER: "Manažer",
  COORDINATOR: "Koordinátor",
  HEAD_CHEF: "Šéfkuchař",
  CHEF: "Kuchař",
  SOUS_CHEF: "Pomocný kuchař",
  PREP_COOK: "Přípravář",
  HEAD_WAITER: "Vrchní číšník",
  WAITER: "Číšník",
  BARTENDER: "Barman",
  HOSTESS: "Hosteska",
  MUSICIAN: "Hudebník",
  DANCER: "Tanečník",
  SOUND_TECH: "Zvukař",
  PHOTOGRAPHER: "Fotograf",
  SECURITY: "Ochranka",
  CLEANER: "Uklízeč",
  DRIVER: "Řidič",
  // Lowercase codes (from staffing formulas)
  waiter: "Číšník",
  chef: "Kuchař",
  coordinator: "Koordinátor",
  bartender: "Barman",
  hostess: "Hosteska",
  security: "Ochranka",
  musician: "Hudebník",
  dancer: "Tanečník",
  photographer: "Fotograf",
  sound_tech: "Zvukař",
  cleaner: "Uklízeč",
  driver: "Řidič",
  manager: "Manažer",
};

/**
 * Vrátí český překlad pro kód role
 * Zvládá různé formáty: "SECURITY", "security", "security_FOLKLORE_SHOW"
 */
export function translateStaffRole(roleCode: string | null | undefined): string {
  if (!roleCode) return "Nepřiřazeno";

  // First try direct match (for uppercase codes like "SECURITY")
  if (STAFF_ROLE_LABELS[roleCode]) {
    return STAFF_ROLE_LABELS[roleCode];
  }

  // Try uppercase version
  const upperCode = roleCode.toUpperCase();
  if (STAFF_ROLE_LABELS[upperCode]) {
    return STAFF_ROLE_LABELS[upperCode];
  }

  // Handle codes with event type suffix like "security_FOLKLORE_SHOW"
  // Extract base code before underscore followed by uppercase letters
  const baseCode = roleCode.replace(/_[A-Z_]+$/, '').toUpperCase();
  if (STAFF_ROLE_LABELS[baseCode]) {
    return STAFF_ROLE_LABELS[baseCode];
  }

  // Return original if no translation found
  return roleCode;
}

 /**
  * Fetcher - očekává JSON pole rolí z /api/staff-member-roles
  */
 async function fetchStaffRoles(): Promise<StaffRole[]> {
   return api.get<StaffRole[]>("/api/staff-roles");
 }

 /**
  * React Query hook
  * Používá objektovou formu volání, aby odpovídalo typům @tanstack/react-query
  */
 export function useStaffRoles() {
   return useQuery({
     queryKey: ["staff-roles"],
     queryFn: fetchStaffRoles,
     staleTime: 60_000,
     refetchOnWindowFocus: false,
   });
 }

 /**
  * Pomocná funkce: mapuje id -> label
  */
 export function staffRoleLabelsById(roles: StaffRole[] = []) {
   return roles.reduce<Record<number, string>>((acc, r) => {
     acc[r.id] = r.name;
     return acc;
   }, {});
 }

 /**
  * Pomocná funkce: mapuje normalizovaný klíč (slug z name) -> label
  */
// typescript
export type SelectOption = { value: string; label: string };

/**
 * Vrátí pole optionů pro dropdown/select: { value: name, label: překlad }
 * Backend ukládá position jako string (název role), ne jako ID
 */
export function staffRoleOptions(roles: StaffRole[] = []): SelectOption[] {
  return roles.map((r) => ({
    value: r.name,
    label: STAFF_ROLE_LABELS[r.name] ?? r.name
  }));
}

/**
 * Vrátí jednu option podle name nebo undefined
 */
export function staffRoleOptionByName(roles: StaffRole[] = [], name?: string): SelectOption | undefined {
  if (name === undefined || name === null) return undefined;
  const r = roles.find((x) => x.name === name);
  return r ? { value: r.name, label: r.name } : undefined;
}

