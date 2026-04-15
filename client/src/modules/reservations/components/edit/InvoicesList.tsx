import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { api } from "@/shared/lib/api";
import { invalidateInvoiceQueries } from "@/shared/lib/query-helpers";
import { successToast, errorToast } from "@/shared/lib/toast-helpers";
import { Button } from "@/shared/components/ui/button";
import { Label } from "@/shared/components/ui/label";
import { StatusBadge } from "@/shared/components/StatusBadge";
import { formatCurrency } from "@/shared/lib/formatting";
import {
  Pencil,
  Send,
  CheckCircle,
  Loader2,
  Trash2,
} from "lucide-react";
import type { Invoice } from "@shared/types";
import { INVOICE_TYPE_LABELS } from "@shared/types";
import dayjs from "dayjs";
import type { UseMutationResult } from "@tanstack/react-query";

interface InvoicesListProps {
  reservationId: number;
  invoices: Invoice[] | undefined;
  invoicesLoading: boolean;
  markInvoicePaidMutation: UseMutationResult<any, Error, number, unknown>;
}

export function InvoicesList({
  reservationId,
  invoices,
  invoicesLoading,
  markInvoicePaidMutation,
}: InvoicesListProps) {
  const [, setLocation] = useLocation();

  const deleteInvoiceMutation = useMutation({
    mutationFn: (invoiceId: number) => api.delete(`/api/invoices/${invoiceId}`),
    onSuccess: () => {
      invalidateInvoiceQueries(reservationId);
      successToast("Faktura byla smazána");
    },
    onError: (error: Error) => errorToast(error),
  });

  const sendInvoiceMutation = useMutation({
    mutationFn: (invoiceId: number) => api.post(`/api/invoices/${invoiceId}/send`),
    onSuccess: () => {
      invalidateInvoiceQueries(reservationId);
      successToast("Faktura byla označena jako odeslaná");
    },
    onError: (error: Error) => errorToast(error),
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <Label className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          Vystavené faktury
        </Label>
      </div>

      {invoicesLoading ? (
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
                      invoice.invoiceType === "DEPOSIT" ? "bg-blue-100 text-blue-700" :
                      invoice.invoiceType === "FINAL" ? "bg-purple-100 text-purple-700" :
                      "bg-gray-100 text-gray-700"
                    }`}>
                      {INVOICE_TYPE_LABELS[invoice.invoiceType]}
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  Vystaveno: {dayjs(invoice.issueDate).format("DD.MM.YYYY")} | Splatnost: {dayjs(invoice.dueDate).format("DD.MM.YYYY")}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <p className="font-mono font-medium">
                  {formatCurrency(invoice.total, invoice.currency)}
                </p>
                <StatusBadge status={invoice.status} type="invoice" />
                <div className="flex items-center gap-1 ml-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 w-7 p-0"
                    onClick={() => setLocation(`/invoices/${invoice.id}/edit`)}
                    title="Upravit fakturu"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </Button>
                  {(invoice.status === "DRAFT" || invoice.status === "SENT" || invoice.status === "PAID") && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 w-7 p-0"
                      onClick={() => sendInvoiceMutation.mutate(invoice.id)}
                      disabled={sendInvoiceMutation.isPending}
                      title={invoice.status === "PAID" ? "Znovu odeslat" : "Odeslat"}
                    >
                      <Send className="w-3.5 h-3.5" />
                    </Button>
                  )}
                  {invoice.status !== "PAID" && invoice.status !== "CANCELLED" && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 w-7 p-0 text-green-600"
                      onClick={() => markInvoicePaidMutation.mutate(invoice.id)}
                      disabled={markInvoicePaidMutation.isPending}
                      title="Označit jako zaplaceno"
                    >
                      {markInvoicePaidMutation.isPending ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <CheckCircle className="w-3.5 h-3.5" />
                      )}
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                    onClick={() => {
                      if (confirm("Opravdu chcete smazat tuto fakturu?")) {
                        deleteInvoiceMutation.mutate(invoice.id);
                      }
                    }}
                    disabled={deleteInvoiceMutation.isPending}
                    title="Smazat fakturu"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
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
