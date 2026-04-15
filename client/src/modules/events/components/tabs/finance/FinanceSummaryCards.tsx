import { formatCurrency } from "@/shared/lib/formatting";
import type { PaymentTotals, EventInvoiceSummary } from "@shared/types";
import { StatCard } from "@/shared/components";
import { AlertCircle, CheckCircle2, FileText, Receipt } from "lucide-react";

interface FinanceSummaryCardsProps {
  totals: PaymentTotals;
  invoices: EventInvoiceSummary[];
}

export default function FinanceSummaryCards({ totals, invoices }: FinanceSummaryCardsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      <StatCard
        label="Očekávaná částka"
        value={formatCurrency(totals.totalExpected)}
        subtitle={`${totals.reservationCount} rezervací`}
        icon={Receipt}
      />
      <StatCard
        label="Zaplaceno"
        value={formatCurrency(totals.totalPaid)}
        subtitle={`${totals.paidCount} plně zaplacených`}
        icon={CheckCircle2}
        variant="success"
      />
      <StatCard
        label="Zbývá zaplatit"
        value={formatCurrency(totals.totalRemaining)}
        subtitle={`${totals.unpaidCount} nezaplacených, ${totals.partialCount} částečně`}
        icon={AlertCircle}
        variant="danger"
      />
      <StatCard
        label="Faktury"
        value={invoices.length}
        subtitle={`${invoices.filter(i => i.status === "PAID").length} zaplacených`}
        icon={FileText}
      />
    </div>
  );
}
