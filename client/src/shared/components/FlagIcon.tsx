import { Globe } from "lucide-react";
import * as Flags from "country-flag-icons/react/3x2";

interface FlagIconProps {
  code: string;
  className?: string;
}

/**
 * Display a country flag icon by ISO 3166-1 alpha-2 code
 * Falls back to Globe icon if code not found
 */
export function FlagIcon({ code, className }: FlagIconProps) {
  const FlagComponent = (Flags as Record<string, React.ComponentType<{ className?: string }>>)[code];

  if (!FlagComponent) {
    return <Globe className={className} />;
  }

  return <FlagComponent className={className} />;
}
