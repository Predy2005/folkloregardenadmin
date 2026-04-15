import dayjs from 'dayjs';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select';
import { Search, Filter, X } from 'lucide-react';
import { PAGE_SIZE_OPTIONS } from '@/shared/lib/constants';
import type { FilterState, ReservationFiltersProps } from '@modules/reservations/types/components/table/ReservationFilters';
export type { FilterState, ReservationFiltersProps };

const STATUS_OPTIONS = [
  { value: 'RECEIVED', label: 'Přijato' },
  { value: 'WAITING_PAYMENT', label: 'Čeká na platbu' },
  { value: 'PAID', label: 'Zaplaceno' },
  { value: 'AUTHORIZED', label: 'Autorizováno' },
  { value: 'CONFIRMED', label: 'Potvrzeno' },
  { value: 'CANCELLED', label: 'Zrušeno' },
] as const;

export function ReservationFilters({
  searchTerm,
  onSearchChange,
  filters,
  onFilterChange,
  onClearAll,
  nationalities,
  showFilters,
  onToggleFilters,
  pageSize,
  onPageSizeChange,
}: ReservationFiltersProps) {
  const { statusFilter, nationalityFilter, dateFrom, dateTo } = filters;
  const hasActiveFilters = statusFilter || nationalityFilter || dateFrom || dateTo;

  return (
    <div className="flex flex-col gap-4">
      {/* Header with search, filters toggle and page size */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Hledat rezervace..."
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-10"
              data-testid="input-search-reservations"
            />
          </div>
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
              onClick={onClearAll}
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 p-4 bg-muted/50 rounded-lg border">
          <div className="space-y-2">
            <Label className="text-sm font-medium">Status</Label>
            <Select
              value={statusFilter || 'all'}
              onValueChange={(value) => onFilterChange({ statusFilter: value === 'all' ? '' : value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Všechny statusy" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Všechny statusy</SelectItem>
                {STATUS_OPTIONS.map((status) => (
                  <SelectItem key={status.value} value={status.value}>
                    {status.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium">Země původu</Label>
            <Select
              value={nationalityFilter || 'all'}
              onValueChange={(value) => onFilterChange({ nationalityFilter: value === 'all' ? '' : value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Všechny země" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Všechny země</SelectItem>
                {nationalities.map((nationality) => (
                  <SelectItem key={nationality} value={nationality}>
                    {nationality}
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
              onChange={(e) => onFilterChange({ dateFrom: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium">Datum do</Label>
            <Input
              type="date"
              value={dateTo}
              onChange={(e) => onFilterChange({ dateTo: e.target.value })}
            />
          </div>
        </div>
      )}

      {/* Active filters summary */}
      {hasActiveFilters && (
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="text-muted-foreground">Aktivní filtry:</span>
          {statusFilter && (
            <span className="inline-flex items-center gap-1 px-2 py-1 bg-primary/10 text-primary rounded-full text-xs">
              Status: {STATUS_OPTIONS.find(s => s.value === statusFilter)?.label}
              <button onClick={() => onFilterChange({ statusFilter: '' })} className="hover:text-primary/70">
                <X className="w-3 h-3" />
              </button>
            </span>
          )}
          {nationalityFilter && (
            <span className="inline-flex items-center gap-1 px-2 py-1 bg-primary/10 text-primary rounded-full text-xs">
              Země: {nationalityFilter}
              <button onClick={() => onFilterChange({ nationalityFilter: '' })} className="hover:text-primary/70">
                <X className="w-3 h-3" />
              </button>
            </span>
          )}
          {dateFrom && (
            <span className="inline-flex items-center gap-1 px-2 py-1 bg-primary/10 text-primary rounded-full text-xs">
              Od: {dayjs(dateFrom).format('DD.MM.YYYY')}
              <button onClick={() => onFilterChange({ dateFrom: '' })} className="hover:text-primary/70">
                <X className="w-3 h-3" />
              </button>
            </span>
          )}
          {dateTo && (
            <span className="inline-flex items-center gap-1 px-2 py-1 bg-primary/10 text-primary rounded-full text-xs">
              Do: {dayjs(dateTo).format('DD.MM.YYYY')}
              <button onClick={() => onFilterChange({ dateTo: '' })} className="hover:text-primary/70">
                <X className="w-3 h-3" />
              </button>
            </span>
          )}
        </div>
      )}
    </div>
  );
}
