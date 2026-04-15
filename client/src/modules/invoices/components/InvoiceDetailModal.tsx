import dayjs from "dayjs";
import { formatCurrency } from "@/shared/lib/formatting";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import { Separator } from "@/shared/components/ui/separator";
import { QrCode } from "lucide-react";
import { StatusBadge } from "@/shared/components/StatusBadge";
import { Badge } from "@/shared/components/ui/badge";
import type { Invoice } from "@shared/types";
import { INVOICE_TYPE_LABELS } from "@shared/types";

interface InvoiceDetailModalProps {
  invoice: Invoice | null;
  onClose: () => void;
}

export function InvoiceDetailModal({ invoice, onClose }: InvoiceDetailModalProps) {
  return (
    <Dialog open={!!invoice} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <DialogTitle>Faktura {invoice?.invoiceNumber}</DialogTitle>
            {invoice && (
              <Badge
                variant="outline"
                className={
                  invoice.invoiceType === "DEPOSIT"
                    ? "border-blue-500/50 bg-blue-500/10 text-blue-700 dark:text-blue-400"
                    : invoice.invoiceType === "FINAL"
                    ? "border-purple-500/50 bg-purple-500/10 text-purple-700 dark:text-purple-400"
                    : invoice.invoiceType === "CREDIT_NOTE"
                    ? "border-red-500/50 bg-red-500/10 text-red-700 dark:text-red-400"
                    : "border-orange-500/50 bg-orange-500/10 text-orange-700 dark:text-orange-400"
                }
              >
                {INVOICE_TYPE_LABELS[invoice.invoiceType]}
              </Badge>
            )}
          </div>
          <DialogDescription>Detail faktury</DialogDescription>
        </DialogHeader>

        {invoice && (
          <div className="space-y-6">
            {/* Header info */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Datum vystavení</p>
                <p className="font-medium">
                  {dayjs(invoice.issueDate).format("DD.MM.YYYY")}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Datum splatnosti</p>
                <p className="font-medium">
                  {dayjs(invoice.dueDate).format("DD.MM.YYYY")}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Variabilní symbol</p>
                <p className="font-mono font-medium">{invoice.variableSymbol}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Status</p>
                <StatusBadge
                  status={invoice.status}
                  type="invoice"
                />
              </div>
              {invoice.originalInvoiceId && (
                <div>
                  <p className="text-sm text-muted-foreground">Dobropis k faktuře</p>
                  <p className="font-mono font-medium">#{invoice.originalInvoiceId}</p>
                </div>
              )}
            </div>

            <Separator />

            {/* Supplier and Customer */}
            <div className="grid grid-cols-2 gap-6">
              <div>
                <h4 className="font-semibold mb-2">Dodavatel</h4>
                <div className="text-sm space-y-1">
                  <p className="font-medium">{invoice.supplier.name}</p>
                  <p>{invoice.supplier.street}</p>
                  <p>
                    {invoice.supplier.zipcode} {invoice.supplier.city}
                  </p>
                  <p className="text-muted-foreground">IČO: {invoice.supplier.ico}</p>
                  {invoice.supplier.dic && (
                    <p className="text-muted-foreground">DIČ: {invoice.supplier.dic}</p>
                  )}
                </div>
              </div>
              <div>
                <h4 className="font-semibold mb-2">Odběratel</h4>
                <div className="text-sm space-y-1">
                  <p className="font-medium">{invoice.customer.name}</p>
                  {invoice.customer.company && (
                    <p>{invoice.customer.company}</p>
                  )}
                  {invoice.customer.street && <p>{invoice.customer.street}</p>}
                  {(invoice.customer.zipcode || invoice.customer.city) && (
                    <p>
                      {invoice.customer.zipcode} {invoice.customer.city}
                    </p>
                  )}
                  {invoice.customer.ico && (
                    <p className="text-muted-foreground">IČO: {invoice.customer.ico}</p>
                  )}
                  {invoice.customer.dic && (
                    <p className="text-muted-foreground">DIČ: {invoice.customer.dic}</p>
                  )}
                </div>
              </div>
            </div>

            <Separator />

            {/* Items */}
            <div>
              <h4 className="font-semibold mb-3">Položky</h4>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Popis</TableHead>
                    <TableHead className="text-right">Množství</TableHead>
                    <TableHead className="text-right">Cena/ks</TableHead>
                    <TableHead className="text-right">Celkem</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoice.items.map((item, idx) => (
                    <TableRow key={idx}>
                      <TableCell>{item.description}</TableCell>
                      <TableCell className="text-right">{item.quantity}</TableCell>
                      <TableCell className="text-right font-mono">
                        {formatCurrency(item.unitPrice, invoice?.currency)}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {formatCurrency(item.total, invoice?.currency)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Totals */}
            <div className="flex justify-end">
              <div className="w-64 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Základ</span>
                  <span className="font-mono">
                    {formatCurrency(invoice.subtotal, invoice?.currency)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">DPH {invoice.vatRate}%</span>
                  <span className="font-mono">
                    {formatCurrency(invoice.vatAmount, invoice?.currency)}
                  </span>
                </div>
                <Separator />
                <div className="flex justify-between font-semibold">
                  <span>Celkem</span>
                  <span className="font-mono text-lg">
                    {formatCurrency(invoice.total, invoice.currency)}
                  </span>
                </div>
              </div>
            </div>

            {/* QR Code */}
            {invoice.qrPaymentData && (
              <>
                <Separator />
                <div className="flex items-center gap-4">
                  <QrCode className="w-24 h-24 text-muted-foreground" />
                  <div>
                    <h4 className="font-semibold mb-1">QR platba</h4>
                    <p className="text-sm text-muted-foreground">
                      Naskenujte QR kód pro rychlou platbu
                    </p>
                    <p className="text-xs font-mono mt-2 text-muted-foreground break-all">
                      {invoice.qrPaymentData}
                    </p>
                  </div>
                </div>
              </>
            )}

            {/* Bank details */}
            {invoice.supplier.bankAccount && (
              <>
                <Separator />
                <div>
                  <h4 className="font-semibold mb-2">Bankovní spojení</h4>
                  <div className="text-sm space-y-1">
                    <p>
                      <span className="text-muted-foreground">Číslo účtu:</span>{" "}
                      <span className="font-mono">{invoice.supplier.bankAccount}</span>
                    </p>
                    {invoice.supplier.iban && (
                      <p>
                        <span className="text-muted-foreground">IBAN:</span>{" "}
                        <span className="font-mono">{invoice.supplier.iban}</span>
                      </p>
                    )}
                    {invoice.supplier.swift && (
                      <p>
                        <span className="text-muted-foreground">SWIFT:</span>{" "}
                        <span className="font-mono">{invoice.supplier.swift}</span>
                      </p>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
