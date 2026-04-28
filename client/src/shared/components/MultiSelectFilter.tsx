import { useMemo, useState } from "react";
import { Check, ChevronDown, X } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Badge } from "@/shared/components/ui/badge";
import { Input } from "@/shared/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/shared/components/ui/popover";
import { cn } from "@/shared/lib/utils";

export interface MultiSelectFilterOption {
  value: string;
  label: string;
}

export interface MultiSelectFilterProps {
  /** Krátký popisek (např. "Pozice"). Zobrazuje se v tlačítku, když nic není vybráno. */
  label: string;
  options: MultiSelectFilterOption[];
  /** Vybrané hodnoty. Prázdná množina = "vše". */
  selected: Set<string>;
  onChange: (next: Set<string>) => void;
  /** Pokud true, ukáže search input nad seznamem. Default: ukáže se při >6 položkách. */
  searchable?: boolean;
  className?: string;
  /** Maximální počet badgí v triggeru, než se zkrátí na "X vybráno". Default 2. */
  maxBadgeCount?: number;
}

export function MultiSelectFilter({
  label,
  options,
  selected,
  onChange,
  searchable,
  className,
  maxBadgeCount = 2,
}: MultiSelectFilterProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const showSearch = searchable ?? options.length > 6;

  const toggle = (value: string) => {
    const next = new Set(selected);
    if (next.has(value)) next.delete(value);
    else next.add(value);
    onChange(next);
  };

  const clearAll = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(new Set());
  };

  const filteredOptions = useMemo(() => {
    if (!search) return options;
    const q = search.toLowerCase();
    return options.filter((o) => o.label.toLowerCase().includes(q) || o.value.toLowerCase().includes(q));
  }, [options, search]);

  const selectedLabels = options.filter((o) => selected.has(o.value));

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "h-9 justify-between gap-2 font-normal",
            selected.size === 0 && "text-muted-foreground",
            className,
          )}
        >
          <div className="flex items-center gap-1.5 flex-wrap min-w-0">
            <span className="font-medium text-foreground">{label}</span>
            {selected.size === 0 ? (
              <span>: vše</span>
            ) : selectedLabels.length <= maxBadgeCount ? (
              selectedLabels.map((o) => (
                <Badge key={o.value} variant="secondary" className="h-5 px-1.5 text-xs">
                  {o.label}
                </Badge>
              ))
            ) : (
              <Badge variant="secondary" className="h-5 px-1.5 text-xs">
                {selected.size} vybráno
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {selected.size > 0 && (
              <span
                role="button"
                tabIndex={0}
                onClick={clearAll}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.stopPropagation();
                    onChange(new Set());
                  }
                }}
                className="p-0.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground"
                aria-label="Zrušit výběr"
              >
                <X className="h-3.5 w-3.5" />
              </span>
            )}
            <ChevronDown className="h-4 w-4 opacity-50" />
          </div>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-0" align="start">
        {showSearch && (
          <div className="p-2 border-b">
            <Input
              placeholder="Hledat..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-8"
              autoFocus
            />
          </div>
        )}
        <div className="max-h-64 overflow-y-auto py-1">
          {filteredOptions.length === 0 ? (
            <div className="px-3 py-4 text-sm text-muted-foreground text-center">
              Nic nenalezeno
            </div>
          ) : (
            filteredOptions.map((opt) => {
              const isSelected = selected.has(opt.value);
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => toggle(opt.value)}
                  className={cn(
                    "w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted text-left",
                    isSelected && "bg-muted/50",
                  )}
                >
                  <div
                    className={cn(
                      "w-4 h-4 rounded border flex items-center justify-center shrink-0",
                      isSelected
                        ? "bg-primary border-primary text-primary-foreground"
                        : "border-input",
                    )}
                  >
                    {isSelected && <Check className="h-3 w-3" />}
                  </div>
                  <span className="flex-1">{opt.label}</span>
                </button>
              );
            })
          )}
        </div>
        {selected.size > 0 && (
          <div className="border-t p-2">
            <Button
              variant="ghost"
              size="sm"
              className="w-full h-7 text-xs"
              onClick={() => onChange(new Set())}
            >
              <X className="h-3 w-3 mr-1" />
              Zrušit výběr
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
