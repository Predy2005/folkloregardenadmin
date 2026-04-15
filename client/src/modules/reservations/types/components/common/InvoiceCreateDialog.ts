export interface InvoiceCreateDialogProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly reservationId: number;
  readonly invoiceType: "DEPOSIT" | "FINAL";
  readonly depositPercent?: number;
  readonly currency?: string;
  readonly onSuccess?: () => void;
}
