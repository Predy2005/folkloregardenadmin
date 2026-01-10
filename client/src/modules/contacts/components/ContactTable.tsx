import { useState, useMemo } from 'react';
import dayjs from 'dayjs';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/shared/components/ui/tooltip';
import { Search, Edit, Trash2, Plus, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Filter, X } from 'lucide-react';
import type { Contact } from '@shared/types';

type Props = {
  contacts: Contact[];
  searchTerm: string;
  onSearchChange: (value: string) => void;
  onEdit: (contact: Contact) => void;
  onDelete: (id: number) => void;
  onNewReservation: (contact: Contact) => void;
};

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100] as const;

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

export function ContactTable({
  contacts,
  searchTerm,
  onSearchChange,
  onEdit,
  onDelete,
  onNewReservation,
}: Props) {
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(20);

  // Filter states
  const [companyFilter, setCompanyFilter] = useState<string>('');
  const [invoiceFilter, setInvoiceFilter] = useState<string>('');
  const [clientComeFromFilter, setClientComeFromFilter] = useState<string>('');
  const [showFilters, setShowFilters] = useState(false);

  // Extract unique clientComeFrom values
  const clientSources = useMemo(() => {
    const uniqueSources = new Set<string>();
    (contacts || []).forEach((c) => {
      if (c.clientComeFrom) {
        uniqueSources.add(c.clientComeFrom);
      }
    });
    return Array.from(uniqueSources).sort();
  }, [contacts]);

  // Filter contacts
  const filtered = useMemo(() => {
    return (contacts || []).filter((contact) => {
      // Text search
      const search = (searchTerm || '').toLowerCase();
      const matchesSearch =
        (contact.name || '').toLowerCase().includes(search) ||
        (contact.email || '').toLowerCase().includes(search) ||
        (contact.phone || '').includes(search) ||
        (contact.company || '').toLowerCase().includes(search) ||
        (contact.invoiceIc || '').includes(search) ||
        (contact.invoiceDic || '').includes(search);

      if (!matchesSearch) return false;

      // Company filter
      if (companyFilter === 'with_company' && !contact.company) {
        return false;
      }
      if (companyFilter === 'without_company' && contact.company) {
        return false;
      }

      // Invoice filter (IČO)
      if (invoiceFilter === 'with_ic' && !contact.invoiceIc) {
        return false;
      }
      if (invoiceFilter === 'without_ic' && contact.invoiceIc) {
        return false;
      }

      // Client source filter
      if (clientComeFromFilter && contact.clientComeFrom !== clientComeFromFilter) {
        return false;
      }

      return true;
    });
  }, [contacts, searchTerm, companyFilter, invoiceFilter, clientComeFromFilter]);

  // Calculate pagination
  const totalItems = filtered.length;
  const totalPages = Math.ceil(totalItems / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalItems);
  const paginatedData = filtered.slice(startIndex, endIndex);

  // Check if any filter is active
  const hasActiveFilters = companyFilter || invoiceFilter || clientComeFromFilter;

  // Reset to page 1 when any filter changes
  const resetPage = () => setCurrentPage(1);

  const handleSearchChange = (value: string) => {
    onSearchChange(value);
    resetPage();
  };

  const handlePageSizeChange = (value: string) => {
    setPageSize(Number(value));
    resetPage();
  };

  const handleCompanyFilterChange = (value: string) => {
    setCompanyFilter(value === 'all' ? '' : value);
    resetPage();
  };

  const handleInvoiceFilterChange = (value: string) => {
    setInvoiceFilter(value === 'all' ? '' : value);
    resetPage();
  };

  const handleClientComeFromChange = (value: string) => {
    setClientComeFromFilter(value === 'all' ? '' : value);
    resetPage();
  };

  const clearAllFilters = () => {
    setCompanyFilter('');
    setInvoiceFilter('');
    setClientComeFromFilter('');
    onSearchChange('');
    resetPage();
  };

  // Navigation handlers
  const goToFirstPage = () => setCurrentPage(1);
  const goToPreviousPage = () => setCurrentPage((prev) => Math.max(1, prev - 1));
  const goToNextPage = () => setCurrentPage((prev) => Math.min(totalPages, prev + 1));
  const goToLastPage = () => setCurrentPage(totalPages);

  return (
    <TooltipProvider>
    <div className="space-y-4">
      {/* Header with search, filters toggle and page size */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Hledat kontakty..."
                value={searchTerm}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button
              variant={showFilters ? "secondary" : "outline"}
              size="icon"
              onClick={() => setShowFilters(!showFilters)}
              className="shrink-0"
            >
              <Filter className="w-4 h-4" />
            </Button>
            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearAllFilters}
                className="shrink-0 text-muted-foreground"
              >
                <X className="w-4 h-4 mr-1" />
                Zrušit filtry
              </Button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground whitespace-nowrap">Zobrazit:</span>
            <Select value={String(pageSize)} onValueChange={handlePageSizeChange}>
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
              <Select value={companyFilter || 'all'} onValueChange={handleCompanyFilterChange}>
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
              <Select value={invoiceFilter || 'all'} onValueChange={handleInvoiceFilterChange}>
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
              <Select value={clientComeFromFilter || 'all'} onValueChange={handleClientComeFromChange}>
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
                <button onClick={() => { setCompanyFilter(''); resetPage(); }} className="hover:text-primary/70">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {invoiceFilter && (
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-primary/10 text-primary rounded-full text-xs">
                IČO: {INVOICE_FILTER_OPTIONS.find(s => s.value === invoiceFilter)?.label}
                <button onClick={() => { setInvoiceFilter(''); resetPage(); }} className="hover:text-primary/70">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {clientComeFromFilter && (
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-primary/10 text-primary rounded-full text-xs">
                Zdroj: {clientComeFromFilter}
                <button onClick={() => { setClientComeFromFilter(''); resetPage(); }} className="hover:text-primary/70">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
          </div>
        )}
      </div>

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Kontakt</TableHead>
              <TableHead>Telefon</TableHead>
              <TableHead>Firma</TableHead>
              <TableHead>IČO / DIČ</TableHead>
              <TableHead>Zdroj</TableHead>
              <TableHead className="text-right">Akce</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedData.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  Žádné kontakty
                </TableCell>
              </TableRow>
            ) : (
              paginatedData.map((contact) => (
                <TableRow key={contact.id}>
                  <TableCell>
                    <div className="flex flex-col gap-0.5">
                      <span className="font-medium">{contact.name}</span>
                      <span className="text-sm text-muted-foreground">{contact.email || '-'}</span>
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-sm">{contact.phone || '-'}</TableCell>
                  <TableCell className="text-sm">{contact.company || '-'}</TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-0.5 text-sm">
                      <span>{contact.invoiceIc || '-'}</span>
                      {contact.invoiceDic && (
                        <span className="text-muted-foreground">{contact.invoiceDic}</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {contact.clientComeFrom || '-'}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => onEdit(contact)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Detail / Upravit</TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => onNewReservation(contact)}
                          >
                            <Plus className="w-4 h-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Nová rezervace</TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => onDelete(contact.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Smazat</TooltipContent>
                      </Tooltip>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination footer */}
      {totalItems > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-2">
          <div className="text-sm text-muted-foreground">
            Zobrazeno {startIndex + 1}–{endIndex} z {totalItems} kontaktů
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={goToFirstPage}
              disabled={currentPage === 1}
            >
              <ChevronsLeft className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={goToPreviousPage}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <div className="flex items-center gap-1 px-2">
              <span className="text-sm">
                Strana <strong>{currentPage}</strong> z <strong>{totalPages || 1}</strong>
              </span>
            </div>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={goToNextPage}
              disabled={currentPage >= totalPages}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={goToLastPage}
              disabled={currentPage >= totalPages}
            >
              <ChevronsRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
    </TooltipProvider>
  );
}
