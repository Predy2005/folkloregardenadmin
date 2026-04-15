import type { ReservationFood, DrinkItem } from "@shared/types";
import type { PersonEntry, ReservationEntry } from "@modules/reservations/types";

export interface ReservationPersonsSectionProps {
  readonly currentReservation: ReservationEntry;
  readonly activeTabIndex: number;
  readonly foods: ReservationFood[] | undefined;
  readonly drinks?: DrinkItem[];
  readonly currency?: string;
  readonly currentTotalPrice: number;
  // Bulk add persons state
  readonly bulkCount: number;
  readonly setBulkCount: (value: number) => void;
  readonly bulkType: PersonEntry["type"];
  readonly setBulkType: (value: PersonEntry["type"]) => void;
  readonly bulkMenu: string;
  readonly setBulkMenu: (value: string) => void;
  readonly bulkPrice: number | "";
  readonly setBulkPrice: (value: number | "") => void;
  readonly bulkNationality: string;
  readonly setBulkNationality: (value: string) => void;
  // Bulk change state
  readonly bulkPriceChange: number | "";
  readonly setBulkPriceChange: (value: number | "") => void;
  readonly bulkMenuChange: string;
  readonly setBulkMenuChange: (value: string) => void;
  readonly bulkDrinkChange: string;
  readonly setBulkDrinkChange: (value: string) => void;
  // Handlers
  readonly addPerson: (resIndex: number, type: PersonEntry["type"]) => void;
  readonly addBulkPersons: (resIndex: number) => void;
  readonly applyBulkPriceChange: (resIndex: number) => void;
  readonly applyBulkMenuChange: (resIndex: number) => void;
  readonly applyBulkDrinkChange: (resIndex: number) => void;
  readonly handleTypeChange: (resIndex: number, personIndex: number, newType: PersonEntry["type"]) => void;
  readonly handleMenuChange: (resIndex: number, personIndex: number, newMenuValue: string) => void;
  readonly updatePerson: (resIndex: number, personIndex: number, updates: Partial<PersonEntry>) => void;
  readonly removePerson: (resIndex: number, personIndex: number) => void;
}
