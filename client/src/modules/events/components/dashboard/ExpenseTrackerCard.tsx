import { useState, useMemo } from "react";
import {
  TrendingDown,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { useCurrency } from "@/shared/contexts/CurrencyContext";
import { CurrencySelect } from "@/shared/components/CurrencySelect";
import {
  useInitializeEventCashbox,
  useLockEventCashbox,
  useReopenEventCashbox,
  useConfirmTransfer,
  useRejectTransfer,
  useStornoMovement,
} from "../../hooks/useDashboardMutations";
import { useAuth } from "@/modules/auth/contexts/AuthContext";
import type { EventFinancials, CashboxTransfer } from "@shared/types";
import { PosDialog } from "./expense/PosDialog";
import { StornoDialog } from "./expense/StornoDialog";
import { PendingTransferAlert } from "./expense/PendingTransferAlert";
import { CashboxHeader } from "./expense/CashboxHeader";
import { CategoryList, type UnifiedCategory } from "./expense/CategoryList";

interface ExpenseTrackerCardProps {
  financials: EventFinancials;
  eventId: number;
  pendingTransfers?: CashboxTransfer[];
}

export function ExpenseTrackerCard({
  financials,
  eventId,
  pendingTransfers,
}: ExpenseTrackerCardProps) {
  const { defaultCurrency } = useCurrency();
  const [selectedCategory, setSelectedCategory] = useState<UnifiedCategory | null>(null);
  const [posDialogOpen, setPosDialogOpen] = useState(false);
  const [posType, setPosType] = useState<"expense" | "income">("expense");
  const [initBalance, setInitBalance] = useState("");
  const [stornoItem, setStornoItem] = useState<{ id: number; description: string; amount: number } | null>(null);
  const [stornoReason, setStornoReason] = useState("");

  const stornoMutation = useStornoMovement(eventId);

  const { hasRole, isSuperAdmin } = useAuth();
  const initCashbox = useInitializeEventCashbox(eventId);
  const lockCashbox = useLockEventCashbox(eventId);
  const reopenCashbox = useReopenEventCashbox(eventId);
  const confirmTransfer = useConfirmTransfer(eventId);
  const rejectTransfer = useRejectTransfer(eventId);

  const canConfirmTransfer = hasRole("ROLE_MANAGER") || hasRole("ROLE_ADMIN") || hasRole("ROLE_SUPER_ADMIN") || isSuperAdmin;

  const cashbox = financials.cashbox;
  const isLocked = !!cashbox?.lockedBy;
  const isActive = cashbox?.isActive ?? false;
  const hasPendingTransfers = pendingTransfers && pendingTransfers.length > 0;

  const totalExpenses = financials.expensesByCategory.reduce((s, c) => s + c.subtotal, 0);
  const totalIncome = financials.incomeByCategory.reduce((s, c) => s + c.subtotal, 0);

  // Merge expenses and income into unified category list
  const unifiedCategories = useMemo((): UnifiedCategory[] => {
    const cats: UnifiedCategory[] = [];

    for (const ec of financials.expensesByCategory) {
      cats.push({
        key: `exp_${ec.category}`,
        label: ec.label,
        type: "expense",
        subtotal: ec.subtotal,
        count: ec.items.length,
        items: ec.items.map((i) => ({
          id: i.id,
          description: i.description || i.paidTo || "—",
          amount: i.amount,
          createdAt: i.createdAt,
        })),
      });
    }

    for (const ic of financials.incomeByCategory) {
      cats.push({
        key: `inc_${ic.category}`,
        label: ic.label,
        type: "income",
        subtotal: ic.subtotal,
        count: ic.items.length,
        items: ic.items.map((i) => ({
          id: i.id,
          description: i.description || i.source || "—",
          amount: i.amount,
          createdAt: i.createdAt,
        })),
      });
    }

    // Sort: expenses first, then income, each by subtotal desc
    cats.sort((a, b) => {
      if (a.type !== b.type) return a.type === "expense" ? -1 : 1;
      return b.subtotal - a.subtotal;
    });

    return cats;
  }, [financials.expensesByCategory, financials.incomeByCategory]);

  const openPosDialog = (type: "expense" | "income") => {
    setPosType(type);
    setPosDialogOpen(true);
  };

  const renderPendingTransfers = () => {
    if (!hasPendingTransfers) return null;
    return (
      <div className="space-y-2">
        {pendingTransfers!.map((t) => (
          <PendingTransferAlert
            key={t.id}
            transfer={t}
            canConfirm={canConfirmTransfer}
            onConfirm={() => confirmTransfer.mutate(t.id)}
            onReject={(reason) => rejectTransfer.mutate({ transferId: t.id, reason })}
            isConfirming={confirmTransfer.isPending}
            isRejecting={rejectTransfer.isPending}
          />
        ))}
      </div>
    );
  };

  // Show init form if no cashbox exists
  if (!cashbox) {
    return (
      <div className="p-4 space-y-3">
        {renderPendingTransfers()}

        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Wallet className="h-4 w-4" />
          Kasa eventu ještě nebyla vytvořena
        </div>
        <div className="flex gap-2">
          <Input
            type="number"
            step="0.01"
            value={initBalance}
            onChange={(e) => setInitBalance(e.target.value)}
            placeholder="Počáteční stav"
            className="flex-1 min-h-[44px]"
          />
          <CurrencySelect value={defaultCurrency} onChange={() => {}} className="w-24" />
          <Button
            onClick={() => initCashbox.mutate(parseFloat(initBalance) || 0)}
            disabled={initCashbox.isPending}
            className="min-h-[44px]"
          >
            {initCashbox.isPending ? "..." : "Vytvořit kasu"}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Pending transfers */}
      {hasPendingTransfers && (
        <div className="p-3 space-y-2 border-b">
          {renderPendingTransfers()}
        </div>
      )}

      {/* Top bar: totals + cashbox controls */}
      <CashboxHeader
        totalExpenses={totalExpenses}
        totalIncome={totalIncome}
        currency={defaultCurrency}
        isActive={isActive}
        isLocked={isLocked}
        onLock={() => lockCashbox.mutate()}
        onReopen={() => reopenCashbox.mutate()}
        isLocking={lockCashbox.isPending}
        isReopening={reopenCashbox.isPending}
      />

      {/* Category list OR detail view */}
      <div className="flex-1 overflow-y-auto">
        <CategoryList
          selectedCategory={selectedCategory}
          onSelectCategory={setSelectedCategory}
          unifiedCategories={unifiedCategories}
          currency={defaultCurrency}
          isActive={isActive}
          isLocked={isLocked}
          onStornoItem={(item) => { setStornoItem(item); setStornoReason(""); }}
        />
      </div>

      {/* POS action buttons - always at bottom */}
      <div className="flex gap-2 p-3 border-t bg-background">
        <Button
          variant="outline"
          className="flex-1 min-h-[48px] touch-manipulation text-red-500 hover:text-red-600 hover:bg-red-50 border-red-200 text-base font-semibold"
          disabled={isLocked || !isActive}
          onClick={() => openPosDialog("expense")}
        >
          <TrendingDown className="h-5 w-5 mr-2" />
          Výdaj
        </Button>
        <Button
          variant="outline"
          className="flex-1 min-h-[48px] touch-manipulation text-green-600 hover:text-green-700 hover:bg-green-50 border-green-200 text-base font-semibold"
          disabled={isLocked || !isActive}
          onClick={() => openPosDialog("income")}
        >
          <TrendingUp className="h-5 w-5 mr-2" />
          Příjem
        </Button>
      </div>

      {/* POS-style dialog */}
      <PosDialog
        open={posDialogOpen}
        onOpenChange={setPosDialogOpen}
        type={posType}
        eventId={eventId}
      />

      {/* Storno dialog */}
      <StornoDialog
        item={stornoItem}
        reason={stornoReason}
        onReasonChange={setStornoReason}
        onClose={() => setStornoItem(null)}
        onConfirm={() => {
          if (!stornoItem) return;
          stornoMutation.mutate(
            { movementId: stornoItem.id, reason: stornoReason || "Storno" },
            { onSuccess: () => { setStornoItem(null); setSelectedCategory(null); } }
          );
        }}
        isPending={stornoMutation.isPending}
      />
    </div>
  );
}
