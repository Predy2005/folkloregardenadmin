import { useState } from "react";
import { ArrowRightLeft, Check, X } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { formatCurrency } from "@/shared/lib/formatting";
import type { CashboxTransfer } from "@shared/types";
import dayjs from "dayjs";

export interface PendingTransferAlertProps {
  transfer: CashboxTransfer;
  canConfirm: boolean;
  onConfirm: () => void;
  onReject: (reason?: string) => void;
  isConfirming: boolean;
  isRejecting: boolean;
}

export function PendingTransferAlert({
  transfer,
  canConfirm,
  onConfirm,
  onReject,
  isConfirming,
  isRejecting,
}: PendingTransferAlertProps) {
  const [showRejectReason, setShowRejectReason] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  return (
    <div className="border border-amber-300 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-700 rounded-lg p-3 space-y-2">
      <div className="flex items-center gap-2">
        <ArrowRightLeft className="h-4 w-4 text-amber-600" />
        <span className="text-sm font-medium text-amber-800 dark:text-amber-300">
          Čekající převod z hlavní kasy
        </span>
      </div>
      <div className="text-sm space-y-1">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Částka:</span>
          <span className="font-bold text-lg">{formatCurrency(transfer.amount, transfer.currency)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Od:</span>
          <span>{transfer.initiatedByName}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Datum:</span>
          <span>{dayjs(transfer.initiatedAt).format("DD.MM. HH:mm")}</span>
        </div>
        {transfer.description && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">Popis:</span>
            <span>{transfer.description}</span>
          </div>
        )}
      </div>

      {canConfirm && !showRejectReason && (
        <div className="flex gap-2 pt-1">
          <Button
            size="sm"
            className="flex-1 min-h-[44px] bg-green-600 hover:bg-green-700"
            onClick={onConfirm}
            disabled={isConfirming || isRejecting}
          >
            <Check className="h-4 w-4 mr-1" />
            {isConfirming ? "..." : "Potvrdit"}
          </Button>
          <Button
            size="sm"
            variant="destructive"
            className="min-h-[44px]"
            onClick={() => setShowRejectReason(true)}
            disabled={isConfirming || isRejecting}
          >
            <X className="h-4 w-4 mr-1" />
            Odmítnout
          </Button>
        </div>
      )}

      {canConfirm && showRejectReason && (
        <div className="space-y-2 pt-1">
          <Input
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder="Důvod odmítnutí"
            className="min-h-[44px]"
          />
          <div className="flex gap-2">
            <Button size="sm" variant="outline" className="flex-1 min-h-[44px]" onClick={() => setShowRejectReason(false)}>
              Zpět
            </Button>
            <Button
              size="sm"
              variant="destructive"
              className="flex-1 min-h-[44px]"
              onClick={() => onReject(rejectReason || undefined)}
              disabled={isRejecting}
            >
              {isRejecting ? "..." : "Odmítnout"}
            </Button>
          </div>
        </div>
      )}

      {!canConfirm && (
        <p className="text-xs text-muted-foreground italic">
          Pouze manažer může potvrdit převzetí.
        </p>
      )}
    </div>
  );
}
