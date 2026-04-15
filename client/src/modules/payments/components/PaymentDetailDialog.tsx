import { Button } from "@/shared/components/ui/button";
import { SectionHeader } from "@/shared/components/SectionHeader";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/shared/components/ui/dialog";
import { StatusBadge } from "@/shared/components/StatusBadge";
import { CreditCard, User, Calendar, Phone, Mail, MapPin } from "lucide-react";
import type { Payment, Reservation } from "@shared/types";
import { formatCurrency } from "@/shared/lib/formatting";
import dayjs from "dayjs";

interface PaymentDetailDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  selectedPayment: Payment | null;
  linkedReservation: Reservation | null;
}

export function PaymentDetailDialog({
  isOpen,
  onOpenChange,
  selectedPayment,
  linkedReservation,
}: PaymentDetailDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
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
              <SectionHeader title="Informace o platbě" size="lg" />
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
                  <p className="font-bold text-lg">{formatCurrency(Number(selectedPayment.amount), selectedPayment.currency)}</p>
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
              <SectionHeader title="Přiřazená rezervace" size="lg" />
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
                          {formatCurrency((linkedReservation.persons || []).reduce((sum, p) => sum + Number(p.price || 0), 0))}
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
                        onOpenChange(false);
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
  );
}
