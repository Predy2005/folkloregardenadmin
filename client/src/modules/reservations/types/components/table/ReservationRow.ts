import type { Reservation } from "@shared/types";

export interface ReservationRowProps {
  readonly reservation: Reservation;
  readonly onView: (reservation: Reservation) => void;
  readonly onEdit: (reservation: Reservation) => void;
  readonly onDelete: (id: number) => void;
  readonly onSendPayment: (id: number) => void;
  readonly showCheckbox?: boolean;
  readonly isSelected?: boolean;
  readonly onToggleSelect?: (id: number) => void;
}
