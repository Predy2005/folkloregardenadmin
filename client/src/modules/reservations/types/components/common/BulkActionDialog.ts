export type BulkActionType = 'status' | 'reservationType' | 'delete';

export interface WarningItem {
  type: string;
  message: string;
  eventId?: number;
  eventName?: string;
}

export interface ReservationWarning {
  reservationId: number;
  contactName: string;
  date: string;
  warnings: WarningItem[];
}

export interface BulkActionDialogProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly actionType: BulkActionType;
  readonly selectedIds: Set<number>;
  readonly onSuccess: () => void;
}
