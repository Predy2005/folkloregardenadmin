import type { Reservation } from "@shared/types";

export interface ReservationDetailDialogProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly reservation: Reservation | null;
}
