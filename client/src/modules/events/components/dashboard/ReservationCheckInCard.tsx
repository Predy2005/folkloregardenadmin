import { useState } from "react";
import {
  Users,
  Minus,
  Plus,
  Check,
  Phone,
  CheckCircle2,
  Search,
  Wallet,
  AlertCircle,
} from "lucide-react";
import { InfoTooltip } from "@/shared/components/ui/info-tooltip";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
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
import { useUpdateReservationPresence } from "../../hooks";
import type { ReservationGuestData, GuestPresenceStatus } from "@shared/types";

interface ReservationCheckInCardProps {
  reservations: ReservationGuestData[];
  totalPresence: GuestPresenceStatus;
  eventId: number;
}

/**
 * Check-in card for managing guest presence by reservation
 */
export function ReservationCheckInCard({
  reservations,
  totalPresence,
  eventId,
}: ReservationCheckInCardProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredReservations = reservations.filter((res) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      res.contactName?.toLowerCase().includes(query) ||
      res.contactPhone?.includes(query) ||
      res.nationality?.toLowerCase().includes(query)
    );
  });

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Users className="h-5 w-5 text-primary" />
          Check-in hostů
          <Badge variant="secondary" className="ml-auto">
            {totalPresence.present}/{totalPresence.total}
          </Badge>
        </CardTitle>

        {/* Progress bar */}
        <div className="space-y-2">
          <Progress value={totalPresence.percentage} className="h-2" />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{totalPresence.percentage}% přítomno</span>
            <span>{reservations.length} rezervací</span>
          </div>
        </div>

        {/* Search */}
        <div className="relative mt-2">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Hledat rezervaci..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </CardHeader>

      <CardContent className="space-y-2 max-h-[60vh] overflow-y-auto">
        {filteredReservations.length === 0 ? (
          <p className="text-center text-muted-foreground py-4">
            {searchQuery ? "Žádné rezervace nenalezeny" : "Žádné rezervace"}
          </p>
        ) : (
          filteredReservations.map((reservation) => (
            <ReservationRow
              key={reservation.reservationId}
              reservation={reservation}
              eventId={eventId}
            />
          ))
        )}
      </CardContent>
    </Card>
  );
}

interface ReservationRowProps {
  reservation: ReservationGuestData;
  eventId: number;
}

