import dayjs from 'dayjs';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/shared/components/ui/dialog';
import { Button } from '@/shared/components/ui/button';
import { Separator } from '@/shared/components/ui/separator';
import { StatusBadge } from '@/shared/components/StatusBadge';
import { FileText, Loader2, CreditCard, Banknote, Receipt, CheckCircle } from 'lucide-react';
import { api } from '@/shared/lib/api';
import { queryClient } from '@/shared/lib/queryClient';
import { useToast } from '@/shared/hooks/use-toast';
import type { Reservation, Invoice, PaymentSummary } from '@shared/types';
import {
  PERSON_TYPE_LABELS,
  INVOICE_TYPE_LABELS,
  RESERVATION_PAYMENT_STATUS_LABELS,
  RESERVATION_PAYMENT_METHOD_LABELS,
} from '@shared/types';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reservation: Reservation | null;
};

export function ReservationDetailDialog({ open, onOpenChange, reservation }: Props) {
  const { toast } = useToast();

  // Fetch payment summary for this reservation
  const { data: paymentSummary, isLoading: summaryLoading } = useQuery({
    queryKey: ['/api/reservations', reservation?.id, 'payment-summary'],
    queryFn: () => api.get<PaymentSummary>(`/api/reservations/${reservation?.id}/payment-summary`),
    enabled: !!reservation?.id && open,
  });

  // Fetch invoices for this reservation
  const { data: invoices, isLoading: invoicesLoading } = useQuery({
    queryKey: ['/api/invoices/reservation', reservation?.id],
    queryFn: () => api.get<Invoice[]>(`/api/invoices/reservation/${reservation?.id}`),
    enabled: !!reservation?.id && open,
  });

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ['/api/invoices'] });
    queryClient.invalidateQueries({ queryKey: ['/api/invoices/reservation', reservation?.id] });
    queryClient.invalidateQueries({ queryKey: ['/api/reservations'] });
    queryClient.invalidateQueries({ queryKey: ['/api/reservations', reservation?.id, 'payment-summary'] });
  };

  // Create deposit invoice mutation
  const createDepositMutation = useMutation({
    mutationFn: ({ reservationId, percent }: { reservationId: number; percent: number }) =>
      api.post<Invoice>(`/api/invoices/create-deposit/${reservationId}`, { percent }),
    onSuccess: () => {
      invalidateAll();
      toast({ title: 'Zálohová faktura byla úspěšně vytvořena' });
    },
    onError: (error: Error) => {
      toast({
        title: 'Chyba při vytváření zálohové faktury',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Create final invoice mutation
  const createFinalMutation = useMutation({
    mutationFn: (reservationId: number) =>
      api.post<Invoice>(`/api/invoices/create-final/${reservationId}`),
    onSuccess: () => {
      invalidateAll();
      toast({ title: 'Ostrá faktura byla úspěšně vytvořena' });
    },
    onError: (error: Error) => {
      toast({
        title: 'Chyba při vytváření ostré faktury',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Mark as paid mutation
  const markPaidMutation = useMutation({
    mutationFn: ({ reservationId, paymentMethod }: { reservationId: number; paymentMethod: string }) =>
      api.post(`/api/reservations/${reservationId}/mark-paid`, { paymentMethod }),
    onSuccess: () => {
      invalidateAll();
      toast({ title: 'Rezervace byla označena jako zaplacená' });
    },
    onError: (error: Error) => {
      toast({
        title: 'Chyba při označování jako zaplaceno',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Mark invoice as paid mutation
  const markInvoicePaidMutation = useMutation({
    mutationFn: (invoiceId: number) => api.post(`/api/invoices/${invoiceId}/pay`),
    onSuccess: () => {
      invalidateAll();
      toast({ title: 'Faktura byla označena jako zaplacená' });
    },
    onError: (error: Error) => {
      toast({
        title: 'Chyba při označování faktury',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Create invoice mutation (legacy)
  const createInvoiceMutation = useMutation({
    mutationFn: (reservationId: number) =>
      api.post<Invoice>(`/api/invoices/create-from-reservation/${reservationId}`),
    onSuccess: () => {
      invalidateAll();
      toast({ title: 'Faktura byla úspěšně vytvořena' });
    },
    onError: (error: Error) => {
      toast({
        title: 'Chyba při vytváření faktury',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const handleCreateDepositInvoice = (percent: number = 25) => {
    if (reservation?.id) {
      createDepositMutation.mutate({ reservationId: reservation.id, percent });
    }
  };

  const handleCreateFinalInvoice = () => {
    if (reservation?.id) {
      createFinalMutation.mutate(reservation.id);
    }
  };

  const handleMarkAsPaid = (method: string = 'CASH') => {
    if (reservation?.id) {
      markPaidMutation.mutate({ reservationId: reservation.id, paymentMethod: method });
    }
  };

  const handleCreateInvoice = () => {
    if (reservation?.id) {
      createInvoiceMutation.mutate(reservation.id);
    }
  };

  const isAnyMutationPending =
    createDepositMutation.isPending ||
    createFinalMutation.isPending ||
    markPaidMutation.isPending ||
    createInvoiceMutation.isPending ||
    markInvoicePaidMutation.isPending;

  const formatCurrency = (value: number | string | undefined) => {
    const num = typeof value === 'string' ? parseFloat(value) : value ?? 0;
    return num.toLocaleString('cs-CZ', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-serif">Detail rezervace #{reservation?.id}</DialogTitle>
        </DialogHeader>

        {reservation && (
          <div className="space-y-6">
            <div>
              <h3 className="font-semibold mb-3">Základní informace</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Datum</p>
                  <p className="font-medium">{dayjs(reservation.date).format('DD.MM.YYYY')}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Status</p>
                  <StatusBadge status={reservation.status} type="reservation" />
                </div>
              </div>
            </div>

            <div>
              <h3 className="font-semibold mb-3">Kontaktní údaje</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Jméno</p>
                  <p className="font-medium">{reservation.contactName}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Email</p>
                  <p className="font-medium">{reservation.contactEmail}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Telefon</p>
                  <p className="font-mono">{reservation.contactPhone}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Národnost</p>
                  <p className="font-medium">{reservation.contactNationality}</p>
                </div>
                {reservation.clientComeFrom && (
                  <div className="col-span-2">
                    <p className="text-muted-foreground">Zdroj</p>
                    <p className="font-medium">{reservation.clientComeFrom}</p>
                  </div>
                )}
                {reservation.contactNote && (
                  <div className="col-span-2">
                    <p className="text-muted-foreground">Poznámka</p>
                    <p className="font-medium">{reservation.contactNote}</p>
                  </div>
                )}
              </div>
            </div>

            {reservation.persons && reservation.persons.length > 0 && (
              <div>
                <h3 className="font-semibold mb-3">Osoby ({reservation.persons.length})</h3>
                <div className="space-y-2">
                  {reservation.persons.map((person, index) => (
                    <div key={person.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-medium">
                          {index + 1}
                        </div>
                        <div>
                          <p className="font-medium">{PERSON_TYPE_LABELS[person.type]}</p>
                          <p className="text-sm text-muted-foreground">Menu: {person.menu || 'Bez jídla'}</p>
                        </div>
                      </div>
                      <p className="font-mono font-medium">{Math.round(person.price).toLocaleString('cs-CZ')} Kč</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {!reservation.invoiceSameAsContact && reservation.invoiceName && (
              <div>
                <h3 className="font-semibold mb-3">Fakturační údaje</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Jméno</p>
                    <p className="font-medium">{reservation.invoiceName}</p>
                  </div>
                  {reservation.invoiceCompany && (
                    <div>
                      <p className="text-muted-foreground">Firma</p>
                      <p className="font-medium">{reservation.invoiceCompany}</p>
                    </div>
                  )}
                  {reservation.invoiceIc && (
                    <div>
                      <p className="text-muted-foreground">IČ</p>
                      <p className="font-mono">{reservation.invoiceIc}</p>
                    </div>
                  )}
                  {reservation.invoiceDic && (
                    <div>
                      <p className="text-muted-foreground">DIČ</p>
                      <p className="font-mono">{reservation.invoiceDic}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {reservation.transferSelected && (
              <div>
                <h3 className="font-semibold mb-3">Transfer</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Počet osob</p>
                    <p className="font-medium">{reservation.transferCount}</p>
                  </div>
                  {reservation.transferAddress && (
                    <div className="col-span-2">
                      <p className="text-muted-foreground">Adresa</p>
                      <p className="font-medium">{reservation.transferAddress}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {reservation.payments && reservation.payments.length > 0 && (
              <div>
                <h3 className="font-semibold mb-3">Platby ({reservation.payments.length})</h3>
                <div className="space-y-2">
                  {reservation.payments.map((payment) => (
                    <div key={payment.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                      <div>
                        <p className="font-medium font-mono text-sm">ID: {payment.transactionId}</p>
                        <p className="text-xs text-muted-foreground">
                          {dayjs(payment.createdAt).format('DD.MM.YYYY HH:mm')}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <p className="font-mono font-medium">{payment.amount} Kč</p>
                        <StatusBadge status={payment.status} type="payment" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <Separator />

            {/* Platby a faktury */}
            <div>
              <h3 className="font-semibold mb-4">Platby a faktury</h3>

              {/* Payment Summary */}
              {summaryLoading ? (
                <div className="flex justify-center py-4">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              ) : paymentSummary && (
                <div className="space-y-4">
                  {/* Summary Cards */}
                  <div className="grid grid-cols-3 gap-4">
                    <div className="p-4 rounded-lg bg-muted/50 text-center">
                      <p className="text-sm text-muted-foreground">Celková cena</p>
                      <p className="text-xl font-bold font-mono">
                        {formatCurrency(paymentSummary.totalPrice)} Kč
                      </p>
                    </div>
                    <div className="p-4 rounded-lg bg-green-500/10 text-center">
                      <p className="text-sm text-muted-foreground">Zaplaceno</p>
                      <p className="text-xl font-bold font-mono text-green-600">
                        {formatCurrency(paymentSummary.paidAmount)} Kč
                      </p>
                    </div>
                    <div className="p-4 rounded-lg bg-orange-500/10 text-center">
                      <p className="text-sm text-muted-foreground">Zbývá</p>
                      <p className="text-xl font-bold font-mono text-orange-600">
                        {formatCurrency(paymentSummary.remainingAmount)} Kč
                      </p>
                    </div>
                  </div>

                  {/* Payment Status */}
                  <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                    <div className="flex items-center gap-2">
                      <CreditCard className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm">Stav platby:</span>
                      <span className={`font-medium ${
                        paymentSummary.paymentStatus === 'PAID' ? 'text-green-600' :
                        paymentSummary.paymentStatus === 'PARTIAL' ? 'text-orange-600' :
                        'text-red-600'
                      }`}>
                        {RESERVATION_PAYMENT_STATUS_LABELS[paymentSummary.paymentStatus]}
                      </span>
                    </div>
                    {paymentSummary.paymentMethod && (
                      <span className="text-sm text-muted-foreground">
                        Způsob: {RESERVATION_PAYMENT_METHOD_LABELS[paymentSummary.paymentMethod]}
                      </span>
                    )}
                  </div>

                  {/* Quick Actions */}
                  {!paymentSummary.isFullyPaid && (
                    <div className="flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleCreateDepositInvoice(25)}
                        disabled={isAnyMutationPending}
                      >
                        {createDepositMutation.isPending ? (
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                          <Receipt className="w-4 h-4 mr-2" />
                        )}
                        Záloha 25%
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleCreateDepositInvoice(50)}
                        disabled={isAnyMutationPending}
                      >
                        <Receipt className="w-4 h-4 mr-2" />
                        Záloha 50%
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleCreateFinalInvoice}
                        disabled={isAnyMutationPending}
                      >
                        {createFinalMutation.isPending ? (
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                          <FileText className="w-4 h-4 mr-2" />
                        )}
                        Ostrá faktura
                      </Button>
                      <Button
                        size="sm"
                        variant="default"
                        onClick={() => handleMarkAsPaid('CASH')}
                        disabled={isAnyMutationPending}
                      >
                        {markPaidMutation.isPending ? (
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                          <Banknote className="w-4 h-4 mr-2" />
                        )}
                        Hotově zaplaceno
                      </Button>
                    </div>
                  )}

                  {paymentSummary.isFullyPaid && (
                    <div className="flex items-center gap-2 p-3 rounded-lg bg-green-500/10 text-green-600">
                      <CheckCircle className="w-5 h-5" />
                      <span className="font-medium">Rezervace je plně zaplacena</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            <Separator />

            {/* Faktury */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold">Vystavené faktury</h3>
              </div>

              {invoicesLoading ? (
                <div className="flex justify-center py-4">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              ) : invoices && invoices.length > 0 ? (
                <div className="space-y-2">
                  {invoices.map((invoice) => (
                    <div key={invoice.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium font-mono text-sm">{invoice.invoiceNumber}</p>
                          {invoice.invoiceType && (
                            <span className={`text-xs px-2 py-0.5 rounded-full ${
                              invoice.invoiceType === 'DEPOSIT' ? 'bg-blue-100 text-blue-700' :
                              invoice.invoiceType === 'FINAL' ? 'bg-purple-100 text-purple-700' :
                              'bg-gray-100 text-gray-700'
                            }`}>
                              {INVOICE_TYPE_LABELS[invoice.invoiceType]}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Vystaveno: {dayjs(invoice.issueDate).format('DD.MM.YYYY')} | Splatnost: {dayjs(invoice.dueDate).format('DD.MM.YYYY')}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <p className="font-mono font-medium">
                          {formatCurrency(invoice.total)} {invoice.currency}
                        </p>
                        <StatusBadge status={invoice.status} type="invoice" />
                        {invoice.status !== 'PAID' && invoice.status !== 'CANCELLED' && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => markInvoicePaidMutation.mutate(invoice.id)}
                            disabled={markInvoicePaidMutation.isPending}
                          >
                            {markInvoicePaidMutation.isPending ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <CheckCircle className="w-4 h-4" />
                            )}
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Žádné faktury pro tuto rezervaci
                </p>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
