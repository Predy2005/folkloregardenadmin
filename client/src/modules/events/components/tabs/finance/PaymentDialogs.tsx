import { formatCurrency } from "@/shared/lib/formatting";
import { useCurrency } from "@/shared/contexts/CurrencyContext";
import { CurrencySelect } from "@/shared/components/CurrencySelect";
import type { ReservationPaymentSummary } from "@shared/types";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Textarea } from "@/shared/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/shared/components/ui/dialog";
import { Loader2 } from "lucide-react";

/* ---- Note Dialog ---- */

interface NoteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reservation: ReservationPaymentSummary | null;
  noteText: string;
  onNoteTextChange: (value: string) => void;
  onSave: () => void;
  isPending: boolean;
}

export function NoteDialog({
  open,
  onOpenChange,
  reservation,
  noteText,
  onNoteTextChange,
  onSave,
  isPending,
}: NoteDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Poznámka k platbě</DialogTitle>
          <DialogDescription>
            {reservation?.contactName} - Rezervace #{reservation?.reservationId}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <Textarea
            value={noteText}
            onChange={(e) => onNoteTextChange(e.target.value)}
            placeholder="Např. zaplatí při příjezdu, platba kartou na místě..."
            rows={4}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Zrušit
          </Button>
          <Button onClick={onSave} disabled={isPending}>
            {isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Ukládám...
              </>
            ) : (
              "Uložit"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ---- Record Payment Dialog ---- */

interface RecordPaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reservation: ReservationPaymentSummary | null;
  paymentAmount: string;
  onPaymentAmountChange: (value: string) => void;
  paymentNote: string;
  onPaymentNoteChange: (value: string) => void;
  onSave: () => void;
  isPending: boolean;
}

export function RecordPaymentDialog({
  open,
  onOpenChange,
  reservation,
  paymentAmount,
  onPaymentAmountChange,
  paymentNote,
  onPaymentNoteChange,
  onSave,
  isPending,
}: RecordPaymentDialogProps) {
  const { defaultCurrency } = useCurrency();
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Zaznamenat platbu</DialogTitle>
          <DialogDescription>
            {reservation?.contactName} - Zbývá: {reservation && formatCurrency(reservation.remainingAmount, defaultCurrency)}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium">Částka</label>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                value={paymentAmount}
                onChange={(e) => onPaymentAmountChange(e.target.value)}
                placeholder="Zadejte částku"
              />
              <CurrencySelect value={defaultCurrency} onChange={() => {}} className="w-24" />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium">Poznámka (volitelná)</label>
            <Input
              value={paymentNote}
              onChange={(e) => onPaymentNoteChange(e.target.value)}
              placeholder="Např. hotovost, karta..."
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Zrušit
          </Button>
          <Button
            onClick={onSave}
            disabled={isPending || !paymentAmount}
          >
            {isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Ukládám...
              </>
            ) : (
              "Zaznamenat platbu"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
