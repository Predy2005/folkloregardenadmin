import { useState, useMemo } from "react";
import { Search, Building2, Check } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Badge } from "@/shared/components/ui/badge";
import { Input } from "@/shared/components/ui/input";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/shared/components/ui/sheet";
import { ScrollArea } from "@/shared/components/ui/scroll-area";
import type { EventTable, EventGuest, Building, Room } from "@shared/types";

interface MoveGuestSheetProps {
  isOpen: boolean;
  onClose: () => void;
  /** Called with target table id; when `extraOption` is shown, the 2nd arg carries its state. */
  onConfirm: (targetTableId: number, extraChecked?: boolean) => void;
  currentTableId: number;
  allTables: EventTable[];
  allRooms: Room[];
  buildings: Building[];
  guests: EventGuest[];
  isPending: boolean;
  /** Minimum free seats required at the target table. Defaults to 1 (single-guest move). Use 0 when capacity is irrelevant (moving movements only). */
  requiredSeats?: number;
  /** Optional title override (e.g. "Presadit 5 hostu"). */
  title?: string;
  /** Optional extra toggle shown above the confirm button (e.g. "Přesunout i transakce"). */
  extraOption?: { label: string; defaultChecked?: boolean };
}

export function MoveGuestSheet({
  isOpen, onClose, onConfirm, currentTableId, allTables, allRooms, buildings, guests, isPending,
  requiredSeats = 1, title, extraOption,
}: MoveGuestSheetProps) {
  const [search, setSearch] = useState("");
  const [selectedTableId, setSelectedTableId] = useState<number | null>(null);
  const [extraChecked, setExtraChecked] = useState<boolean>(extraOption?.defaultChecked ?? false);

  // Group tables by building/room with occupancy
  const tablesByRoom = useMemo(() => {
    const result: Array<{
      building: Building;
      room: Room;
      tables: Array<EventTable & { guestCount: number; available: number }>;
    }> = [];

    for (const building of buildings) {
      for (const room of building.rooms ?? []) {
        const roomTables = allTables
          .filter((t) => t.roomId === room.id && t.id !== currentTableId)
          .map((t) => {
            const guestCount = guests.filter((g) => g.eventTableId === t.id).length;
            return { ...t, guestCount, available: t.capacity - guestCount };
          })
          .filter((t) => {
            if (!search.trim()) return true;
            const q = search.toLowerCase();
            return (
              t.tableName.toLowerCase().includes(q) ||
              (t.tableNumber?.toString() ?? "").includes(q)
            );
          });

        if (roomTables.length > 0) {
          result.push({ building, room, tables: roomTables });
        }
      }
    }
    return result;
  }, [buildings, allTables, currentTableId, guests, search]);

  const handleConfirm = () => {
    if (selectedTableId) {
      onConfirm(selectedTableId, extraOption ? extraChecked : undefined);
    }
  };

  const handleClose = () => {
    setSelectedTableId(null);
    setSearch("");
    setExtraChecked(extraOption?.defaultChecked ?? false);
    onClose();
  };

  return (
    <Sheet open={isOpen} onOpenChange={(open) => { if (!open) handleClose(); }}>
      <SheetContent side="right" className="w-full sm:w-[420px] p-0 flex flex-col">
        <div className="px-4 py-3 border-b bg-card">
          <SheetHeader>
            <SheetTitle className="text-lg">
              {title ?? "Presadit hosta na jiny stul"}
              {requiredSeats > 1 && (
                <span className="text-xs text-muted-foreground font-normal ml-2">
                  (potreba {requiredSeats} volnych mist)
                </span>
              )}
            </SheetTitle>
          </SheetHeader>

          {/* Search */}
          <div className="relative mt-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Hledat stul..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-10 text-base"
            />
          </div>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-4 space-y-4">
            {tablesByRoom.map(({ building, room, tables }) => (
              <div key={room.id}>
                <div className="flex items-center gap-1.5 mb-2">
                  <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-xs uppercase text-muted-foreground font-semibold">
                    {building.name} / {room.name}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {tables.map((t) => {
                    const hasEnough = t.available >= requiredSeats;
                    return (
                        <button
                          key={t.id}
                          disabled={!hasEnough}
                          className={`
                            flex items-center justify-between p-3 rounded-xl border-2 text-left
                            touch-manipulation select-none transition-all min-h-[56px]
                            ${selectedTableId === t.id
                              ? "border-primary bg-primary/10 shadow-sm"
                              : hasEnough
                                ? "border-muted hover:border-primary/40 hover:bg-muted/50"
                                : "border-muted bg-muted/30 opacity-50 cursor-not-allowed"
                            }
                          `}
                          onClick={() => hasEnough && setSelectedTableId(t.id)}
                        >
                          <div>
                            <div className="font-medium text-sm">
                              {t.tableNumber ? `#${t.tableNumber} ` : ""}{t.tableName}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {t.guestCount}/{t.capacity} hostu
                            </div>
                          </div>
                          {hasEnough ? (
                            <Badge
                              variant={selectedTableId === t.id ? "default" : "secondary"}
                              className="text-xs shrink-0"
                            >
                              {t.available} volne
                            </Badge>
                          ) : (
                            <Badge variant="destructive" className="text-xs shrink-0">
                              {t.available === 0 ? "Plny" : `Malo mist (${t.available}/${requiredSeats})`}
                            </Badge>
                          )}
                        </button>
                      );
                    })}
                </div>
              </div>
            ))}

            {tablesByRoom.length === 0 && (
              <p className="text-center text-muted-foreground text-sm py-8">
                {search ? "Zadny stul nenalezen" : "Zadne dostupne stoly"}
              </p>
            )}
          </div>
        </ScrollArea>

        {/* Confirm bar */}
        <div className="px-4 py-3 border-t bg-card space-y-2">
          {extraOption && (
            <label className="flex items-center gap-2 text-sm cursor-pointer select-none touch-manipulation min-h-[40px]">
              <input
                type="checkbox"
                checked={extraChecked}
                onChange={(e) => setExtraChecked(e.target.checked)}
                className="h-5 w-5 accent-primary cursor-pointer"
              />
              <span>{extraOption.label}</span>
            </label>
          )}
          <Button
            className="w-full h-12 text-base touch-manipulation"
            disabled={!selectedTableId || isPending}
            onClick={handleConfirm}
          >
            <Check className="h-5 w-5 mr-2" />
            {isPending ? "Presunuji..." : "Potvrdit presun"}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
