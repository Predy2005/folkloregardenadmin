import type { ReactNode } from "react";
import { SearchInput } from "./SearchInput";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { SlidersHorizontal, X } from "lucide-react";
import { cn } from "@/shared/lib/utils";

interface FilterBarProps {
  search: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder?: string;
  /** Inline filter controls (selects, toggles) */
  children?: ReactNode;
  /** Result count display */
  resultCount?: number;
  totalCount?: number;
  /** Expandable advanced filters */
  advancedFilters?: ReactNode;
  advancedOpen?: boolean;
  onAdvancedToggle?: () => void;
  hasActiveFilters?: boolean;
  onClearFilters?: () => void;
  className?: string;
}

export function FilterBar({
  search,
  onSearchChange,
  searchPlaceholder,
  children,
  resultCount,
  totalCount,
  advancedFilters,
  advancedOpen,
  onAdvancedToggle,
  hasActiveFilters,
  onClearFilters,
  className,
}: FilterBarProps) {
  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex flex-wrap items-center gap-3">
        <SearchInput
          value={search}
          onChange={onSearchChange}
          placeholder={searchPlaceholder}
          className="flex-1 min-w-[200px]"
        />
        {children}
        {advancedFilters && onAdvancedToggle && (
          <Button
            variant={advancedOpen ? "secondary" : "outline"}
            size="sm"
            onClick={onAdvancedToggle}
          >
            <SlidersHorizontal className="h-4 w-4 mr-1" />
            Filtry
          </Button>
        )}
        {resultCount !== undefined && totalCount !== undefined && (
          <Badge variant="outline" className="text-xs">
            {resultCount}/{totalCount}
          </Badge>
        )}
        {hasActiveFilters && onClearFilters && (
          <Button variant="ghost" size="sm" onClick={onClearFilters}>
            <X className="h-3 w-3 mr-1" />
            Vyčistit
          </Button>
        )}
      </div>
      {advancedFilters && advancedOpen && (
        <div className="p-3 bg-muted/30 rounded-lg border space-y-3">
          {advancedFilters}
        </div>
      )}
    </div>
  );
}
