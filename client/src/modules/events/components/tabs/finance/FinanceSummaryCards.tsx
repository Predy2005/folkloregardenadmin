import { formatCurrency } from "@/shared/lib/formatting";
import type { PaymentTotals, EventInvoiceSummary } from "@shared/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { AlertCircle, CheckCircle2, FileText, Receipt } from "lucide-react";

interface FinanceSummaryCardsProps {
  totals: PaymentTotals;
  invoices: EventInvoiceSummary[];
}

export default function FinanceSummaryCards({ totals, invoices }: FinanceSummaryCardsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <Receipt className="h-4 w-4" />
            Očekávaná částka
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatCurrency(totals.totalExpected)}</div>
          <p className="text-xs text-muted-foreground">{totals.reservationCount} rezervací</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-green-500" />
            Zaplaceno
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-green-600">{formatCurrency(totals.totalPaid)}</div>
          <p className="text-xs text-muted-foreground">{totals.paidCount} plně zaplacených</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-red-500" />
            Zbývá zaplatit
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-red-600">{formatCurrency(totals.totalRemaining)}</div>
          <p className="text-xs text-muted-foreground">
            {totals.unpaidCount} nezaplacených, {totals.partialCount} částečně
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Faktury
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{invoices.length}</div>
          <p className="text-xs text-muted-foreground">
            {invoices.filter(i => i.status === "PAID").length} zaplacených
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
