import { useState, useMemo } from 'react';
import { useMutation } from '@tanstack/react-query';
import { api } from '@/shared/lib/api';
import { invalidateContactQueries } from '@/shared/lib/query-helpers';
import { successToast, errorToast } from '@/shared/lib/toast-helpers';
import { Button } from '@/shared/components/ui/button';
import { Badge } from '@/shared/components/ui/badge';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { Checkbox } from '@/shared/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/shared/components/ui/tooltip';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/dialog';
import { Search, Edit, Trash2, Plus, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Filter, X } from 'lucide-react';
import type { Contact } from '@shared/types';
import { usePagination } from '@/shared/hooks/usePagination';
import { PAGE_SIZE_OPTIONS } from '@/shared/lib/constants';

type Props = {
  contacts: Contact[];
  searchTerm: string;
  onSearchChange: (value: string) => void;
  onEdit: (contact: Contact) => void;
  onDelete: (id: number) => void;
  onNewReservation: (contact: Contact) => void;
};

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
  // Filter states
  const [companyFilter, setCompanyFilter] = useState<string>('');
  const [invoiceFilter, setInvoiceFilter] = useState<string>('');
  const [clientComeFromFilter, setClientComeFromFilter] = useState<string>('');
  const [showFilters, setShowFilters] = useState(false);

  // Bulk action states
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [bulkActionOpen, setBulkActionOpen] = useState(false);
  const [bulkActionType, setBulkActionType] = useState<'delete' | 'source' | null>(null);
  const [bulkValue, setBulkValue] = useState('');

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

  // Pagination
  const { page, pageSize, setPage, setPageSize, paginatedData, totalPages, totalItems } = usePagination(filtered);

  // Check if any filter is active
  const hasActiveFilters = companyFilter || invoiceFilter || clientComeFromFilter;

  // Selection functions
  const toggleSelect = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleSelectAll = () => {
    const pageIds = paginatedData.map((c) => c.id);
    const allSelected = pageIds.every((id) => selectedIds.has(id));
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allSelected) {
        pageIds.forEach((id) => next.delete(id));
      } else {
        pageIds.forEach((id) => next.add(id));
      }
      return next;
    });
  };

  const clearSelection = () => {
    setSelectedIds(new Set());
  };

  const openBulkAction = (type: 'delete' | 'source') => {
    setBulkActionType(type);
    setBulkValue('');
    setBulkActionOpen(true);
  };

  const closeBulkAction = () => {
    setBulkActionOpen(false);
    setBulkActionType(null);
    setBulkValue('');
  };

  // Bulk mutations
  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids: number[]) =>
      api.delete('/api/contacts/bulk-delete', { data: { ids } }),
    onSuccess: () => {
      successToast(`Smazáno ${selectedIds.size} kontaktů`);
      clearSelection();
      closeBulkAction();
      invalidateContactQueries();
    },
    onError: (error: Error) => errorToast(error),
  });

  const bulkUpdateMutation = useMutation({
    mutationFn: async ({ ids, updates }: { ids: number[]; updates: Record<string, string> }) =>
      api.put('/api/contacts/bulk-update', { ids, updates }),
    onSuccess: () => {
      successToast(`Aktualizováno ${selectedIds.size} kontaktů`);
      clearSelection();
      closeBulkAction();
      invalidateContactQueries();
    },
    onError: (error: Error) => errorToast(error),
  });

  const executeBulkAction = () => {
    const ids = Array.from(selectedIds);
    if (bulkActionType === 'delete') {
      bulkDeleteMutation.mutate(ids);
    } else if (bulkActionType === 'source') {
      bulkUpdateMutation.mutate({ ids, updates: { clientComeFrom: bulkValue } });
    }
  };

  const handleSearchChange = (value: string) => {
    onSearchChange(value);
    setPage(1);
  };

  const handlePageSizeChange = (value: string) => {
    setPageSize(Number(value));
  };

  const handleCompanyFilterChange = (value: string) => {
    setCompanyFilter(value === 'all' ? '' : value);
    setPage(1);
  };

  const handleInvoiceFilterChange = (value: string) => {
    setInvoiceFilter(value === 'all' ? '' : value);
    setPage(1);
  };

  const handleClientComeFromChange = (value: string) => {
    setClientComeFromFilter(value === 'all' ? '' : value);
    setPage(1);
  };

  const clearAllFilters = () => {
    setCompanyFilter('');
    setInvoiceFilter('');
    setClientComeFromFilter('');
    onSearchChange('');
    setPage(1);
  };

  const pageAllSelected = paginatedData.length > 0 && paginatedData.every((c) => selectedIds.has(c.id));
  const pageSomeSelected = paginatedData.some((c) => selectedIds.has(c.id)) && !pageAllSelected;

  const colCount = 7; // checkbox + 6 original columns

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
                <button onClick={() => { setCompanyFilter(''); setPage(1); }} className="hover:text-primary/70">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {invoiceFilter && (
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-primary/10 text-primary rounded-full text-xs">
                IČO: {INVOICE_FILTER_OPTIONS.find(s => s.value === invoiceFilter)?.label}
                <button onClick={() => { setInvoiceFilter(''); setPage(1); }} className="hover:text-primary/70">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {clientComeFromFilter && (
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-primary/10 text-primary rounded-full text-xs">
                Zdroj: {clientComeFromFilter}
                <button onClick={() => { setClientComeFromFilter(''); setPage(1); }} className="hover:text-primary/70">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
          </div>
        )}
      </div>

      {/* Bulk action bar */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg border">
          <Badge variant="secondary">{selectedIds.size} vybráno</Badge>
          <Button
            variant="outline"
            size="sm"
            onClick={() => openBulkAction('source')}
          >
            Změnit zdroj
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => openBulkAction('delete')}
          >
            Smazat
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={clearSelection}
          >
            Zrušit výběr
          </Button>
        </div>
      )}

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[40px]">
                <Checkbox
                  checked={pageAllSelected ? true : pageSomeSelected ? 'indeterminate' : false}
                  onCheckedChange={toggleSelectAll}
                />
              </TableHead>
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
                <TableCell colSpan={colCount} className="text-center py-8 text-muted-foreground">
                  Žádné kontakty
                </TableCell>
              </TableRow>
            ) : (
              paginatedData.map((contact) => (
                <TableRow
                  key={contact.id}
                  className={selectedIds.has(contact.id) ? 'bg-primary/5' : ''}
                >
                  <TableCell className="w-[40px]">
                    <Checkbox
                      checked={selectedIds.has(contact.id)}
                      onCheckedChange={() => toggleSelect(contact.id)}
                    />
                  </TableCell>
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
            Zobrazeno {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, totalItems)} z {totalItems} kontaktů
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => setPage(1)}
              disabled={page === 1}
            >
              <ChevronsLeft className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => setPage(page - 1)}
              disabled={page === 1}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <div className="flex items-center gap-1 px-2">
              <span className="text-sm">
                Strana <strong>{page}</strong> z <strong>{totalPages || 1}</strong>
              </span>
            </div>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => setPage(page + 1)}
              disabled={page >= totalPages}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => setPage(totalPages)}
              disabled={page >= totalPages}
            >
              <ChevronsRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Bulk action dialog */}
      <Dialog open={bulkActionOpen} onOpenChange={(o) => { if (!o) closeBulkAction(); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {bulkActionType === 'delete' && 'Smazat kontakty'}
              {bulkActionType === 'source' && 'Změnit zdroj kontaktů'}
            </DialogTitle>
            <DialogDescription>
              {bulkActionType === 'delete' &&
                `Opravdu chcete smazat ${selectedIds.size} vybraných kontaktů? Tato akce je nevratná.`}
              {bulkActionType === 'source' &&
                `Změna zdroje pro ${selectedIds.size} vybraných kontaktů.`}
            </DialogDescription>
          </DialogHeader>

          {bulkActionType === 'source' && (
            <div className="space-y-2 py-2">
              <Label>Nový zdroj</Label>
              <Input
                value={bulkValue}
                onChange={(e) => setBulkValue(e.target.value)}
                placeholder="Zadejte nový zdroj..."
              />
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={closeBulkAction}>
              Zrušit
            </Button>
            <Button
              variant={bulkActionType === 'delete' ? 'destructive' : 'default'}
              onClick={executeBulkAction}
              disabled={
                (bulkActionType === 'source' && !bulkValue.trim()) ||
                bulkDeleteMutation.isPending ||
                bulkUpdateMutation.isPending
              }
            >
              {(bulkDeleteMutation.isPending || bulkUpdateMutation.isPending)
                ? 'Provádím...'
                : bulkActionType === 'delete'
                  ? 'Smazat'
                  : 'Uložit'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
    </TooltipProvider>
  );
}
