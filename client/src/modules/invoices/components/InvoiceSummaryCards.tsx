import dayjs from "dayjs";
import { formatCurrency } from "@/shared/lib/formatting";
import { useCurrency } from "@/shared/contexts/CurrencyContext";
import { StatCard } from "@/shared/components";
import type { Invoice } from "@shared/types";

interface InvoiceSummaryCardsProps {
  invoices: Invoice[];
}

export function InvoiceSummaryCards({ invoices }: InvoiceSummaryCardsProps) {
  const { defaultCurrency } = useCurrency();

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <StatCard
        label="Celkem nezaplaceno"
        value={formatCurrency(invoices.filter(i => i.status === 'SENT').reduce((sum, i) => sum + parseFloat(i.total), 0), defaultCurrency)}
        variant="danger"
      />
      <StatCard
        label="Po splatnosti"
        value={`${invoices.filter(i => i.status === 'SENT' && dayjs(i.dueDate).isBefore(dayjs())).length} faktur`}
        variant="danger"
      />
      <StatCard
        label="Zaplaceno tento měsíc"
        value={formatCurrency(invoices.filter(i => i.status === 'PAID' && dayjs(i.paidAt).isAfter(dayjs().startOf('month'))).reduce((sum, i) => sum + parseFloat(i.total), 0), defaultCurrency)}
        variant="success"
      />
      <StatCard
        label="Koncepty"
        value={invoices.filter(i => i.status === 'DRAFT').length}
      />
    </div>
  );
}
