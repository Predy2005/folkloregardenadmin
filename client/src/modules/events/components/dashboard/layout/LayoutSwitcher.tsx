import { LayoutGrid, Columns2, Rows3, RotateCcw } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/shared/components/ui/tooltip";
import { useDashboardLayout, type DashboardLayout } from "./DashboardLayoutContext";
import { cn } from "@/shared/lib/utils";

interface LayoutOption {
  value: DashboardLayout;
  icon: React.ReactNode;
  label: string;
}

const layoutOptions: LayoutOption[] = [
  { value: "3col", icon: <LayoutGrid className="h-4 w-4" />, label: "3 sloupce" },
  { value: "2col", icon: <Columns2 className="h-4 w-4" />, label: "2 sloupce" },
  { value: "1col", icon: <Rows3 className="h-4 w-4" />, label: "1 sloupec" },
];

/**
 * Component for switching dashboard layout between 3/2/1 columns
 */
export function LayoutSwitcher() {
  const { layout, setLayout, resetToDefaults } = useDashboardLayout();

  return (
    <TooltipProvider>
      <div className="flex items-center gap-1 bg-muted/50 rounded-lg p-1">
        {layoutOptions.map((option) => (
          <Tooltip key={option.value}>
            <TooltipTrigger asChild>
              <Button
                variant={layout === option.value ? "secondary" : "ghost"}
                size="sm"
                className={cn(
                  "h-8 w-8 p-0",
                  layout === option.value && "bg-background shadow-sm"
                )}
                onClick={() => setLayout(option.value)}
              >
                {option.icon}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <p>{option.label}</p>
            </TooltipContent>
          </Tooltip>
        ))}

        <div className="w-px h-6 bg-border mx-1" />

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={resetToDefaults}
            >
              <RotateCcw className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            <p>Obnovit výchozí rozložení</p>
          </TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  );
}
