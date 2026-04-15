import { useState } from "react";
import { Car, Phone, Mail, Users, ChevronDown, ChevronRight, MapPin, Truck, DollarSign } from "lucide-react";
import { Badge } from "@/shared/components/ui/badge";
import type { TransportSummary, TaxiReservation, DashboardEventTransport } from "@shared/types";
import { formatCurrency } from "@/shared/lib/formatting";

const PAYMENT_LABELS: Record<string, string> = {
  PENDING: "Nezaplaceno",
  INVOICED: "Fakturováno",
  PAID: "Zaplaceno",
};

const TYPE_LABELS: Record<string, string> = {
  ARRIVAL: "Příjezd",
  DEPARTURE: "Odjezd",
  BOTH: "Příjezd i odjezd",
  SHUTTLE: "Shuttle",
};

const paymentBadgeVariant = (status: string) => {
  switch (status) {
    case "PAID": return "default" as const;
    case "INVOICED": return "outline" as const;
    default: return "secondary" as const;
  }
};

interface TransportCardProps {
  transport: TransportSummary;
  eventId?: number;
}

export function TransportCard({ transport }: TransportCardProps) {
  const [taxiExpanded, setTaxiExpanded] = useState(false);
  const [eventTransportExpanded, setEventTransportExpanded] = useState(true);

  const reservationsWithTaxi = transport.reservationsWithTaxi.filter((r) => r.hasTaxi);
  const hasTaxiReservations = reservationsWithTaxi.length > 0;
  const eventTransports = transport.eventTransports ?? [];
  const hasEventTransports = eventTransports.length > 0;

  return (
    <div className="p-4 space-y-3">
      {/* Event-level transport assignments */}
      {hasEventTransports && (
        <div>
          <button
            onClick={() => setEventTransportExpanded(!eventTransportExpanded)}
            className="w-full flex items-center justify-between p-3 bg-blue-50/60 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg hover:bg-blue-100/60 min-h-[48px]"
          >
            <div className="flex items-center gap-2">
              {eventTransportExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              <Truck className="h-4 w-4 text-blue-600" />
              <span className="font-medium text-blue-700 dark:text-blue-400">
                Přiřazená doprava ({eventTransports.length})
              </span>
            </div>
            <span className="text-sm font-medium text-blue-600">
              {formatCurrency(eventTransports.reduce((s, a) => s + (parseFloat(a.price ?? "0")), 0))}
            </span>
          </button>

          {eventTransportExpanded && (
            <div className="space-y-2 pt-2">
              {eventTransports.map((a) => (
                <EventTransportItem key={a.id} assignment={a} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Taxi reservations */}
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
            onClick={() => setTaxiExpanded(!taxiExpanded)}
            className="w-full flex items-center justify-between p-3 bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg hover:bg-amber-100/60 min-h-[48px]"
          >
            <div className="flex items-center gap-2">
              {taxiExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              <span className="font-medium text-amber-700 dark:text-amber-400">
                Rezervace s taxi ({reservationsWithTaxi.length})
              </span>
            </div>
          </button>

          {taxiExpanded && (
            <div className="space-y-2 pt-2">
              {reservationsWithTaxi.map((reservation) => (
                <TaxiReservationItem key={reservation.reservationId} reservation={reservation} />
              ))}
            </div>
          )}
        </>
      ) : !hasEventTransports ? (
        <div className="text-center py-4 text-muted-foreground">
          <Car className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">Žádná doprava</p>
          <p className="text-xs">
            Přiřaďte dopravu v záložce "Doprava" v editaci akce
          </p>
        </div>
      ) : null}
    </div>
  );
}

function EventTransportItem({ assignment: a }: { assignment: DashboardEventTransport }) {
  return (
    <div className="p-3 border rounded-lg bg-background">
      <div className="flex items-start justify-between mb-1">
        <div>
          <span className="font-medium">{a.companyName}</span>
          {a.transportType && (
            <Badge variant="outline" className="ml-2 text-xs">
              {TYPE_LABELS[a.transportType] || a.transportType}
            </Badge>
          )}
        </div>
        <Badge variant={paymentBadgeVariant(a.paymentStatus ?? "PENDING")}>
          {PAYMENT_LABELS[a.paymentStatus ?? "PENDING"]}
        </Badge>
      </div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-sm text-muted-foreground">
        {a.vehiclePlate && (
          <span>Vozidlo: <span className="text-foreground">{a.vehiclePlate}</span></span>
        )}
        {a.driverName && (
          <span>Řidič: <span className="text-foreground">{a.driverName}</span></span>
        )}
        {a.scheduledTime && (
          <span>Čas: <span className="text-foreground">{a.scheduledTime}</span></span>
        )}
        {a.passengerCount && (
          <span>Osob: <span className="text-foreground">{a.passengerCount}</span></span>
        )}
        {a.pickupLocation && (
          <span className="col-span-2 flex items-center gap-1">
            <MapPin className="h-3 w-3" />
            {a.pickupLocation}
            {a.dropoffLocation && ` → ${a.dropoffLocation}`}
          </span>
        )}
        {a.price && (
          <span className="flex items-center gap-1">
            <DollarSign className="h-3 w-3" />
            {formatCurrency(parseFloat(a.price))}
          </span>
        )}
        {a.invoiceNumber && <span>Faktura: {a.invoiceNumber}</span>}
      </div>
      {a.notes && <p className="text-xs text-muted-foreground mt-1 italic">{a.notes}</p>}
    </div>
  );
}

function TaxiReservationItem({ reservation }: { reservation: TaxiReservation }) {
  const transfers = reservation.transfers ?? [];
  const hasTransportAssigned = transfers.some((t) => t.transportCompanyName);

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
          <a href={`tel:${reservation.contactPhone}`} className="flex items-center gap-2 text-primary hover:underline">
            <Phone className="h-3 w-3" />
            {reservation.contactPhone}
          </a>
        )}
        {reservation.contactEmail && (
          <a href={`mailto:${reservation.contactEmail}`} className="flex items-center gap-2 text-muted-foreground hover:text-primary">
            <Mail className="h-3 w-3" />
            {reservation.contactEmail}
          </a>
        )}

        {/* Show individual transfers with transport info */}
        {transfers.length > 0 ? (
          transfers.map((t, i) => (
            <div key={i} className="flex items-start gap-2 text-muted-foreground bg-muted/30 p-2 rounded">
              <MapPin className="h-3 w-3 mt-0.5 shrink-0" />
              <div className="min-w-0">
                <div>{t.address} ({t.personCount} os.)</div>
                {t.transportCompanyName && (
                  <div className="text-xs text-foreground">
                    <Truck className="h-3 w-3 inline mr-1" />
                    {t.transportCompanyName}
                    {t.transportVehiclePlate && ` — ${t.transportVehiclePlate}`}
                    {t.transportDriverName && ` — ${t.transportDriverName}`}
                  </div>
                )}
              </div>
            </div>
          ))
        ) : reservation.pickupAddress ? (
          <div className="flex items-center gap-2 text-muted-foreground">
            <MapPin className="h-3 w-3" />
            {reservation.pickupAddress}
          </div>
        ) : null}
      </div>
    </div>
  );
}
