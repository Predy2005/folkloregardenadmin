import { useState } from "react";
import { Wallet, TrendingUp, TrendingDown, Banknote, ArrowRight } from "lucide-react";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Textarea } from "@/shared/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/shared/components/ui/dialog";
import { formatCurrency } from "@/shared/lib/formatting";
import { useCloseEventCashbox, useReopenEventCashbox } from "../../hooks/useDashboardMutations";
import type { SettlementSummary, CashboxSummary } from "@shared/types";

interface SettlementCardProps {
  settlement: SettlementSummary;
  cashbox: CashboxSummary | null;
  eventId: number;
}

export function SettlementCard({ settlement, cashbox, eventId }: SettlementCardProps) {
  const isProfit = settlement.netResult >= 0;
  const [showClose, setShowClose] = useState(false);
  const [actualCash, setActualCash] = useState("");
  const [closeNotes, setCloseNotes] = useState("");

  const closeCashbox = useCloseEventCashbox(eventId);
  const reopenCashbox = useReopenEventCashbox(eventId);

  const isActive = cashbox?.isActive ?? false;
  const isClosed = cashbox && !cashbox.isActive;

  return (
    <div className="p-4 space-y-4">
        {/* Cashbox info */}
        {cashbox && (
          <div className="p-3 bg-indigo-50/50 dark:bg-indigo-950/20 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Wallet className="h-4 w-4" />
                {cashbox.name}
              </div>
              {isActive ? (
                <Badge variant="outline" className="text-xs text-green-600">Aktivní</Badge>
              ) : (
                <Badge variant="destructive" className="text-xs">Uzavřena</Badge>
              )}
            </div>
            <div className="text-2xl font-bold">
              {formatCurrency(cashbox.currentBalance)}
            </div>
            <div className="text-xs text-muted-foreground">
              Aktuální zůstatek v kase
            </div>
          </div>
        )}

        {/* Settlement breakdown */}
        <div className="space-y-2">
          <SettlementRow
            icon={<Banknote className="h-4 w-4" />}
            label="Počáteční stav"
            value={formatCurrency(settlement.initialCash)}
          />

          <SettlementRow
            icon={<TrendingUp className="h-4 w-4 text-green-600" />}
            label="Celkové příjmy"
            value={formatCurrency(settlement.totalIncome)}
            valueClassName="text-green-600"
          />

          <SettlementRow
            icon={<TrendingDown className="h-4 w-4 text-red-500" />}
            label="Celkové výdaje"
            value={formatCurrency(settlement.totalExpenses)}
            valueClassName="text-red-500"
          />

          <div className="border-t pt-2 mt-2">
            <SettlementRow
              label="Výsledek"
              value={`${isProfit ? "+" : ""}${formatCurrency(settlement.netResult)}`}
              valueClassName={`text-lg font-bold ${isProfit ? "text-green-600" : "text-red-500"}`}
              labelClassName="font-medium"
            />
          </div>

          <div className="border-t pt-2 mt-2">
            <SettlementRow
              icon={<Wallet className="h-4 w-4" />}
              label="Hotovost v kase"
              value={formatCurrency(settlement.cashOnHand)}
              valueClassName="text-lg font-bold text-primary"
              labelClassName="font-medium"
            />
          </div>
        </div>

        {/* Variance check */}
        {cashbox && isActive && (
          <VarianceCheck
            expectedCash={settlement.cashOnHand}
            actualCash={cashbox.currentBalance}
            formatCurrency={formatCurrency}
          />
        )}

        {/* Close / Reopen buttons */}
        {cashbox && (
          <div className="pt-2 border-t space-y-2">
            {isActive && (
              <Button
                variant="outline"
                className="w-full min-h-[44px] touch-manipulation"
                onClick={() => {
                  setActualCash(String(cashbox.currentBalance));
                  setShowClose(true);
                }}
              >
                <ArrowRight className="h-4 w-4 mr-2" />
                Uzavřít kasu a převést do hlavní kasy
              </Button>
            )}
            {isClosed && (
              <Button
                variant="outline"
                className="w-full min-h-[44px] touch-manipulation"
                onClick={() => reopenCashbox.mutate()}
                disabled={reopenCashbox.isPending}
              >
                {reopenCashbox.isPending ? "Otevírání..." : "Znovu otevřít kasu"}
              </Button>
            )}
          </div>
        )}

        {/* Close cashbox dialog */}
        <Dialog open={showClose} onOpenChange={setShowClose}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>Uzavřít kasu eventu</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Zadejte skutečnou hotovost v kase. Částka bude převedena do hlavní kasy.
              </p>
              <div>
                <Label>Skutečná hotovost</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={actualCash}
                  onChange={(e) => setActualCash(e.target.value)}
                  className="min-h-[44px]"
                />
              </div>
              <div>
                <Label>Poznámka (volitelné)</Label>
                <Textarea
                  value={closeNotes}
                  onChange={(e) => setCloseNotes(e.target.value)}
                  placeholder="Poznámky k uzávěrce"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowClose(false)}>Zrušit</Button>
              <Button
                onClick={() => {
                  closeCashbox.mutate(
                    {
                      actualCash: parseFloat(actualCash) || 0,
                      notes: closeNotes || undefined,
                    },
                    { onSuccess: () => { setShowClose(false); setCloseNotes(""); } }
                  );
                }}
                disabled={closeCashbox.isPending}
              >
                {closeCashbox.isPending ? "Uzavírání..." : "Uzavřít a převést"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
    </div>
  );
}

interface SettlementRowProps {
  icon?: React.ReactNode;
  label: string;
  value: string;
  valueClassName?: string;
  labelClassName?: string;
}

function SettlementRow({
  icon,
  label,
  value,
  valueClassName = "",
  labelClassName = "",
}: SettlementRowProps) {
  return (
    <div className="flex items-center justify-between">
      <div className={`flex items-center gap-2 text-sm ${labelClassName}`}>
        {icon}
        {label}
      </div>
      <span className={`font-medium ${valueClassName}`}>{value}</span>
    </div>
  );
}

interface VarianceCheckProps {
  expectedCash: number;
  actualCash: number;
  formatCurrency: (amount: number) => string;
}

function VarianceCheck({
  expectedCash,
  actualCash,
  formatCurrency,
}: VarianceCheckProps) {
  const variance = actualCash - expectedCash;

  if (Math.abs(variance) < 1) {
    return (
      <div className="p-2 bg-green-500/10 border border-green-500/20 rounded-lg text-center">
        <span className="text-sm text-green-600 font-medium">
          Pokladna sedí
        </span>
      </div>
    );
  }

  const isOver = variance > 0;

  return (
    <div
      className={`p-2 rounded-lg text-center ${
        isOver
          ? "bg-blue-500/10 border border-blue-500/20"
          : "bg-red-500/10 border border-red-500/20"
      }`}
    >
      <span
        className={`text-sm font-medium ${isOver ? "text-blue-600" : "text-red-500"}`}
      >
        Rozdíl: {isOver ? "+" : ""}
        {formatCurrency(variance)}
      </span>
      <p className="text-xs text-muted-foreground mt-1">
        {isOver ? "Přebytek v pokladně" : "Manko v pokladně"}
      </p>
    </div>
  );
}
