export interface ReservationFormFooterProps {
  readonly totalPrice: number;
  readonly currency?: string;
  readonly onCancel: () => void;
  readonly saving: boolean;
  readonly editing: boolean;
}
