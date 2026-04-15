import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select";
import { Filter, X } from "lucide-react";
import { SearchInput } from "@/shared/components";
import { PAGE_SIZE_OPTIONS } from "@/shared/lib/constants";
import dayjs from "dayjs";

const STATUS_OPTIONS = [
  { value: 'all', label: 'Všechny' },
  { value: 'PAID', label: 'Zaplaceno' },
  { value: 'PENDING', label: 'Čeká' },
  { value: 'CANCELLED', label: 'Zrušeno' },
  { value: 'AUTHORIZED', label: 'Autorizováno' },
  { value: 'CREATED', label: 'Vytvořeno' },
] as const;

export { STATUS_OPTIONS };

interface PaymentFiltersProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  statusFilter: string;
  onStatusChange: (value: string) => void;
  dateFrom: string;
  onDateFromChange: (value: string) => void;
  dateTo: string;
  onDateToChange: (value: string) => void;
  showFilters: boolean;
  onToggleFilters: () => void;
  hasActiveFilters: boolean;
  onClearAllFilters: () => void;
  pageSize: number;
  onPageSizeChange: (value: string) => void;
  onResetPage: () => void;
}

export function PaymentFilters({
  searchTerm,
  onSearchChange,
  statusFilter,
  onStatusChange,
  dateFrom,
  onDateFromChange,
  dateTo,
  onDateToChange,
  showFilters,
  onToggleFilters,
  hasActiveFilters,
  onClearAllFilters,
  pageSize,
  onPageSizeChange,
  onResetPage,
}: PaymentFiltersProps) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <SearchInput
            value={searchTerm}
            onChange={onSearchChange}
            placeholder="Hledat platby..."
            className="flex-1 sm:w-80"
          />
          <Button
            variant={showFilters ? "secondary" : "outline"}
            size="icon"
            onClick={onToggleFilters}
            className="shrink-0"
          >
            <Filter className="w-4 h-4" />
          </Button>
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onClearAllFilters}
              className="shrink-0 text-muted-foreground"
            >
              <X className="w-4 h-4 mr-1" />
              Zrušit filtry
            </Button>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground whitespace-nowrap">Zobrazit:</span>
          <Select value={String(pageSize)} onValueChange={onPageSizeChange}>
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
          <span className="text-sm text-muted-foreground whitespace-nowrap">položek</span>
        </div>
      </div>

      {/* Filters panel */}
      {showFilters && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 bg-muted/50 rounded-lg border">
          <div className="space-y-2">
            <Label className="text-sm font-medium">Status</Label>
            <Select value={statusFilter} onValueChange={onStatusChange}>
              <SelectTrigger>
                <SelectValue placeholder="Všechny" />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((status) => (
                  <SelectItem key={status.value} value={status.value}>
                    {status.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium">Datum od</Label>
            <Input
              type="date"
              value={dateFrom}
              onChange={(e) => onDateFromChange(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium">Datum do</Label>
            <Input
              type="date"
              value={dateTo}
              onChange={(e) => onDateToChange(e.target.value)}
            />
          </div>
        </div>
      )}

      {/* Active filters summary */}
      {hasActiveFilters && (
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="text-muted-foreground">Aktivní filtry:</span>
          {statusFilter !== 'all' && (
            <span className="inline-flex items-center gap-1 px-2 py-1 bg-primary/10 text-primary rounded-full text-xs">
              Status: {STATUS_OPTIONS.find(s => s.value === statusFilter)?.label}
              <button onClick={() => { onStatusChange('all'); onResetPage(); }} className="hover:text-primary/70">
                <X className="w-3 h-3" />
              </button>
            </span>
          )}
          {dateFrom && (
            <span className="inline-flex items-center gap-1 px-2 py-1 bg-primary/10 text-primary rounded-full text-xs">
              Od: {dayjs(dateFrom).format('DD.MM.YYYY')}
              <button onClick={() => { onDateFromChange(''); onResetPage(); }} className="hover:text-primary/70">
                <X className="w-3 h-3" />
              </button>
            </span>
          )}
          {dateTo && (
            <span className="inline-flex items-center gap-1 px-2 py-1 bg-primary/10 text-primary rounded-full text-xs">
              Do: {dayjs(dateTo).format('DD.MM.YYYY')}
              <button onClick={() => { onDateToChange(''); onResetPage(); }} className="hover:text-primary/70">
                <X className="w-3 h-3" />
              </button>
            </span>
          )}
        </div>
      )}
    </div>
  );
}
