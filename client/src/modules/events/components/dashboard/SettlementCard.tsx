import { Calculator, Wallet, TrendingUp, TrendingDown, Banknote } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Badge } from "@/shared/components/ui/badge";
import type { SettlementSummary, CashboxSummary } from "@shared/types";

interface SettlementCardProps {
  settlement: SettlementSummary;
  cashbox: CashboxSummary | null;
}

export function SettlementCard({ settlement, cashbox }: SettlementCardProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("cs-CZ", {
      style: "currency",
      currency: "CZK",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const isProfit = settlement.netResult >= 0;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Calculator className="h-5 w-5 text-primary" />
          Vyúčtování
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Cashbox info */}
        {cashbox && (
          <div className="p-3 bg-muted/30 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Wallet className="h-4 w-4" />
                {cashbox.name}
              </div>
              {cashbox.isActive && (
                <Badge variant="outline" className="text-xs text-green-600">
                  Aktivní
                </Badge>
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
        {cashbox && (
          <VarianceCheck
            expectedCash={settlement.cashOnHand}
            actualCash={cashbox.currentBalance}
            formatCurrency={formatCurrency}
          />
        )}
      </CardContent>
    </Card>
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
