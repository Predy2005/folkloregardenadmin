import { useQuery } from "@tanstack/react-query";
import { api } from "@/shared/lib/api";

export interface PartnerCategory {
  id: number;
  name: string;
  slug: string;
  displayOrder: number;
  isActive: boolean;
  createdAt: string;
}

const QUERY_KEY = ["/api/partner-categories"] as const;

/**
 * Načte aktivní kategorie partnerů (pro dropdowny ve formulářích).
 * Pro správcovskou stránku použij `useAllPartnerCategories` (vrací i neaktivní).
 */
export function usePartnerCategories(activeOnly = true) {
  return useQuery({
    queryKey: [...QUERY_KEY, { activeOnly }],
    queryFn: () =>
      api.get<PartnerCategory[]>(
        activeOnly ? "/api/partner-categories?activeOnly=1" : "/api/partner-categories",
      ),
    staleTime: 60_000,
  });
}

/**
 * Mapování slug → label pro fallback (když partner má slug kategorie, která už
 * neexistuje, ukážeme aspoň slug). Caller obvykle dostane data z usePartnerCategories
 * a sestaví si vlastní mapu, ale toto je default pro nejčastější případy.
 */
export const DEFAULT_PARTNER_CATEGORY_LABELS: Record<string, string> = {
  TRAVEL_AGENCY: "Cestovní kancelář",
  GUIDE: "Průvodce",
  HOTEL: "Hotel",
  OTHER: "Ostatní",
  // Legacy hodnoty z původního enumu — kdyby přežily v datech
  RECEPTION: "Recepce",
  DISTRIBUTOR: "Distributor",
};
