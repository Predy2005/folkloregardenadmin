import type { Reservation } from "@shared/types";

export interface ReservationTableProps {
  readonly reservations: Reservation[];
  readonly searchTerm: string;
  readonly onSearchChange: (value: string) => void;
  readonly onView: (reservation: Reservation) => void;
  readonly onEdit: (reservation: Reservation) => void;
  readonly onDelete: (id: number) => void;
  readonly onSendPayment: (id: number) => void;
}
