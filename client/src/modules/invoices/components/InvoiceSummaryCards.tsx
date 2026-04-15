import dayjs from "dayjs";
import { formatCurrency } from "@/shared/lib/formatting";
import { useCurrency } from "@/shared/contexts/CurrencyContext";
import { Card, CardContent } from "@/shared/components/ui/card";
import { StatCard } from "@/shared/components";
import type { Invoice } from "@shared/types";

interface InvoiceSummaryCardsProps {
  readonly invoices: Invoice[];
}

// Sum invoice totals grouped by currency
function sumByCurrency(invoices: Invoice[], fallbackCurrency: string): Record<string, number> {
  const totals: Record<string, number> = {};
  for (const inv of invoices) {
    const currency = inv.currency || fallbackCurrency;
    totals[currency] = (totals[currency] ?? 0) + Number.parseFloat(inv.total);
  }
  return totals;
}

interface MultiCurrencyCardProps {
  readonly label: string;
  readonly totals: Record<string, number>;
  readonly variant?: 'default' | 'danger' | 'success';
  readonly fallbackCurrency: string;
}

// Card showing one row per currency
function MultiCurrencyCard({ label, totals, variant = 'default', fallbackCurrency }: MultiCurrencyCardProps) {
  const entries = Object.entries(totals).filter(([, v]) => v > 0);
  const valueColor = variant === 'danger' ? 'text-red-600'
    : variant === 'success' ? 'text-green-600'
    : 'text-foreground';

  return (
    <Card>
      <CardContent className="p-4">
        <div className="text-sm text-muted-foreground mb-2">{label}</div>
        {entries.length === 0 ? (
          <div className={`text-2xl font-bold ${valueColor}`}>
            {formatCurrency(0, fallbackCurrency)}
          </div>
        ) : (
          <div className="space-y-1">
            {entries.map(([currency, value]) => (
              <div key={currency} className={`text-2xl font-bold ${valueColor}`}>
                {formatCurrency(value, currency)}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function InvoiceSummaryCards({ invoices }: InvoiceSummaryCardsProps) {
  const { defaultCurrency } = useCurrency();

  const unpaidTotals = sumByCurrency(
    invoices.filter(i => i.status === 'SENT'),
    defaultCurrency,
  );
  const paidThisMonthTotals = sumByCurrency(
    invoices.filter(i => i.status === 'PAID' && dayjs(i.paidAt).isAfter(dayjs().startOf('month'))),
    defaultCurrency,
  );
  const draftTotals = sumByCurrency(
    invoices.filter(i => i.status === 'DRAFT'),
    defaultCurrency,
  );
  const overdueCount = invoices.filter(i => i.status === 'SENT' && dayjs(i.dueDate).isBefore(dayjs())).length;
  const draftCount = invoices.filter(i => i.status === 'DRAFT').length;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <MultiCurrencyCard
        label="Celkem nezaplaceno"
        totals={unpaidTotals}
        variant="danger"
        fallbackCurrency={defaultCurrency}
      />
      <StatCard
        label="Po splatnosti"
        value={`${overdueCount} faktur`}
        variant="danger"
      />
      <MultiCurrencyCard
        label="Zaplaceno tento měsíc"
        totals={paidThisMonthTotals}
        variant="success"
        fallbackCurrency={defaultCurrency}
      />
      <MultiCurrencyCard
        label={`Koncepty (${draftCount})`}
        totals={draftTotals}
        fallbackCurrency={defaultCurrency}
      />
    </div>
  );
}
