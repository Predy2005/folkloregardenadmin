import { Button } from "@/shared/components/ui/button";
import { Label } from "@/shared/components/ui/label";
import { formatCurrency } from "@/shared/lib/formatting";
import {
  Receipt,
  FileText,
  Banknote,
  CreditCard,
  CheckCircle,
  Pencil,
  Undo2,
  Info,
  Loader2,
} from "lucide-react";
import type { PaymentSummary } from "@shared/types";
import {
  RESERVATION_PAYMENT_STATUS_LABELS,
  RESERVATION_PAYMENT_METHOD_LABELS,
} from "@shared/types";

interface PaymentSummaryCardsProps {
  paymentSummary: PaymentSummary | undefined;
  summaryLoading: boolean;
  isAnyInvoiceMutationPending: boolean;
  linkedEvent: { id: number; name: string; hasCashbox: boolean } | null;
  onOpenConfirm: (method: string) => void;
  onOpenEditDialog: () => void;
  onCreateInvoice: (type: "DEPOSIT" | "FINAL", percent?: number) => void;
}

export function PaymentSummaryCards({
  paymentSummary,
  summaryLoading,
  isAnyInvoiceMutationPending,
  linkedEvent,
  onOpenConfirm,
  onOpenEditDialog,
  onCreateInvoice,
}: PaymentSummaryCardsProps) {
  const cur = paymentSummary?.currency;

  if (summaryLoading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!paymentSummary) return null;

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="p-4 rounded-lg bg-muted/50 text-center">
          <p className="text-sm text-muted-foreground">Celková cena</p>
          <p className="text-xl font-bold font-mono">
            {formatCurrency(Math.round(paymentSummary.totalPrice), cur)}
          </p>
        </div>
        <div className="p-4 rounded-lg bg-green-500/10 text-center">
          <p className="text-sm text-muted-foreground">Zaplaceno</p>
          <p className="text-xl font-bold font-mono text-green-600">
            {formatCurrency(Math.round(paymentSummary.paidAmount), cur)}
          </p>
        </div>
        <div className="p-4 rounded-lg bg-orange-500/10 text-center">
          <p className="text-sm text-muted-foreground">Zbývá</p>
          <p className="text-xl font-bold font-mono text-orange-600">
            {formatCurrency(Math.round(paymentSummary.remainingAmount), cur)}
          </p>
        </div>
      </div>

      {/* Payment Status */}
      <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
        <div className="flex items-center gap-2">
          <CreditCard className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm">Stav platby:</span>
          <span className={`font-medium ${
            paymentSummary.paymentStatus === "PAID" ? "text-green-600" :
            paymentSummary.paymentStatus === "PARTIAL" ? "text-orange-600" :
            "text-red-600"
          }`}>
            {RESERVATION_PAYMENT_STATUS_LABELS[paymentSummary.paymentStatus]}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {paymentSummary.paymentMethod && (
            <span className="text-sm text-muted-foreground">
              Způsob: {RESERVATION_PAYMENT_METHOD_LABELS[paymentSummary.paymentMethod]}
            </span>
          )}
          <Button
            size="sm"
            variant="ghost"
            onClick={onOpenEditDialog}
            title="Upravit stav platby"
          >
            <Pencil className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      {/* Quick Actions - ALWAYS visible */}
      <div className="space-y-3">
        <Label className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          Rychlé akce
        </Label>

        {/* Info about where money goes */}
        <div className="flex items-start gap-2 p-2.5 rounded-lg bg-blue-50 text-blue-700 text-xs">
          <Info className="w-3.5 h-3.5 mt-0.5 shrink-0" />
          <span>
            Tlačítka "Hotově" a "Převod" označí celou zbývající částku jako zaplacenou.
            U hotovostní platby si můžete zvolit, zda zapsat částku do pokladny
            {linkedEvent ? ` (kasa eventu "${linkedEvent.name}" nebo hlavní kasa)` : " (hlavní kasa)"}.
          </span>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => onCreateInvoice("DEPOSIT", 25)}
          >
            <Receipt className="w-4 h-4 mr-2" />
            Záloha 25%
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => onCreateInvoice("DEPOSIT", 50)}
          >
            <Receipt className="w-4 h-4 mr-2" />
            Záloha 50%
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => onCreateInvoice("FINAL")}
          >
            <FileText className="w-4 h-4 mr-2" />
            Ostrá faktura
          </Button>

          {!paymentSummary.isFullyPaid ? (
            <>
              <Button
                size="sm"
                variant="default"
                onClick={() => onOpenConfirm("CASH")}
                disabled={isAnyInvoiceMutationPending}
              >
                <Banknote className="w-4 h-4 mr-2" />
                Hotově zaplaceno
              </Button>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => onOpenConfirm("BANK_TRANSFER")}
                disabled={isAnyInvoiceMutationPending}
              >
                <CreditCard className="w-4 h-4 mr-2" />
                Převod zaplacen
              </Button>
            </>
          ) : (
            <>
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-green-500/10 text-green-600">
                <CheckCircle className="w-4 h-4" />
                <span className="text-sm font-medium">Zaplaceno</span>
              </div>
              <Button
                size="sm"
                variant="outline"
                className="text-orange-600 hover:text-orange-700 border-orange-300"
                onClick={onOpenEditDialog}
              >
                <Undo2 className="w-4 h-4 mr-2" />
                Upravit platbu
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
