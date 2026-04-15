import { Button } from '@/shared/components/ui/button';
import { Label } from '@/shared/components/ui/label';
import { Badge } from '@/shared/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select';
import { SearchInput } from "@/shared/components";
import { Filter, X } from 'lucide-react';
import { PAGE_SIZE_OPTIONS } from '@/shared/lib/constants';

const COMPANY_FILTER_OPTIONS = [
  { value: '', label: 'Všechny kontakty' },
  { value: 'with_company', label: 'S firmou' },
  { value: 'without_company', label: 'Bez firmy' },
] as const;

const INVOICE_FILTER_OPTIONS = [
  { value: '', label: 'Všechny' },
  { value: 'with_ic', label: 'S IČO' },
  { value: 'without_ic', label: 'Bez IČO' },
] as const;

interface ContactFiltersProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  showFilters: boolean;
  onToggleFilters: () => void;
  companyFilter: string;
  onCompanyFilterChange: (value: string) => void;
  invoiceFilter: string;
  onInvoiceFilterChange: (value: string) => void;
  clientComeFromFilter: string;
  onClientComeFromChange: (value: string) => void;
  clientSources: string[];
  hasActiveFilters: boolean;
  onClearAllFilters: () => void;
  pageSize: number;
  onPageSizeChange: (value: string) => void;
  selectedCount: number;
  onBulkSource: () => void;
  onBulkDelete: () => void;
  onClearSelection: () => void;
}

export function ContactFilters({
  searchTerm,
  onSearchChange,
  showFilters,
  onToggleFilters,
  companyFilter,
  onCompanyFilterChange,
  invoiceFilter,
  onInvoiceFilterChange,
  clientComeFromFilter,
  onClientComeFromChange,
  clientSources,
  hasActiveFilters,
  onClearAllFilters,
  pageSize,
  onPageSizeChange,
  selectedCount,
  onBulkSource,
  onBulkDelete,
  onClearSelection,
}: ContactFiltersProps) {
  return (
    <>
      {/* Header with search, filters toggle and page size */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <SearchInput
              value={searchTerm}
              onChange={onSearchChange}
              placeholder="Hledat kontakty..."
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 p-4 bg-muted/50 rounded-lg border">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Firma</Label>
              <Select value={companyFilter || 'all'} onValueChange={onCompanyFilterChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Všechny kontakty" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Všechny kontakty</SelectItem>
                  {COMPANY_FILTER_OPTIONS.filter(s => s.value).map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">Fakturační údaje</Label>
              <Select value={invoiceFilter || 'all'} onValueChange={onInvoiceFilterChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Všechny" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Všechny</SelectItem>
                  {INVOICE_FILTER_OPTIONS.filter(s => s.value).map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">Zdroj</Label>
              <Select value={clientComeFromFilter || 'all'} onValueChange={onClientComeFromChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Všechny zdroje" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Všechny zdroje</SelectItem>
                  {clientSources.map((source) => (
                    <SelectItem key={source} value={source}>
                      {source}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        {/* Active filters summary */}
        {hasActiveFilters && (
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="text-muted-foreground">Aktivní filtry:</span>
            {companyFilter && (
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-primary/10 text-primary rounded-full text-xs">
                Firma: {COMPANY_FILTER_OPTIONS.find(s => s.value === companyFilter)?.label}
                <button onClick={() => onCompanyFilterChange('all')} className="hover:text-primary/70">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {invoiceFilter && (
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-primary/10 text-primary rounded-full text-xs">
                IČO: {INVOICE_FILTER_OPTIONS.find(s => s.value === invoiceFilter)?.label}
                <button onClick={() => onInvoiceFilterChange('all')} className="hover:text-primary/70">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {clientComeFromFilter && (
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-primary/10 text-primary rounded-full text-xs">
                Zdroj: {clientComeFromFilter}
                <button onClick={() => onClientComeFromChange('all')} className="hover:text-primary/70">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
          </div>
        )}
      </div>

      {/* Bulk action bar */}
      {selectedCount > 0 && (
        <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg border">
          <Badge variant="secondary">{selectedCount} vybráno</Badge>
          <Button
            variant="outline"
            size="sm"
            onClick={onBulkSource}
          >
            Změnit zdroj
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={onBulkDelete}
          >
            Smazat
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClearSelection}
          >
            Zrušit výběr
          </Button>
        </div>
      )}
    </>
  );
}
