import { useState } from "react";
import {
  Receipt,
  Plus,
  ChevronDown,
  ChevronRight,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/shared/components/ui/dialog";
import { useAddExpense, useAddIncome } from "../../hooks/useEventDashboard";
import type { EventFinancials } from "@shared/types";
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES } from "@shared/types";

interface ExpenseTrackerCardProps {
  financials: EventFinancials;
  eventId: number;
}

export function ExpenseTrackerCard({
  financials,
  eventId,
}: ExpenseTrackerCardProps) {
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set()
  );
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [showAddIncome, setShowAddIncome] = useState(false);

  const totalExpenses = financials.expensesByCategory.reduce(
    (sum, cat) => sum + cat.subtotal,
    0
  );
  const totalIncome = financials.incomeByCategory.reduce(
    (sum, cat) => sum + cat.subtotal,
    0
  );

  const toggleCategory = (category: string) => {
    const newSet = new Set(expandedCategories);
    if (newSet.has(category)) {
      newSet.delete(category);
    } else {
      newSet.add(category);
    }
    setExpandedCategories(newSet);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("cs-CZ", {
      style: "currency",
      currency: "CZK",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Receipt className="h-5 w-5 text-primary" />
          Výdaje a příjmy
        </CardTitle>
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
      </CardHeader>
      <CardContent className="space-y-3">
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
                isExpanded={expandedCategories.has(category.category)}
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
                isExpanded={expandedCategories.has(`income_${category.category}`)}
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
      </CardContent>
    </Card>
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
        className="w-full flex items-center justify-between p-2 bg-muted/30 hover:bg-muted/50 touch-manipulation min-h-[44px]"
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
        <div className="p-2 space-y-1">
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
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="min-h-[44px]">
              <SelectValue placeholder="Vyberte kategorii" />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(EXPENSE_CATEGORIES).map(([key, label]) => (
                <SelectItem key={key} value={key}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
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
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="min-h-[44px]">
              <SelectValue placeholder="Vyberte kategorii" />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(INCOME_CATEGORIES).map(([key, label]) => (
                <SelectItem key={key} value={key}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
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
