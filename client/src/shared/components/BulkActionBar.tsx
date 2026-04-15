import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { X } from "lucide-react";
import { cn } from "@/shared/lib/utils";

interface BulkAction {
  label: string;
  onClick: () => void;
  variant?: "default" | "outline" | "destructive" | "ghost";
  icon?: React.ReactNode;
}

interface BulkActionBarProps {
  selectedCount: number;
  actions: BulkAction[];
  onClear: () => void;
  className?: string;
}

export function BulkActionBar({ selectedCount, actions, onClear, className }: BulkActionBarProps) {
  if (selectedCount === 0) return null;

  return (
    <div className={cn("flex items-center gap-2 p-2 bg-primary/5 rounded-lg border", className)}>
      <Badge variant="secondary">{selectedCount} vybráno</Badge>
      {actions.map((action, i) => (
        <Button
          key={i}
          size="sm"
          variant={action.variant ?? "outline"}
          onClick={action.onClick}
        >
          {action.icon}
          {action.label}
        </Button>
      ))}
      <Button size="sm" variant="ghost" onClick={onClear} className="ml-auto">
        <X className="h-3 w-3 mr-1" />
        Zrušit výběr
      </Button>
    </div>
  );
}
