import { useState } from "react";
import {
  Ticket,
  CheckCircle2,
  Clock,
  ChevronDown,
  ChevronRight,
  QrCode,
  Check,
} from "lucide-react";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/shared/components/ui/dialog";
import { useMutation } from "@tanstack/react-query";
import { api } from "@/shared/lib/api";
import { queryClient } from "@/shared/lib/queryClient";
import type { DashboardVoucherSummary, DashboardEventVoucher } from "@shared/types";

interface VoucherCardProps {
  vouchers: DashboardVoucherSummary;
  eventId: number;
}

export function VoucherCard({ vouchers, eventId }: VoucherCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [showScanner, setShowScanner] = useState(false);

  const hasVouchers = vouchers.eventVouchers.length > 0;

  return (
    <div className="p-4 space-y-3">
      <div className="flex gap-4 text-sm">
        <span className="text-green-600 flex items-center gap-1">
          <CheckCircle2 className="h-4 w-4" />
          {vouchers.validatedCount} ověřeno
        </span>
        {vouchers.pendingCount > 0 && (
          <span className="text-orange-500 flex items-center gap-1">
            <Clock className="h-4 w-4" />
            {vouchers.pendingCount} čeká
          </span>
        )}
      </div>
        {hasVouchers ? (
          <>
            <button
              onClick={() => setExpanded(!expanded)}
              className="w-full flex items-center justify-between p-3 bg-emerald-50/50 dark:bg-emerald-950/20 rounded-lg hover:bg-emerald-100/60 dark:hover:bg-emerald-950/30 touch-manipulation min-h-[48px]"
            >
              <div className="flex items-center gap-2">
                {expanded ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
                <span className="font-medium">
                  Seznam voucherů ({vouchers.eventVouchers.length})
                </span>
              </div>
            </button>

            {expanded && (
              <div className="space-y-2 pt-2">
                {vouchers.eventVouchers.map((voucher) => (
                  <VoucherItem
                    key={voucher.id}
                    voucher={voucher}
                    eventId={eventId}
                  />
                ))}
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-4 text-muted-foreground">
            <Ticket className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Žádné vouchery přiřazeny</p>
          </div>
        )}

        {/* Scan voucher button */}
        <Dialog open={showScanner} onOpenChange={setShowScanner}>
          <DialogTrigger asChild>
            <Button
              variant="outline"
              className="w-full min-h-[44px] touch-manipulation"
            >
              <QrCode className="h-4 w-4 mr-2" />
              Skenovat / Zadat kód
            </Button>
          </DialogTrigger>
          <VoucherScannerDialog
            eventId={eventId}
            onClose={() => setShowScanner(false)}
          />
        </Dialog>
    </div>
  );
}

interface VoucherItemProps {
  voucher: DashboardEventVoucher;
  eventId: number;
}

function VoucherItem({ voucher, eventId }: VoucherItemProps) {
  const validateMutation = useMutation({
    mutationFn: () =>
      api.post(`/api/events/${eventId}/vouchers/${voucher.id}/validate`),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/events", eventId, "manager-dashboard"],
      });
    },
  });

  return (
    <div className="p-3 border rounded-lg bg-background">
      <div className="flex items-start justify-between mb-2">
        <div>
          <div className="font-medium font-mono">
            {voucher.voucherCode || `#${voucher.voucherId}`}
          </div>
          {voucher.partnerName && (
            <div className="text-sm text-muted-foreground">
              {voucher.partnerName}
            </div>
          )}
        </div>
        <Badge
          className={
            voucher.validated
              ? "bg-green-500 text-white"
              : "bg-orange-500 text-white"
          }
        >
          {voucher.quantity}x
        </Badge>
      </div>

      <div className="flex items-center justify-between">
        {voucher.validated ? (
          <div className="flex items-center gap-1 text-green-600 text-sm">
            <CheckCircle2 className="h-4 w-4" />
            Ověřeno{" "}
            {voucher.validatedAt &&
              new Date(voucher.validatedAt).toLocaleTimeString("cs-CZ", {
                hour: "2-digit",
                minute: "2-digit",
              })}
          </div>
        ) : (
          <Button
            size="sm"
            onClick={() => validateMutation.mutate()}
            disabled={validateMutation.isPending}
            className="min-h-[36px] touch-manipulation"
          >
            <Check className="h-4 w-4 mr-1" />
            {validateMutation.isPending ? "Ověřuji..." : "Ověřit"}
          </Button>
        )}
      </div>
    </div>
  );
}

interface VoucherScannerDialogProps {
  eventId: number;
  onClose: () => void;
}

function VoucherScannerDialog({ eventId, onClose }: VoucherScannerDialogProps) {
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const scanMutation = useMutation({
    mutationFn: (voucherCode: string) =>
      api.post(`/api/events/${eventId}/vouchers/scan`, { code: voucherCode }),
    onSuccess: (data: { message?: string }) => {
      setSuccess(data.message || "Voucher úspěšně ověřen");
      setError(null);
      setCode("");
      queryClient.invalidateQueries({
        queryKey: ["/api/events", eventId, "manager-dashboard"],
      });
    },
    onError: (err: Error & { response?: { data?: { error?: string } } }) => {
      setError(err.response?.data?.error || "Voucher nenalezen nebo neplatný");
      setSuccess(null);
    },
  });

  const handleSubmit = () => {
    if (!code.trim()) return;
    scanMutation.mutate(code.trim());
  };

  return (
    <DialogContent className="max-w-sm">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <QrCode className="h-5 w-5" />
          Skenovat voucher
        </DialogTitle>
      </DialogHeader>

      <div className="space-y-4">
        {/* QR Scanner placeholder - would need a library like react-qr-reader */}
        <div className="border-2 border-dashed rounded-lg p-8 text-center bg-muted/30">
          <QrCode className="h-12 w-12 mx-auto mb-2 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            QR scanner není dostupný
          </p>
          <p className="text-xs text-muted-foreground">
            Zadejte kód ručně níže
          </p>
        </div>

        {/* Manual code input */}
        <div className="space-y-2">
          <Input
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="Zadejte kód voucheru"
            className="min-h-[44px] font-mono text-center text-lg"
            onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
          />
        </div>

        {/* Status messages */}
        {error && (
          <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-500 text-sm text-center">
            {error}
          </div>
        )}
        {success && (
          <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-lg text-green-600 text-sm text-center">
            {success}
          </div>
        )}
      </div>

      <DialogFooter className="gap-2">
        <Button variant="outline" onClick={onClose}>
          Zavřít
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={!code.trim() || scanMutation.isPending}
          className="min-h-[44px]"
        >
          {scanMutation.isPending ? "Ověřuji..." : "Ověřit kód"}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}
