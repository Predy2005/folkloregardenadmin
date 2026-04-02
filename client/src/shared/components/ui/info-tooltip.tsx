import * as React from "react";
import { Info } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "./popover";
import { cn } from "@/shared/lib/utils";

interface InfoTooltipProps {
  children: React.ReactNode;
  content: React.ReactNode;
  side?: "top" | "right" | "bottom" | "left";
  className?: string;
  iconClassName?: string;
  showIcon?: boolean;
}

/**
 * Mobile-friendly tooltip component
 * - Desktop: hover to show
 * - Mobile: tap to show (stays open until tap elsewhere)
 */
export function InfoTooltip({
  children,
  content,
  side = "top",
  className,
  iconClassName,
  showIcon = false,
}: InfoTooltipProps) {
  const [open, setOpen] = React.useState(false);
  const [isHovering, setIsHovering] = React.useState(false);
  const timeoutRef = React.useRef<NodeJS.Timeout>();

  // Handle hover for desktop
  const handleMouseEnter = () => {
    setIsHovering(true);
    // Small delay before showing
    timeoutRef.current = setTimeout(() => {
      setOpen(true);
    }, 200);
  };

  const hideTimeoutRef = React.useRef<NodeJS.Timeout>();

  const handleMouseLeave = () => {
    setIsHovering(false);
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
    }
    // Small delay before hiding — use ref to check latest hover state
    hideTimeoutRef.current = setTimeout(() => {
      setOpen(false);
    }, 100);
  };

  const handleContentMouseEnter = () => {
    setIsHovering(true);
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
    }
  };

  // Cleanup on unmount
  React.useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      if (hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current);
      }
    };
  }, []);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <span
          className={cn(
            "inline-flex items-center gap-1 cursor-help touch-manipulation",
            className
          )}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          {children}
          {showIcon && (
            <Info className={cn("h-3 w-3 text-muted-foreground", iconClassName)} />
          )}
        </span>
      </PopoverTrigger>
      <PopoverContent
        side={side}
        className="max-w-[280px] text-sm p-3"
        onMouseEnter={handleContentMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {content}
      </PopoverContent>
    </Popover>
  );
}

/**
 * Stat item with built-in tooltip
 */
interface StatWithTooltipProps {
  value: React.ReactNode;
  label: string;
  description?: string;
  className?: string;
  valueClassName?: string;
}

export function StatWithTooltip({
  value,
  label,
  description,
  className,
  valueClassName,
}: StatWithTooltipProps) {
  const tooltipContent = (
    <div>
      <div className="font-medium mb-1">{label}</div>
      {description && (
        <div className="text-muted-foreground text-xs">{description}</div>
      )}
    </div>
  );

  return (
    <InfoTooltip content={tooltipContent} className={className}>
      <span className={valueClassName}>{value}</span>
    </InfoTooltip>
  );
}