function ReservationRow({ reservation, eventId }: ReservationRowProps) {
  const [showInputDialog, setShowInputDialog] = useState(false);
  const [inputValue, setInputValue] = useState(
    reservation.presence.present.toString()
  );

  const updatePresence = useUpdateReservationPresence(eventId);

  const isComplete = reservation.presence.present >= reservation.presence.total;
  const isoCode = reservation.nationality
    ? getIsoCode(reservation.nationality)
    : null;

  const handleUpdatePresence = (newCount: number) => {
    updatePresence.mutate({
      reservationId: reservation.reservationId,
      presentCount: newCount,
    });
  };

  const handleDirectInput = () => {
    const value = parseInt(inputValue, 10);
    if (!isNaN(value) && value >= 0 && value <= reservation.presence.total) {
      handleUpdatePresence(value);
      setShowInputDialog(false);
    }
  };

  const openInputDialog = () => {
    setInputValue(reservation.presence.present.toString());
    setShowInputDialog(true);
  };

  // Payment status badge
  const getPaymentBadge = () => {
    switch (reservation.paymentStatus) {
      case "PAID":
        return (
          <Badge className="bg-green-500 text-white text-xs">
            <Wallet className="h-3 w-3 mr-1" />
            Zaplaceno
          </Badge>
        );
      case "PARTIAL":
        return (
          <InfoTooltip
            content={`Uhrazeno ${Math.round(reservation.paidPercentage * 100)}% z celkové částky`}
          >
            <Badge className="bg-yellow-500 text-white text-xs cursor-help">
              <Wallet className="h-3 w-3 mr-1" />
              {Math.round(reservation.paidPercentage * 100)}%
            </Badge>
          </InfoTooltip>
        );
      default:
        return (
          <Badge className="bg-red-500 text-white text-xs">
            <AlertCircle className="h-3 w-3 mr-1" />
            Nezaplaceno
          </Badge>
        );
    }
  };

  return (
    <>
      <div
        className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
          isComplete
            ? "bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800"
            : "bg-background"
        }`}
      >
        {/* Nationality flag */}
        <div className="shrink-0">
          {isoCode ? (
            <FlagIcon code={isoCode} className="h-6 w-8 rounded-sm" />
          ) : (
            <Badge variant="outline" className="text-xs">
              {reservation.nationality?.toUpperCase().slice(0, 2) || "?"}
            </Badge>
          )}
        </div>

        {/* Reservation info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm truncate">
              {reservation.contactName || `Rezervace #${reservation.reservationId}`}
            </span>
            {getPaymentBadge()}
          </div>

          <div className="text-xs text-muted-foreground flex items-center gap-2 flex-wrap mt-1">
            {reservation.contactPhone && (
              <a
                href={`tel:${reservation.contactPhone}`}
                className="flex items-center gap-1 hover:text-primary"
              >
                <Phone className="h-3 w-3" />
                {reservation.contactPhone}
              </a>
            )}
            <span>
              {reservation.types.adults > 0 && `${reservation.types.adults} dosp.`}
              {reservation.types.children > 0 && ` + ${reservation.types.children} dětí`}
              {reservation.types.drivers > 0 && ` + ${reservation.types.drivers} řid.`}
              {reservation.types.guides > 0 && ` + ${reservation.types.guides} prův.`}
            </span>
          </div>
        </div>

        {/* Counter controls */}
        <div className="flex items-center gap-1 shrink-0">
          <Button
            variant="outline"
            size="icon"
            className="h-10 w-10 touch-manipulation"
            onClick={() =>
              handleUpdatePresence(Math.max(0, reservation.presence.present - 1))
            }
            disabled={updatePresence.isPending || reservation.presence.present <= 0}
          >
            <Minus className="h-4 w-4" />
          </Button>

          {/* Clickable count */}
          <button
            onClick={openInputDialog}
            className="min-w-[60px] text-center py-1 px-2 rounded hover:bg-muted transition-colors touch-manipulation"
            title="Klikněte pro přímé zadání"
          >
            <span
              className={`font-bold text-lg ${isComplete ? "text-green-600" : ""}`}
            >
              {reservation.presence.present}
            </span>
            <span className="text-muted-foreground text-sm">
              /{reservation.presence.total}
            </span>
          </button>

          <Button
            variant="outline"
            size="icon"
            className="h-10 w-10 touch-manipulation"
            onClick={() =>
              handleUpdatePresence(
                Math.min(reservation.presence.total, reservation.presence.present + 1)
              )
            }
            disabled={
              updatePresence.isPending ||
              reservation.presence.present >= reservation.presence.total
            }
          >
            <Plus className="h-4 w-4" />
          </Button>

          {/* Mark all present */}
          <Button
            variant={isComplete ? "default" : "outline"}
            size="icon"
            className={`h-10 w-10 touch-manipulation ${
              isComplete ? "bg-green-600 hover:bg-green-700" : ""
            }`}
            onClick={() => handleUpdatePresence(reservation.presence.total)}
            disabled={updatePresence.isPending || isComplete}
            title="Označit všechny jako přítomné"
          >
            {isComplete ? (
              <CheckCircle2 className="h-4 w-4" />
            ) : (
              <Check className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>

      {/* Direct input dialog */}
      <Dialog open={showInputDialog} onOpenChange={setShowInputDialog}>
        <DialogContent className="max-w-xs">
          <DialogHeader>
            <DialogTitle>Počet přítomných</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {reservation.contactName || `Rezervace #${reservation.reservationId}`}
              <br />
              Celkem: {reservation.presence.total} hostů
            </p>
            <Input
              type="number"
              min={0}
              max={reservation.presence.total}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleDirectInput();
              }}
              className="text-center text-2xl h-14"
              autoFocus
            />
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setShowInputDialog(false)}
              >
                Zrušit
              </Button>
              <Button
                className="flex-1"
                onClick={handleDirectInput}
                disabled={updatePresence.isPending}
              >
                Uložit
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
