import {
  Minus,
  Plus,
  Check,
  CheckCircle2,
  ChevronRight,
  MapPin,
} from "lucide-react";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { InfoTooltip } from "@/shared/components/ui/info-tooltip";
import { FlagIcon } from "@/shared/components/FlagIcon";
import { getIsoCode } from "@/shared/lib/nationality";
import { cn } from "@/shared/lib/utils";
import { useUpdateReservationPresence } from "../../../hooks";
import { ReservationPaymentInfo } from "./ReservationPaymentInfo";
import type { ReservationGuestData } from "@shared/types";

interface ReservationCardProps {
  reservation: ReservationGuestData;
  eventId: number;
  onOpenDetail: () => void;
}

export function ReservationCard({ reservation, eventId, onOpenDetail }: ReservationCardProps) {
  const updatePresence = useUpdateReservationPresence(eventId);
  const isComplete = reservation.presence.present >= reservation.presence.total;
  const isoCode = reservation.nationality ? getIsoCode(reservation.nationality) : null;

  const handleQuickCheckIn = (e: React.MouseEvent) => {
    e.stopPropagation();
    updatePresence.mutate({
      reservationId: reservation.reservationId,
      presentCount: reservation.presence.total,
    });
  };

  const handleIncrement = (e: React.MouseEvent) => {
    e.stopPropagation();
    updatePresence.mutate({
      reservationId: reservation.reservationId,
      presentCount: Math.min(reservation.presence.total, reservation.presence.present + 1),
    });
  };

  const handleDecrement = (e: React.MouseEvent) => {
    e.stopPropagation();
    updatePresence.mutate({
      reservationId: reservation.reservationId,
      presentCount: Math.max(0, reservation.presence.present - 1),
    });
  };

  return (
    <div
      onClick={onOpenDetail}
      className={cn(
        "flex items-center gap-3 p-3 cursor-pointer transition-colors active:bg-muted/70",
        isComplete
          ? "bg-green-50 dark:bg-green-950/20"
          : "hover:bg-muted/50"
      )}
    >
      {/* Flag */}
      <div className="shrink-0 w-8">
        {isoCode ? (
          <FlagIcon code={isoCode} className="h-6 w-8 rounded-sm shadow-sm" />
        ) : (
          <Badge variant="outline" className="text-xs">
            {reservation.nationality?.toUpperCase().slice(0, 2) || "?"}
          </Badge>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium truncate">
            {reservation.contactName || `#${reservation.reservationId}`}
          </span>
          <ReservationPaymentInfo
            status={reservation.paymentStatus}
            percentage={reservation.paidPercentage}
          />
          {reservation.reservationType && reservation.reservationType.code !== 'standard' && (
            <Badge
              className="text-[10px] py-0 px-1.5"
              style={{ backgroundColor: reservation.reservationType.color + '20', color: reservation.reservationType.color }}
            >
              {reservation.reservationType.name}
              {reservation.reservationType.note && ` · ${reservation.reservationType.note}`}
            </Badge>
          )}
        </div>
        <div className="text-xs text-muted-foreground flex items-center gap-2 mt-0.5">
          <span>
            {reservation.types.adults > 0 && `${reservation.types.adults} dosp.`}
            {reservation.types.children > 0 && ` +${reservation.types.children} dětí`}
            {reservation.types.free > 0 && ` +${reservation.types.free} zdarma`}
          </span>
          {reservation.spaceName && (
            <Badge variant="outline" className="text-[10px] py-0">
              <MapPin className="h-2.5 w-2.5 mr-0.5" />
              {reservation.spaceName}
            </Badge>
          )}
        </div>
      </div>

      {/* Quick controls */}
      <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
        {/* Counter */}
        <Button
          variant="outline"
          size="icon"
          className="h-11 w-11 touch-manipulation"
          onClick={handleDecrement}
          disabled={updatePresence.isPending || reservation.presence.present <= 0}
        >
          <Minus className="h-4 w-4" />
        </Button>

        <InfoTooltip
          content={
            <div>
              <div className="font-medium">Check-in stav</div>
              <div className="text-xs text-muted-foreground">
                {reservation.presence.present} z {reservation.presence.total} hostů přítomno
              </div>
            </div>
          }
        >
          <div className="min-w-[50px] text-center px-2 cursor-help">
            <span className={cn("font-bold text-lg", isComplete && "text-green-600")}>
              {reservation.presence.present}
            </span>
            <span className="text-muted-foreground text-sm">/{reservation.presence.total}</span>
          </div>
        </InfoTooltip>

        <Button
          variant="outline"
          size="icon"
          className="h-11 w-11 touch-manipulation"
          onClick={handleIncrement}
          disabled={updatePresence.isPending || isComplete}
        >
          <Plus className="h-4 w-4" />
        </Button>

        {/* Quick check-in all */}
        <Button
          variant={isComplete ? "default" : "outline"}
          size="icon"
          className={cn(
            "h-11 w-11 touch-manipulation ml-1",
            isComplete && "bg-green-600 hover:bg-green-700"
          )}
          onClick={handleQuickCheckIn}
          disabled={updatePresence.isPending || isComplete}
        >
          {isComplete ? (
            <CheckCircle2 className="h-5 w-5" />
          ) : (
            <Check className="h-5 w-5" />
          )}
        </Button>
      </div>

      {/* Detail arrow */}
      <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
    </div>
  );
}
