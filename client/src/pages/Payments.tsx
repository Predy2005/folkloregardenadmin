import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { StatusBadge } from '@/components/StatusBadge';
import { Search, Filter } from 'lucide-react';
import type { Payment } from '@shared/types';
import dayjs from 'dayjs';

export default function Payments() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const { data: paymentsData, isLoading } = useQuery({
    queryKey: ['/api/payment/list', statusFilter, dateFrom, dateTo],
    queryFn: () => {
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (dateFrom) params.append('dateFrom', dateFrom);
      if (dateTo) params.append('dateTo', dateTo);
      const queryString = params.toString();
      return api.get<any>(`/api/payment/list${queryString ? `?${queryString}` : ''}`);
    },
  });

  const payments = Array.isArray(paymentsData) ? paymentsData : [];

  const filteredPayments = payments.filter((payment: any) => {
    const search = searchTerm.toLowerCase();
    return (
      payment.transactionId?.toLowerCase().includes(search) ||
      payment.reservationReference?.toLowerCase().includes(search) ||
      payment.id?.toString().includes(search)
    );
  });

  const totalAmount = filteredPayments.reduce((sum: number, p: any) => {
    if (p.status === 'PAID') {
      return sum + (p.amount || 0);
    }
    return sum;
  }, 0);

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
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-serif font-bold mb-2">Platby</h1>
        <p className="text-muted-foreground">Přehled všech plateb z Comgate</p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 grid-cols-1 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <p className="text-sm text-muted-foreground">Celkem plateb</p>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-serif font-bold" data-testid="stat-total-payments">{filteredPayments.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <p className="text-sm text-muted-foreground">Zaplaceno</p>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-serif font-bold" data-testid="stat-paid-payments">
              {filteredPayments.filter((p: any) => p.status === 'PAID').length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <p className="text-sm text-muted-foreground">Celková částka</p>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-serif font-bold" data-testid="stat-total-amount">
              {totalAmount.toLocaleString('cs-CZ')} Kč
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Hledat platby..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
                data-testid="input-search-payments"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[180px]" data-testid="select-status-filter">
                <SelectValue placeholder="Filtr statusu" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Všechny</SelectItem>
                <SelectItem value="PAID">Zaplaceno</SelectItem>
                <SelectItem value="PENDING">Čeká</SelectItem>
                <SelectItem value="CANCELLED">Zrušeno</SelectItem>
                <SelectItem value="AUTHORIZED">Autorizováno</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Transaction ID</TableHead>
                  <TableHead>Rezervace</TableHead>
                  <TableHead>Částka</TableHead>
                  <TableHead>Datum</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPayments.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      Žádné platby
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredPayments.map((payment: any) => (
                    <TableRow key={payment.id} className="hover-elevate" data-testid={`row-payment-${payment.id}`}>
                      <TableCell className="font-mono text-sm">#{payment.id}</TableCell>
                      <TableCell className="font-mono text-sm max-w-[200px] truncate">
                        {payment.transactionId}
                      </TableCell>
                      <TableCell className="font-mono text-sm">#{payment.reservationReference}</TableCell>
                      <TableCell className="font-mono font-medium">
                        {payment.amount?.toLocaleString('cs-CZ')} Kč
                      </TableCell>
                      <TableCell className="text-sm">
                        {dayjs(payment.createdAt).format('DD.MM.YYYY HH:mm')}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={payment.status} type="payment" />
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
