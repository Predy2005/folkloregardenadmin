import { useLocation } from "wouter";
import { formatCurrency } from "@/shared/lib/formatting";
import type { EventInvoiceSummary } from "@shared/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/components/ui/table";
import { getInvoiceStatusBadge, getInvoiceTypeBadge } from "./financeBadges";
import { FileText } from "lucide-react";

interface InvoicesTableProps {
  invoices: EventInvoiceSummary[];
}

export default function InvoicesTable({ invoices }: InvoicesTableProps) {
  const [, setLocation] = useLocation();

  if (invoices.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Všechny faktury akce
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Číslo faktury</TableHead>
                <TableHead>Typ</TableHead>
                <TableHead>Zákazník</TableHead>
                <TableHead className="text-right">Částka</TableHead>
                <TableHead>Splatnost</TableHead>
                <TableHead>Stav</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoices.map((inv) => (
                <TableRow
                  key={inv.id}
                  className="cursor-pointer hover:bg-blue-50 transition-colors"
                  onClick={() => setLocation(`/invoices/${inv.id}/edit`)}
                >
                  <TableCell className="font-mono text-primary">{inv.invoiceNumber}</TableCell>
                  <TableCell>{getInvoiceTypeBadge(inv.invoiceType)}</TableCell>
                  <TableCell>{inv.customerName}</TableCell>
                  <TableCell className="text-right font-medium">{formatCurrency(inv.total, inv.currency)}</TableCell>
                  <TableCell>{inv.dueDate || "-"}</TableCell>
                  <TableCell>
                    {getInvoiceStatusBadge(inv.status)}
                    {inv.paidAt && (
                      <span className="text-xs text-muted-foreground ml-2">
                        ({inv.paidAt})
                      </span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
