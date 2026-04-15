import { ArrowLeft, X } from "lucide-react";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { formatCurrency } from "@/shared/lib/formatting";
import dayjs from "dayjs";

// Unified category type for both expense and income
export interface UnifiedCategory {
  key: string;
  label: string;
  type: "expense" | "income";
  subtotal: number;
  count: number;
  items: { id: number; description: string; amount: number; createdAt: string }[];
}

interface CategoryListProps {
  selectedCategory: UnifiedCategory | null;
  onSelectCategory: (cat: UnifiedCategory | null) => void;
  unifiedCategories: UnifiedCategory[];
  currency: string;
  isActive: boolean;
  isLocked: boolean;
  onStornoItem: (item: { id: number; description: string; amount: number }) => void;
}

export function CategoryList({
  selectedCategory,
  onSelectCategory,
  unifiedCategories,
  currency,
  isActive,
  isLocked,
  onStornoItem,
}: CategoryListProps) {
  if (selectedCategory) {
    return (
      <div className="flex flex-col h-full">
        <button
          className="flex items-center gap-2 p-3 text-sm font-medium border-b hover:bg-muted/50 touch-manipulation min-h-[44px]"
          onClick={() => onSelectCategory(null)}
        >
          <ArrowLeft className="h-4 w-4" />
          <span>{selectedCategory.label}</span>
          <Badge
            variant="outline"
            className={`ml-auto ${selectedCategory.type === "expense" ? "text-red-500 border-red-300" : "text-green-600 border-green-300"}`}
          >
            {formatCurrency(selectedCategory.subtotal, currency)}
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
                  {formatCurrency(item.amount, currency)}
                </span>
                {!isStorno && isActive && !isLocked && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 shrink-0 text-orange-500 hover:text-orange-600 hover:bg-orange-50"
                    onClick={() => onStornoItem(item)}
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
    );
  }

  return (
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
            onClick={() => onSelectCategory(cat)}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className={`w-2 h-2 rounded-full shrink-0 ${cat.type === "expense" ? "bg-red-400" : "bg-green-500"}`} />
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{cat.label}</p>
                <p className="text-[10px] text-muted-foreground">{cat.count} {cat.count === 1 ? "položka" : cat.count < 5 ? "položky" : "položek"}</p>
              </div>
            </div>
            <span className={`font-mono font-bold text-sm shrink-0 ${cat.type === "expense" ? "text-red-500" : "text-green-600"}`}>
              {formatCurrency(cat.subtotal, currency)}
            </span>
          </button>
        ))
      )}
    </div>
  );
}
