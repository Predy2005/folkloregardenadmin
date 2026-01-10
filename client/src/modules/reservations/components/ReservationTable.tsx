import { useState, useMemo } from 'react';
import dayjs from 'dayjs';
import isSameOrAfter from 'dayjs/plugin/isSameOrAfter';
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/shared/components/ui/tooltip';
import { Search, Eye, Edit, Trash2, Mail, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Filter, X, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { StatusBadge } from '@/shared/components/StatusBadge';
import type { Reservation } from '@shared/types';

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

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100] as const;

const STATUS_OPTIONS = [
  { value: '', label: 'Všechny statusy' },
  { value: 'RECEIVED', label: 'Přijato' },
  { value: 'WAITING_PAYMENT', label: 'Čeká na platbu' },
  { value: 'PAID', label: 'Zaplaceno' },
  { value: 'AUTHORIZED', label: 'Autorizováno' },
  { value: 'CONFIRMED', label: 'Potvrzeno' },
  { value: 'CANCELLED', label: 'Zrušeno' },
] as const;

type SortColumn = 'id' | 'date' | 'contactName' | null;
type SortDirection = 'asc' | 'desc';

export function ReservationTable({
  reservations,
  searchTerm,
  onSearchChange,
  onView,
  onEdit,
  onDelete,
  onSendPayment,
}: Props) {
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(20);

  // Sorting state
  const [sortColumn, setSortColumn] = useState<SortColumn>('id');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  // Filter states
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [nationalityFilter, setNationalityFilter] = useState<string>('');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
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
  }, [reservations, searchTerm, statusFilter, nationalityFilter, dateFrom, dateTo, sortColumn, sortDirection]);

  // Calculate pagination
  const totalItems = filtered.length;
  const totalPages = Math.ceil(totalItems / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalItems);
  const paginatedData = filtered.slice(startIndex, endIndex);

  // Check if any filter is active
  const hasActiveFilters = statusFilter || nationalityFilter || dateFrom || dateTo;

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

  const handleStatusChange = (value: string) => {
    setStatusFilter(value === 'all' ? '' : value);
    resetPage();
  };

  const handleNationalityChange = (value: string) => {
    setNationalityFilter(value === 'all' ? '' : value);
    resetPage();
  };

  const handleDateFromChange = (value: string) => {
    setDateFrom(value);
    resetPage();
  };

  const handleDateToChange = (value: string) => {
    setDateTo(value);
    resetPage();
  };

  const clearAllFilters = () => {
    setStatusFilter('');
    setNationalityFilter('');
    setDateFrom('');
    setDateTo('');
    onSearchChange('');
    resetPage();
  };

  // Sorting handler
  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      // Toggle direction if same column
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // New column, default to descending for ID, ascending for others
      setSortColumn(column);
      setSortDirection(column === 'id' ? 'desc' : 'asc');
    }
    resetPage();
  };

  // Sort icon helper
  const getSortIcon = (column: SortColumn) => {
    if (sortColumn !== column) {
      return <ArrowUpDown className="w-4 h-4 ml-1 opacity-50" />;
    }
    return sortDirection === 'asc'
      ? <ArrowUp className="w-4 h-4 ml-1" />
      : <ArrowDown className="w-4 h-4 ml-1" />;
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
                placeholder="Hledat rezervace..."
                value={searchTerm}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="pl-10"
                data-testid="input-search-reservations"
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 p-4 bg-muted/50 rounded-lg border">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Status</Label>
              <Select value={statusFilter || 'all'} onValueChange={handleStatusChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Všechny statusy" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Všechny statusy</SelectItem>
                  {STATUS_OPTIONS.filter(s => s.value).map((status) => (
                    <SelectItem key={status.value} value={status.value}>
                      {status.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">Země původu</Label>
              <Select value={nationalityFilter || 'all'} onValueChange={handleNationalityChange}>
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
                onChange={(e) => handleDateFromChange(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">Datum do</Label>
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => handleDateToChange(e.target.value)}
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
                <button onClick={() => { setStatusFilter(''); resetPage(); }} className="hover:text-primary/70">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {nationalityFilter && (
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-primary/10 text-primary rounded-full text-xs">
                Země: {nationalityFilter}
                <button onClick={() => { setNationalityFilter(''); resetPage(); }} className="hover:text-primary/70">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {dateFrom && (
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-primary/10 text-primary rounded-full text-xs">
                Od: {dayjs(dateFrom).format('DD.MM.YYYY')}
                <button onClick={() => { setDateFrom(''); resetPage(); }} className="hover:text-primary/70">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {dateTo && (
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-primary/10 text-primary rounded-full text-xs">
                Do: {dayjs(dateTo).format('DD.MM.YYYY')}
                <button onClick={() => { setDateTo(''); resetPage(); }} className="hover:text-primary/70">
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
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Akce</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedData.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  Žádné rezervace
                </TableCell>
              </TableRow>
            ) : (
              paginatedData.map((reservation) => (
                <TableRow key={reservation.id} data-testid={`row-reservation-${reservation.id}`}>
                  <TableCell className="font-mono text-xs text-muted-foreground">#{reservation.id}</TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-0.5">
                      <span className="text-xs text-muted-foreground">
                        {dayjs(reservation.date).format('DD.MM.YYYY HH:mm')}
                      </span>
                      <span className="font-medium">{reservation.contactName}</span>
                      <span className="text-sm text-muted-foreground">{reservation.contactEmail}</span>
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-sm">{reservation.contactPhone}</TableCell>
                  <TableCell className="text-center">{reservation.persons?.length || 0}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {reservation.contactNationality || '-'}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={reservation.status} type="reservation" />
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => onView(reservation)}
                            data-testid={`button-view-${reservation.id}`}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Zobrazit detail</TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => onEdit(reservation)}
                            data-testid={`button-edit-${reservation.id}`}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Upravit</TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => onSendPayment(reservation.id)}
                            data-testid={`button-send-payment-${reservation.id}`}
                          >
                            <Mail className="w-4 h-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Odeslat platební email</TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => onDelete(reservation.id)}
                            data-testid={`button-delete-${reservation.id}`}
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
            Zobrazeno {startIndex + 1}–{endIndex} z {totalItems} rezervací
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
