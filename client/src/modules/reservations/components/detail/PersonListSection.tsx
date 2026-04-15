import dayjs from 'dayjs';
import { StatusBadge } from '@/shared/components/StatusBadge';
import { SectionHeader } from '@/shared/components/SectionHeader';
import { formatCurrency } from '@/shared/lib/formatting';
import { PERSON_TYPE_LABELS } from '@shared/types';
import type { PersonListSectionProps } from '@modules/reservations/types/components/detail/PersonListSection';

export function PersonListSection({ reservation }: PersonListSectionProps) {
  const cur = reservation.currency;

  return (
    <>
      {reservation.persons && reservation.persons.length > 0 && (
        <div>
          <SectionHeader title={`Osoby (${reservation.persons.length})`} className="mb-3" />
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
                <p className="font-mono font-medium">{formatCurrency(person.price, cur)}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {reservation.payments && reservation.payments.length > 0 && (
        <div>
          <SectionHeader title={`Platby (${reservation.payments.length})`} className="mb-3" />
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
                  <p className="font-mono font-medium">{formatCurrency(payment.amount, payment.currency ?? cur)}</p>
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
