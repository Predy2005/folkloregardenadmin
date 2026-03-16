import { useState, useMemo, useCallback } from 'react';
import dayjs from 'dayjs';
import isSameOrAfter from 'dayjs/plugin/isSameOrAfter';
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/components/ui/table';
import { TooltipProvider } from '@/shared/components/ui/tooltip';
import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import type { Reservation } from '@shared/types';
import { usePagination } from '@/shared/hooks/usePagination';
import type { SortColumn, SortDirection } from '@modules/reservations/types';
import { ReservationFilters, ReservationRow, PaginationControls } from './table';
import type { FilterState } from './table';

dayjs.extend(isSameOrAfter);
dayjs.extend(isSameOrBefore);

type Props = {
  reservations: Reservation[];
  searchTerm: string;
  onSearchChange: (value: string) => void;
  onView: (reservation: Reservation) => void;
  onEdit: (reservation: Reservation) => void;
  onDelete: (id: number) => void;
  onSendPayment: (id: number) => void;
};

export function ReservationTable({
  reservations,
  searchTerm,
  onSearchChange,
  onView,
  onEdit,
  onDelete,
  onSendPayment,
}: Props) {
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
        reservation.contactEmail.toLowerCase().includes(search) ||
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

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
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
                <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
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
    </div>
    </TooltipProvider>
  );
}
