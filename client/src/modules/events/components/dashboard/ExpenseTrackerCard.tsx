import { useState } from "react";
import {
  Plus,
  ChevronDown,
  ChevronRight,
  TrendingDown,
  TrendingUp,
  Lock,
  Unlock,
  Wallet,
  ArrowRightLeft,
  Check,
  X,
} from "lucide-react";
import { useToggleSet } from "@/shared/hooks/useToggleSet";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/shared/components/ui/dialog";
import { useAddExpense, useAddIncome } from "../../hooks/useEventDashboard";
import {
  useInitializeEventCashbox,
  useLockEventCashbox,
  useReopenEventCashbox,
  useConfirmTransfer,
  useRejectTransfer,
} from "../../hooks/useDashboardMutations";
import { useAuth } from "@/modules/auth/contexts/AuthContext";
import { formatCurrency } from "@/shared/lib/formatting";
import type { EventFinancials, CashboxTransfer } from "@shared/types";
import { CategoryCombobox } from "@/shared/components/CategoryCombobox";
import dayjs from "dayjs";

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
  const { isOpen: isCategoryOpen, toggle: toggleCategory } = useToggleSet<string>();
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [showAddIncome, setShowAddIncome] = useState(false);
  const [initBalance, setInitBalance] = useState("");

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

  const totalExpenses = financials.expensesByCategory.reduce(
    (sum, cat) => sum + cat.subtotal,
    0
  );
  const totalIncome = financials.incomeByCategory.reduce(
    (sum, cat) => sum + cat.subtotal,
    0
  );

  // Show init form if no cashbox exists
  if (!cashbox) {
    return (
      <div className="p-4 space-y-3">
        {/* Pending transfers from main cashbox */}
        {hasPendingTransfers && (
          <div className="space-y-2">
            {pendingTransfers.map((t) => (
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
        )}

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
            placeholder="Počáteční stav (Kč)"
            className="flex-1 min-h-[44px]"
          />
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
    <div className="p-4 space-y-3">
      {/* Pending transfers from main cashbox */}
      {hasPendingTransfers && (
        <div className="space-y-2">
          {pendingTransfers.map((t) => (
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
      )}

      {/* Cashbox status bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {isActive ? (
            <Badge variant="outline" className="text-green-600 border-green-300">Aktivní</Badge>
          ) : (
            <Badge variant="destructive">Uzavřena</Badge>
          )}
          {isLocked && (
            <Badge variant="outline" className="text-amber-600 border-amber-300">
              <Lock className="h-3 w-3 mr-1" /> Zamčeno
            </Badge>
          )}
        </div>
        {isActive && (
          <div className="flex gap-1">
            {isLocked ? (
              <Button variant="ghost" size="sm" onClick={() => reopenCashbox.mutate()} disabled={reopenCashbox.isPending}>
                <Unlock className="h-3.5 w-3.5" />
              </Button>
            ) : (
              <Button variant="ghost" size="sm" onClick={() => lockCashbox.mutate()} disabled={lockCashbox.isPending}>
                <Lock className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        )}
      </div>

      <div className="flex gap-4 text-sm">
        <span className="text-red-500 flex items-center gap-1">
          <TrendingDown className="h-4 w-4" />
          {formatCurrency(totalExpenses)}
        </span>
        <span className="text-green-600 flex items-center gap-1">
          <TrendingUp className="h-4 w-4" />
          {formatCurrency(totalIncome)}
        </span>
      </div>
        {/* Expenses by category */}
        <div className="space-y-1.5">
          <h4 className="text-xs font-medium text-muted-foreground flex items-center gap-1">
            <TrendingDown className="h-3 w-3" />
            Výdaje
          </h4>
          {financials.expensesByCategory.length === 0 ? (
            <p className="text-sm text-muted-foreground py-2">Žádné výdaje</p>
          ) : (
            financials.expensesByCategory.map((category) => (
              <CategorySection
                key={category.category}
                category={category.category}
                label={category.label}
                subtotal={category.subtotal}
                items={category.items.map((item) => ({
                  description: item.description || item.paidTo || "—",
                  amount: item.amount,
                }))}
                isExpanded={isCategoryOpen(category.category)}
                onToggle={() => toggleCategory(category.category)}
                formatCurrency={formatCurrency}
                variant="expense"
              />
            ))
          )}
        </div>

        {/* Income by category */}
        <div className="space-y-1.5 pt-2 border-t">
          <h4 className="text-xs font-medium text-muted-foreground flex items-center gap-1">
            <TrendingUp className="h-3 w-3" />
            Příjmy
          </h4>
          {financials.incomeByCategory.length === 0 ? (
            <p className="text-sm text-muted-foreground py-2">Žádné příjmy</p>
          ) : (
            financials.incomeByCategory.map((category) => (
              <CategorySection
                key={category.category}
                category={category.category}
                label={category.label}
                subtotal={category.subtotal}
                items={category.items.map((item) => ({
                  description: item.description || item.source || "—",
                  amount: item.amount,
                }))}
                isExpanded={isCategoryOpen(`income_${category.category}`)}
                onToggle={() => toggleCategory(`income_${category.category}`)}
                formatCurrency={formatCurrency}
                variant="income"
              />
            ))
          )}
        </div>

        {/* Action buttons */}
        <div className="flex gap-2 pt-2">
          <Dialog open={showAddExpense} onOpenChange={setShowAddExpense}>
            <DialogTrigger asChild>
              <Button
                variant="outline"
                className="flex-1 min-h-[44px] touch-manipulation text-red-500 hover:text-red-600"
                disabled={isLocked || !isActive}
              >
                <Plus className="h-4 w-4 mr-1" />
                Výdaj
              </Button>
            </DialogTrigger>
            <AddExpenseDialog
              eventId={eventId}
              onClose={() => setShowAddExpense(false)}
            />
          </Dialog>

          <Dialog open={showAddIncome} onOpenChange={setShowAddIncome}>
            <DialogTrigger asChild>
              <Button
                variant="outline"
                className="flex-1 min-h-[44px] touch-manipulation text-green-600 hover:text-green-700"
                disabled={isLocked || !isActive}
              >
                <Plus className="h-4 w-4 mr-1" />
                Příjem
              </Button>
            </DialogTrigger>
            <AddIncomeDialog
              eventId={eventId}
              onClose={() => setShowAddIncome(false)}
            />
          </Dialog>
        </div>
    </div>
  );
}

interface CategorySectionProps {
  category: string;
  label: string;
  subtotal: number;
  items: { description: string; amount: number }[];
  isExpanded: boolean;
  onToggle: () => void;
  formatCurrency: (amount: number) => string;
  variant: "expense" | "income";
}

function CategorySection({
  label,
  subtotal,
  items,
  isExpanded,
  onToggle,
  formatCurrency,
  variant,
}: CategorySectionProps) {
  return (
    <div className="border rounded-lg overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-2 bg-rose-50/50 dark:bg-rose-950/20 hover:bg-rose-100/60 dark:hover:bg-rose-950/30 touch-manipulation min-h-[44px]"
      >
        <div className="flex items-center gap-2">
          {isExpanded ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
          <span className="font-medium text-sm">{label}</span>
          <Badge variant="outline" className="text-xs">
            {items.length}
          </Badge>
        </div>
        <span
          className={`font-medium text-sm ${variant === "expense" ? "text-red-500" : "text-green-600"}`}
        >
          {formatCurrency(subtotal)}
        </span>
      </button>

      {isExpanded && (
        <div className="p-2 space-y-1 bg-rose-50/30 dark:bg-rose-950/10">
          {items.map((item, idx) => (
            <div
              key={idx}
              className="flex items-center justify-between text-sm p-1"
            >
              <span className="text-muted-foreground truncate flex-1 mr-2">
                {item.description}
              </span>
              <span className="font-medium">{formatCurrency(item.amount)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

interface AddExpenseDialogProps {
  eventId: number;
  onClose: () => void;
}

function AddExpenseDialog({ eventId, onClose }: AddExpenseDialogProps) {
  const [category, setCategory] = useState<string>("");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [paidTo, setPaidTo] = useState("");

  const addExpense = useAddExpense(eventId);

  const handleSubmit = () => {
    if (!category || !amount) return;

    addExpense.mutate(
      {
        category,
        amount: parseFloat(amount),
        description: description || undefined,
        paidTo: paidTo || undefined,
      },
      {
        onSuccess: () => {
          onClose();
          setCategory("");
          setAmount("");
          setDescription("");
          setPaidTo("");
        },
      }
    );
  };

  return (
    <DialogContent className="max-w-sm">
      <DialogHeader>
        <DialogTitle>Přidat výdaj</DialogTitle>
      </DialogHeader>
      <div className="space-y-4">
        <div className="space-y-2">
          <Label>Kategorie</Label>
          <CategoryCombobox
            value={category}
            onChange={setCategory}
            type="EXPENSE"
            placeholder="Vyberte nebo napište..."
          />
        </div>

        <div className="space-y-2">
          <Label>Částka (Kč)</Label>
          <Input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0"
            className="min-h-[44px]"
          />
        </div>

        <div className="space-y-2">
          <Label>Popis (volitelné)</Label>
          <Input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Popis výdaje"
            className="min-h-[44px]"
          />
        </div>

        <div className="space-y-2">
          <Label>Zaplaceno komu (volitelné)</Label>
          <Input
            value={paidTo}
            onChange={(e) => setPaidTo(e.target.value)}
            placeholder="Jméno / firma"
            className="min-h-[44px]"
          />
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onClose}>
          Zrušit
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={!category || !amount || addExpense.isPending}
        >
          {addExpense.isPending ? "Ukládám..." : "Přidat"}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}

interface AddIncomeDialogProps {
  eventId: number;
  onClose: () => void;
}

function AddIncomeDialog({ eventId, onClose }: AddIncomeDialogProps) {
  const [category, setCategory] = useState<string>("");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [source, setSource] = useState("");

  const addIncome = useAddIncome(eventId);

  const handleSubmit = () => {
    if (!category || !amount) return;

    addIncome.mutate(
      {
        category,
        amount: parseFloat(amount),
        description: description || undefined,
        source: source || undefined,
      },
      {
        onSuccess: () => {
          onClose();
          setCategory("");
          setAmount("");
          setDescription("");
          setSource("");
        },
      }
    );
  };

  return (
    <DialogContent className="max-w-sm">
      <DialogHeader>
        <DialogTitle>Přidat příjem</DialogTitle>
      </DialogHeader>
      <div className="space-y-4">
        <div className="space-y-2">
          <Label>Kategorie</Label>
          <CategoryCombobox
            value={category}
            onChange={setCategory}
            type="INCOME"
            placeholder="Vyberte nebo napište..."
          />
        </div>

        <div className="space-y-2">
          <Label>Částka (Kč)</Label>
          <Input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0"
            className="min-h-[44px]"
          />
        </div>

        <div className="space-y-2">
          <Label>Popis (volitelné)</Label>
          <Input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Popis příjmu"
            className="min-h-[44px]"
          />
        </div>

        <div className="space-y-2">
          <Label>Zdroj (volitelné)</Label>
          <Input
            value={source}
            onChange={(e) => setSource(e.target.value)}
            placeholder="Zdroj příjmu"
            className="min-h-[44px]"
          />
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onClose}>
          Zrušit
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={!category || !amount || addIncome.isPending}
        >
          {addIncome.isPending ? "Ukládám..." : "Přidat"}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}

interface PendingTransferAlertProps {
  transfer: CashboxTransfer;
  canConfirm: boolean;
  onConfirm: () => void;
  onReject: (reason?: string) => void;
  isConfirming: boolean;
  isRejecting: boolean;
}

function PendingTransferAlert({
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
          <span className="font-bold text-lg">{parseFloat(transfer.amount).toLocaleString("cs-CZ")} {transfer.currency}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Převod vytvořil:</span>
          <span>{transfer.initiatedByName}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Datum:</span>
          <span>{dayjs(transfer.initiatedAt).format("DD.MM.YYYY HH:mm")}</span>
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
            {isConfirming ? "Potvrzuji..." : "Potvrdit převzetí"}
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
            placeholder="Důvod odmítnutí (volitelné)"
            className="min-h-[44px]"
          />
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              className="flex-1 min-h-[44px]"
              onClick={() => setShowRejectReason(false)}
            >
              Zpět
            </Button>
            <Button
              size="sm"
              variant="destructive"
              className="flex-1 min-h-[44px]"
              onClick={() => onReject(rejectReason || undefined)}
              disabled={isRejecting}
            >
              {isRejecting ? "Odmítám..." : "Potvrdit odmítnutí"}
            </Button>
          </div>
        </div>
      )}

      {!canConfirm && (
        <p className="text-xs text-muted-foreground italic">
          Pouze manažer může potvrdit převzetí peněz.
        </p>
      )}
    </div>
  );
}
