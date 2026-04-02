import { useState, useMemo } from "react";
import {
  Plus,
  TrendingDown,
  TrendingUp,
  Lock,
  Unlock,
  Wallet,
  ArrowRightLeft,
  Check,
  X,
  ArrowLeft,
  Delete,
  Users,
  ChefHat,
  HandHelping,
  Music,
  Mic,
  Camera,
  UtensilsCrossed,
  Bus,
  Gem,
  MoreHorizontal,
  CreditCard,
  Banknote,
  ShoppingBag,
  Sparkles,
  PenLine,
} from "lucide-react";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import { useAddExpense, useAddIncome } from "../../hooks/useEventDashboard";
import {
  useInitializeEventCashbox,
  useLockEventCashbox,
  useReopenEventCashbox,
  useConfirmTransfer,
  useRejectTransfer,
  useStornoMovement,
} from "../../hooks/useDashboardMutations";
import { useAuth } from "@/modules/auth/contexts/AuthContext";
import { formatCurrency } from "@/shared/lib/formatting";
import type { EventFinancials, CashboxTransfer } from "@shared/types";
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES } from "@shared/types";
import dayjs from "dayjs";

interface ExpenseTrackerCardProps {
  financials: EventFinancials;
  eventId: number;
  pendingTransfers?: CashboxTransfer[];
}

// Unified category type for both expense and income
interface UnifiedCategory {
  key: string;
  label: string;
  type: "expense" | "income";
  subtotal: number;
  count: number;
  items: { id: number; description: string; amount: number; createdAt: string }[];
}

