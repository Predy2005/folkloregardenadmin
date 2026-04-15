import { useState, useMemo, useRef, useEffect } from "react";
import { Input } from "@/shared/components/ui/input";
import { cn } from "@/shared/lib/utils";

export interface Suggestion {
  value: string;
  label: string;
  description?: string;
}

interface AutocompleteInputProps {
  value: string;
  onChange: (val: string) => void;
  suggestions: Suggestion[];
  placeholder?: string;
  onSelect?: (suggestion: Suggestion) => void;
  "data-testid"?: string;
}

export function AutocompleteInput({
  value,
  onChange,
  suggestions,
  placeholder,
  onSelect,
  "data-testid": testId,
}: AutocompleteInputProps) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const filtered = useMemo(() => {
    if (!value) return suggestions.slice(0, 15);
    const lower = value.toLowerCase();
    return suggestions.filter((s) => s.value.toLowerCase().includes(lower)).slice(0, 15);
  }, [value, suggestions]);

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div ref={wrapperRef} className="relative">
      <Input
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        placeholder={placeholder}
        autoComplete="off"
        data-testid={testId}
      />
      {open && filtered.length > 0 && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 rounded-md border bg-popover shadow-md max-h-60 overflow-y-auto">
          {filtered.map((s) => (
            <button
              key={s.value}
              type="button"
              className={cn(
                "w-full text-left px-3 py-2 text-sm hover:bg-accent cursor-pointer",
                value === s.value && "bg-accent"
              )}
              onMouseDown={(e) => {
                e.preventDefault(); // prevent blur before click
                onChange(s.value);
                onSelect?.(s);
                setOpen(false);
              }}
            >
              <div className="font-medium">{s.label}</div>
              {s.description && (
                <div className="text-xs text-muted-foreground">{s.description}</div>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
