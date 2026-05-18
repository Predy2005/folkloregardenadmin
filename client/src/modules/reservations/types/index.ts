// Domain types for multi-reservation form (from ReservationEditPage)
export interface PersonEntry {
  type: "adult" | "child" | "infant" | "driver" | "guide";
  menu: string;
  price: number;
  nationality: string;
  drinkOption: string;
  /** Comma-joined names of selected drinks (snapshot pro display + bulk export). */
  drinkName: string;
  /** Součet cen vybraných nápojů (jeden welcome může obsahovat víc položek). */
  drinkPrice: number;
  /**
   * Pole ID vybraných nápojů — welcome combo (víno+medovina+sodovka) má více
   * položek; allin obvykle jen jednu. `[]` = host nemá zvolen konkrétní drink.
   */
  drinkItemIds: number[];
}

export interface TransferEntry {
  personCount: number;
  address: string;
  transportCompanyId?: number | null;
  transportVehicleId?: number | null;
  transportDriverId?: number | null;
}

export interface ReservationEntry {
  date: string;
  persons: PersonEntry[];
  status: "RECEIVED" | "WAITING_PAYMENT" | "PAID" | "CANCELLED" | "AUTHORIZED" | "CONFIRMED";
  contactNote: string;
  /** Kdo objednávku provedl (volitelné — např. zaměstnanec CK). */
  orderedBy: string;
  transfers: TransferEntry[];
  reservationTypeId?: number;
}

export interface SharedContact {
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  contactNationality: string;
  clientComeFrom: string;
  currency: string;
  invoiceSameAsContact: boolean;
  invoiceName: string;
  invoiceCompany: string;
  invoiceIc: string;
  invoiceDic: string;
  invoiceEmail: string;
  invoicePhone: string;
}

// Types for reservation table sorting (from ReservationTable)
export type SortColumn = 'id' | 'date' | 'contactName' | null;
export type SortDirection = 'asc' | 'desc';
