import dayjs from 'dayjs';
import { StatusBadge } from '@/shared/components/StatusBadge';
import type { Reservation } from '@shared/types';
import { PERSON_TYPE_LABELS } from '@shared/types';

type Props = {
  reservation: Reservation;
};

export function PersonListSection({ reservation }: Props) {
  return (
    <>
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
                <p className="font-mono font-medium">{Math.round(Number(person.price)).toLocaleString('cs-CZ')} Kč</p>
              </div>
            ))}
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
    </>
  );
}
