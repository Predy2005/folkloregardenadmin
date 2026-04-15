import { X } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import { formatCurrency } from "@/shared/lib/formatting";
import { useCurrency } from "@/shared/contexts/CurrencyContext";

const STORNO_REASONS = [
  "Chybná částka",
  "Špatná kategorie",
  "Duplicitní záznam",
  "Zrušená objednávka",
  "Reklamace",
];

export interface StornoDialogProps {
  item: { id: number; description: string; amount: number } | null;
  reason: string;
  onReasonChange: (reason: string) => void;
  onClose: () => void;
  onConfirm: () => void;
  isPending: boolean;
}

export function StornoDialog({ item, reason, onReasonChange, onClose, onConfirm, isPending }: StornoDialogProps) {
  const { defaultCurrency } = useCurrency();
  if (!item) return null;

  return (
    <Dialog open={!!item} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-sm p-0 gap-0 overflow-hidden">
        <div className="px-4 py-3 bg-orange-500 text-white">
          <DialogHeader>
            <DialogTitle className="text-white text-lg">Storno</DialogTitle>
          </DialogHeader>
        </div>

        <div className="p-4 space-y-4">
          {/* What's being reversed */}
          <div className="p-3 bg-muted/50 rounded-lg">
            <p className="text-sm font-medium truncate">{item.description}</p>
            <p className="text-lg font-bold font-mono mt-1">{formatCurrency(item.amount, defaultCurrency)}</p>
          </div>

          {/* Quick reason buttons */}
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Důvod storna</Label>
            <div className="grid grid-cols-2 gap-2">
              {STORNO_REASONS.map((r) => (
                <button
                  key={r}
                  type="button"
                  className={`
                    px-3 py-2.5 rounded-lg border text-sm font-medium text-left
                    touch-manipulation transition-all active:scale-95
                    ${reason === r
                      ? "border-orange-400 bg-orange-50 text-orange-700 ring-2 ring-orange-200"
                      : "border-border hover:bg-muted/50"
                    }
                  `}
                  onClick={() => onReasonChange(r)}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          {/* Custom reason */}
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Vlastní důvod</Label>
            <Input
              value={STORNO_REASONS.includes(reason) ? "" : reason}
              onChange={(e) => onReasonChange(e.target.value)}
              placeholder="Nebo napište vlastní..."
              className="min-h-[44px]"
              onKeyDown={(e) => { if (e.key === "Enter" && reason) onConfirm(); }}
            />
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-1">
            <Button
              variant="outline"
              className="flex-1 min-h-[48px]"
              onClick={onClose}
            >
              Zrušit
            </Button>
            <Button
              className="flex-1 min-h-[48px] bg-orange-500 hover:bg-orange-600 text-white"
              onClick={onConfirm}
              disabled={!reason || isPending}
            >
              {isPending ? "..." : (
                <>
                  <X className="h-4 w-4 mr-2" />
                  Provést storno
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
