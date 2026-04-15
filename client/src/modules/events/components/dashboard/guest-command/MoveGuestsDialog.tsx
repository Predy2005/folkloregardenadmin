import { useState, useMemo } from "react";
import {
  ArrowRightLeft,
  Minus,
  Plus,
} from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";
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
import { getSpaceColor } from "@/shared/lib/constants";
import { cn } from "@/shared/lib/utils";
import { useMoveGuests, type MoveGuestsFilter } from "../../../hooks/useDashboardMutations";
import type { SpaceGuestData, ReservationGuestData } from "@shared/types";

interface MoveGuestsDialogProps {
  fromSpace: string;
  spaceData: SpaceGuestData;
  targetSpaces: SpaceGuestData[];
  reservations: ReservationGuestData[];
  eventId: number;
  onClose: () => void;
}

export function MoveGuestsDialog({
  fromSpace,
  spaceData,
  targetSpaces,
  reservations,
  eventId,
  onClose,
}: MoveGuestsDialogProps) {
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
    <Dialog open onOpenChange={() => onClose()}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader className="pb-4">
          <DialogTitle className="flex items-center gap-2">
            <ArrowRightLeft className="h-5 w-5" />
            Přesunout hosty z {fromSpace.charAt(0).toUpperCase() + fromSpace.slice(1)}
          </DialogTitle>
        </DialogHeader>

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
      </DialogContent>
    </Dialog>
  );
}
