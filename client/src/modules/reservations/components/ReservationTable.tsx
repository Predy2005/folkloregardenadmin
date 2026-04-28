import { useState, useMemo, useCallback } from 'react';
import dayjs from 'dayjs';
import isSameOrAfter from 'dayjs/plugin/isSameOrAfter';
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore';
import * as XLSX from 'xlsx';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/components/ui/table';
import { TooltipProvider } from '@/shared/components/ui/tooltip';
import { Checkbox } from '@/shared/components/ui/checkbox';
import { Button } from '@/shared/components/ui/button';
import { Badge } from '@/shared/components/ui/badge';
import { ArrowUpDown, ArrowUp, ArrowDown, Download, Trash2 } from 'lucide-react';
import { usePagination } from '@/shared/hooks/usePagination';
import { successToast, errorToast } from '@/shared/lib/toast-helpers';
import type { SortColumn, SortDirection } from '@modules/reservations/types';
import { ReservationFilters, ReservationRow, PaginationControls } from './table';
import type { FilterState } from './table';
import { BulkActionDialog, type BulkActionType } from './BulkActionDialog';
import { useAuth } from '@/modules/auth/contexts/AuthContext';
import type { ReservationTableProps } from '@modules/reservations/types/components/common/ReservationTable';

dayjs.extend(isSameOrAfter);
dayjs.extend(isSameOrBefore);