export function ExpenseTrackerCard({
  financials,
  eventId,
  pendingTransfers,
}: ExpenseTrackerCardProps) {
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

  // Show init form if no cashbox exists
  if (!cashbox) {
    return (
      <div className="p-4 space-y-3">
        {hasPendingTransfers && (
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
    <div className="flex flex-col h-full">
      {/* Pending transfers */}
      {hasPendingTransfers && (
        <div className="p-3 space-y-2 border-b">
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
      )}

      {/* Top bar: totals + cashbox controls */}
      <div className="flex items-center justify-between p-3 border-b bg-muted/30">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 text-red-500">
            <TrendingDown className="h-4 w-4" />
            <span className="font-bold text-sm">{formatCurrency(totalExpenses)}</span>
          </div>
          <div className="flex items-center gap-1.5 text-green-600">
            <TrendingUp className="h-4 w-4" />
            <span className="font-bold text-sm">{formatCurrency(totalIncome)}</span>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {isActive ? (
            <Badge variant="outline" className="text-green-600 border-green-300 text-[10px] px-1.5">Aktivní</Badge>
          ) : (
            <Badge variant="destructive" className="text-[10px] px-1.5">Uzavřena</Badge>
          )}
          {isLocked && (
            <Badge variant="outline" className="text-amber-600 border-amber-300 text-[10px] px-1.5">
              <Lock className="h-2.5 w-2.5 mr-0.5" />Zamčeno
            </Badge>
          )}
          {isActive && (
            isLocked ? (
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => reopenCashbox.mutate()} disabled={reopenCashbox.isPending}>
                <Unlock className="h-3.5 w-3.5" />
              </Button>
            ) : (
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => lockCashbox.mutate()} disabled={lockCashbox.isPending}>
                <Lock className="h-3.5 w-3.5" />
              </Button>
            )
          )}
        </div>
      </div>

      {/* Category list OR detail view */}
      <div className="flex-1 overflow-y-auto">
        {selectedCategory ? (
          /* Detail view for selected category */
          <div className="flex flex-col h-full">
            <button
              className="flex items-center gap-2 p-3 text-sm font-medium border-b hover:bg-muted/50 touch-manipulation min-h-[44px]"
              onClick={() => setSelectedCategory(null)}
            >
              <ArrowLeft className="h-4 w-4" />
              <span>{selectedCategory.label}</span>
              <Badge
                variant="outline"
                className={`ml-auto ${selectedCategory.type === "expense" ? "text-red-500 border-red-300" : "text-green-600 border-green-300"}`}
              >
                {formatCurrency(selectedCategory.subtotal)}
              </Badge>
            </button>
            <div className="divide-y">
              {selectedCategory.items.map((item, idx) => {
                const isStorno = item.description.startsWith("STORNO:");
                return (
                  <div key={idx} className={`flex items-center gap-2 px-4 py-3 min-h-[44px] ${isStorno ? "bg-muted/50 opacity-60" : ""}`}>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm truncate ${isStorno ? "line-through" : ""}`}>{item.description}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {dayjs(item.createdAt).format("DD.MM. HH:mm")}
                      </p>
                    </div>
                    <span className={`font-mono font-medium text-sm shrink-0 ${selectedCategory.type === "expense" ? "text-red-500" : "text-green-600"}`}>
                      {formatCurrency(item.amount)}
                    </span>
                    {!isStorno && isActive && !isLocked && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 shrink-0 text-orange-500 hover:text-orange-600 hover:bg-orange-50"
                        onClick={() => { setStornoItem(item); setStornoReason(""); }}
                        title="Storno"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                );
              })}
              {selectedCategory.items.length === 0 && (
                <div className="p-4 text-center text-sm text-muted-foreground">
                  Zatím žádné položky
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Category list */
          <div className="divide-y">
            {unifiedCategories.length === 0 ? (
              <div className="p-4 text-center text-sm text-muted-foreground">
                Zatím žádné pohyby
              </div>
            ) : (
              unifiedCategories.map((cat) => (
                <button
                  key={cat.key}
                  className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/50 touch-manipulation min-h-[52px] text-left"
                  onClick={() => setSelectedCategory(cat)}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className={`w-2 h-2 rounded-full shrink-0 ${cat.type === "expense" ? "bg-red-400" : "bg-green-500"}`} />
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{cat.label}</p>
                      <p className="text-[10px] text-muted-foreground">{cat.count} {cat.count === 1 ? "položka" : cat.count < 5 ? "položky" : "položek"}</p>
                    </div>
                  </div>
                  <span className={`font-mono font-bold text-sm shrink-0 ${cat.type === "expense" ? "text-red-500" : "text-green-600"}`}>
                    {formatCurrency(cat.subtotal)}
                  </span>
                </button>
              ))
            )}
          </div>
        )}
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

// ─── POS-style dialog ────────────────────────────────────────────

// Icon mapping for known categories
const EXPENSE_ICONS: Record<string, React.ReactNode> = {
  STAFF_WAITERS: <Users className="h-6 w-6" />,
  STAFF_COOKS: <ChefHat className="h-6 w-6" />,
  STAFF_HELPERS: <HandHelping className="h-6 w-6" />,
  ENTERTAINMENT_DANCERS: <Sparkles className="h-6 w-6" />,
  ENTERTAINMENT_MUSICIANS: <Music className="h-6 w-6" />,
  ENTERTAINMENT_MODERATOR: <Mic className="h-6 w-6" />,
  PHOTOGRAPHER: <Camera className="h-6 w-6" />,
  CATERING: <UtensilsCrossed className="h-6 w-6" />,
  TRANSPORT: <Bus className="h-6 w-6" />,
  MERCHANDISE_JEWELRY: <Gem className="h-6 w-6" />,
  OTHER: <MoreHorizontal className="h-6 w-6" />,
};

const INCOME_ICONS: Record<string, React.ReactNode> = {
  ONLINE_PAYMENT: <CreditCard className="h-6 w-6" />,
  CASH_PAYMENT: <Banknote className="h-6 w-6" />,
  JEWELRY_SALES: <Gem className="h-6 w-6" />,
  MERCHANDISE: <ShoppingBag className="h-6 w-6" />,
  OTHER: <MoreHorizontal className="h-6 w-6" />,
};

type PosStep = "category" | "amount";

interface PosDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: "expense" | "income";
  eventId: number;
}

function PosDialog({ open, onOpenChange, type, eventId }: PosDialogProps) {
  const [step, setStep] = useState<PosStep>("category");
  const [amount, setAmount] = useState("0");
  const [category, setCategory] = useState("");
  const [categoryLabel, setCategoryLabel] = useState("");
  const [description, setDescription] = useState("");
  const [showCustom, setShowCustom] = useState(false);
  const [customName, setCustomName] = useState("");

  const addExpense = useAddExpense(eventId);
  const addIncome = useAddIncome(eventId);
  const isExpense = type === "expense";
  const isPending = addExpense.isPending || addIncome.isPending;

  const categories = isExpense ? EXPENSE_CATEGORIES : INCOME_CATEGORIES;
  const icons = isExpense ? EXPENSE_ICONS : INCOME_ICONS;

  const resetForm = () => {
    setStep("category");
    setAmount("0");
    setCategory("");
    setCategoryLabel("");
    setDescription("");
    setShowCustom(false);
    setCustomName("");
  };

  const selectCategory = (key: string, label: string) => {
    setCategory(label);
    setCategoryLabel(label);
    setStep("amount");
  };

  const handleCustomSubmit = () => {
    const name = customName.trim();
    if (!name) return;
    setCategory(name);
    setCategoryLabel(name);
    setShowCustom(false);
    setCustomName("");
    setStep("amount");
  };

  const handleNumpad = (key: string) => {
    setAmount((prev) => {
      if (key === "C") return "0";
      if (key === "⌫") return prev.length <= 1 ? "0" : prev.slice(0, -1);
      if (key === "." && prev.includes(".")) return prev;
      if (key === "00") {
        if (prev === "0") return "0";
        return prev + "00";
      }
      if (prev === "0" && key !== ".") return key;
      return prev + key;
    });
  };

  const handleSubmit = () => {
    const numAmount = parseFloat(amount);
    if (!category || !numAmount || numAmount <= 0) return;

    if (isExpense) {
      addExpense.mutate(
        { category, amount: numAmount, description: description || undefined },
        { onSuccess: () => { resetForm(); onOpenChange(false); } }
      );
    } else {
      addIncome.mutate(
        { category, amount: numAmount, description: description || undefined },
        { onSuccess: () => { resetForm(); onOpenChange(false); } }
      );
    }
  };

  const numAmount = parseFloat(amount) || 0;
  const isValid = category && numAmount > 0;

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) resetForm();
        onOpenChange(v);
      }}
    >
      <DialogContent className="max-w-md p-0 gap-0 overflow-hidden">
        {/* Header */}
        <div className={`px-4 py-3 flex items-center gap-3 ${isExpense ? "bg-red-500" : "bg-green-600"} text-white`}>
          {step === "amount" && (
            <button
              type="button"
              className="p-1 -ml-1 rounded hover:bg-white/20 touch-manipulation"
              onClick={() => setStep("category")}
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
          )}
          <DialogHeader className="flex-1">
            <DialogTitle className="text-white text-lg">
              {step === "category"
                ? (isExpense ? "Výdaj — kategorie" : "Příjem — kategorie")
                : categoryLabel
              }
            </DialogTitle>
          </DialogHeader>
        </div>

        {step === "category" ? (
          /* ─── Step 1: Category tiles ─── */
          <div className="p-3">
            {!showCustom ? (
              <>
                <div className="grid grid-cols-3 gap-2">
                  {Object.entries(categories).map(([key, label]) => (
                    <button
                      key={key}
                      type="button"
                      className={`
                        flex flex-col items-center justify-center gap-1.5 p-3 rounded-xl border-2
                        min-h-[80px] touch-manipulation select-none transition-all
                        hover:shadow-md active:scale-95
                        ${isExpense
                          ? "border-red-200 hover:border-red-400 hover:bg-red-50 active:bg-red-100 text-red-700"
                          : "border-green-200 hover:border-green-400 hover:bg-green-50 active:bg-green-100 text-green-700"
                        }
                      `}
                      onClick={() => selectCategory(key, label)}
                    >
                      <span className={isExpense ? "text-red-500" : "text-green-600"}>
                        {icons[key] || <MoreHorizontal className="h-6 w-6" />}
                      </span>
                      <span className="text-xs font-medium text-center leading-tight">{label}</span>
                    </button>
                  ))}

                  {/* Custom category button */}
                  <button
                    type="button"
                    className={`
                      flex flex-col items-center justify-center gap-1.5 p-3 rounded-xl border-2 border-dashed
                      min-h-[80px] touch-manipulation select-none transition-all
                      hover:shadow-md active:scale-95
                      ${isExpense
                        ? "border-red-300 hover:border-red-400 hover:bg-red-50 text-red-600"
                        : "border-green-300 hover:border-green-400 hover:bg-green-50 text-green-600"
                      }
                    `}
                    onClick={() => setShowCustom(true)}
                  >
                    <PenLine className="h-6 w-6" />
                    <span className="text-xs font-medium">Vlastní</span>
                  </button>
                </div>
              </>
            ) : (
              /* Custom category input */
              <div className="space-y-3 py-2">
                <Label>Název vlastní kategorie</Label>
                <Input
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  placeholder="Napište název..."
                  className="min-h-[48px] text-lg"
                  autoFocus
                  onKeyDown={(e) => { if (e.key === "Enter") handleCustomSubmit(); }}
                />
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="flex-1 min-h-[48px]"
                    onClick={() => { setShowCustom(false); setCustomName(""); }}
                  >
                    Zpět
                  </Button>
                  <Button
                    className={`flex-1 min-h-[48px] ${isExpense ? "bg-red-500 hover:bg-red-600" : "bg-green-600 hover:bg-green-700"}`}
                    onClick={handleCustomSubmit}
                    disabled={!customName.trim()}
                  >
                    Potvrdit
                  </Button>
                </div>
              </div>
            )}
          </div>
        ) : (
          /* ─── Step 2: Amount numpad ─── */
          <>
            {/* Amount input - editable by keyboard */}
            <div className={`px-4 py-3 ${isExpense ? "bg-red-50" : "bg-green-50"}`}>
              <div className="flex items-center justify-center gap-2">
                <input
                  type="text"
                  inputMode="decimal"
                  value={amount === "0" ? "" : amount}
                  onChange={(e) => {
                    const val = e.target.value.replace(/[^0-9.]/g, "");
                    if (val === "" || val === ".") { setAmount("0"); return; }
                    // prevent multiple dots
                    if ((val.match(/\./g) || []).length > 1) return;
                    setAmount(val);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && isValid) handleSubmit();
                  }}
                  placeholder="0"
                  autoFocus
                  className={`
                    w-full text-center text-4xl font-bold font-mono bg-transparent border-0 outline-none
                    ${isExpense ? "text-red-600 placeholder:text-red-300" : "text-green-700 placeholder:text-green-300"}
                  `}
                />
                <span className="text-xl text-muted-foreground shrink-0">Kč</span>
              </div>
            </div>

            {/* Optional description */}
            <div className="px-3 py-2 border-b">
              <Input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={isExpense ? "Komu / za co (nepovinné)" : "Od koho / za co (nepovinné)"}
                className="min-h-[44px] border-0 bg-muted/50 text-sm"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && isValid) handleSubmit();
                }}
              />
            </div>

            {/* Numpad (touch helper, not required) */}
            <div className="grid grid-cols-4 gap-px bg-border">
              {["7", "8", "9", "⌫", "4", "5", "6", "C", "1", "2", "3", ".", "00", "0"].map((key) => (
                <button
                  key={key}
                  type="button"
                  tabIndex={-1}
                  className={`
                    flex items-center justify-center min-h-[56px] text-xl font-medium bg-background
                    hover:bg-muted active:bg-muted/80 touch-manipulation select-none transition-colors
                    ${key === "C" ? "text-orange-500 font-bold" : ""}
                    ${key === "⌫" ? "text-muted-foreground" : ""}
                  `}
                  onClick={() => handleNumpad(key)}
                >
                  {key === "⌫" ? <Delete className="h-5 w-5" /> : key}
                </button>
              ))}
              {/* Submit button takes last 2 cells */}
              <button
                type="button"
                className={`
                  col-span-2 flex items-center justify-center min-h-[56px] text-lg font-bold text-white
                  touch-manipulation select-none transition-colors
                  ${isValid && !isPending
                    ? isExpense
                      ? "bg-red-500 hover:bg-red-600 active:bg-red-700"
                      : "bg-green-600 hover:bg-green-700 active:bg-green-800"
                    : "bg-muted text-muted-foreground cursor-not-allowed"
                  }
                `}
                onClick={handleSubmit}
                disabled={!isValid || isPending}
              >
                {isPending ? "..." : (
                  <>
                    <Check className="h-5 w-5 mr-2" />
                    Uložit
                  </>
                )}
              </button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ─── Storno Dialog ───────────────────────────────────────────────

const STORNO_REASONS = [
  "Chybná částka",
  "Špatná kategorie",
  "Duplicitní záznam",
  "Zrušená objednávka",
  "Reklamace",
];

interface StornoDialogProps {
  item: { id: number; description: string; amount: number } | null;
  reason: string;
  onReasonChange: (reason: string) => void;
  onClose: () => void;
  onConfirm: () => void;
  isPending: boolean;
}

function StornoDialog({ item, reason, onReasonChange, onClose, onConfirm, isPending }: StornoDialogProps) {
  if (!item) return null;

  return (
    <Dialog open={!!item} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-sm p-0 gap-0 overflow-hidden">
        <div className="px-4 py-3 bg-orange-500 text-white">
          <DialogHeader>
            <DialogTitle className="text-white text-lg">Storno</DialogTitle>
          </DialogHeader>
        </div>

        <div className="p-4 space-y-4">
          {/* What's being reversed */}
          <div className="p-3 bg-muted/50 rounded-lg">
            <p className="text-sm font-medium truncate">{item.description}</p>
            <p className="text-lg font-bold font-mono mt-1">{formatCurrency(item.amount)}</p>
          </div>

          {/* Quick reason buttons */}
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Důvod storna</Label>
            <div className="grid grid-cols-2 gap-2">
              {STORNO_REASONS.map((r) => (
                <button
                  key={r}
                  type="button"
                  className={`
                    px-3 py-2.5 rounded-lg border text-sm font-medium text-left
                    touch-manipulation transition-all active:scale-95
                    ${reason === r
                      ? "border-orange-400 bg-orange-50 text-orange-700 ring-2 ring-orange-200"
                      : "border-border hover:bg-muted/50"
                    }
                  `}
                  onClick={() => onReasonChange(r)}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          {/* Custom reason */}
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Vlastní důvod</Label>
            <Input
              value={STORNO_REASONS.includes(reason) ? "" : reason}
              onChange={(e) => onReasonChange(e.target.value)}
              placeholder="Nebo napište vlastní..."
              className="min-h-[44px]"
              onKeyDown={(e) => { if (e.key === "Enter" && reason) onConfirm(); }}
            />
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-1">
            <Button
              variant="outline"
              className="flex-1 min-h-[48px]"
              onClick={onClose}
            >
              Zrušit
            </Button>
            <Button
              className="flex-1 min-h-[48px] bg-orange-500 hover:bg-orange-600 text-white"
              onClick={onConfirm}
              disabled={!reason || isPending}
            >
              {isPending ? "..." : (
                <>
                  <X className="h-4 w-4 mr-2" />
                  Provést storno
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Pending Transfer Alert ──────────────────────────────────────

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
