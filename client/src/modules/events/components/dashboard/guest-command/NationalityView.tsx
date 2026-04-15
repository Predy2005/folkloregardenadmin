import { useMutation } from "@tanstack/react-query";
import { useToggleSet } from "@/shared/hooks/useToggleSet";
import {
  ChevronDown,
  ChevronRight,
  Phone,
  Minus,
  Plus,
  Check,
  Loader2,
} from "lucide-react";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Progress } from "@/shared/components/ui/progress";
import { FlagIcon } from "@/shared/components/FlagIcon";
import { getIsoCode, getNationalityDisplayName } from "@/shared/lib/nationality";
import { cn } from "@/shared/lib/utils";
import { api } from "@/shared/lib/api";
import { queryClient } from "@/shared/lib/queryClient";
import { errorToast } from "@/shared/lib/toast-helpers";
import type { ReservationGuestData } from "@shared/types";

interface NationalityBreakdown {
  count: number;
  present: number;
  reservations: number;
}

interface NationalityViewProps {
  breakdown: Record<string, NationalityBreakdown>;
  reservations: ReservationGuestData[];
  eventId: number;
}

/**
 * View guests grouped by nationality
 * Useful for understanding group composition and language needs
 */
export function NationalityView({
  breakdown,
  reservations,
  eventId,
}: NationalityViewProps) {
  const expandedNationalities = useToggleSet<string>();

  // Presence mutation
  const updatePresenceMutation = useMutation({
    mutationFn: async (params: { nationality: string; presentCount: number }) => {
      return api.post(`/api/events/${eventId}/guests/mark-present-by-group`, {
        type: 'nationality',
        nationality: params.nationality,
        presentCount: params.presentCount,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/events", eventId, "guest-summary"] });
      queryClient.invalidateQueries({ queryKey: ["/api/events", eventId, "manager-dashboard"] });
    },
    onError: () => {
      errorToast("Nepodařilo se aktualizovat přítomnost");
    },
  });

  const toggleNationality = expandedNationalities.toggle;

  // Sort by count descending
  const sortedNationalities = Object.entries(breakdown)
    .sort(([, a], [, b]) => b.count - a.count);

  if (sortedNationalities.length === 0) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        Žádné údaje o národnostech
      </div>
    );
  }

  return (
    <div className="divide-y">
      {sortedNationalities.map(([nationality, data]) => {
        const isoCode = getIsoCode(nationality);
        const displayName = getNationalityDisplayName(nationality);
        const isExpanded = expandedNationalities.isOpen(nationality);
        const presencePercentage = data.count > 0
          ? Math.round((data.present / data.count) * 100)
          : 0;
        // Get reservations for this nationality
        const nationalityReservations = reservations.filter(
          (res) => (res.nationality || "unknown") === nationality
        );

        const isComplete = data.present >= data.count;

        return (
          <div key={nationality}>
            {/* Header */}
            <div className="flex items-center gap-3 p-3 hover:bg-muted/50 transition-colors touch-manipulation">
              <button
                onClick={() => toggleNationality(nationality)}
                className="flex items-center gap-3 flex-1 text-left"
              >
                {/* Expand icon */}
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                )}

                {/* Flag */}
                <div className="shrink-0 w-8">
                  {isoCode ? (
                    <FlagIcon code={isoCode} className="h-5 w-8 rounded shadow-sm" />
                  ) : (
                    <Badge variant="outline" className="text-xs">
                      {nationality.slice(0, 2).toUpperCase()}
                    </Badge>
                  )}
                </div>

                {/* Name and counts */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">{displayName}</span>
                    <Badge variant="secondary" className="text-xs py-0">
                      {data.count} hostů
                    </Badge>
                  </div>
                </div>
              </button>

              {/* Presence controls */}
              <div className="flex items-center gap-1 shrink-0">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8 touch-manipulation"
                  onClick={(e) => {
                    e.stopPropagation();
                    updatePresenceMutation.mutate({
                      nationality,
                      presentCount: Math.max(0, data.present - 1),
                    });
                  }}
                  disabled={updatePresenceMutation.isPending || data.present <= 0}
                >
                  <Minus className="h-3 w-3" />
                </Button>

                <span className={cn(
                  "min-w-[50px] text-center font-medium text-sm",
                  isComplete ? "text-green-600" : ""
                )}>
                  {data.present}/{data.count}
                </span>

                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8 touch-manipulation"
                  onClick={(e) => {
                    e.stopPropagation();
                    updatePresenceMutation.mutate({
                      nationality,
                      presentCount: Math.min(data.count, data.present + 1),
                    });
                  }}
                  disabled={updatePresenceMutation.isPending || data.present >= data.count}
                >
                  <Plus className="h-3 w-3" />
                </Button>

                <Button
                  variant={isComplete ? "default" : "outline"}
                  size="icon"
                  className={cn("h-8 w-8 touch-manipulation", isComplete && "bg-green-600 hover:bg-green-700")}
                  onClick={(e) => {
                    e.stopPropagation();
                    updatePresenceMutation.mutate({
                      nationality,
                      presentCount: data.count,
                    });
                  }}
                  disabled={updatePresenceMutation.isPending || isComplete}
                  title="Všichni přítomni"
                >
                  {updatePresenceMutation.isPending ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Check className="h-3 w-3" />
                  )}
                </Button>
              </div>
            </div>

            {/* Expanded content - reservations list */}
            {isExpanded && (
              <div className="bg-blue-50/50 dark:bg-blue-950/20 px-4 pb-3">
                {/* Progress bar */}
                <div className="py-2">
                  <Progress value={presencePercentage} className="h-2" />
                  <div className="flex justify-between text-xs text-muted-foreground mt-1">
                    <span>{presencePercentage}% přítomno</span>
                    <span>{data.count - data.present} čeká</span>
                  </div>
                </div>

                {/* Reservations for this nationality */}
                <div className="space-y-2 mt-2">
                  {nationalityReservations.map((res) => (
                    <NationalityReservationRow
                      key={res.reservationId}
                      reservation={res}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function NationalityReservationRow({
  reservation,
}: {
  reservation: ReservationGuestData;
}) {
  const isComplete = reservation.presence.present >= reservation.presence.total;

  return (
    <div
      className={cn(
        "flex items-center gap-3 p-3 rounded-lg border bg-background",
        isComplete && "border-green-200 bg-green-50/50 dark:bg-green-950/20"
      )}
    >
      {/* Contact name */}
      <div className="flex-1 min-w-0">
        <span className="font-medium text-sm truncate block">
          {reservation.contactName || `#${reservation.reservationId}`}
        </span>
        <span className="text-xs text-muted-foreground">
          {reservation.types.paying} platících
          {reservation.types.free > 0 && ` + ${reservation.types.free} zdarma`}
        </span>
      </div>

      {/* Phone link */}
      {reservation.contactPhone && (
        <a
          href={`tel:${reservation.contactPhone}`}
          className="p-2 rounded-full hover:bg-muted touch-manipulation"
          onClick={(e) => e.stopPropagation()}
        >
          <Phone className="h-4 w-4 text-muted-foreground" />
        </a>
      )}

      {/* Presence */}
      <div className={cn(
        "font-medium text-sm min-w-[50px] text-right",
        isComplete ? "text-green-600" : "text-muted-foreground"
      )}>
        {reservation.presence.present}/{reservation.presence.total}
      </div>

      {/* Status indicator */}
      <div className={cn(
        "w-3 h-3 rounded-full shrink-0",
        isComplete ? "bg-green-500" : "bg-orange-400"
      )} />
    </div>
  );
}
