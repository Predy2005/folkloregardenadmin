import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  Users,
  Minus,
  Plus,
  Check,
  Phone,
  Loader2,
  CheckCircle2,
  Search,
  Car,
  UserRound,
} from "lucide-react";
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
import { api } from "@/shared/lib/api";
import { queryClient } from "@/shared/lib/queryClient";
import { errorToast } from "@/shared/lib/toast-helpers";
import { getNationalityInfo } from "@/shared/lib/constants";
import type { GuestsByReservationResponse, ReservationGuestGroup } from "@shared/types";

interface GroupCheckInCardProps {
  eventId: number;
}

export function GroupCheckInCard({ eventId }: GroupCheckInCardProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const { data, isLoading, error } = useQuery<GuestsByReservationResponse>({
    queryKey: ["/api/events", eventId, "guests-by-reservation"],
    queryFn: () => api.get(`/api/events/${eventId}/guests/by-reservation`).then(r => r.data),
  });

  const updatePresenceMutation = useMutation({
    mutationFn: async ({ reservationId, presentCount }: { reservationId: number; presentCount: number }) => {
      return api.put(`/api/events/${eventId}/guests/reservation/${reservationId}/presence`, { presentCount });
    },
    onSuccess: () => {
      // Invalidate both queries to keep data in sync
      queryClient.invalidateQueries({ queryKey: ["/api/events", eventId, "guests-by-reservation"] });
      queryClient.invalidateQueries({ queryKey: ["/api/events", eventId, "manager-dashboard"] });
    },
    onError: () => {
      errorToast("Nepodařilo se aktualizovat přítomnost");
    },
  });

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  if (error || !data) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          Nepodařilo se načíst skupiny hostů
        </CardContent>
      </Card>
    );
  }

  const { groups, summary } = data;
  const progressPercent = summary.totalGuests > 0
    ? Math.round((summary.totalPresent / summary.totalGuests) * 100)
    : 0;

  // Filter groups based on search
  const filteredGroups = groups.filter(group => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      group.contactName?.toLowerCase().includes(query) ||
      group.contactPhone?.includes(query) ||
      group.nationality?.toLowerCase().includes(query)
    );
  });

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Users className="h-5 w-5 text-primary" />
          Check-in hostů
          <Badge variant="secondary" className="ml-auto">
            {summary.totalPresent}/{summary.totalGuests}
          </Badge>
        </CardTitle>
        <div className="space-y-2">
          <Progress value={progressPercent} className="h-2" />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{progressPercent}% přítomno</span>
            <span>{summary.totalGroups} skupin</span>
          </div>
        </div>

        {/* Search */}
        <div className="relative mt-2">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Hledat skupinu..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </CardHeader>

      <CardContent className="space-y-2 max-h-[60vh] overflow-y-auto">
        {filteredGroups.length === 0 ? (
          <p className="text-center text-muted-foreground py-4">
            {searchQuery ? "Žádné skupiny nenalezeny" : "Žádné skupiny k zobrazení"}
          </p>
        ) : (
          filteredGroups.map((group) => (
            <GroupRow
              key={group.reservationId}
              group={group}
              onUpdatePresence={(count) =>
                updatePresenceMutation.mutate({
                  reservationId: group.reservationId,
                  presentCount: count
                })
              }
              isPending={updatePresenceMutation.isPending}
            />
          ))
        )}
      </CardContent>
    </Card>
  );
}

interface GroupRowProps {
  group: ReservationGuestGroup;
  onUpdatePresence: (count: number) => void;
  isPending: boolean;
}

