import { Badge } from "@/shared/components/ui/badge";
import { cn } from "@/shared/lib/utils";

// Barevné kódování nacionalit
export const NATIONALITY_COLORS: Record<string, { bg: string; text: string; name: string }> = {
  CZ: { bg: "bg-blue-500", text: "text-white", name: "Česko" },
  SK: { bg: "bg-blue-400", text: "text-white", name: "Slovensko" },
  DE: { bg: "bg-gray-800", text: "text-yellow-400", name: "Německo" },
  AT: { bg: "bg-red-600", text: "text-white", name: "Rakousko" },
  US: { bg: "bg-red-700", text: "text-white", name: "USA" },
  GB: { bg: "bg-indigo-700", text: "text-white", name: "Británie" },
  ES: { bg: "bg-orange-500", text: "text-white", name: "Španělsko" },
  FR: { bg: "bg-blue-600", text: "text-white", name: "Francie" },
  IT: { bg: "bg-green-600", text: "text-white", name: "Itálie" },
  PL: { bg: "bg-red-500", text: "text-white", name: "Polsko" },
  NL: { bg: "bg-orange-600", text: "text-white", name: "Nizozemsko" },
  RU: { bg: "bg-blue-800", text: "text-white", name: "Rusko" },
  UA: { bg: "bg-yellow-500", text: "text-blue-800", name: "Ukrajina" },
  CN: { bg: "bg-red-600", text: "text-yellow-300", name: "Čína" },
  JP: { bg: "bg-white", text: "text-red-600", name: "Japonsko" },
  KR: { bg: "bg-white", text: "text-blue-800", name: "Korea" },
  default: { bg: "bg-gray-400", text: "text-white", name: "Jiná" },
};

export function getNationalityColor(nationality: string | null | undefined) {
  const code = nationality?.toUpperCase() ?? "default";
  return NATIONALITY_COLORS[code] || NATIONALITY_COLORS.default;
}

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
  const color = getNationalityColor(nationality);
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
