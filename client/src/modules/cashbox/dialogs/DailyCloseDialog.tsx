import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/shared/components/ui/dialog";
import { Label } from "@/shared/components/ui/label";
import { Textarea } from "@/shared/components/ui/textarea";
import { api } from "@/shared/lib/api";
import { formatCurrency } from "@/shared/lib/formatting";
import { invalidateCashboxQueries } from "@/shared/lib/query-helpers";
import { successToast, errorToast } from "@/shared/lib/toast-helpers";

interface DailyCloseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentBalance: number;
  currency: string;
}

export function DailyCloseDialog({ open, onOpenChange, currentBalance, currency }: DailyCloseDialogProps) {
  const [actualCash, setActualCash] = useState("");
  const [closeNotes, setCloseNotes] = useState("");

  const closeMutation = useMutation({
    mutationFn: (data: { actualCash: number; notes?: string }) =>
      api.post('/api/cashbox/main/close', data),
    onSuccess: () => {
      invalidateCashboxQueries();
      onOpenChange(false);
      setActualCash("");
      setCloseNotes("");
      successToast("Denní uzávěrka dokončena");
    },
    onError: (e: Error) => errorToast(e),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Denní uzávěrka</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
            <span className="text-sm text-muted-foreground">Očekávaný zůstatek</span>
            <span className="text-lg font-bold">{formatCurrency(currentBalance, currency)}</span>
          </div>
          <div>
            <Label>Skutečně napočítaná hotovost</Label>
            <Input
              type="number"
              step="0.01"
              min="0"
              value={actualCash}
              onChange={(e) => setActualCash(e.target.value)}
              placeholder="0.00"
            />
          </div>
          {actualCash && (
            <div className="flex justify-between items-center p-3 rounded-lg border">
              <span className="text-sm text-muted-foreground">Rozdíl</span>
              {(() => {
                const diff = parseFloat(actualCash) - currentBalance;
                return (
                  <span className={`text-lg font-bold ${diff === 0 ? "text-green-600" : diff > 0 ? "text-blue-600" : "text-red-600"}`}>
                    {diff >= 0 ? "+" : ""}{formatCurrency(diff, currency)}
                  </span>
                );
              })()}
            </div>
          )}
          <div>
            <Label>Poznámky (volitelné)</Label>
            <Textarea
              value={closeNotes}
              onChange={(e) => setCloseNotes(e.target.value)}
              placeholder="Denní uzávěrka"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Zrušit</Button>
          <Button
            onClick={() => {
              if (!actualCash || parseFloat(actualCash) < 0) return;
              closeMutation.mutate({
                actualCash: parseFloat(actualCash),
                notes: closeNotes || undefined,
              });
            }}
            disabled={closeMutation.isPending || !actualCash}
          >
            {closeMutation.isPending ? "Uzavírám..." : "Potvrdit uzávěrku"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
