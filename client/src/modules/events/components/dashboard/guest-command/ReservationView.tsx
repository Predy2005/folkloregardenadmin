import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import {
  Phone,
  Minus,
  Plus,
  CheckCircle2,
  ExternalLink,
  MapPin,
  Save,
} from "lucide-react";
import { formatCurrency } from "@/shared/lib/formatting";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Progress } from "@/shared/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import { FlagIcon } from "@/shared/components/FlagIcon";
import { getIsoCode } from "@/shared/lib/nationality";
import { cn } from "@/shared/lib/utils";
import { useUpdateReservationPresence } from "../../../hooks";
import { ReservationCard } from "./ReservationCard";
import { ReservationMenuBreakdown } from "./ReservationMenuBreakdown";
import { ReservationPaymentInfo } from "./ReservationPaymentInfo";
import type { ReservationGuestData } from "@shared/types";

interface ReservationViewProps {
  reservations: ReservationGuestData[];
  eventId: number;
  searchQuery?: string;
}

/**
 * Reservation view for check-in operations
 * Optimized for tablet with large touch targets
 */
export function ReservationView({ reservations, eventId, searchQuery = "" }: ReservationViewProps) {
  const [selectedReservation, setSelectedReservation] = useState<ReservationGuestData | null>(null);

  const filteredReservations = reservations.filter((res) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      res.contactName?.toLowerCase().includes(query) ||
      res.contactPhone?.includes(query) ||
      res.nationality?.toLowerCase().includes(query)
    );
  });

  // Sort: incomplete first, then by name
  const sortedReservations = [...filteredReservations].sort((a, b) => {
    const aComplete = a.presence.present >= a.presence.total;
    const bComplete = b.presence.present >= b.presence.total;
    if (aComplete !== bComplete) return aComplete ? 1 : -1;
    return (a.contactName || "").localeCompare(b.contactName || "");
  });

  return (
    <div className="flex flex-col h-full">
      {/* Reservation list */}
      <div className="flex-1 overflow-y-auto">
        {sortedReservations.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            {searchQuery ? "Žádné rezervace nenalezeny" : "Žádné rezervace"}
          </div>
        ) : (
          <div className="divide-y">
            {sortedReservations.map((reservation) => (
              <ReservationCard
                key={reservation.reservationId}
                reservation={reservation}
                eventId={eventId}
                onOpenDetail={() => setSelectedReservation(reservation)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Detail sheet */}
      <ReservationDetailSheet
        reservation={selectedReservation}
        eventId={eventId}
        onClose={() => setSelectedReservation(null)}
      />
    </div>
  );
}

/**
 * Detail sheet for reservation with menu breakdown
 */
function ReservationDetailSheet({
  reservation,
  eventId,
  onClose,
}: {
  reservation: ReservationGuestData | null;
  eventId: number;
  onClose: () => void;
}) {
  const [localPresent, setLocalPresent] = useState(0);
  const updatePresence = useUpdateReservationPresence(eventId);

  // Sync local state with reservation when it changes
  useEffect(() => {
    if (reservation) {
      setLocalPresent(reservation.presence.present);
    }
  }, [reservation?.reservationId, reservation?.presence.present]);

  if (!reservation) return null;

  const hasChanges = localPresent !== reservation.presence.present;

  const handleSave = () => {
    if (localPresent >= 0 && localPresent <= reservation.presence.total) {
      updatePresence.mutate({
        reservationId: reservation.reservationId,
        presentCount: localPresent,
      });
    }
  };

  const handleMarkAllPresent = () => {
    updatePresence.mutate({
      reservationId: reservation.reservationId,
      presentCount: reservation.presence.total,
    });
  };

  const handleIncrement = () => {
    setLocalPresent((prev) => Math.min(reservation.presence.total, prev + 1));
  };

  const handleDecrement = () => {
    setLocalPresent((prev) => Math.max(0, prev - 1));
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value, 10);
    if (!isNaN(value) && value >= 0 && value <= reservation.presence.total) {
      setLocalPresent(value);
    } else if (e.target.value === "") {
      setLocalPresent(0);
    }
  };

  const isoCode = reservation.nationality ? getIsoCode(reservation.nationality) : null;
  const isComplete = reservation.presence.present >= reservation.presence.total;

  return (
    <Dialog open={!!reservation} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader className="pb-4">
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-3">
              {isoCode && <FlagIcon code={isoCode} className="h-6 w-9 rounded shadow-sm" />}
              {reservation.contactName || `Rezervace #${reservation.reservationId}`}
            </DialogTitle>
            <EditReservationLink reservationId={reservation.reservationId} />
          </div>
        </DialogHeader>

        <div className="space-y-4">
          {/* Contact info */}
          <div className="flex items-center gap-4 flex-wrap">
            {reservation.contactPhone && (
              <a
                href={`tel:${reservation.contactPhone}`}
                className="flex items-center gap-2 px-4 py-3 bg-primary text-primary-foreground rounded-lg touch-manipulation"
              >
                <Phone className="h-5 w-5" />
                <span className="font-medium">{reservation.contactPhone}</span>
              </a>
            )}
            {reservation.spaceName && (
              <Badge variant="secondary" className="text-sm py-1.5 px-3">
                <MapPin className="h-4 w-4 mr-1" />
                {reservation.spaceName}
              </Badge>
            )}
            {reservation.reservationType && reservation.reservationType.code !== 'standard' && (
              <Badge
                className="text-sm py-1.5 px-3"
                style={{ backgroundColor: reservation.reservationType.color + '20', color: reservation.reservationType.color }}
              >
                {reservation.reservationType.name}
                {reservation.reservationType.note && ` · ${reservation.reservationType.note}`}
              </Badge>
            )}
          </div>

          {/* Stats grid */}
          <div className="grid grid-cols-3 gap-3">
            {/* Guest breakdown */}
            <div className="p-3 bg-muted/30 rounded-lg">
              <span className="text-xs text-muted-foreground">Hosté</span>
              <div className="mt-1 text-sm space-y-0.5">
                {reservation.types.adults > 0 && (
                  <div className="flex justify-between">
                    <span>Dospělí:</span>
                    <span className="font-medium">{reservation.types.adults}</span>
                  </div>
                )}
                {reservation.types.children > 0 && (
                  <div className="flex justify-between">
                    <span>Děti:</span>
                    <span className="font-medium">{reservation.types.children}</span>
                  </div>
                )}
                {reservation.types.drivers > 0 && (
                  <div className="flex justify-between text-orange-600">
                    <span>Řidiči:</span>
                    <span className="font-medium">{reservation.types.drivers}</span>
                  </div>
                )}
                {reservation.types.guides > 0 && (
                  <div className="flex justify-between text-orange-600">
                    <span>Průvodci:</span>
                    <span className="font-medium">{reservation.types.guides}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Payment */}
            <div className="p-3 bg-muted/30 rounded-lg">
              <span className="text-xs text-muted-foreground">Platba</span>
              <div className="mt-1">
                <ReservationPaymentInfo
                  status={reservation.paymentStatus}
                  percentage={reservation.paidPercentage}
                />
                <div className="mt-1 text-xs">
                  {formatCurrency(reservation.paidAmount, reservation.currency)} / {formatCurrency(reservation.totalPrice, reservation.currency)}
                </div>
              </div>
            </div>

            {/* Presence */}
            <div className="p-3 bg-muted/30 rounded-lg">
              <span className="text-xs text-muted-foreground">Přítomnost</span>
              <div className={cn("mt-1 text-2xl font-bold", isComplete && "text-green-600")}>
                {reservation.presence.present}/{reservation.presence.total}
              </div>
              <div className="text-xs text-muted-foreground">
                {reservation.presence.percentage}%
              </div>
            </div>
          </div>

          {/* Menu breakdown table */}
          {reservation.menuBreakdown && reservation.menuBreakdown.length > 0 && (
            <ReservationMenuBreakdown menuBreakdown={reservation.menuBreakdown} />
          )}

          {/* Presence controls - simplified */}
          <div className="space-y-3">
            <Progress value={reservation.presence.percentage} className="h-2" />

            {/* Input with +/- buttons and save */}
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                className="h-14 w-14 touch-manipulation shrink-0"
                onClick={handleDecrement}
                disabled={updatePresence.isPending || localPresent <= 0}
              >
                <Minus className="h-6 w-6" />
              </Button>

              <div className="flex-1 relative">
                <Input
                  type="number"
                  value={localPresent}
                  onChange={handleInputChange}
                  min={0}
                  max={reservation.presence.total}
                  className="h-14 text-2xl text-center font-bold pr-12"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-lg">
                  /{reservation.presence.total}
                </span>
              </div>

              <Button
                variant="outline"
                size="icon"
                className="h-14 w-14 touch-manipulation shrink-0"
                onClick={handleIncrement}
                disabled={updatePresence.isPending || localPresent >= reservation.presence.total}
              >
                <Plus className="h-6 w-6" />
              </Button>

              {/* All present button */}
              <Button
                variant={isComplete ? "default" : "outline"}
                size="icon"
                className={cn(
                  "h-14 w-14 touch-manipulation shrink-0",
                  isComplete && "bg-green-600 hover:bg-green-700"
                )}
                onClick={handleMarkAllPresent}
                disabled={updatePresence.isPending || isComplete}
                title="Všichni přítomni"
              >
                <CheckCircle2 className="h-6 w-6" />
              </Button>

              {/* Save button */}
              <Button
                variant={hasChanges ? "default" : "outline"}
                size="icon"
                className={cn(
                  "h-14 w-14 touch-manipulation shrink-0",
                  hasChanges && "bg-primary"
                )}
                onClick={handleSave}
                disabled={updatePresence.isPending || !hasChanges}
                title="Uložit"
              >
                <Save className="h-6 w-6" />
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function EditReservationLink({ reservationId }: { reservationId: number }) {
  const [, navigate] = useLocation();
  return (
    <Button
      variant="outline"
      size="sm"
      className="gap-1.5 touch-manipulation"
      onClick={() => navigate(`/reservations/${reservationId}/edit`)}
    >
      <ExternalLink className="h-3.5 w-3.5" />
      Upravit rezervaci
    </Button>
  );
}
