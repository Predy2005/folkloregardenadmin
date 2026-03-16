import { useState, useMemo } from "react";
import { useMutation } from "@tanstack/react-query";
import { useToggleSet } from "@/shared/hooks/useToggleSet";
import {
  ChevronDown,
  ChevronRight,
  ArrowRightLeft,
  UtensilsCrossed,
  Minus,
  Plus,
  Check,
  Loader2,
} from "lucide-react";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Progress } from "@/shared/components/ui/progress";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/shared/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/shared/components/ui/tabs";
import { FlagIcon } from "@/shared/components/FlagIcon";
import { getIsoCode, getNationalityDisplayName } from "@/shared/lib/nationality";
import { getSpaceColor, getSpaceTint } from "@/shared/lib/constants";
import { cn } from "@/shared/lib/utils";
import { api } from "@/shared/lib/api";
import { queryClient } from "@/shared/lib/queryClient";
import { errorToast } from "@/shared/lib/toast-helpers";
import { useMoveGuests, type MoveGuestsFilter } from "../../../hooks/useDashboardMutations";
import type { SpaceGuestData, ReservationGuestData } from "@shared/types";

interface SpaceViewProps {
  spaces: SpaceGuestData[];
  reservations?: ReservationGuestData[];
  eventId: number;
}

/**
 * Space view for managing guests by venue space
 * Includes advanced move functionality
 */
