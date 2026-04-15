import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/shared/components/ui/dialog";
import { Label } from "@/shared/components/ui/label";
import { Textarea } from "@/shared/components/ui/textarea";
import { api } from "@/shared/lib/api";
import { invalidateCashboxQueries } from "@/shared/lib/query-helpers";
import { formatNumber } from "@/shared/lib/formatting";
import { successToast, errorToast } from "@/shared/lib/toast-helpers";

interface AdjustBalanceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentBalance: number;
  currencyLabel: string;
}

export function AdjustBalanceDialog({ open, onOpenChange, currentBalance, currencyLabel }: AdjustBalanceDialogProps) {
  const [adjustBalance, setAdjustBalance] = useState("");
  const [adjustReason, setAdjustReason] = useState("");

  useEffect(() => {
    if (open) {
      setAdjustBalance(String(currentBalance));
      setAdjustReason("");
    }
  }, [open, currentBalance]);

  const adjustBalanceMutation = useMutation({
    mutationFn: (data: { newBalance: number; reason: string }) =>
      api.post('/api/cashbox/main/adjust-balance', data),
    onSuccess: () => {
      invalidateCashboxQueries();
      onOpenChange(false);
      setAdjustBalance("");
      setAdjustReason("");
      successToast("Zůstatek kasy upraven");
    },
    onError: (e: Error) => errorToast(e),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Korekce zůstatku kasy</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
            <span className="text-sm text-muted-foreground">Aktuální zůstatek v systému</span>
            <span className="text-lg font-bold">{formatNumber(currentBalance)} {currencyLabel}</span>
          </div>
          <div>
            <Label>Skutečný zůstatek ({currencyLabel})</Label>
            <Input
              type="number"
              step="0.01"
              value={adjustBalance}
              onChange={(e) => setAdjustBalance(e.target.value)}
              placeholder="0.00"
            />
          </div>
          {adjustBalance && parseFloat(adjustBalance) !== currentBalance && (
            <div className="flex justify-between items-center p-3 rounded-lg border">
              <span className="text-sm text-muted-foreground">Korekce</span>
              {(() => {
                const diff = parseFloat(adjustBalance) - currentBalance;
                return (
                  <span className={`text-lg font-bold ${diff > 0 ? "text-green-600" : "text-red-600"}`}>
                    {diff >= 0 ? "+" : ""}{formatNumber(diff)} {currencyLabel}
                  </span>
                );
              })()}
            </div>
          )}
          <div>
            <Label>Důvod korekce (povinné)</Label>
            <Textarea
              value={adjustReason}
              onChange={(e) => setAdjustReason(e.target.value)}
              placeholder="Např.: Inventura hotovosti, opraven chybný zápis, ..."
              className="min-h-[80px]"
            />
          </div>
          <div className="text-xs text-muted-foreground bg-amber-50 dark:bg-amber-950 p-3 rounded border border-amber-200 dark:border-amber-800">
            Korekce vytvoří vyrovnávací pohyb (příjem nebo výdaj) s kategorií KOREKCE.
            Vše se zaloguje do audit logu včetně důvodu a původního zůstatku.
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Zrušit</Button>
          <Button
            onClick={() => {
              if (!adjustBalance || !adjustReason.trim()) return;
              adjustBalanceMutation.mutate({
                newBalance: parseFloat(adjustBalance),
                reason: adjustReason.trim(),
              });
            }}
            disabled={adjustBalanceMutation.isPending || !adjustBalance || !adjustReason.trim() || parseFloat(adjustBalance) === currentBalance}
          >
            {adjustBalanceMutation.isPending ? "Ukládám..." : "Provést korekci"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
