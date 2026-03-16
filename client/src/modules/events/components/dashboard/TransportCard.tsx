import { useState } from "react";
import { Car, Phone, Mail, Users, ChevronDown, ChevronRight, MapPin } from "lucide-react";
import { Badge } from "@/shared/components/ui/badge";
import type { TransportSummary, TaxiReservation } from "@shared/types";

interface TransportCardProps {
  transport: TransportSummary;
}

export function TransportCard({ transport }: TransportCardProps) {
  const [expanded, setExpanded] = useState(false);

  const reservationsWithTaxi = transport.reservationsWithTaxi.filter((r) => r.hasTaxi);
  const hasTaxiReservations = reservationsWithTaxi.length > 0;

  return (
    <div className="p-4 space-y-2">
      <div className="flex gap-4 text-sm text-muted-foreground">
        <span className="flex items-center gap-1">
          <Users className="h-4 w-4" />
          {transport.totalPassengers} cestujících
        </span>
        {hasTaxiReservations && (
          <span className="text-orange-500 font-medium">
            {reservationsWithTaxi.length} s taxi
          </span>
        )}
      </div>
        {hasTaxiReservations ? (
          <>
            <button
              onClick={() => setExpanded(!expanded)}
              className="w-full flex items-center justify-between p-3 bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg hover:bg-amber-100/60 dark:hover:bg-amber-950/30 touch-manipulation min-h-[48px]"
            >
              <div className="flex items-center gap-2">
                {expanded ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
                <span className="font-medium text-amber-700 dark:text-amber-400">
                  Rezervace s taxi ({reservationsWithTaxi.length})
                </span>
              </div>
            </button>

            {expanded && (
              <div className="space-y-2 pt-2">
                {reservationsWithTaxi.map((reservation) => (
                  <TaxiReservationItem
                    key={reservation.reservationId}
                    reservation={reservation}
                  />
                ))}
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-4 text-muted-foreground">
            <Car className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Žádné rezervace taxi</p>
            <p className="text-xs">
              Celkem {transport.totalReservations} rezervací na tento den
            </p>
          </div>
        )}

        {/* All reservations summary */}
        {transport.totalReservations > 0 && !hasTaxiReservations && (
          <div className="pt-2 border-t">
            <p className="text-xs text-muted-foreground mb-2">
              Všechny rezervace ({transport.totalReservations})
            </p>
            <div className="max-h-32 overflow-y-auto space-y-1">
              {transport.reservationsWithTaxi.slice(0, 5).map((r) => (
                <div
                  key={r.reservationId}
                  className="flex items-center justify-between text-sm p-2 bg-amber-50/40 dark:bg-amber-950/10 rounded"
                >
                  <span className="truncate">{r.contactName}</span>
                  <Badge variant="outline" className="text-xs">
                    {r.passengerCount} os.
                  </Badge>
                </div>
              ))}
              {transport.totalReservations > 5 && (
                <p className="text-xs text-muted-foreground text-center">
                  a {transport.totalReservations - 5} dalších...
                </p>
              )}
            </div>
          </div>
        )}
    </div>
  );
}

interface TaxiReservationItemProps {
  reservation: TaxiReservation;
}

function TaxiReservationItem({ reservation }: TaxiReservationItemProps) {
  return (
    <div className="p-3 border rounded-lg bg-background">
      <div className="flex items-start justify-between mb-2">
        <div className="font-medium">{reservation.contactName}</div>
        <Badge variant="secondary" className="flex items-center gap-1">
          <Users className="h-3 w-3" />
          {reservation.passengerCount}
        </Badge>
      </div>

      <div className="space-y-1 text-sm">
        {reservation.contactPhone && (
          <a
            href={`tel:${reservation.contactPhone}`}
            className="flex items-center gap-2 text-primary hover:underline"
          >
            <Phone className="h-3 w-3" />
            {reservation.contactPhone}
          </a>
        )}
        {reservation.contactEmail && (
          <a
            href={`mailto:${reservation.contactEmail}`}
            className="flex items-center gap-2 text-muted-foreground hover:text-primary"
          >
            <Mail className="h-3 w-3" />
            {reservation.contactEmail}
          </a>
        )}
        {reservation.pickupAddress && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <MapPin className="h-3 w-3" />
            {reservation.pickupAddress}
          </div>
        )}
      </div>
    </div>
  );
}
