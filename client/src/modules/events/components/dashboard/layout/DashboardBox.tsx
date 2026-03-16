import { type ReactNode, forwardRef } from "react";
import { GripVertical, ChevronDown, ChevronUp, Maximize2, Minimize2 } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { useDashboardLayout } from "./DashboardLayoutContext";
import { cn } from "@/shared/lib/utils";

/** Per-card color accent styles keyed by box ID */
const BOX_ACCENTS: Record<string, { border: string; headerBg: string; iconColor: string }> = {
  guests:          { border: "border-l-blue-500",    headerBg: "bg-blue-50 dark:bg-blue-950/40",    iconColor: "text-blue-600 dark:text-blue-400" },
  "staff-planning": { border: "border-l-violet-500", headerBg: "bg-violet-50 dark:bg-violet-950/40", iconColor: "text-violet-600 dark:text-violet-400" },
  transport:       { border: "border-l-amber-500",   headerBg: "bg-amber-50 dark:bg-amber-950/40",   iconColor: "text-amber-600 dark:text-amber-400" },
  vouchers:        { border: "border-l-emerald-500", headerBg: "bg-emerald-50 dark:bg-emerald-950/40", iconColor: "text-emerald-600 dark:text-emerald-400" },
  expenses:        { border: "border-l-rose-500",    headerBg: "bg-rose-50 dark:bg-rose-950/40",    iconColor: "text-rose-600 dark:text-rose-400" },
  settlement:      { border: "border-l-indigo-500",  headerBg: "bg-indigo-50 dark:bg-indigo-950/40",  iconColor: "text-indigo-600 dark:text-indigo-400" },
};

const DEFAULT_ACCENT = { border: "border-l-gray-400", headerBg: "bg-muted/40", iconColor: "text-primary" };

interface DashboardBoxProps {
  id: string;
  title: string;
  icon?: ReactNode;
  badge?: ReactNode;  // Shows next to title (e.g., count)
  children: ReactNode;
  className?: string;
  // Drag handle props from dnd-kit
  dragHandleProps?: Record<string, unknown>;
  isDragging?: boolean;
}

/**
 * Wrapper component for dashboard cards with:
 * - Color-coded left border and header per card type
 * - Drag handle for reordering (always visible)
 * - Collapse/expand toggle
 * - Full-width toggle
 */
export const DashboardBox = forwardRef<HTMLDivElement, DashboardBoxProps>(
  function DashboardBox(
    { id, title, icon, badge, children, className, dragHandleProps, isDragging },
    ref
  ) {
    const { isCollapsed, toggleCollapsed, isFullWidth, toggleFullWidth, layout } =
      useDashboardLayout();

    const collapsed = isCollapsed(id);
    const fullWidth = isFullWidth(id);
    const accent = BOX_ACCENTS[id] || DEFAULT_ACCENT;

    // Don't show full-width toggle in 1-column layout
    const showFullWidthToggle = layout !== "1col";

    return (
      <div
        ref={ref}
        className={cn(
          "relative transition-all duration-200 rounded-lg border border-l-4 bg-card shadow-sm overflow-hidden",
          accent.border,
          isDragging && "opacity-60 ring-2 ring-primary shadow-lg",
          fullWidth && layout !== "1col" && "col-span-full",
          className
        )}
      >
        {/* Header bar - drag handle area */}
        <div className={cn("flex items-center gap-1 px-2 py-1.5 border-b", accent.headerBg)}>
          {/* Drag handle - the entire left part is draggable */}
          <div
            className={cn(
              "flex items-center gap-2 flex-1 min-w-0 cursor-grab active:cursor-grabbing touch-manipulation select-none",
              isDragging && "cursor-grabbing"
            )}
            {...dragHandleProps}
          >
            <GripVertical className="h-4 w-4 text-muted-foreground shrink-0" />
            {icon && <span className={cn("shrink-0", accent.iconColor)}>{icon}</span>}
            <span className="text-sm font-semibold truncate">{title}</span>
            {badge && <span className="shrink-0">{badge}</span>}
          </div>

          {/* Controls - not part of drag handle */}
          <div className="flex items-center gap-0.5 shrink-0">
            {/* Full-width toggle */}
            {showFullWidthToggle && (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleFullWidth(id);
                }}
                title={fullWidth ? "Zmenšit" : "Rozšířit na celou šířku"}
              >
                {fullWidth ? (
                  <Minimize2 className="h-3.5 w-3.5" />
                ) : (
                  <Maximize2 className="h-3.5 w-3.5" />
                )}
              </Button>
            )}

            {/* Collapse toggle */}
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={(e) => {
                e.stopPropagation();
                toggleCollapsed(id);
              }}
              title={collapsed ? "Rozbalit" : "Sbalit"}
            >
              {collapsed ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronUp className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>

        {/* Content - collapsible */}
        {!collapsed && <div>{children}</div>}
      </div>
    );
  }
);
