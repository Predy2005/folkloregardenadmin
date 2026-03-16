import dayjs from 'dayjs';
import { Loader2, CheckCircle } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { StatusBadge } from '@/shared/components/StatusBadge';
import { formatCurrency } from '@/shared/lib/formatting';
import type { Invoice } from '@shared/types';
import { INVOICE_TYPE_LABELS } from '@shared/types';
import type { UseMutationResult } from '@tanstack/react-query';

type Props = {
  invoices: Invoice[] | undefined;
  isLoading: boolean;
  markInvoicePaidMutation: UseMutationResult<unknown, Error, number>;
};

export function InvoiceListSection({ invoices, isLoading, markInvoicePaidMutation }: Props) {
  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold">Vystavené faktury</h3>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-4">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : invoices && invoices.length > 0 ? (
        <div className="space-y-2">
          {invoices.map((invoice) => (
            <div key={invoice.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-medium font-mono text-sm">{invoice.invoiceNumber}</p>
                  {invoice.invoiceType && (
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      invoice.invoiceType === 'DEPOSIT' ? 'bg-blue-100 text-blue-700' :
                      invoice.invoiceType === 'FINAL' ? 'bg-purple-100 text-purple-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {INVOICE_TYPE_LABELS[invoice.invoiceType]}
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  Vystaveno: {dayjs(invoice.issueDate).format('DD.MM.YYYY')} | Splatnost: {dayjs(invoice.dueDate).format('DD.MM.YYYY')}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <p className="font-mono font-medium">
                  {formatCurrency(invoice.total)} {invoice.currency}
                </p>
                <StatusBadge status={invoice.status} type="invoice" />
                {invoice.status !== 'PAID' && invoice.status !== 'CANCELLED' && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => markInvoicePaidMutation.mutate(invoice.id)}
                    disabled={markInvoicePaidMutation.isPending}
                  >
                    {markInvoicePaidMutation.isPending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <CheckCircle className="w-4 h-4" />
                    )}
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground text-center py-4">
          Žádné faktury pro tuto rezervaci
        </p>
      )}
    </div>
  );
}
