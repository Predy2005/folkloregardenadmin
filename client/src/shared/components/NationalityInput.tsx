import { useState, useRef, useEffect, useMemo } from "react";
import { Input } from "@/shared/components/ui/input";
import { cn } from "@/shared/lib/utils";

interface NationalityOption {
  code: string;
  name: string;
  flag: string;
}

const NATIONALITIES: NationalityOption[] = [
  { code: "CZ", name: "Česká republika", flag: "🇨🇿" },
  { code: "SK", name: "Slovensko", flag: "🇸🇰" },
  { code: "DE", name: "Německo", flag: "🇩🇪" },
  { code: "AT", name: "Rakousko", flag: "🇦🇹" },
  { code: "PL", name: "Polsko", flag: "🇵🇱" },
  { code: "US", name: "USA", flag: "🇺🇸" },
  { code: "GB", name: "Velká Británie", flag: "🇬🇧" },
  { code: "FR", name: "Francie", flag: "🇫🇷" },
  { code: "ES", name: "Španělsko", flag: "🇪🇸" },
  { code: "IT", name: "Itálie", flag: "🇮🇹" },
  { code: "NL", name: "Nizozemsko", flag: "🇳🇱" },
  { code: "BE", name: "Belgie", flag: "🇧🇪" },
  { code: "CH", name: "Švýcarsko", flag: "🇨🇭" },
  { code: "RU", name: "Rusko", flag: "🇷🇺" },
  { code: "UA", name: "Ukrajina", flag: "🇺🇦" },
  { code: "CN", name: "Čína", flag: "🇨🇳" },
  { code: "JP", name: "Japonsko", flag: "🇯🇵" },
  { code: "KR", name: "Jižní Korea", flag: "🇰🇷" },
  { code: "IN", name: "Indie", flag: "🇮🇳" },
  { code: "AU", name: "Austrálie", flag: "🇦🇺" },
  { code: "CA", name: "Kanada", flag: "🇨🇦" },
  { code: "BR", name: "Brazílie", flag: "🇧🇷" },
  { code: "MX", name: "Mexiko", flag: "🇲🇽" },
  { code: "SE", name: "Švédsko", flag: "🇸🇪" },
  { code: "NO", name: "Norsko", flag: "🇳🇴" },
  { code: "DK", name: "Dánsko", flag: "🇩🇰" },
  { code: "FI", name: "Finsko", flag: "🇫🇮" },
  { code: "PT", name: "Portugalsko", flag: "🇵🇹" },
  { code: "GR", name: "Řecko", flag: "🇬🇷" },
  { code: "HU", name: "Maďarsko", flag: "🇭🇺" },
  { code: "RO", name: "Rumunsko", flag: "🇷🇴" },
  { code: "BG", name: "Bulharsko", flag: "🇧🇬" },
  { code: "HR", name: "Chorvatsko", flag: "🇭🇷" },
  { code: "SI", name: "Slovinsko", flag: "🇸🇮" },
  { code: "RS", name: "Srbsko", flag: "🇷🇸" },
  { code: "IE", name: "Irsko", flag: "🇮🇪" },
  { code: "IL", name: "Izrael", flag: "🇮🇱" },
  { code: "TR", name: "Turecko", flag: "🇹🇷" },
  { code: "ZA", name: "Jižní Afrika", flag: "🇿🇦" },
  { code: "AR", name: "Argentina", flag: "🇦🇷" },
  { code: "CL", name: "Chile", flag: "🇨🇱" },
  { code: "NZ", name: "Nový Zéland", flag: "🇳🇿" },
  { code: "SG", name: "Singapur", flag: "🇸🇬" },
  { code: "TH", name: "Thajsko", flag: "🇹🇭" },
  { code: "MY", name: "Malajsie", flag: "🇲🇾" },
  { code: "ID", name: "Indonésie", flag: "🇮🇩" },
  { code: "PH", name: "Filipíny", flag: "🇵🇭" },
  { code: "VN", name: "Vietnam", flag: "🇻🇳" },
  { code: "EG", name: "Egypt", flag: "🇪🇬" },
  { code: "AE", name: "SAE", flag: "🇦🇪" },
  { code: "SA", name: "Saúdská Arábie", flag: "🇸🇦" },
  { code: "TW", name: "Tchaj-wan", flag: "🇹🇼" },
  { code: "CO", name: "Kolumbie", flag: "🇨🇴" },
  { code: "PE", name: "Peru", flag: "🇵🇪" },
];

const FLAG_MAP = new Map(NATIONALITIES.map((n) => [n.code, n.flag]));

export function getFlagForCode(code: string): string {
  return FLAG_MAP.get(code.toUpperCase()) || "";
}

interface NationalityInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export function NationalityInput({
  value,
  onChange,
  placeholder = "Národnost",
  className,
  disabled,
}: NationalityInputProps) {
  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync display value from prop
  useEffect(() => {
    const match = NATIONALITIES.find((n) => n.code === value?.toUpperCase());
    setInputValue(match ? `${match.flag} ${match.code}` : value || "");
  }, [value]);

  const filtered = useMemo(() => {
    if (!inputValue.trim()) return NATIONALITIES.slice(0, 15);
    const q = inputValue.toLowerCase().replace(/[^\w\s]/g, "").trim();
    if (!q) return NATIONALITIES.slice(0, 15);
    return NATIONALITIES.filter(
      (n) =>
        n.code.toLowerCase().includes(q) ||
        n.name.toLowerCase().includes(q)
    ).slice(0, 12);
  }, [inputValue]);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const selectOption = (opt: NationalityOption) => {
    onChange(opt.code);
    setInputValue(`${opt.flag} ${opt.code}`);
    setOpen(false);
  };

  const handleInputChange = (val: string) => {
    setInputValue(val);
    setOpen(true);
    // If user typed an exact code, accept it
    const upper = val.replace(/[^\w]/g, "").toUpperCase();
    const exact = NATIONALITIES.find((n) => n.code === upper);
    if (exact && upper.length >= 2) {
      onChange(exact.code);
    } else {
      onChange(val);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      setOpen(false);
    }
    if (e.key === "Enter" && filtered.length > 0 && open) {
      e.preventDefault();
      selectOption(filtered[0]);
    }
  };

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <Input
        ref={inputRef}
        value={inputValue}
        onChange={(e) => handleInputChange(e.target.value)}
        onFocus={() => setOpen(true)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        autoComplete="off"
      />
      {open && filtered.length > 0 && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-popover border rounded-md shadow-lg max-h-48 overflow-y-auto">
          {filtered.map((opt) => (
            <button
              key={opt.code}
              type="button"
              className={cn(
                "w-full flex items-center gap-2 px-3 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground text-left",
                opt.code === value?.toUpperCase() && "bg-accent"
              )}
              onMouseDown={(e) => {
                e.preventDefault();
                selectOption(opt);
              }}
            >
              <span className="text-base">{opt.flag}</span>
              <span className="font-medium">{opt.code}</span>
              <span className="text-muted-foreground">{opt.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
