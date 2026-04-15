import { Button } from "@/shared/components/ui/button";
import { Textarea } from "@/shared/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";

interface MarkPaidDialogProps {
  markPaidId: number | null;
  paymentNote: string;
  setPaymentNote: (val: string) => void;
  onClose: () => void;
  onConfirm: () => void;
  isPending: boolean;
}

export function MarkPaidDialog({
  markPaidId,
  paymentNote,
  setPaymentNote,
  onClose,
  onConfirm,
  isPending,
}: MarkPaidDialogProps) {
  return (
    <Dialog open={markPaidId !== null} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Označit jako zaplaceno</DialogTitle>
          <DialogDescription>Můžete přidat poznámku k platbě</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium">Poznámka k platbě</label>
            <Textarea
              placeholder="Poznámka k platbě (nepovinné)"
              value={paymentNote}
              onChange={(e) => setPaymentNote(e.target.value)}
              className="mt-1"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Zrušit
          </Button>
          <Button
            onClick={onConfirm}
            disabled={isPending}
          >
            {isPending ? "Označování..." : "Potvrdit platbu"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
