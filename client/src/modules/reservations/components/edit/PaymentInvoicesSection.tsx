import { useState } from "react";
import { useLocation } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import { api } from "@/shared/lib/api";
import { invalidateInvoiceQueries } from "@/shared/lib/query-helpers";
import { successToast, errorToast } from "@/shared/lib/toast-helpers";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { StatusBadge } from "@/shared/components/StatusBadge";
import { formatCurrency } from "@/shared/lib/formatting";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/shared/components/ui/alert-dialog";
import {
  Receipt,
  FileText,
  Banknote,
  CreditCard,
  CheckCircle,
  Loader2,
  AlertTriangle,
  Pencil,
  Undo2,
  Info,
  Landmark,
  Calendar,
  ExternalLink,
  Send,
  Trash2,
} from "lucide-react";
import type { Invoice, PaymentSummary } from "@shared/types";
import {
  INVOICE_TYPE_LABELS,
  RESERVATION_PAYMENT_STATUS_LABELS,
  RESERVATION_PAYMENT_METHOD_LABELS,
} from "@shared/types";
import dayjs from "dayjs";
import type { UseMutationResult } from "@tanstack/react-query";

export interface PaymentInvoicesSectionProps {
  reservationId: number;
  paymentSummary: PaymentSummary | undefined;
  summaryLoading: boolean;
  invoices: Invoice[] | undefined;
  invoicesLoading: boolean;
  // Mutations
  markPaidMutation: UseMutationResult<any, Error, { paymentMethod: string; cashboxTarget?: string }, unknown>;
  markInvoicePaidMutation: UseMutationResult<any, Error, number, unknown>;
  isAnyInvoiceMutationPending: boolean;
  // Invoice dialog
  setInvoiceDialogType: (type: "DEPOSIT" | "FINAL") => void;
  setInvoiceDialogPercent: (percent: number) => void;
  setInvoiceDialogOpen: (open: boolean) => void;
}

