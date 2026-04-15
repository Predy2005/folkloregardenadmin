import dayjs from 'dayjs';
import { StatusBadge } from '@/shared/components/StatusBadge';
import { SectionHeader } from '@/shared/components/SectionHeader';
import type { ReservationInfoSectionProps } from '@modules/reservations/types/components/detail/ReservationInfoSection';

export function ReservationInfoSection({ reservation }: ReservationInfoSectionProps) {
  return (
    <>
      <div>
        <SectionHeader title="Základní informace" className="mb-3" />
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground">Datum</p>
            <p className="font-medium">{dayjs(reservation.date).format('DD.MM.YYYY')}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Status</p>
            <StatusBadge status={reservation.status} type="reservation" />
          </div>
          {reservation.reservationType && (
            <div>
              <p className="text-muted-foreground">Druh rezervace</p>
              <span
                className="inline-flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-full"
                style={{
                  backgroundColor: reservation.reservationType.color + '20',
                  color: reservation.reservationType.color,
                }}
              >
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: reservation.reservationType.color }}
                />
                {reservation.reservationType.name}
              </span>
            </div>
          )}
        </div>
      </div>

      <div>
        <SectionHeader title="Kontaktní údaje" className="mb-3" />
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

      {!reservation.invoiceSameAsContact && reservation.invoiceName && (
        <div>
          <SectionHeader title="Fakturační údaje" className="mb-3" />
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
          <SectionHeader title="Transfer" className="mb-3" />
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
    </>
  );
}
