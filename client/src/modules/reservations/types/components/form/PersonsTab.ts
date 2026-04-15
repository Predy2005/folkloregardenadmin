import type { ReservationFood } from "@shared/types";

export type PersonType = 'adult' | 'child' | 'infant' | 'driver' | 'guide';

export interface PersonField {
  readonly id: string;
  readonly type: PersonType;
  readonly menu: string;
  readonly price: number;
}

export interface PersonsTabProps {
  readonly personFields: PersonField[];
  readonly onAdd: (type: PersonType) => void;
  readonly onRemove: (index: number) => void;
  readonly foods?: ReservationFood[];
  readonly totalPrice: number;
  readonly currency?: string;
}