export function PaymentInvoicesSection({
  reservationId,
  paymentSummary,
  summaryLoading,
  invoices,
  invoicesLoading,
  markPaidMutation,
  markInvoicePaidMutation,
  isAnyInvoiceMutationPending,
  setInvoiceDialogType,
  setInvoiceDialogPercent,
  setInvoiceDialogOpen,
}: PaymentInvoicesSectionProps) {
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

  // Linked event info (for cashbox options)
  const { data: linkedEventData } = useQuery<{ event: { id: number; name: string; hasCashbox: boolean } | null }>({
    queryKey: ["/api/reservations", reservationId, "linked-event"],
    queryFn: () => api.get(`/api/reservations/${reservationId}/linked-event`),
  });
  const linkedEvent = linkedEventData?.event ?? null;

  // Confirmation dialog for mark-paid
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmMethod, setConfirmMethod] = useState<string>("CASH");
  const [cashboxTarget, setCashboxTarget] = useState<string | undefined>(undefined);

  // Edit payment dialog
  const [editOpen, setEditOpen] = useState(false);
  const [editAmount, setEditAmount] = useState("");
  const [editMethod, setEditMethod] = useState("");
  const [editNote, setEditNote] = useState("");

  const adjustPaymentMutation = useMutation({
    mutationFn: (params: { paidAmount: number; paymentMethod?: string; note?: string }) =>
      api.post(`/api/reservations/${reservationId}/adjust-payment`, params),
    onSuccess: () => {
      invalidateInvoiceQueries(reservationId);
      successToast("Platba byla upravena");
      setEditOpen(false);
    },
    onError: (error: Error) => errorToast(error),
  });

  const openConfirm = (method: string) => {
    setConfirmMethod(method);
    // Default cashbox target for cash: event cashbox if available, otherwise none
    if (method === "CASH" && linkedEvent) {
      setCashboxTarget("event");
    } else {
      setCashboxTarget(undefined);
    }
    setConfirmOpen(true);
  };

  const handleConfirmPaid = () => {
    markPaidMutation.mutate({
      paymentMethod: confirmMethod,
      cashboxTarget: confirmMethod === "CASH" ? cashboxTarget : undefined,
    });
    setConfirmOpen(false);
  };

  const openEditDialog = () => {
    setEditAmount(paymentSummary ? String(Math.round(paymentSummary.paidAmount)) : "0");
    setEditMethod(paymentSummary?.paymentMethod || "");
    setEditNote("");
    setEditOpen(true);
  };

  const handleSaveEdit = () => {
    adjustPaymentMutation.mutate({
      paidAmount: parseFloat(editAmount) || 0,
      paymentMethod: editMethod || undefined,
      note: editNote || undefined,
    });
  };

  const methodLabel = confirmMethod === "CASH" ? "hotově" : "převodem";
  const confirmTotal = paymentSummary ? formatCurrency(Math.round(paymentSummary.remainingAmount || paymentSummary.totalPrice)) : "";

  return (
    <div className="space-y-6">
      {/* Payment Summary */}
      {summaryLoading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : paymentSummary && (
        <div className="space-y-4">
          {/* Summary Cards */}
          <div className="grid grid-cols-3 gap-4">
            <div className="p-4 rounded-lg bg-muted/50 text-center">
              <p className="text-sm text-muted-foreground">Celková cena</p>
              <p className="text-xl font-bold font-mono">
                {formatCurrency(Math.round(paymentSummary.totalPrice))}
              </p>
            </div>
            <div className="p-4 rounded-lg bg-green-500/10 text-center">
              <p className="text-sm text-muted-foreground">Zaplaceno</p>
              <p className="text-xl font-bold font-mono text-green-600">
                {formatCurrency(Math.round(paymentSummary.paidAmount))}
              </p>
            </div>
            <div className="p-4 rounded-lg bg-orange-500/10 text-center">
              <p className="text-sm text-muted-foreground">Zbývá</p>
              <p className="text-xl font-bold font-mono text-orange-600">
                {formatCurrency(Math.round(paymentSummary.remainingAmount))}
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
                onClick={openEditDialog}
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
                onClick={() => {
                  setInvoiceDialogType("DEPOSIT");
                  setInvoiceDialogPercent(25);
                  setInvoiceDialogOpen(true);
                }}
              >
                <Receipt className="w-4 h-4 mr-2" />
                Záloha 25%
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setInvoiceDialogType("DEPOSIT");
                  setInvoiceDialogPercent(50);
                  setInvoiceDialogOpen(true);
                }}
              >
                <Receipt className="w-4 h-4 mr-2" />
                Záloha 50%
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setInvoiceDialogType("FINAL");
                  setInvoiceDialogOpen(true);
                }}
              >
                <FileText className="w-4 h-4 mr-2" />
                Ostrá faktura
              </Button>

              {!paymentSummary.isFullyPaid ? (
                <>
                  <Button
                    size="sm"
                    variant="default"
                    onClick={() => openConfirm("CASH")}
                    disabled={isAnyInvoiceMutationPending}
                  >
                    <Banknote className="w-4 h-4 mr-2" />
                    Hotově zaplaceno
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => openConfirm("BANK_TRANSFER")}
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
                    onClick={openEditDialog}
                  >
                    <Undo2 className="w-4 h-4 mr-2" />
                    Upravit platbu
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="border-t my-4" />

      {/* Invoices List */}
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
                    {Math.round(parseFloat(invoice.total)).toLocaleString("cs-CZ")} {invoice.currency}
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

      {/* Confirmation dialog for mark-paid */}
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-orange-500" />
              Potvrdit zaplacení {methodLabel}
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <p>
                  Opravdu chcete označit zbývající částku{" "}
                  <strong>{confirmTotal}</strong> jako zaplacenou {methodLabel}?
                </p>
                <div className="p-3 rounded-lg bg-blue-50 text-blue-700 text-sm">
                  <Info className="w-4 h-4 inline mr-1" />
                  Pokud budete potřebovat stav změnit, můžete platbu kdykoli upravit.
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>

          {/* Cashbox target options - only for CASH payments */}
          {confirmMethod === "CASH" && (
            <div className="space-y-3 py-2">
              <Label className="text-sm font-semibold">Zapsat do pokladny?</Label>
              <div className="space-y-2">
                {linkedEvent && (
                  <button
                    type="button"
                    className={`w-full flex items-center gap-3 p-3 rounded-lg border text-left transition-colors ${
                      cashboxTarget === "event"
                        ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                        : "border-border hover:bg-muted/50"
                    }`}
                    onClick={() => setCashboxTarget("event")}
                  >
                    <Calendar className="w-5 h-5 text-primary shrink-0" />
                    <div>
                      <p className="font-medium text-sm text-foreground">Kasa eventu</p>
                      <p className="text-xs text-muted-foreground">{linkedEvent.name}</p>
                    </div>
                  </button>
                )}
                <button
                  type="button"
                  className={`w-full flex items-center gap-3 p-3 rounded-lg border text-left transition-colors ${
                    cashboxTarget === "main"
                      ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                      : "border-border hover:bg-muted/50"
                  }`}
                  onClick={() => setCashboxTarget("main")}
                >
                  <Landmark className="w-5 h-5 text-muted-foreground shrink-0" />
                  <div>
                    <p className="font-medium text-sm text-foreground">Hlavní kasa</p>
                    <p className="text-xs text-muted-foreground">Centrální pokladna</p>
                  </div>
                </button>
                <button
                  type="button"
                  className={`w-full flex items-center gap-3 p-3 rounded-lg border text-left transition-colors ${
                    cashboxTarget === undefined
                      ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                      : "border-border hover:bg-muted/50"
                  }`}
                  onClick={() => setCashboxTarget(undefined)}
                >
                  <Banknote className="w-5 h-5 text-muted-foreground shrink-0" />
                  <div>
                    <p className="font-medium text-sm text-foreground">Nezapisovat do pokladny</p>
                    <p className="text-xs text-muted-foreground">Pouze označit rezervaci jako zaplacenou</p>
                  </div>
                </button>
              </div>
            </div>
          )}

          <AlertDialogFooter>
            <AlertDialogCancel>Zrušit</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmPaid}>
              {markPaidMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : confirmMethod === "CASH" ? (
                <Banknote className="w-4 h-4 mr-2" />
              ) : (
                <CreditCard className="w-4 h-4 mr-2" />
              )}
              Ano, označit jako zaplaceno
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Edit payment dialog */}
      <AlertDialog open={editOpen} onOpenChange={setEditOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Pencil className="w-5 h-5" />
              Upravit stav platby
            </AlertDialogTitle>
            <AlertDialogDescription>
              Můžete ručně změnit zaplacenou částku a způsob platby.
              Stav se automaticky přepočítá podle zadané částky.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-4 py-2">
            {paymentSummary && (
              <div className="text-sm text-muted-foreground">
                Celková cena: <strong>{formatCurrency(Math.round(paymentSummary.totalPrice))}</strong>
              </div>
            )}
            <div className="space-y-2">
              <Label>Zaplacená částka (Kč)</Label>
              <Input
                type="number"
                min={0}
                value={editAmount}
                onChange={(e) => setEditAmount(e.target.value)}
                placeholder="0"
              />
              <div className="flex gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="text-xs"
                  onClick={() => setEditAmount("0")}
                >
                  Resetovat na 0
                </Button>
                {paymentSummary && (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="text-xs"
                    onClick={() => setEditAmount(String(Math.round(paymentSummary.totalPrice)))}
                  >
                    Celá částka
                  </Button>
                )}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Způsob platby</Label>
              <div className="flex flex-wrap gap-2">
                {(["CASH", "BANK_TRANSFER", "ONLINE", "MIXED", ""] as const).map((method) => (
                  <Button
                    key={method || "__none__"}
                    type="button"
                    size="sm"
                    variant={editMethod === method ? "default" : "outline"}
                    onClick={() => setEditMethod(method)}
                  >
                    {method === "CASH" && "Hotově"}
                    {method === "BANK_TRANSFER" && "Převod"}
                    {method === "ONLINE" && "Online"}
                    {method === "MIXED" && "Kombinace"}
                    {method === "" && "Neurčeno"}
                  </Button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Poznámka (nepovinné)</Label>
              <Input
                value={editNote}
                onChange={(e) => setEditNote(e.target.value)}
                placeholder="Důvod úpravy..."
              />
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Zrušit</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleSaveEdit}
              disabled={adjustPaymentMutation.isPending}
            >
              {adjustPaymentMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <CheckCircle className="w-4 h-4 mr-2" />
              )}
              Uložit změny
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
