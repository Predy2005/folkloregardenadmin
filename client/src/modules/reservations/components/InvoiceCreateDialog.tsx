import { useState, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { api } from "@/shared/lib/api";
import { invalidateInvoiceQueries } from "@/shared/lib/query-helpers";
import { successToast, errorToast } from "@/shared/lib/toast-helpers";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Textarea } from "@/shared/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { formatCurrency } from "@/shared/lib/formatting";
import type { Invoice, InvoiceItem } from "@shared/types";
import type { InvoicePreview } from "@modules/invoices/types";

import type { InvoiceCreateDialogProps } from "@modules/reservations/types/components/common/InvoiceCreateDialog";

export type { InvoiceCreateDialogProps };

export function InvoiceCreateDialog({
  open,
  onOpenChange,
  reservationId,
  invoiceType,
  depositPercent = 25,
  currency,
  onSuccess,
}: InvoiceCreateDialogProps) {
  const [items, setItems] = useState<InvoiceItem[]>([]);
  const [selectedPercent, setSelectedPercent] = useState(depositPercent);

  // Sync selectedPercent when prop changes (e.g. user clicks Záloha 50% button)
  useEffect(() => {
    setSelectedPercent(depositPercent);
  }, [depositPercent, open]);

  // Fetch preview - always refetch when dialog opens to get latest reservation state
  const { data: preview, isLoading: previewLoading, error: previewError } = useQuery({
    queryKey: [
      `/api/invoices/preview-${invoiceType.toLowerCase()}`,
      reservationId,
      invoiceType === "DEPOSIT" ? selectedPercent : null,
    ],
    queryFn: () =>
      invoiceType === "DEPOSIT"
        ? api.get<InvoicePreview>(
            `/api/invoices/preview-deposit/${reservationId}?percent=${selectedPercent}`
          )
        : api.get<InvoicePreview>(`/api/invoices/preview-final/${reservationId}`),
    enabled: open,
    staleTime: 0,
    refetchOnMount: "always",
    retry: false,
  });

  // Surface backend errors (e.g. 403 permissions) instead of silently showing empty
  useEffect(() => {
    if (previewError instanceof Error) {
      errorToast(previewError);
    }
  }, [previewError]);

  // Use prop currency, fallback to preview currency, then CZK
  const cur = currency ?? preview?.currency ?? "CZK";

  // Sync items from preview whenever it changes (initial load, deposit %, invoice type, refetches)
  useEffect(() => {
    if (preview && Array.isArray(preview.items) && preview.items.length > 0) {
      setItems(preview.items);
    }
  }, [preview]);

  const createMutation = useMutation({
    mutationFn: () => {
      const endpoint =
        invoiceType === "DEPOSIT"
          ? `/api/invoices/create-deposit/${reservationId}`
          : `/api/invoices/create-final/${reservationId}`;

      const payload: { customItems: typeof items; percent?: number } = { customItems: items };
      if (invoiceType === "DEPOSIT") {
        payload.percent = selectedPercent;
      }

      return api.post<Invoice>(endpoint, payload);
    },
    onSuccess: () => {
      invalidateInvoiceQueries(reservationId);
      successToast(
        invoiceType === "DEPOSIT"
          ? "Zálohová faktura vytvořena"
          : "Ostrá faktura vytvořena"
      );
      onOpenChange(false);
      onSuccess?.();
    },
    onError: (error: Error) => errorToast(error),
  });

  const updateItem = (index: number, updates: Partial<InvoiceItem>) => {
    setItems((prev) =>
      prev.map((item, i) => {
        if (i !== index) return item;
        const updated = { ...item, ...updates };
        // Recalculate total if quantity or unitPrice changed
        if ("quantity" in updates || "unitPrice" in updates) {
          updated.total = updated.quantity * updated.unitPrice;
        }
        return updated;
      })
    );
  };

  const removeItem = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const addItem = () => {
    setItems((prev) => [
      ...prev,
      {
        description: "Nová položka",
        quantity: 1,
        unitPrice: 0,
        total: 0,
      },
    ]);
  };

  const calculateSubtotal = () => items.reduce((sum, item) => sum + item.total, 0);
  const calculateVat = () =>
    preview?.vatRate ? calculateSubtotal() * (preview.vatRate / 100) : 0;
  const calculateTotal = () => calculateSubtotal() + calculateVat();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {invoiceType === "DEPOSIT"
              ? "Vytvořit zálohovou fakturu"
              : "Vytvořit ostrou fakturu"}
          </DialogTitle>
          <DialogDescription>
            Upravte položky faktury před vytvořením. Můžete změnit popisy, ceny
            nebo přidat/odebrat položky.
          </DialogDescription>
        </DialogHeader>

        {previewLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-4">
            {/* Deposit percent selector */}
            {invoiceType === "DEPOSIT" && (
              <div className="flex items-center gap-4 p-3 bg-muted/50 rounded-lg">
                <Label className="whitespace-nowrap">Procento zálohy:</Label>
                <Select
                  value={String(selectedPercent)}
                  onValueChange={(v) => setSelectedPercent(Number(v))}
                >
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="25">25%</SelectItem>
                    <SelectItem value="30">30%</SelectItem>
                    <SelectItem value="50">50%</SelectItem>
                    <SelectItem value="100">100%</SelectItem>
                  </SelectContent>
                </Select>
                {preview?.totalPrice && (
                  <span className="text-sm text-muted-foreground">
                    z celkové ceny{" "}
                    {formatCurrency(Math.round(preview.totalPrice), cur)}
                  </span>
                )}
              </div>
            )}

            {/* Paid deposits info for final invoice */}
            {invoiceType === "FINAL" && preview?.paidDeposits && preview.paidDeposits > 0 && (
              <div className="p-3 bg-blue-50 text-blue-700 rounded-lg text-sm">
                Odečteny zaplacené zálohy:{" "}
                {formatCurrency(Math.round(preview.paidDeposits), cur)}
              </div>
            )}

            {/* Items list */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-semibold">Položky faktury</Label>
                <Button size="sm" variant="outline" onClick={addItem}>
                  <Plus className="w-4 h-4 mr-1" /> Přidat položku
                </Button>
              </div>

              {items.map((item, index) => (
                <div
                  key={index}
                  className="grid grid-cols-12 gap-2 items-start p-3 border rounded-lg bg-background"
                >
                  <div className="col-span-5">
                    <Label className="text-xs text-muted-foreground">
                      Popis
                    </Label>
                    <Textarea
                      value={item.description}
                      onChange={(e) =>
                        updateItem(index, { description: e.target.value })
                      }
                      className="mt-1 min-h-[60px]"
                      placeholder="Popis položky"
                    />
                  </div>
                  <div className="col-span-2">
                    <Label className="text-xs text-muted-foreground">
                      Množství
                    </Label>
                    <Input
                      type="number"
                      min={1}
                      value={item.quantity}
                      onChange={(e) =>
                        updateItem(index, { quantity: Number(e.target.value) })
                      }
                      className="mt-1"
                    />
                  </div>
                  <div className="col-span-2">
                    <Label className="text-xs text-muted-foreground">
                      Cena/ks
                    </Label>
                    <Input
                      type="number"
                      value={item.unitPrice}
                      onChange={(e) =>
                        updateItem(index, { unitPrice: Number(e.target.value) })
                      }
                      className="mt-1"
                    />
                  </div>
                  <div className="col-span-2">
                    <Label className="text-xs text-muted-foreground">
                      Celkem
                    </Label>
                    <div className="mt-1 h-9 px-3 py-2 text-sm font-medium bg-muted rounded-md">
                      {formatCurrency(Math.round(item.total), cur)}
                    </div>
                  </div>
                  <div className="col-span-1 flex items-end justify-center pb-1">
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => removeItem(index)}
                      disabled={items.length === 1}
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            {/* Totals */}
            <div className="border-t pt-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span>Mezisoučet:</span>
                <span className="font-mono">
                  {formatCurrency(Math.round(calculateSubtotal()), cur)}
                </span>
              </div>
              {preview?.vatRate && preview.vatRate > 0 && (
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>DPH ({preview.vatRate}%):</span>
                  <span className="font-mono">
                    {formatCurrency(Math.round(calculateVat()), cur)}
                  </span>
                </div>
              )}
              <div className="flex justify-between text-lg font-bold">
                <span>Celkem:</span>
                <span className="font-mono">
                  {formatCurrency(Math.round(calculateTotal()), cur)}
                </span>
              </div>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Zrušit
          </Button>
          <Button
            onClick={() => createMutation.mutate()}
            disabled={createMutation.isPending || items.length === 0}
          >
            {createMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Vytvářím...
              </>
            ) : (
              "Vytvořit fakturu"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
