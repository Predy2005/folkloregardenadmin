import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/shared/lib/api';
import { usePagination } from '@/shared/hooks/usePagination';
import { Card, CardContent, CardHeader } from '@/shared/components/ui/card';
import { PageHeader } from "@/shared/components/PageHeader";
import type { Payment, Reservation } from '@shared/types';
import { formatCurrency } from '@/shared/lib/formatting';
import dayjs from 'dayjs';
import isSameOrAfter from 'dayjs/plugin/isSameOrAfter';
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore';
import { PaymentFilters } from '../components/PaymentFilters';
import { PaymentsTable } from '../components/PaymentsTable';
import { PaymentDetailDialog } from '../components/PaymentDetailDialog';

dayjs.extend(isSameOrAfter);
dayjs.extend(isSameOrBefore);

export default function Payments() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [showFilters, setShowFilters] = useState(false);

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

  const payments = useMemo(() => Array.isArray(paymentsData) ? paymentsData : [], [paymentsData]);

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
      const search = searchTerm.toLowerCase();
      const matchesSearch =
        payment.transactionId?.toLowerCase().includes(search) ||
        payment.reservationReference?.toLowerCase().includes(search) ||
        payment.id?.toString().includes(search);

      if (!matchesSearch) return false;

      if (statusFilter !== 'all' && payment.status !== statusFilter) {
        return false;
      }

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

  // Pagination
  const { page, pageSize, setPage, setPageSize, paginatedData, totalPages, totalItems } = usePagination(filteredPayments);

  // Stats
  const totalAmount = filteredPayments.reduce((sum: number, p: Payment) => {
    if (p.status === 'PAID') {
      return sum + (p.amount || 0);
    }
    return sum;
  }, 0);

  const paidCount = filteredPayments.filter((p: Payment) => p.status === 'PAID').length;

  const hasActiveFilters = statusFilter !== 'all' || dateFrom || dateTo;

  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    setPage(1);
  };

  const handleStatusChange = (value: string) => {
    setStatusFilter(value);
    setPage(1);
  };

  const handleDateFromChange = (value: string) => {
    setDateFrom(value);
    setPage(1);
  };

  const handleDateToChange = (value: string) => {
    setDateTo(value);
    setPage(1);
  };

  const clearAllFilters = () => {
    setStatusFilter('all');
    setDateFrom('');
    setDateTo('');
    setSearchTerm('');
    setPage(1);
  };

  const handleViewPayment = (payment: Payment) => {
    setSelectedPayment(payment);
    setIsDetailOpen(true);
  };

  const linkedReservation = selectedPayment
    ? reservationMap.get(selectedPayment.reservationReference) ?? null
    : null;

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
      <PageHeader title="Platby" description="Přehled všech plateb z Comgate" />

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
              {formatCurrency(totalAmount)}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="space-y-4">
            <PaymentFilters
              searchTerm={searchTerm}
              onSearchChange={handleSearchChange}
              statusFilter={statusFilter}
              onStatusChange={handleStatusChange}
              dateFrom={dateFrom}
              onDateFromChange={handleDateFromChange}
              dateTo={dateTo}
              onDateToChange={handleDateToChange}
              showFilters={showFilters}
              onToggleFilters={() => setShowFilters(!showFilters)}
              hasActiveFilters={!!hasActiveFilters}
              onClearAllFilters={clearAllFilters}
              pageSize={pageSize}
              onPageSizeChange={(value) => setPageSize(Number(value))}
              onResetPage={() => setPage(1)}
            />

            <PaymentsTable
              paginatedData={paginatedData}
              reservationMap={reservationMap}
              onViewPayment={handleViewPayment}
              page={page}
              pageSize={pageSize}
              totalPages={totalPages}
              totalItems={totalItems}
              setPage={setPage}
            />
          </div>
        </CardContent>
      </Card>

      <PaymentDetailDialog
        isOpen={isDetailOpen}
        onOpenChange={setIsDetailOpen}
        selectedPayment={selectedPayment}
        linkedReservation={linkedReservation}
      />
    </div>
  );
}
