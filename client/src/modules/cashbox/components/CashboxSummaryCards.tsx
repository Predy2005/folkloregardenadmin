import { StatCard } from "@/shared/components";
import { formatNumber } from "@/shared/lib/formatting";

interface CashboxSummaryCardsProps {
  initialBalance: number;
  incomeTotal: number;
  expenseTotal: number;
  currentBalance: number;
  currencyLabel: string;
}

export function CashboxSummaryCards({
  initialBalance,
  incomeTotal,
  expenseTotal,
  currentBalance,
  currencyLabel,
}: CashboxSummaryCardsProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <StatCard
        label="Počáteční stav"
        value={`${formatNumber(initialBalance)} ${currencyLabel}`}
      />
      <StatCard
        label="Příjmy"
        value={`+${formatNumber(incomeTotal)} ${currencyLabel}`}
        variant="success"
      />
      <StatCard
        label="Výdaje"
        value={`-${formatNumber(expenseTotal)} ${currencyLabel}`}
        variant="danger"
      />
      <StatCard
        label="Zůstatek"
        value={`${formatNumber(currentBalance)} ${currencyLabel}`}
        variant={currentBalance >= 0 ? "info" : "danger"}
      />
    </div>
  );
}
