import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/shared/lib/api';
import { Card, CardContent, CardHeader } from '@/shared/components/ui/card';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/shared/components/ui/dialog';
import { StatusBadge } from '@/shared/components/StatusBadge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/shared/components/ui/tooltip';
import { Search, Filter, X, Eye, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, CreditCard, User, Calendar, Phone, Mail, MapPin } from 'lucide-react';
import type { Payment, Reservation } from '@shared/types';
import dayjs from 'dayjs';
import isSameOrAfter from 'dayjs/plugin/isSameOrAfter';
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore';

dayjs.extend(isSameOrAfter);
dayjs.extend(isSameOrBefore);

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100] as const;

const STATUS_OPTIONS = [
  { value: 'all', label: 'Všechny' },
  { value: 'PAID', label: 'Zaplaceno' },
  { value: 'PENDING', label: 'Čeká' },
  { value: 'CANCELLED', label: 'Zrušeno' },
  { value: 'AUTHORIZED', label: 'Autorizováno' },
  { value: 'CREATED', label: 'Vytvořeno' },
] as const;

export default function Payments() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(20);

  // Detail dialog state
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  // Fetch payments
  const { data: paymentsData, isLoading } = useQuery({
    queryKey: ['/api/payment/list'],
    queryFn: () => api.get<Payment[]>('/api/payment/list'),
  });

  // Fetch reservations for linking
  const { data: reservations } = useQuery({
    queryKey: ['/api/reservations'],
    queryFn: () => api.get<Reservation[]>('/api/reservations'),
  });

  const payments = Array.isArray(paymentsData) ? paymentsData : [];

  // Create reservation lookup map
  const reservationMap = useMemo(() => {
    const map = new Map<string, Reservation>();
    (reservations || []).forEach((r) => {
      map.set(String(r.id), r);
    });
    return map;
  }, [reservations]);

  // Filter payments
  const filteredPayments = useMemo(() => {
    return payments.filter((payment: Payment) => {
      // Text search
      const search = searchTerm.toLowerCase();
      const matchesSearch =
        payment.transactionId?.toLowerCase().includes(search) ||
        payment.reservationReference?.toLowerCase().includes(search) ||
        payment.id?.toString().includes(search);

      if (!matchesSearch) return false;

      // Status filter
      if (statusFilter !== 'all' && payment.status !== statusFilter) {
        return false;
      }

      // Date range filter
      if (dateFrom) {
        const paymentDate = dayjs(payment.createdAt);
        const fromDate = dayjs(dateFrom);
        if (!paymentDate.isSameOrAfter(fromDate, 'day')) {
          return false;
        }
      }

      if (dateTo) {
        const paymentDate = dayjs(payment.createdAt);
        const toDate = dayjs(dateTo);
        if (!paymentDate.isSameOrBefore(toDate, 'day')) {
          return false;
        }
      }

      return true;
    });
  }, [payments, searchTerm, statusFilter, dateFrom, dateTo]);

  // Calculate pagination
  const totalItems = filteredPayments.length;
  const totalPages = Math.ceil(totalItems / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalItems);
  const paginatedData = filteredPayments.slice(startIndex, endIndex);

  // Stats
  const totalAmount = filteredPayments.reduce((sum: number, p: Payment) => {
    if (p.status === 'PAID') {
      return sum + (p.amount || 0);
    }
    return sum;
  }, 0);

  const paidCount = filteredPayments.filter((p: Payment) => p.status === 'PAID').length;

  // Check if any filter is active
  const hasActiveFilters = statusFilter !== 'all' || dateFrom || dateTo;

  // Reset to page 1 when filter changes
  const resetPage = () => setCurrentPage(1);

  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    resetPage();
  };

  const handleStatusChange = (value: string) => {
    setStatusFilter(value);
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

  const handlePageSizeChange = (value: string) => {
    setPageSize(Number(value));
    resetPage();
  };

  const clearAllFilters = () => {
    setStatusFilter('all');
    setDateFrom('');
    setDateTo('');
    setSearchTerm('');
    resetPage();
  };

  const handleViewPayment = (payment: Payment) => {
    setSelectedPayment(payment);
    setIsDetailOpen(true);
  };

  // Get linked reservation for selected payment
  const linkedReservation = selectedPayment
    ? reservationMap.get(selectedPayment.reservationReference)
    : null;

  // Navigation handlers
  const goToFirstPage = () => setCurrentPage(1);
  const goToPreviousPage = () => setCurrentPage((prev) => Math.max(1, prev - 1));
  const goToNextPage = () => setCurrentPage((prev) => Math.min(totalPages, prev + 1));
  const goToLastPage = () => setCurrentPage(totalPages);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Načítání plateb...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
          Platby
        </h1>
        <p className="text-muted-foreground mt-1">Přehled všech plateb z Comgate</p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 grid-cols-1 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <p className="text-sm text-muted-foreground">Celkem plateb</p>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold" data-testid="stat-total-payments">{filteredPayments.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <p className="text-sm text-muted-foreground">Zaplaceno</p>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-600" data-testid="stat-paid-payments">
              {paidCount}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <p className="text-sm text-muted-foreground">Celková částka</p>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold" data-testid="stat-total-amount">
              {totalAmount.toLocaleString('cs-CZ')} Kč
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="space-y-4">
            {/* Header with search, filters toggle and page size */}
            <div className="flex flex-col gap-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <div className="relative flex-1 sm:w-80">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      type="search"
                      placeholder="Hledat platby..."
                      value={searchTerm}
                      onChange={(e) => handleSearchChange(e.target.value)}
                      className="pl-10"
                      data-testid="input-search-payments"
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
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 bg-muted/50 rounded-lg border">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Status</Label>
                    <Select value={statusFilter} onValueChange={handleStatusChange}>
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
                  {statusFilter !== 'all' && (
                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-primary/10 text-primary rounded-full text-xs">
                      Status: {STATUS_OPTIONS.find(s => s.value === statusFilter)?.label}
                      <button onClick={() => { setStatusFilter('all'); resetPage(); }} className="hover:text-primary/70">
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
                    <TableHead className="w-[60px]">ID</TableHead>
                    <TableHead>Transaction ID</TableHead>
                    <TableHead>Rezervace</TableHead>
                    <TableHead>Částka</TableHead>
                    <TableHead>Datum</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Akce</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedData.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        Žádné platby
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedData.map((payment: Payment) => {
                      const reservation = reservationMap.get(payment.reservationReference);
                      return (
                        <TableRow
                          key={payment.id}
                          className="cursor-pointer hover:bg-muted/50"
                          onClick={() => handleViewPayment(payment)}
                          data-testid={`row-payment-${payment.id}`}
                        >
                          <TableCell className="font-mono text-xs text-muted-foreground">#{payment.id}</TableCell>
                          <TableCell className="font-mono text-sm max-w-[200px] truncate">
                            {payment.transactionId}
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col gap-0.5">
                              <span className="font-mono text-sm">#{payment.reservationReference}</span>
                              {reservation && (
                                <span className="text-xs text-muted-foreground truncate max-w-[150px]">
                                  {reservation.contactName}
                                </span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="font-mono font-medium">
                            {Number(payment.amount).toLocaleString('cs-CZ')} Kč
                          </TableCell>
                          <TableCell className="text-sm">
                            {dayjs(payment.createdAt).format('DD.MM.YYYY HH:mm')}
                          </TableCell>
                          <TableCell>
                            <StatusBadge status={payment.status} type="payment" />
                          </TableCell>
                          <TableCell className="text-right">
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleViewPayment(payment);
                                    }}
                                  >
                                    <Eye className="w-4 h-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Zobrazit detail</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Pagination footer */}
            {totalItems > 0 && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-2">
                <div className="text-sm text-muted-foreground">
                  Zobrazeno {startIndex + 1}–{endIndex} z {totalItems} plateb
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
        </CardContent>
      </Card>

      {/* Payment Detail Dialog */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CreditCard className="w-5 h-5" />
              Detail platby #{selectedPayment?.id}
            </DialogTitle>
          </DialogHeader>

          {selectedPayment && (
            <div className="space-y-6">
              {/* Payment Info */}
              <div className="space-y-4">
                <h3 className="font-semibold text-lg">Informace o platbě</h3>
                <div className="grid grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
                  <div>
                    <p className="text-sm text-muted-foreground">Transaction ID</p>
                    <p className="font-mono text-sm">{selectedPayment.transactionId}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Status</p>
                    <StatusBadge status={selectedPayment.status} type="payment" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Částka</p>
                    <p className="font-bold text-lg">{Number(selectedPayment.amount).toLocaleString('cs-CZ')} Kč</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Datum vytvoření</p>
                    <p className="text-sm">{dayjs(selectedPayment.createdAt).format('DD.MM.YYYY HH:mm:ss')}</p>
                  </div>
                  {selectedPayment.updatedAt && (
                    <div>
                      <p className="text-sm text-muted-foreground">Poslední aktualizace</p>
                      <p className="text-sm">{dayjs(selectedPayment.updatedAt).format('DD.MM.YYYY HH:mm:ss')}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Linked Reservation */}
              <div className="space-y-4">
                <h3 className="font-semibold text-lg">Přiřazená rezervace</h3>
                {linkedReservation ? (
                  <div className="p-4 bg-muted/50 rounded-lg space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm">#{linkedReservation.id}</span>
                        <StatusBadge status={linkedReservation.status} type="reservation" />
                      </div>
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Calendar className="w-4 h-4" />
                        {dayjs(linkedReservation.date).format('DD.MM.YYYY HH:mm')}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-muted-foreground" />
                          <span className="font-medium">{linkedReservation.contactName}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Mail className="w-4 h-4 text-muted-foreground" />
                          <span className="text-sm">{linkedReservation.contactEmail}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Phone className="w-4 h-4 text-muted-foreground" />
                          <span className="text-sm font-mono">{linkedReservation.contactPhone}</span>
                        </div>
                      </div>
                      <div className="space-y-2">
                        {linkedReservation.contactNationality && (
                          <div className="flex items-center gap-2">
                            <MapPin className="w-4 h-4 text-muted-foreground" />
                            <span className="text-sm">{linkedReservation.contactNationality}</span>
                          </div>
                        )}
                        <div>
                          <p className="text-sm text-muted-foreground">Počet osob</p>
                          <p className="font-medium">{linkedReservation.persons?.length || 0}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Celková cena rezervace</p>
                          <p className="font-medium">
                            {(linkedReservation.persons || []).reduce((sum, p) => sum + Number(p.price || 0), 0).toLocaleString('cs-CZ')} Kč
                          </p>
                        </div>
                      </div>
                    </div>

                    {linkedReservation.contactNote && (
                      <div className="pt-2 border-t">
                        <p className="text-sm text-muted-foreground">Poznámka</p>
                        <p className="text-sm">{linkedReservation.contactNote}</p>
                      </div>
                    )}

                    <div className="pt-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setIsDetailOpen(false);
                          window.location.href = `/reservations/${linkedReservation.id}/edit`;
                        }}
                      >
                        Zobrazit rezervaci
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 bg-muted/50 rounded-lg text-center text-muted-foreground">
                    <p>Rezervace #{selectedPayment.reservationReference} nenalezena</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
