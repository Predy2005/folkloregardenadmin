import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { StatusBadge } from '@/components/StatusBadge';
import { Search, Eye } from 'lucide-react';
import type { Reservation } from '@shared/types';
import dayjs from 'dayjs';
import { useState } from 'react';
import { PERSON_TYPE_LABELS } from '@shared/types';

export default function Reservations() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null);

  const { data: reservations, isLoading } = useQuery({
    queryKey: ['/api/reservations'],
    queryFn: () => api.get<Reservation[]>('/api/reservations'),
  });

  const filteredReservations = reservations?.filter((reservation) => {
    const search = searchTerm.toLowerCase();
    return (
      reservation.contactName.toLowerCase().includes(search) ||
      reservation.contactEmail.toLowerCase().includes(search) ||
      reservation.contactPhone.includes(search) ||
      reservation.id.toString().includes(search)
    );
  });

  const openDetailModal = (reservation: Reservation) => {
    setSelectedReservation(reservation);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Načítání rezervací...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-serif font-bold mb-2">Rezervace</h1>
          <p className="text-muted-foreground">Správa všech rezervací</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Hledat rezervace..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
                data-testid="input-search-reservations"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Datum</TableHead>
                  <TableHead>Jméno</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Telefon</TableHead>
                  <TableHead>Osoby</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Akce</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredReservations?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      Žádné rezervace
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredReservations?.map((reservation) => (
                    <TableRow key={reservation.id} className="hover-elevate" data-testid={`row-reservation-${reservation.id}`}>
                      <TableCell className="font-mono text-sm">#{reservation.id}</TableCell>
                      <TableCell>{dayjs(reservation.date).format('DD.MM.YYYY')}</TableCell>
                      <TableCell className="font-medium">{reservation.contactName}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{reservation.contactEmail}</TableCell>
                      <TableCell className="font-mono text-sm">{reservation.contactPhone}</TableCell>
                      <TableCell>{reservation.persons?.length || 0}</TableCell>
                      <TableCell>
                        <StatusBadge status={reservation.status} type="reservation" />
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openDetailModal(reservation)}
                          data-testid={`button-view-${reservation.id}`}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Detail Modal */}
      <Dialog open={!!selectedReservation} onOpenChange={() => setSelectedReservation(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-serif">Detail rezervace #{selectedReservation?.id}</DialogTitle>
          </DialogHeader>

          {selectedReservation && (
            <div className="space-y-6">
              {/* Kontaktní údaje */}
              <div>
                <h3 className="font-semibold mb-3">Kontaktní údaje</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Jméno</p>
                    <p className="font-medium">{selectedReservation.contactName}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Email</p>
                    <p className="font-medium">{selectedReservation.contactEmail}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Telefon</p>
                    <p className="font-mono">{selectedReservation.contactPhone}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Národnost</p>
                    <p className="font-medium">{selectedReservation.contactNationality}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Datum</p>
                    <p className="font-medium">{dayjs(selectedReservation.date).format('DD.MM.YYYY')}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Status</p>
                    <StatusBadge status={selectedReservation.status} type="reservation" />
                  </div>
                  {selectedReservation.clientComeFrom && (
                    <div className="col-span-2">
                      <p className="text-muted-foreground">Zdroj</p>
                      <p className="font-medium">{selectedReservation.clientComeFrom}</p>
                    </div>
                  )}
                  {selectedReservation.contactNote && (
                    <div className="col-span-2">
                      <p className="text-muted-foreground">Poznámka</p>
                      <p className="font-medium">{selectedReservation.contactNote}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Osoby */}
              {selectedReservation.persons && selectedReservation.persons.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-3">Osoby ({selectedReservation.persons.length})</h3>
                  <div className="space-y-2">
                    {selectedReservation.persons.map((person, index) => (
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
                        <p className="font-mono font-medium">{person.price} Kč</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Fakturační údaje */}
              {!selectedReservation.invoiceSameAsContact && selectedReservation.invoiceName && (
                <div>
                  <h3 className="font-semibold mb-3">Fakturační údaje</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Jméno</p>
                      <p className="font-medium">{selectedReservation.invoiceName}</p>
                    </div>
                    {selectedReservation.invoiceCompany && (
                      <div>
                        <p className="text-muted-foreground">Firma</p>
                        <p className="font-medium">{selectedReservation.invoiceCompany}</p>
                      </div>
                    )}
                    {selectedReservation.invoiceIc && (
                      <div>
                        <p className="text-muted-foreground">IČ</p>
                        <p className="font-mono">{selectedReservation.invoiceIc}</p>
                      </div>
                    )}
                    {selectedReservation.invoiceDic && (
                      <div>
                        <p className="text-muted-foreground">DIČ</p>
                        <p className="font-mono">{selectedReservation.invoiceDic}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Transfer */}
              {selectedReservation.transferSelected && (
                <div>
                  <h3 className="font-semibold mb-3">Transfer</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Počet osob</p>
                      <p className="font-medium">{selectedReservation.transferCount}</p>
                    </div>
                    {selectedReservation.transferAddress && (
                      <div className="col-span-2">
                        <p className="text-muted-foreground">Adresa</p>
                        <p className="font-medium">{selectedReservation.transferAddress}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Platby */}
              {selectedReservation.payments && selectedReservation.payments.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-3">Platby ({selectedReservation.payments.length})</h3>
                  <div className="space-y-2">
                    {selectedReservation.payments.map((payment) => (
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
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
