import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { SearchInput } from "@/shared/components";
import { Filter, X } from "lucide-react";
import { PAGE_SIZE_OPTIONS } from "@/shared/lib/constants";

const STATUS_OPTIONS = [
  { value: "all", label: "Všechny statusy" },
  { value: "DRAFT", label: "Koncept" },
  { value: "SENT", label: "Odesláno" },
  { value: "PAID", label: "Zaplaceno" },
  { value: "CANCELLED", label: "Stornováno" },
] as const;

const TYPE_OPTIONS = [
  { value: "all", label: "Všechny typy" },
  { value: "DEPOSIT", label: "Zálohové faktury" },
  { value: "FINAL", label: "Ostré faktury" },
  { value: "PARTIAL", label: "Částečné faktury" },
  { value: "CREDIT_NOTE", label: "Dobropisy" },
] as const;

export { STATUS_OPTIONS };

interface InvoiceFiltersProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  showFilters: boolean;
  onToggleFilters: () => void;
  hasActiveFilters: boolean;
  onClearFilters: () => void;
  statusFilter: string;
  onStatusFilterChange: (value: string) => void;
  typeFilter: string;
  onTypeFilterChange: (value: string) => void;
  dateFrom: string;
  onDateFromChange: (value: string) => void;
  dateTo: string;
  onDateToChange: (value: string) => void;
  amountMin: string;
  onAmountMinChange: (value: string) => void;
  amountMax: string;
  onAmountMaxChange: (value: string) => void;
  pageSize: number;
  onPageSizeChange: (value: number) => void;
}

export function InvoiceFilters({
  searchTerm,
  onSearchChange,
  showFilters,
  onToggleFilters,
  hasActiveFilters,
  onClearFilters,
  statusFilter,
  onStatusFilterChange,
  typeFilter,
  onTypeFilterChange,
  dateFrom,
  onDateFromChange,
  dateTo,
  onDateToChange,
  amountMin,
  onAmountMinChange,
  amountMax,
  onAmountMaxChange,
  pageSize,
  onPageSizeChange,
}: InvoiceFiltersProps) {
  return (
    <div className="flex flex-col gap-4 mb-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <SearchInput
            value={searchTerm}
            onChange={onSearchChange}
            placeholder="Hledat (číslo, jméno, firma, IČO, VS)..."
            className="flex-1 sm:w-80"
          />
          <Button
            variant={showFilters ? "secondary" : "outline"}
            size="icon"
            onClick={onToggleFilters}
          >
            <Filter className="w-4 h-4" />
          </Button>
          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={onClearFilters}>
              <X className="w-4 h-4 mr-1" />
              Zrušit filtry
            </Button>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Zobrazit:</span>
          <Select
            value={String(pageSize)}
            onValueChange={(v) => onPageSizeChange(Number(v))}
          >
            <SelectTrigger className="w-[80px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PAGE_SIZE_OPTIONS.map((size) => (
                <SelectItem key={size} value={String(size)}>
                  {size}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {showFilters && (
        <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-6 gap-4 p-4 bg-muted/50 rounded-lg border">
          <div className="space-y-2">
            <Label>Status</Label>
            <Select
              value={statusFilter}
              onValueChange={onStatusFilterChange}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Typ faktury</Label>
            <Select
              value={typeFilter}
              onValueChange={onTypeFilterChange}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TYPE_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Datum od</Label>
            <Input
              type="date"
              value={dateFrom}
              onChange={(e) => onDateFromChange(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Datum do</Label>
            <Input
              type="date"
              value={dateTo}
              onChange={(e) => onDateToChange(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Částka od</Label>
            <Input
              type="number"
              placeholder="Min"
              value={amountMin}
              onChange={(e) => onAmountMinChange(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Částka do</Label>
            <Input
              type="number"
              placeholder="Max"
              value={amountMax}
              onChange={(e) => onAmountMaxChange(e.target.value)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
