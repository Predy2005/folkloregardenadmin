import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import {
  Phone,
  Minus,
  Plus,
  Check,
  CheckCircle2,
  Wallet,
  AlertCircle,
  ChevronRight,
  ExternalLink,
  UtensilsCrossed,
  MapPin,
  Save,
} from "lucide-react";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Progress } from "@/shared/components/ui/progress";
import { InfoTooltip } from "@/shared/components/ui/info-tooltip";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/shared/components/ui/sheet";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/components/ui/table";
import { FlagIcon } from "@/shared/components/FlagIcon";
import { getIsoCode } from "@/shared/lib/nationality";
import { cn } from "@/shared/lib/utils";
import { formatCurrency } from "@/shared/lib/formatting";
import { useUpdateReservationPresence } from "../../../hooks";
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
              <ReservationRow
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

interface ReservationRowProps {
  reservation: ReservationGuestData;
  eventId: number;
  onOpenDetail: () => void;
}

function ReservationRow({ reservation, eventId, onOpenDetail }: ReservationRowProps) {
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
          <PaymentBadge
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

function PaymentBadge({
  status,
  percentage,
}: {
  status: "PAID" | "PARTIAL" | "UNPAID";
  percentage: number;
}) {
  const tooltipContent = {
    PAID: "Rezervace je plně uhrazena",
    PARTIAL: `Uhrazeno ${Math.round(percentage * 100)}% z celkové částky`,
    UNPAID: "Rezervace dosud nebyla uhrazena",
  };

  const badge = (() => {
    switch (status) {
      case "PAID":
        return (
          <Badge className="bg-green-500 text-white text-[10px] py-0 px-1.5 cursor-help">
            <Wallet className="h-3 w-3 mr-0.5" />
            Zaplaceno
          </Badge>
        );
      case "PARTIAL":
        return (
          <Badge className="bg-yellow-500 text-white text-[10px] py-0 px-1.5 cursor-help">
            <Wallet className="h-3 w-3 mr-0.5" />
            {Math.round(percentage * 100)}%
          </Badge>
        );
      default:
        return (
          <Badge className="bg-red-500 text-white text-[10px] py-0 px-1.5 cursor-help">
            <AlertCircle className="h-3 w-3 mr-0.5" />
            Nezaplaceno
          </Badge>
        );
    }
  })();

  return (
    <InfoTooltip content={tooltipContent[status]}>
      {badge}
    </InfoTooltip>
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

  // Calculate total menu surcharge
  const totalSurcharge = reservation.menuBreakdown?.reduce(
    (sum, m) => sum + m.surcharge * m.count,
    0
  ) || 0;

  return (
    <Sheet open={!!reservation} onOpenChange={() => onClose()}>
      <SheetContent side="bottom" className="h-auto max-h-[85vh] overflow-y-auto">
        <SheetHeader className="pb-4">
          <div className="flex items-center justify-between">
            <SheetTitle className="flex items-center gap-3">
              {isoCode && <FlagIcon code={isoCode} className="h-6 w-9 rounded shadow-sm" />}
              {reservation.contactName || `Rezervace #${reservation.reservationId}`}
            </SheetTitle>
            <EditReservationLink reservationId={reservation.reservationId} />
          </div>
        </SheetHeader>

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
                <PaymentBadge
                  status={reservation.paymentStatus}
                  percentage={reservation.paidPercentage}
                />
                <div className="mt-1 text-xs">
                  {formatCurrency(reservation.paidAmount)} / {formatCurrency(reservation.totalPrice)}
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
            <div className="border rounded-lg overflow-hidden">
              <div className="bg-muted/40 px-3 py-2 flex items-center gap-2 border-b">
                <UtensilsCrossed className="h-4 w-4 text-primary" />
                <span className="font-medium text-sm">Menu</span>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Jídlo</TableHead>
                    <TableHead className="text-right w-20">Počet</TableHead>
                    <TableHead className="text-right w-24">Příplatek</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reservation.menuBreakdown.map((menu, idx) => (
                    <TableRow key={menu.menuId || idx}>
                      <TableCell className="font-medium">{menu.menuName}</TableCell>
                      <TableCell className="text-right">{menu.count}</TableCell>
                      <TableCell className="text-right">
                        {menu.surcharge > 0 ? (
                          <span className="text-green-600">+{menu.surcharge} Kč</span>
                        ) : (
                          <span className="text-muted-foreground">v ceně</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                  {totalSurcharge > 0 && (
                    <TableRow className="bg-muted/30">
                      <TableCell className="font-medium">Celkem příplatky</TableCell>
                      <TableCell></TableCell>
                      <TableCell className="text-right font-bold text-green-600">
                        +{totalSurcharge} Kč
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
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
      </SheetContent>
    </Sheet>
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
