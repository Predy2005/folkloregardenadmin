import { Button } from "@/shared/components/ui/button";
import { LayoutGrid, List, Clock } from "lucide-react";
import { cn } from "@/shared/lib/utils";
import type { WaiterViewMode } from "./types";

interface WaiterViewSwitcherProps {
  activeMode: WaiterViewMode;
  onModeChange: (mode: WaiterViewMode) => void;
}

export default function WaiterViewSwitcher({
  activeMode,
  onModeChange,
}: WaiterViewSwitcherProps) {
  const modes: { mode: WaiterViewMode; icon: React.ReactNode; label: string }[] = [
    { mode: "floor", icon: <LayoutGrid className="h-5 w-5" />, label: "Půdorys" },
    { mode: "tables", icon: <List className="h-5 w-5" />, label: "Stoly" },
    { mode: "timeline", icon: <Clock className="h-5 w-5" />, label: "Harmonogram" },
  ];

  return (
    <div className="flex gap-2 p-2 bg-muted rounded-lg">
      {modes.map(({ mode, icon, label }) => (
        <Button
          key={mode}
          variant={activeMode === mode ? "default" : "ghost"}
          className={cn(
            "flex-1 h-14 flex flex-col gap-1 touch-manipulation",
            activeMode === mode && "shadow-md"
          )}
          onClick={() => onModeChange(mode)}
        >
          {icon}
          <span className="text-xs">{label}</span>
        </Button>
      ))}
    </div>
  );
}
