import { useState } from "react";
import {
  Check,
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
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import { useCurrency } from "@/shared/contexts/CurrencyContext";
import { CurrencySelect } from "@/shared/components/CurrencySelect";
import { useAddExpense, useAddIncome } from "../../../hooks/useEventDashboard";
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES } from "@shared/types";

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
  /** Optional — when set, the movement is linked to this table (visible at the table). */
  eventTableId?: number;
  /** Optional title prefix shown in the dialog header (e.g. table number). */
  contextLabel?: string;
}

export function PosDialog({ open, onOpenChange, type, eventId, eventTableId, contextLabel }: PosDialogProps) {
  const [step, setStep] = useState<PosStep>("category");
  const [amount, setAmount] = useState("0");
  const [category, setCategory] = useState("");
  const [categoryLabel, setCategoryLabel] = useState("");
  const [description, setDescription] = useState("");
  const [showCustom, setShowCustom] = useState(false);
  const [customName, setCustomName] = useState("");

  const { defaultCurrency } = useCurrency();
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
        { category, amount: numAmount, description: description || undefined, eventTableId },
        { onSuccess: () => { resetForm(); onOpenChange(false); } }
      );
    } else {
      addIncome.mutate(
        { category, amount: numAmount, description: description || undefined, eventTableId },
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
              {contextLabel && <span className="opacity-80 text-sm mr-2">{contextLabel}</span>}
              {step === "category"
                ? (isExpense ? "Výdaj — kategorie" : "Příjem — kategorie")
                : categoryLabel
              }
            </DialogTitle>
          </DialogHeader>
        </div>

        {step === "category" ? (
          /* Step 1: Category tiles */
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
          /* Step 2: Amount numpad */
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
                <CurrencySelect value={defaultCurrency} onChange={() => {}} className="w-20 shrink-0" />
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
