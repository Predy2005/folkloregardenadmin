import { Badge } from "@/shared/components/ui/badge";
import { cn } from "@/shared/lib/utils";
import {
  NATIONALITY_INFO,
  getNationalityInfo,
  type NationalityInfo,
} from "@/shared/lib/constants";

// Re-export from the canonical source so existing consumers keep working
export { NATIONALITY_INFO as NATIONALITY_COLORS, getNationalityInfo as getNationalityColor };
export type { NationalityInfo };

interface NationalityBadgeProps {
  nationality: string | null | undefined;
  showName?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export default function NationalityBadge({
  nationality,
  showName = false,
  size = "md",
  className,
}: NationalityBadgeProps) {
  const color = getNationalityInfo(nationality);
  const code = nationality?.toUpperCase() ?? "?";

  const sizeClasses = {
    sm: "text-xs px-1.5 py-0.5",
    md: "text-sm px-2 py-1",
    lg: "text-base px-3 py-1.5",
  };

  return (
    <Badge
      className={cn(
        color.bg,
        color.text,
        sizeClasses[size],
        "font-semibold",
        className
      )}
    >
      {showName ? color.name : code}
    </Badge>
  );
}
