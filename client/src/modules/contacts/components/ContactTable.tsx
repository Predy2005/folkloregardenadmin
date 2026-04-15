import { useState, useMemo } from 'react';
import { useMutation } from '@tanstack/react-query';
import { api } from '@/shared/lib/api';
import { invalidateContactQueries } from '@/shared/lib/query-helpers';
import { successToast, errorToast } from '@/shared/lib/toast-helpers';
import { Button } from '@/shared/components/ui/button';
import { Checkbox } from '@/shared/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/components/ui/table';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/shared/components/ui/tooltip';
import { Edit, Trash2, Plus, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import type { Contact } from '@shared/types';
import { usePagination } from '@/shared/hooks/usePagination';
import { ContactFilters } from './ContactFilters';
import { ContactBulkActionDialog } from './ContactBulkActionDialog';

type Props = {
  contacts: Contact[];
  searchTerm: string;
  onSearchChange: (value: string) => void;
  onEdit: (contact: Contact) => void;
  onDelete: (id: number) => void;
  onNewReservation: (contact: Contact) => void;
};

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
      const search = (searchTerm || '').toLowerCase();
      const matchesSearch =
        (contact.name || '').toLowerCase().includes(search) ||
        (contact.email || '').toLowerCase().includes(search) ||
        (contact.phone || '').includes(search) ||
        (contact.company || '').toLowerCase().includes(search) ||
        (contact.invoiceIc || '').includes(search) ||
        (contact.invoiceDic || '').includes(search);

      if (!matchesSearch) return false;

      if (companyFilter === 'with_company' && !contact.company) return false;
      if (companyFilter === 'without_company' && contact.company) return false;
      if (invoiceFilter === 'with_ic' && !contact.invoiceIc) return false;
      if (invoiceFilter === 'without_ic' && contact.invoiceIc) return false;
      if (clientComeFromFilter && contact.clientComeFrom !== clientComeFromFilter) return false;

      return true;
    });
  }, [contacts, searchTerm, companyFilter, invoiceFilter, clientComeFromFilter]);

  // Pagination
  const { page, pageSize, setPage, setPageSize, paginatedData, totalPages, totalItems } = usePagination(filtered);

  const hasActiveFilters = !!(companyFilter || invoiceFilter || clientComeFromFilter);

  // Selection functions
  const toggleSelect = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) { next.delete(id); } else { next.add(id); }
      return next;
    });
  };

  const toggleSelectAll = () => {
    const pageIds = paginatedData.map((c) => c.id);
    const allSelected = pageIds.every((id) => selectedIds.has(id));
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allSelected) { pageIds.forEach((id) => next.delete(id)); }
      else { pageIds.forEach((id) => next.add(id)); }
      return next;
    });
  };

  const clearSelection = () => setSelectedIds(new Set());

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

  const handlePageSizeChange = (value: string) => setPageSize(Number(value));

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
  const colCount = 7;

  return (
    <TooltipProvider>
    <div className="space-y-4">
      <ContactFilters
        searchTerm={searchTerm}
        onSearchChange={handleSearchChange}
        showFilters={showFilters}
        onToggleFilters={() => setShowFilters(!showFilters)}
        companyFilter={companyFilter}
        onCompanyFilterChange={handleCompanyFilterChange}
        invoiceFilter={invoiceFilter}
        onInvoiceFilterChange={handleInvoiceFilterChange}
        clientComeFromFilter={clientComeFromFilter}
        onClientComeFromChange={handleClientComeFromChange}
        clientSources={clientSources}
        hasActiveFilters={hasActiveFilters}
        onClearAllFilters={clearAllFilters}
        pageSize={pageSize}
        onPageSizeChange={handlePageSizeChange}
        selectedCount={selectedIds.size}
        onBulkSource={() => openBulkAction('source')}
        onBulkDelete={() => openBulkAction('delete')}
        onClearSelection={clearSelection}
      />

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
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setPage(1)} disabled={page === 1}>
              <ChevronsLeft className="w-4 h-4" />
            </Button>
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setPage(page - 1)} disabled={page === 1}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <div className="flex items-center gap-1 px-2">
              <span className="text-sm">
                Strana <strong>{page}</strong> z <strong>{totalPages || 1}</strong>
              </span>
            </div>
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setPage(page + 1)} disabled={page >= totalPages}>
              <ChevronRight className="w-4 h-4" />
            </Button>
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setPage(totalPages)} disabled={page >= totalPages}>
              <ChevronsRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Bulk action dialog */}
      <ContactBulkActionDialog
        open={bulkActionOpen}
        onOpenChange={(o) => { if (!o) closeBulkAction(); }}
        actionType={bulkActionType}
        selectedCount={selectedIds.size}
        bulkValue={bulkValue}
        onBulkValueChange={setBulkValue}
        onExecute={executeBulkAction}
        onClose={closeBulkAction}
        isPending={bulkDeleteMutation.isPending || bulkUpdateMutation.isPending}
      />
    </div>
    </TooltipProvider>
  );
}
