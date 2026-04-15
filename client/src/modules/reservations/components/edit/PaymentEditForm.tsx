import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { api } from "@/shared/lib/api";
import { invalidateInvoiceQueries } from "@/shared/lib/query-helpers";
import { successToast, errorToast } from "@/shared/lib/toast-helpers";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
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
  Banknote,
  CreditCard,
  CheckCircle,
  Loader2,
  AlertTriangle,
  Pencil,
  Info,
  Landmark,
  Calendar,
} from "lucide-react";
import type { PaymentEditFormProps } from "@modules/reservations/types/components/edit/PaymentEditForm";

export function PaymentEditForm({
  reservationId,
  paymentSummary,
  markPaidMutation,
  linkedEvent,
  currentCurrency,
}: PaymentEditFormProps) {
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
  const cur = currentCurrency ?? paymentSummary?.currency;
  const confirmTotal = paymentSummary ? formatCurrency(Math.round(paymentSummary.remainingAmount || paymentSummary.totalPrice), cur) : "";

  return {
    openConfirm,
    openEditDialog,
    dialogs: (
      <>
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
                  Celková cena: <strong>{formatCurrency(Math.round(paymentSummary.totalPrice), cur)}</strong>
                </div>
              )}
              <div className="space-y-2">
                <Label>Zaplacená částka</Label>
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
      </>
    ),
  };
}