export function SpaceView({ spaces, reservations = [], eventId }: SpaceViewProps) {
  // Default to all collapsed
  const expandedSpaces = useToggleSet<string>();
  const [moveDialog, setMoveDialog] = useState<{
    fromSpace: string;
    spaceData: SpaceGuestData;
  } | null>(null);

  // Presence mutation
  const updatePresenceMutation = useMutation({
    mutationFn: async (params: { space: string; presentCount: number }) => {
      return api.post(`/api/events/${eventId}/guests/mark-present-by-group`, {
        type: 'space',
        space: params.space,
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

  const toggleSpace = expandedSpaces.toggle;

  // Get reservations for a specific space (case-insensitive, includes null spaceName for first space)
  const getSpaceReservations = (spaceName: string, isFirstSpace: boolean = false) => {
    return reservations.filter((res) => {
      if (res.spaceName) {
        return res.spaceName.toLowerCase() === spaceName.toLowerCase();
      }
      // Reservations without space go to first space
      return isFirstSpace;
    });
  };

  if (spaces.length === 0) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        Žádné prostory k zobrazení
      </div>
    );
  }

  // Find first space index for the move dialog
  const getMoveDialogReservations = () => {
    if (!moveDialog) return [];
    const spaceIndex = spaces.findIndex(s => s.spaceName === moveDialog.fromSpace);
    return getSpaceReservations(moveDialog.fromSpace, spaceIndex === 0);
  };

  return (
    <div className="p-2 space-y-1">
      {spaces.map((space, index) => (
        <SpaceSection
          key={space.spaceName}
          space={space}
          index={index}
          isExpanded={expandedSpaces.isOpen(space.spaceName)}
          onToggle={() => toggleSpace(space.spaceName)}
          onMoveGuests={() => setMoveDialog({
            fromSpace: space.spaceName,
            spaceData: space,
          })}
          onUpdatePresence={(count) => updatePresenceMutation.mutate({
            space: space.spaceName,
            presentCount: count,
          })}
          isPending={updatePresenceMutation.isPending}
          otherSpaces={spaces.filter(s => s.spaceName !== space.spaceName)}
          spaceReservations={getSpaceReservations(space.spaceName, index === 0)}
        />
      ))}

      {/* Advanced move dialog */}
      {moveDialog && (
        <MoveGuestsDialog
          fromSpace={moveDialog.fromSpace}
          spaceData={moveDialog.spaceData}
          targetSpaces={spaces.filter(s => s.spaceName !== moveDialog.fromSpace)}
          reservations={getMoveDialogReservations()}
          eventId={eventId}
          onClose={() => setMoveDialog(null)}
        />
      )}
    </div>
  );
}

interface SpaceSectionProps {
  space: SpaceGuestData;
  index: number;
  isExpanded: boolean;
  onToggle: () => void;
  onMoveGuests: () => void;
  onUpdatePresence: (count: number) => void;
  isPending: boolean;
  otherSpaces: SpaceGuestData[];
  spaceReservations: ReservationGuestData[];
}

function SpaceSection({
  space,
  index,
  isExpanded,
  onToggle,
  onMoveGuests,
  onUpdatePresence,
  isPending,
  otherSpaces,
}: SpaceSectionProps) {
  const [menuExpanded, setMenuExpanded] = useState(false);
  const spaceColor = getSpaceColor(index);
  const spaceTint = getSpaceTint(index);
  const presencePercentage = space.presence.percentage;
  const isComplete = space.presence.present >= space.presence.total;

  return (
    <div className={cn("rounded-lg my-1 border", spaceTint.bg, spaceTint.border)}>
      {/* Header - clickable */}
      <div className={cn("flex items-center gap-2 p-3 transition-colors touch-manipulation rounded-t-lg", spaceTint.hover)}>
        <button
          onClick={onToggle}
          className="flex items-center gap-2 flex-1 text-left"
        >
          {/* Expand icon */}
          {isExpanded ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
          ) : (
            <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
          )}

          {/* Space badge */}
          <Badge className={cn(spaceColor, "text-white text-xs py-0.5 px-2")}>
            {space.spaceName.charAt(0).toUpperCase() + space.spaceName.slice(1)}
          </Badge>

          {/* Guest count */}
          <span className="text-sm">
            <span className="font-medium">{space.types.total}</span>
            <span className="text-muted-foreground ml-1">hostů</span>
          </span>
        </button>

        {/* Presence controls */}
        <div className="flex items-center gap-1 shrink-0">
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8 touch-manipulation"
            onClick={(e) => {
              e.stopPropagation();
              onUpdatePresence(Math.max(0, space.presence.present - 1));
            }}
            disabled={isPending || space.presence.present <= 0}
          >
            <Minus className="h-3 w-3" />
          </Button>

          <span className={cn(
            "min-w-[50px] text-center font-medium text-sm",
            isComplete ? "text-green-600" : ""
          )}>
            {space.presence.present}/{space.presence.total}
          </span>

          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8 touch-manipulation"
            onClick={(e) => {
              e.stopPropagation();
              onUpdatePresence(Math.min(space.presence.total, space.presence.present + 1));
            }}
            disabled={isPending || space.presence.present >= space.presence.total}
          >
            <Plus className="h-3 w-3" />
          </Button>

          <Button
            variant={isComplete ? "default" : "outline"}
            size="icon"
            className={cn("h-8 w-8 touch-manipulation", isComplete && "bg-green-600 hover:bg-green-700")}
            onClick={(e) => {
              e.stopPropagation();
              onUpdatePresence(space.presence.total);
            }}
            disabled={isPending || isComplete}
            title="Všichni přítomni"
          >
            {isPending ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Check className="h-3 w-3" />
            )}
          </Button>
        </div>

        {/* Move guests icon button */}
        {otherSpaces.length > 0 && (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0"
            onClick={(e) => {
              e.stopPropagation();
              onMoveGuests();
            }}
            title="Přesunout hosty"
          >
            <ArrowRightLeft className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Expanded content */}
      {isExpanded && (
        <div className="px-3 pb-3 space-y-2">
          {/* Presence progress */}
          <Progress value={presencePercentage} className="h-1.5" />

          {/* Compact stats row - types & nationalities inline */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            {/* Type badges inline */}
            <Badge variant="outline" className="py-0 gap-1 text-green-600">
              {space.types.paying} platících
            </Badge>
            {space.types.free > 0 && (
              <Badge variant="outline" className="py-0 gap-1 text-orange-500">
                {space.types.free} zdarma
              </Badge>
            )}

            {/* Separator */}
            <span className="text-muted-foreground">|</span>

            {/* Nationality badges inline */}
            {Object.entries(space.nationalityBreakdown)
              .sort(([, a], [, b]) => b - a)
              .slice(0, 4)
              .map(([nationality, count]) => {
                const isoCode = getIsoCode(nationality);
                return (
                  <Badge
                    key={nationality}
                    variant="outline"
                    className="py-0 gap-1"
                  >
                    {isoCode ? (
                      <FlagIcon code={isoCode} className="h-3 w-4 rounded-sm" />
                    ) : (
                      <span>{nationality.slice(0, 2).toUpperCase()}</span>
                    )}
                    {count}
                  </Badge>
                );
              })}
            {Object.keys(space.nationalityBreakdown).length > 4 && (
              <span className="text-muted-foreground">
                +{Object.keys(space.nationalityBreakdown).length - 4}
              </span>
            )}
          </div>

          {/* Menu breakdown - collapsible with compact rows */}
          {space.menuBreakdown.length > 0 && (
            <div className="border rounded-lg overflow-hidden bg-background">
              <button
                onClick={() => setMenuExpanded(!menuExpanded)}
                className="w-full bg-muted/30 px-2 py-1.5 flex items-center gap-2 border-b text-left hover:bg-muted/50 transition-colors"
              >
                {menuExpanded ? (
                  <ChevronDown className="h-3 w-3 text-muted-foreground" />
                ) : (
                  <ChevronRight className="h-3 w-3 text-muted-foreground" />
                )}
                <UtensilsCrossed className="h-3 w-3 text-primary" />
                <span className="font-medium text-xs">Menu</span>
                <Badge variant="secondary" className="text-[10px] py-0 px-1 ml-auto">
                  {space.menuBreakdown.length}
                </Badge>
              </button>
              {menuExpanded && (
                <div className="divide-y">
                  {space.menuBreakdown.map((menu, idx) => (
                    <div key={idx} className="flex items-center justify-between px-2 py-1 text-xs">
                      <span className="font-medium truncate">{menu.menuName}</span>
                      <div className="flex items-center gap-2 shrink-0">
                        <span>{menu.count}×</span>
                        {menu.surcharge > 0 ? (
                          <span className="text-green-600 w-16 text-right">+{menu.surcharge} Kč</span>
                        ) : (
                          <span className="text-muted-foreground w-16 text-right">v ceně</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Advanced move guests dialog with multiple filter options
 */
function MoveGuestsDialog({
  fromSpace,
  spaceData,
  targetSpaces,
  reservations,
  eventId,
  onClose,
}: {
  fromSpace: string;
  spaceData: SpaceGuestData;
  targetSpaces: SpaceGuestData[];
  reservations: ReservationGuestData[];
  eventId: number;
  onClose: () => void;
}) {
  const [filterMode, setFilterMode] = useState<"count" | "reservation" | "nationality" | "menu">("count");
  const [targetSpace, setTargetSpace] = useState<string>(
    targetSpaces.length > 0 ? targetSpaces[0].spaceName : ""
  );
  const [moveCount, setMoveCount] = useState(1);
  const [selectedReservation, setSelectedReservation] = useState<string>("");
  const [selectedNationality, setSelectedNationality] = useState<string>("");
  const [selectedMenu, setSelectedMenu] = useState<string>("");

  const moveGuests = useMoveGuests(eventId);

  // Get unique nationalities
  const nationalities = useMemo(() => {
    return Object.entries(spaceData.nationalityBreakdown)
      .sort(([, a], [, b]) => b - a)
      .map(([nat, count]) => ({ nationality: nat, count }));
  }, [spaceData.nationalityBreakdown]);

  // Get unique menus
  const menus = useMemo(() => {
    return spaceData.menuBreakdown;
  }, [spaceData.menuBreakdown]);

  const handleMove = () => {
    const filter: MoveGuestsFilter = {
      fromSpace: fromSpace,
    };

    switch (filterMode) {
      case "count":
        filter.count = moveCount;
        break;
      case "reservation":
        if (selectedReservation) {
          filter.reservationId = parseInt(selectedReservation, 10);
        }
        break;
      case "nationality":
        if (selectedNationality) {
          filter.nationality = selectedNationality;
        }
        break;
      case "menu":
        if (selectedMenu) {
          filter.menuName = selectedMenu;
        }
        break;
    }

    moveGuests.mutate(
      { targetSpace, filter },
      { onSuccess: () => onClose() }
    );
  };

  // Calculate estimated count based on filter
  const estimatedCount = useMemo(() => {
    switch (filterMode) {
      case "count":
        return moveCount;
      case "reservation":
        const res = reservations.find(r => r.reservationId.toString() === selectedReservation);
        return res?.types.total || 0;
      case "nationality":
        return spaceData.nationalityBreakdown[selectedNationality] || 0;
      case "menu":
        const menu = menus.find(m => m.menuName === selectedMenu);
        return menu?.count || 0;
      default:
        return 0;
    }
  }, [filterMode, moveCount, selectedReservation, selectedNationality, selectedMenu, reservations, spaceData, menus]);

  return (
    <Sheet open onOpenChange={() => onClose()}>
      <SheetContent side="bottom" className="h-auto max-h-[85vh] overflow-y-auto">
        <SheetHeader className="pb-4">
          <SheetTitle className="flex items-center gap-2">
            <ArrowRightLeft className="h-5 w-5" />
            Přesunout hosty z {fromSpace.charAt(0).toUpperCase() + fromSpace.slice(1)}
          </SheetTitle>
        </SheetHeader>

        <div className="space-y-6">
          {/* Filter mode tabs */}
          <Tabs value={filterMode} onValueChange={(v) => setFilterMode(v as typeof filterMode)}>
            <TabsList className="grid grid-cols-4 w-full">
              <TabsTrigger value="count" className="text-xs">Počet</TabsTrigger>
              <TabsTrigger value="reservation" className="text-xs">Rezervace</TabsTrigger>
              <TabsTrigger value="nationality" className="text-xs">Národnost</TabsTrigger>
              <TabsTrigger value="menu" className="text-xs">Menu</TabsTrigger>
            </TabsList>

            {/* Count filter */}
            <TabsContent value="count" className="mt-4">
              <Label className="text-sm text-muted-foreground">
                Počet hostů k přesunu (max {spaceData.types.total})
              </Label>
              <div className="flex items-center gap-3 mt-2">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-12 w-12 touch-manipulation"
                  onClick={() => setMoveCount(Math.max(1, moveCount - 1))}
                  disabled={moveCount <= 1}
                >
                  -
                </Button>
                <Input
                  type="number"
                  value={moveCount}
                  onChange={(e) => setMoveCount(Math.min(spaceData.types.total, Math.max(1, parseInt(e.target.value) || 1)))}
                  className="h-12 text-center text-xl font-bold w-24"
                  min={1}
                  max={spaceData.types.total}
                />
                <Button
                  variant="outline"
                  size="icon"
                  className="h-12 w-12 touch-manipulation"
                  onClick={() => setMoveCount(Math.min(spaceData.types.total, moveCount + 1))}
                  disabled={moveCount >= spaceData.types.total}
                >
                  +
                </Button>
                <Button
                  variant="secondary"
                  className="h-12 touch-manipulation"
                  onClick={() => setMoveCount(spaceData.types.total)}
                >
                  Všechny ({spaceData.types.total})
                </Button>
              </div>
            </TabsContent>

            {/* Reservation filter */}
            <TabsContent value="reservation" className="mt-4">
              <Label className="text-sm text-muted-foreground">
                Vyberte rezervaci
              </Label>
              {reservations.length > 0 ? (
                <Select value={selectedReservation} onValueChange={setSelectedReservation}>
                  <SelectTrigger className="h-12 mt-2">
                    <SelectValue placeholder="Vyberte rezervaci..." />
                  </SelectTrigger>
                  <SelectContent>
                    {reservations.map((res) => (
                      <SelectItem key={res.reservationId} value={res.reservationId.toString()}>
                        {res.contactName || `#${res.reservationId}`} ({res.types.total} hostů)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <p className="text-sm text-muted-foreground mt-2">
                  V tomto prostoru nejsou žádné rezervace
                </p>
              )}
            </TabsContent>

            {/* Nationality filter */}
            <TabsContent value="nationality" className="mt-4">
              <Label className="text-sm text-muted-foreground">
                Vyberte národnost
              </Label>
              {nationalities.length > 0 ? (
                <Select value={selectedNationality} onValueChange={setSelectedNationality}>
                  <SelectTrigger className="h-12 mt-2">
                    <SelectValue placeholder="Vyberte národnost..." />
                  </SelectTrigger>
                  <SelectContent>
                    {nationalities.map(({ nationality, count }) => {
                      const isoCode = getIsoCode(nationality);
                      return (
                        <SelectItem key={nationality} value={nationality}>
                          <div className="flex items-center gap-2">
                            {isoCode && <FlagIcon code={isoCode} className="h-4 w-5 rounded-sm" />}
                            {getNationalityDisplayName(nationality)} ({count} hostů)
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              ) : (
                <p className="text-sm text-muted-foreground mt-2">
                  V tomto prostoru nejsou žádné národnosti k dispozici
                </p>
              )}
            </TabsContent>

            {/* Menu filter */}
            <TabsContent value="menu" className="mt-4">
              <Label className="text-sm text-muted-foreground">
                Vyberte menu
              </Label>
              {menus.length > 0 ? (
                <Select value={selectedMenu} onValueChange={setSelectedMenu}>
                  <SelectTrigger className="h-12 mt-2">
                    <SelectValue placeholder="Vyberte menu..." />
                  </SelectTrigger>
                  <SelectContent>
                    {menus.map((menu) => (
                      <SelectItem key={menu.menuName} value={menu.menuName}>
                        {menu.menuName} ({menu.count} hostů)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <p className="text-sm text-muted-foreground mt-2">
                  V tomto prostoru nejsou žádná menu k dispozici
                </p>
              )}
            </TabsContent>
          </Tabs>

          {/* Target space */}
          <div>
            <Label className="text-sm text-muted-foreground">Cílový prostor</Label>
            <div className="grid grid-cols-2 gap-2 mt-2">
              {targetSpaces.map((space, index) => (
                <Button
                  key={space.spaceName}
                  variant={targetSpace === space.spaceName ? "default" : "outline"}
                  className={cn(
                    "h-14 justify-start touch-manipulation",
                    targetSpace === space.spaceName && getSpaceColor(index + 1)
                  )}
                  onClick={() => setTargetSpace(space.spaceName)}
                >
                  <span className="font-medium">
                    {space.spaceName.charAt(0).toUpperCase() + space.spaceName.slice(1)}
                  </span>
                  <span className="text-xs ml-auto opacity-70">
                    ({space.types.total} hostů)
                  </span>
                </Button>
              ))}
            </div>
          </div>

          {/* Summary and confirm */}
          <div className="bg-muted/30 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-muted-foreground">Počet k přesunu:</span>
              <span className="text-2xl font-bold">{estimatedCount}</span>
            </div>
            <Button
              className="w-full h-14 text-lg touch-manipulation"
              onClick={handleMove}
              disabled={moveGuests.isPending || !targetSpace || estimatedCount === 0}
            >
              <ArrowRightLeft className="h-5 w-5 mr-2" />
              Přesunout {estimatedCount} {estimatedCount === 1 ? "hosta" : estimatedCount < 5 ? "hosty" : "hostů"}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