function GroupRow({ group, onUpdatePresence, isPending }: GroupRowProps) {
  const [showInputDialog, setShowInputDialog] = useState(false);
  const [inputValue, setInputValue] = useState(group.presentCount.toString());

  const isComplete = group.presentCount >= group.totalCount;
  const natInfo = getNationalityInfo(group.nationality);
  const nationalityLabel = group.nationality?.toUpperCase() ?? "?";

  const handleDirectInput = () => {
    const value = parseInt(inputValue, 10);
    if (!isNaN(value) && value >= 0 && value <= group.totalCount) {
      onUpdatePresence(value);
      setShowInputDialog(false);
    }
  };

  const openInputDialog = () => {
    setInputValue(group.presentCount.toString());
    setShowInputDialog(true);
  };

  // Build guest breakdown string
  const breakdownParts: string[] = [];
  if (group.adultCount > 0) breakdownParts.push(`${group.adultCount} dosp.`);
  if (group.childCount > 0) breakdownParts.push(`${group.childCount} dětí`);
  if (group.driverCount > 0) breakdownParts.push(`${group.driverCount} řidič`);
  if (group.guideCount > 0) breakdownParts.push(`${group.guideCount} průvodce`);

  return (
    <>
      <div
        className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
          isComplete ? "bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800" : "bg-background"
        }`}
      >
        {/* Nationality badge */}
        <Badge
          className={`${natInfo.bg} ${natInfo.text} min-w-[36px] justify-center text-xs shrink-0`}
        >
          {nationalityLabel}
        </Badge>

        {/* Group info */}
        <div className="flex-1 min-w-0">
          <div className="font-medium text-sm truncate">
            {group.contactName || `Rezervace #${group.reservationId}`}
          </div>
          <div className="text-xs text-muted-foreground flex items-center gap-2 flex-wrap">
            {group.contactPhone && (
              <a
                href={`tel:${group.contactPhone}`}
                className="flex items-center gap-1 hover:text-primary"
              >
                <Phone className="h-3 w-3" />
                {group.contactPhone}
              </a>
            )}
            <span>{breakdownParts.join(" + ")}</span>
          </div>
          {/* Driver/Guide badges */}
          {(group.driverCount > 0 || group.guideCount > 0) && (
            <div className="flex gap-1 mt-1">
              {group.driverCount > 0 && (
                <Badge variant="outline" className="text-xs py-0">
                  <Car className="h-3 w-3 mr-1" />
                  {group.driverCount}
                </Badge>
              )}
              {group.guideCount > 0 && (
                <Badge variant="outline" className="text-xs py-0">
                  <UserRound className="h-3 w-3 mr-1" />
                  {group.guideCount}
                </Badge>
              )}
            </div>
          )}
        </div>

        {/* Counter controls */}
        <div className="flex items-center gap-1 shrink-0">
          <Button
            variant="outline"
            size="icon"
            className="h-10 w-10 touch-manipulation"
            onClick={() => onUpdatePresence(Math.max(0, group.presentCount - 1))}
            disabled={isPending || group.presentCount <= 0}
          >
            <Minus className="h-4 w-4" />
          </Button>

          {/* Clickable count - opens direct input */}
          <button
            onClick={openInputDialog}
            className="min-w-[60px] text-center py-1 px-2 rounded hover:bg-muted transition-colors touch-manipulation"
            title="Klikněte pro přímé zadání počtu"
          >
            <span className={`font-bold text-lg ${isComplete ? "text-green-600" : ""}`}>
              {group.presentCount}
            </span>
            <span className="text-muted-foreground text-sm">/{group.totalCount}</span>
          </button>

          <Button
            variant="outline"
            size="icon"
            className="h-10 w-10 touch-manipulation"
            onClick={() => onUpdatePresence(Math.min(group.totalCount, group.presentCount + 1))}
            disabled={isPending || group.presentCount >= group.totalCount}
          >
            <Plus className="h-4 w-4" />
          </Button>

          {/* Mark all present button */}
          <Button
            variant={isComplete ? "default" : "outline"}
            size="icon"
            className={`h-10 w-10 touch-manipulation ${isComplete ? "bg-green-600 hover:bg-green-700" : ""}`}
            onClick={() => onUpdatePresence(group.totalCount)}
            disabled={isPending || isComplete}
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
              {group.contactName || `Rezervace #${group.reservationId}`}
              <br />
              Celkem: {group.totalCount} hostů
            </p>
            <Input
              type="number"
              min={0}
              max={group.totalCount}
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
                disabled={isPending}
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