export function ReservationTable({
  reservations,
  searchTerm,
  onSearchChange,
  onView,
  onEdit,
  onDelete,
  onSendPayment,
}: ReservationTableProps) {
  // Permission checks — granular místo ROLE_SUPER_ADMIN, aby admini viděli bulk akce.
  const { hasPermission } = useAuth();
  const canUpdate = hasPermission('reservations.update');
  const canDelete = hasPermission('reservations.delete');

  // Selection state
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [bulkActionOpen, setBulkActionOpen] = useState(false);
  const [bulkActionType, setBulkActionType] = useState<BulkActionType>('status');

  // Sorting state
  const [sortColumn, setSortColumn] = useState<SortColumn>('id');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  // Filter states
  const [filters, setFilters] = useState<FilterState>({
    statusFilter: '',
    nationalityFilter: '',
    dateFrom: '',
    dateTo: '',
  });
  const [showFilters, setShowFilters] = useState(false);

  // Extract unique nationalities from reservations
  const nationalities = useMemo(() => {
    const uniqueNationalities = new Set<string>();
    (reservations || []).forEach((r) => {
      if (r.contactNationality) {
        uniqueNationalities.add(r.contactNationality);
      }
    });
    return Array.from(uniqueNationalities).sort();
  }, [reservations]);

  // Filter and sort reservations
  const filtered = useMemo(() => {
    const { statusFilter, nationalityFilter, dateFrom, dateTo } = filters;

    const filteredData = (reservations || []).filter((reservation) => {
      // Text search
      const search = (searchTerm || '').toLowerCase();
      const matchesSearch =
        reservation.contactName.toLowerCase().includes(search) ||
        (reservation.contactEmail?.toLowerCase().includes(search) ?? false) ||
        reservation.contactPhone.includes(search) ||
        reservation.id.toString().includes(search);

      if (!matchesSearch) return false;

      // Status filter
      if (statusFilter && reservation.status !== statusFilter) {
        return false;
      }

      // Nationality filter
      if (nationalityFilter && reservation.contactNationality !== nationalityFilter) {
        return false;
      }

      // Date range filter
      if (dateFrom) {
        const reservationDate = dayjs(reservation.date);
        const fromDate = dayjs(dateFrom);
        if (!reservationDate.isSameOrAfter(fromDate, 'day')) {
          return false;
        }
      }

      if (dateTo) {
        const reservationDate = dayjs(reservation.date);
        const toDate = dayjs(dateTo);
        if (!reservationDate.isSameOrBefore(toDate, 'day')) {
          return false;
        }
      }

      return true;
    });

    // Sort the filtered data
    if (sortColumn) {
      filteredData.sort((a, b) => {
        let comparison = 0;

        switch (sortColumn) {
          case 'id':
            comparison = a.id - b.id;
            break;
          case 'date':
            comparison = dayjs(a.date).unix() - dayjs(b.date).unix();
            break;
          case 'contactName':
            comparison = a.contactName.localeCompare(b.contactName);
            break;
        }

        return sortDirection === 'asc' ? comparison : -comparison;
      });
    }

    return filteredData;
  }, [reservations, searchTerm, filters, sortColumn, sortDirection]);

  // Pagination
  const { page, pageSize, setPage, setPageSize, paginatedData, totalPages, totalItems } = usePagination(filtered);

  // Handlers
  const handleSearchChange = useCallback((value: string) => {
    onSearchChange(value);
    setPage(1);
  }, [onSearchChange, setPage]);

  const handlePageSizeChange = useCallback((value: string) => {
    setPageSize(Number(value));
  }, [setPageSize]);

  const handleFilterChange = useCallback((partial: Partial<FilterState>) => {
    setFilters((prev) => ({ ...prev, ...partial }));
    setPage(1);
  }, [setPage]);

  const handleClearAll = useCallback(() => {
    setFilters({ statusFilter: '', nationalityFilter: '', dateFrom: '', dateTo: '' });
    onSearchChange('');
    setPage(1);
  }, [onSearchChange, setPage]);

  // Sorting handler
  const handleSort = useCallback((column: SortColumn) => {
    if (sortColumn === column) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortColumn(column);
      setSortDirection(column === 'id' ? 'desc' : 'asc');
    }
    setPage(1);
  }, [sortColumn, setPage]);

  // Sort icon helper
  const getSortIcon = (column: SortColumn) => {
    if (sortColumn !== column) {
      return <ArrowUpDown className="w-4 h-4 ml-1 opacity-50" />;
    }
    return sortDirection === 'asc'
      ? <ArrowUp className="w-4 h-4 ml-1" />
      : <ArrowDown className="w-4 h-4 ml-1" />;
  };

  // Selection handlers
  const toggleSelect = useCallback((id: number) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleSelectAll = useCallback(() => {
    setSelectedIds(prev => {
      if (prev.size === paginatedData.length && paginatedData.every(r => prev.has(r.id))) {
        return new Set();
      }
      return new Set(paginatedData.map(r => r.id));
    });
  }, [paginatedData]);

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const allOnPageSelected = paginatedData.length > 0 && paginatedData.every(r => selectedIds.has(r.id));
  const someOnPageSelected = paginatedData.some(r => selectedIds.has(r.id)) && !allOnPageSelected;

  const openBulkAction = useCallback((type: BulkActionType) => {
    setBulkActionType(type);
    setBulkActionOpen(true);
  }, []);

  const handleExportSelected = useCallback(() => {
    const selected = (reservations || []).filter((r) => selectedIds.has(r.id));
    if (selected.length === 0) {
      errorToast('Nic není vybráno');
      return;
    }
    const rows = selected.map((r) => ({
      'ID': r.id,
      'Datum': r.date ? dayjs(r.date).format('DD.MM.YYYY') : '',
      'Jméno': r.contactName ?? '',
      'Email': r.contactEmail ?? '',
      'Telefon': r.contactPhone ?? '',
      'Země': r.contactNationality ?? '',
      'Status': r.status ?? '',
      'Druh': (r as { reservationType?: { name?: string } }).reservationType?.name ?? '',
      'Počet osob': (r as { totalPeople?: number; personCount?: number }).totalPeople
        ?? (r as { personCount?: number }).personCount ?? '',
    }));
    const sheet = XLSX.utils.json_to_sheet(rows);
    const book = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(book, sheet, 'Rezervace');
    const stamp = dayjs().format('YYYY-MM-DD');
    XLSX.writeFile(book, `rezervace_${stamp}.xlsx`);
    successToast(`Exportováno ${selected.length} rezervací`);
  }, [reservations, selectedIds]);

  return (
    <TooltipProvider>
    <div className="space-y-4">
      <ReservationFilters
        searchTerm={searchTerm}
        onSearchChange={handleSearchChange}
        filters={filters}
        onFilterChange={handleFilterChange}
        onClearAll={handleClearAll}
        nationalities={nationalities}
        showFilters={showFilters}
        onToggleFilters={() => setShowFilters(!showFilters)}
        pageSize={pageSize}
        onPageSizeChange={handlePageSizeChange}
      />

      {/* Bulk action bar — selection a export pro všechny, destruktivní akce dle permissions */}
      {selectedIds.size > 0 && (
        <div className="flex flex-wrap items-center gap-2 p-3 bg-primary/5 border rounded-lg">
          <Badge variant="secondary">{selectedIds.size} vybráno</Badge>
          {canUpdate && (
            <Button size="sm" variant="outline" onClick={() => openBulkAction('status')}>
              Změnit status
            </Button>
          )}
          {canUpdate && (
            <Button size="sm" variant="outline" onClick={() => openBulkAction('reservationType')}>
              Změnit typ
            </Button>
          )}
          <Button size="sm" variant="outline" onClick={handleExportSelected}>
            <Download className="w-4 h-4 mr-1" />
            Exportovat
          </Button>
          {canDelete && (
            <Button size="sm" variant="destructive" onClick={() => openBulkAction('delete')}>
              <Trash2 className="w-4 h-4 mr-1" />
              Smazat
            </Button>
          )}
          <Button size="sm" variant="ghost" onClick={clearSelection}>
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
                  checked={allOnPageSelected ? true : someOnPageSelected ? 'indeterminate' : false}
                  onCheckedChange={toggleSelectAll}
                />
              </TableHead>
              <TableHead
                className="w-[70px] cursor-pointer hover:bg-muted/50 select-none"
                onClick={() => handleSort('id')}
              >
                <div className="flex items-center">
                  ID
                  {getSortIcon('id')}
                </div>
              </TableHead>
              <TableHead
                className="cursor-pointer hover:bg-muted/50 select-none"
                onClick={() => handleSort('date')}
              >
                <div className="flex items-center">
                  Rezervace
                  {getSortIcon('date')}
                </div>
              </TableHead>
              <TableHead>Telefon</TableHead>
              <TableHead className="text-center">Osoby</TableHead>
              <TableHead>Země</TableHead>
              <TableHead>Druh</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Akce</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedData.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                  Žádné rezervace
                </TableCell>
              </TableRow>
            ) : (
              paginatedData.map((reservation) => (
                <ReservationRow
                  key={reservation.id}
                  reservation={reservation}
                  onView={onView}
                  onEdit={onEdit}
                  onDelete={onDelete}
                  onSendPayment={onSendPayment}
                  showCheckbox={true}
                  isSelected={selectedIds.has(reservation.id)}
                  onToggleSelect={toggleSelect}
                />
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <PaginationControls
        page={page}
        pageSize={pageSize}
        totalPages={totalPages}
        totalItems={totalItems}
        onPageChange={setPage}
      />

      <BulkActionDialog
        open={bulkActionOpen}
        onOpenChange={setBulkActionOpen}
        actionType={bulkActionType}
        selectedIds={selectedIds}
        onSuccess={clearSelection}
      />
    </div>
    </TooltipProvider>
  );
}
