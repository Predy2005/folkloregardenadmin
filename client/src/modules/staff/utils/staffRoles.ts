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
export type SelectOption = { value: number; label: string };

/**
 * Vrátí pole optionů pro dropdown/select: { value: id, label: name }
 */
export function staffRoleOptions(roles: StaffRole[] = []): SelectOption[] {
  return roles.map((r) => ({ value: r.id, label: r.name }));
}

/**
 * Vrátí jednu option podle id nebo undefined
 */
export function staffRoleOptionById(roles: StaffRole[] = [], id?: number): SelectOption | undefined {
  if (id === undefined || id === null) return undefined;
  const r = roles.find((x) => x.id === id);
  return r ? { value: r.id, label: r.name } : undefined;
}

