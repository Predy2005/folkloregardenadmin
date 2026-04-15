import { TrendingDown, TrendingUp, Lock, Unlock } from "lucide-react";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { formatCurrency } from "@/shared/lib/formatting";

interface CashboxHeaderProps {
  totalExpenses: number;
  totalIncome: number;
  currency: string;
  isActive: boolean;
  isLocked: boolean;
  onLock: () => void;
  onReopen: () => void;
  isLocking: boolean;
  isReopening: boolean;
}

export function CashboxHeader({
  totalExpenses,
  totalIncome,
  currency,
  isActive,
  isLocked,
  onLock,
  onReopen,
  isLocking,
  isReopening,
}: CashboxHeaderProps) {
  return (
    <div className="flex items-center justify-between p-3 border-b bg-muted/30">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1.5 text-red-500">
          <TrendingDown className="h-4 w-4" />
          <span className="font-bold text-sm">{formatCurrency(totalExpenses, currency)}</span>
        </div>
        <div className="flex items-center gap-1.5 text-green-600">
          <TrendingUp className="h-4 w-4" />
          <span className="font-bold text-sm">{formatCurrency(totalIncome, currency)}</span>
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
            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={onReopen} disabled={isReopening}>
              <Unlock className="h-3.5 w-3.5" />
            </Button>
          ) : (
            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={onLock} disabled={isLocking}>
              <Lock className="h-3.5 w-3.5" />
            </Button>
          )
        )}
      </div>
    </div>
  );
}
