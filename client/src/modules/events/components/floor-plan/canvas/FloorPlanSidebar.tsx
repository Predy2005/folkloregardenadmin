import { useState, useMemo, useCallback } from "react";
import { Search, X, ChevronDown, ChevronRight, Armchair, GripVertical, Baby, Car, Flag } from "lucide-react";
import { Input } from "@/shared/components/ui/input";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { ScrollArea } from "@/shared/components/ui/scroll-area";
import { Checkbox } from "@/shared/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select";
import { useIsTouchDevice } from "@/hooks/use-mobile";
import type { EventGuest, EventTable, Room } from "@shared/types";

type GroupMode = "reservation" | "nationality";

interface ReservationGroup {
  reservationId: number | null;
  label: string;
  nationality: string | null;
  guests: EventGuest[];
}

interface FloorPlanSidebarProps {
  guests: EventGuest[];
  tables: EventTable[];
  selectedTableId: number | null;
  room?: Room | null;
  onAssignGuest: (guestId: number, tableId: number) => void;
  onUnassignGuest: (guestId: number) => void;
  onAutoSeatGuests: (guestIds: number[]) => void;
}

export function FloorPlanSidebar({
  guests,
  tables,
  selectedTableId,
  onAssignGuest,
  onUnassignGuest,
  onAutoSeatGuests,
  room,
}: FloorPlanSidebarProps) {
  const [search, setSearch] = useState("");
  const [nationalityFilter, setNationalityFilter] = useState("all");
  const [groupMode, setGroupMode] = useState<GroupMode>("reservation");
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  const [selectedGuestIds, setSelectedGuestIds] = useState<Set<number>>(new Set());
  const [lastClickedGuestId, setLastClickedGuestId] = useState<number | null>(null);

  const unassignedGuests = useMemo(
    () => guests.filter((g) => !g.eventTableId),
    [guests]
  );

  const nationalities = useMemo(() => {
    const nats = new Map<string, number>();
    unassignedGuests.forEach((g) => {
      // Trim + non-empty guard: SelectItem value MUST NOT be an empty string.
      const key = g.nationality?.trim();
      if (key) nats.set(key, (nats.get(key) || 0) + 1);
    });
    return Array.from(nats.entries()).sort((a, b) => b[1] - a[1]);
  }, [unassignedGuests]);

  // Filter guests
  const filteredUnassigned = useMemo(() => {
    let list = unassignedGuests;
    if (nationalityFilter !== "all") {
      list = list.filter((g) => g.nationality === nationalityFilter);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (g) =>
          (g.firstName?.toLowerCase() || "").includes(q) ||
          (g.lastName?.toLowerCase() || "").includes(q) ||
          (g.nationality?.toLowerCase() || "").includes(q)
      );
    }
    return list;
  }, [unassignedGuests, nationalityFilter, search]);

  // Group guests
  const groups = useMemo((): ReservationGroup[] => {
    if (groupMode === "nationality") {
      const natMap = new Map<string, EventGuest[]>();
      filteredUnassigned.forEach((g) => {
        const key = g.nationality || "—";
        if (!natMap.has(key)) natMap.set(key, []);
        natMap.get(key)!.push(g);
      });
      return Array.from(natMap.entries())
        .sort((a, b) => b[1].length - a[1].length)
        .map(([nat, guests]) => ({
          reservationId: null,
          label: nat,
          nationality: nat === "—" ? null : nat,
          guests,
        }));
    }

    // Group by reservation
    const resMap = new Map<number | string, { guests: EventGuest[]; nationality: string | null }>();
    filteredUnassigned.forEach((g) => {
      const key = g.reservationId ?? `no-res-${g.id}`;
      if (!resMap.has(key)) resMap.set(key, { guests: [], nationality: g.nationality || null });
      resMap.get(key)!.guests.push(g);
    });

    return Array.from(resMap.entries())
      .sort((a, b) => b[1].guests.length - a[1].guests.length)
      .map(([key, data]) => {
        const resId = typeof key === "number" ? key : null;
        const first = data.guests[0];
        const label = resId
          ? `R#${resId} — ${first.nationality || "?"} (${data.guests.length})`
          : `${first.firstName || ""} ${first.lastName || ""}`.trim() || `Host #${first.id}`;
        return {
          reservationId: resId,
          label,
          nationality: data.nationality,
          guests: data.guests,
        };
      });
  }, [filteredUnassigned, groupMode]);

  const toggleGroup = (key: string) => {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const collapseAll = () => {
    setCollapsedGroups(new Set(groups.map((g) => g.label)));
  };

  const expandAll = () => {
    setCollapsedGroups(new Set());
  };

  // Auto-seat entire group across available tables
  const handleAutoSeatGroup = useCallback(
    (groupGuests: EventGuest[]) => {
      const unassignedIds = groupGuests.filter((g) => !g.eventTableId).map((g) => g.id);
      if (unassignedIds.length > 0) onAutoSeatGuests(unassignedIds);
    },
    [onAutoSeatGuests]
  );

  // Selected table info
  const selectedTable = tables.find((t) => t.id === selectedTableId);
  const selectedTableGuests = useMemo(
    () => (selectedTableId ? guests.filter((g) => g.eventTableId === selectedTableId) : []),
    [guests, selectedTableId]
  );

  // Stats & recommendations
  const stats = useMemo(() => {
    const totalGuests = guests.length;
    const assignedGuests = guests.filter((g) => g.eventTableId).length;
    const childGuests = guests.filter((g) => g.type === "child").length;
    const totalCapacity = tables.reduce((sum, t) => sum + t.capacity, 0);
    const avgCapacity = tables.length > 0 ? Math.round(totalCapacity / tables.length) : 6;
    const neededTables = avgCapacity > 0 ? Math.ceil(totalGuests / avgCapacity) : 0;
    const tablesWithChildren = new Set(
      guests.filter((g) => g.type === "child" && g.eventTableId).map((g) => g.eventTableId)
    ).size;
    const childTablesNeeded = childGuests > 0 ? Math.ceil(childGuests / avgCapacity) : 0;

    return {
      totalGuests,
      assignedGuests,
      childGuests,
      totalCapacity,
      tableCount: tables.length,
      neededTables,
      tablesWithChildren,
      childTablesNeeded,
    };
  }, [guests, tables]);

  const isTouch = useIsTouchDevice();

  // All unassigned guest IDs in display order (flat list across all groups)
  const orderedUnassignedIds = useMemo(
    () => groups.flatMap((g) => g.guests.filter((gu) => !gu.eventTableId).map((gu) => gu.id)),
    [groups]
  );

  const handleGuestClick = (guestId: number, shiftKey: boolean) => {
    if (shiftKey && lastClickedGuestId !== null) {
      // Shift+click — select range
      const list = orderedUnassignedIds;
      const fromIdx = list.indexOf(lastClickedGuestId);
      const toIdx = list.indexOf(guestId);
      if (fromIdx !== -1 && toIdx !== -1) {
        const start = Math.min(fromIdx, toIdx);
        const end = Math.max(fromIdx, toIdx);
        setSelectedGuestIds((prev) => {
          const next = new Set(prev);
          for (let i = start; i <= end; i++) next.add(list[i]);
          return next;
        });
        setLastClickedGuestId(guestId);
        return;
      }
    }
    // Normal click — toggle single
    setSelectedGuestIds((prev) => {
      const next = new Set(prev);
      if (next.has(guestId)) next.delete(guestId);
      else next.add(guestId);
      return next;
    });
    setLastClickedGuestId(guestId);
  };

  const selectGroupGuests = (groupGuests: EventGuest[]) => {
    const ids = groupGuests.filter((g) => !g.eventTableId).map((g) => g.id);
    const allSelected = ids.every((id) => selectedGuestIds.has(id));
    setSelectedGuestIds((prev) => {
      const next = new Set(prev);
      ids.forEach((id) => (allSelected ? next.delete(id) : next.add(id)));
      return next;
    });
  };

  const handleDragStart = (e: React.DragEvent, guestId: number) => {
    // If this guest is part of a selection, drag all selected
    if (selectedGuestIds.has(guestId) && selectedGuestIds.size > 1) {
      e.dataTransfer.setData("guestIds", JSON.stringify(Array.from(selectedGuestIds)));
    } else {
      e.dataTransfer.setData("guestId", String(guestId));
    }
    e.dataTransfer.effectAllowed = "move";
  };

  const handleGroupDragStart = (e: React.DragEvent, groupGuests: EventGuest[]) => {
    // Drag selected guests from this group, or all unassigned if none selected
    const unassigned = groupGuests.filter((g) => !g.eventTableId);
    const selectedInGroup = unassigned.filter((g) => selectedGuestIds.has(g.id));
    const ids = selectedInGroup.length > 0 ? selectedInGroup.map((g) => g.id) : unassigned.map((g) => g.id);
    e.dataTransfer.setData("guestIds", JSON.stringify(ids));
    e.dataTransfer.effectAllowed = "move";
  };

  // On touch: tap guest to assign to selected table
  const handleGuestTap = (guestId: number) => {
    if (isTouch && selectedTable && selectedTableGuests.length < selectedTable.capacity) {
      onAssignGuest(guestId, selectedTable.id);
    }
  };

  return (
    <div className="w-80 border-l bg-card flex flex-col h-full">
      {/* Selected table info */}
      {selectedTable && (
        <div className="p-3 border-b bg-blue-50 dark:bg-blue-950/30">
          <div className="flex items-center justify-between mb-2">
            <span className="font-semibold text-sm">{selectedTable.tableName}</span>
            <Badge variant={selectedTableGuests.length >= selectedTable.capacity ? "destructive" : "outline"}>
              {selectedTableGuests.length}/{selectedTable.capacity}
            </Badge>
          </div>
          <div className="space-y-1 max-h-32 overflow-y-auto">
            {selectedTableGuests.map((g) => (
              <div key={g.id} className="flex items-center gap-1.5 text-xs bg-white dark:bg-zinc-800 rounded px-2 py-1">
                {g.type === "child" && <span title="Dítě" className="shrink-0 text-orange-500"><Baby className="h-3 w-3" /></span>}
                {g.type === "infant" && <span title="Miminko" className="shrink-0 text-pink-400"><Baby className="h-3 w-3" /></span>}
                {g.type === "driver" && <span title="Řidič" className="shrink-0 text-blue-500"><Car className="h-3 w-3" /></span>}
                {g.type === "guide" && <span title="Průvodce" className="shrink-0 text-green-600"><Flag className="h-3 w-3" /></span>}
                <span className="flex-1 truncate">
                  {g.firstName} {g.lastName}
                  {g.nationality && <span className="text-muted-foreground ml-1">({g.nationality})</span>}
                </span>
                <Button variant="ghost" size="icon" className="h-5 w-5 shrink-0" onClick={() => onUnassignGuest(g.id)}>
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ))}
            {selectedTableGuests.length === 0 && (
              <p className="text-xs text-muted-foreground">Nikdo u stolu</p>
            )}
          </div>
        </div>
      )}

      {/* Stats & recommendations */}
      <div className="p-2 border-b bg-muted/30 space-y-1 text-xs">
        <div className="grid grid-cols-2 gap-x-3 gap-y-0.5">
          <span className="text-muted-foreground">Hostů celkem:</span>
          <span className="font-medium">{stats.totalGuests}</span>
          <span className="text-muted-foreground">Usazeno:</span>
          <span className="font-medium">
            {stats.assignedGuests}/{stats.totalGuests}
            {stats.totalGuests > 0 && (
              <span className="text-muted-foreground ml-1">
                ({Math.round((stats.assignedGuests / stats.totalGuests) * 100)}%)
              </span>
            )}
          </span>
          <span className="text-muted-foreground">Stolů:</span>
          <span className="font-medium">
            {stats.tableCount}
            {stats.tableCount < stats.neededTables && (
              <span className="text-orange-600 ml-1">(potřeba min. {stats.neededTables})</span>
            )}
          </span>
          <span className="text-muted-foreground">Kapacita stolů:</span>
          <span className={`font-medium ${stats.totalCapacity < stats.totalGuests ? "text-red-600" : ""}`}>
            {stats.totalCapacity}
            {stats.totalCapacity < stats.totalGuests && (
              <span className="ml-1">(chybí {stats.totalGuests - stats.totalCapacity} míst)</span>
            )}
          </span>
          {stats.childGuests > 0 && (
            <>
              <span className="text-muted-foreground">👶 Děti:</span>
              <span className="font-medium">
                {stats.childGuests} — min. {stats.childTablesNeeded} {stats.childTablesNeeded === 1 ? "stůl" : stats.childTablesNeeded < 5 ? "stoly" : "stolů"}
              </span>
            </>
          )}
          {room && (
            <>
              <span className="text-muted-foreground">Limit místnosti:</span>
              <span className={`font-medium ${stats.totalGuests > (room.capacityLimit ?? Infinity) ? "text-red-600" : ""}`}>
                {room.capacityLimit ? `${room.capacityLimit} osob` : "—"}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Header + filters */}
      <div className="p-3 border-b space-y-2">
        <div className="flex items-center justify-between">
          <span className="font-semibold text-sm">Nepřiřazení</span>
          <Badge variant="secondary">{unassignedGuests.length}</Badge>
        </div>

        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Hledat..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-8 text-xs"
          />
        </div>

        <div className="flex gap-1.5">
          {/* Nationality filter */}
          <Select value={nationalityFilter} onValueChange={setNationalityFilter}>
            <SelectTrigger className="h-7 text-xs flex-1">
              <SelectValue placeholder="Národnost" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Vše ({unassignedGuests.length})</SelectItem>
              {nationalities.map(([nat, count]) => (
                <SelectItem key={nat} value={nat}>{nat} ({count})</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Group mode */}
          <Select value={groupMode} onValueChange={(v) => setGroupMode(v as GroupMode)}>
            <SelectTrigger className="h-7 text-xs w-28">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="reservation">Dle rezervace</SelectItem>
              <SelectItem value="nationality">Dle národnosti</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Collapse/expand all + seat all */}
        <div className="flex gap-1 flex-wrap">
          <Button variant="ghost" size="sm" className="h-6 text-xs px-2" onClick={expandAll}>
            Rozbalit
          </Button>
          <Button variant="ghost" size="sm" className="h-6 text-xs px-2" onClick={collapseAll}>
            Sbalit
          </Button>
          <span className="flex-1" />
          {filteredUnassigned.length > 0 && (
            <Button
              variant="default"
              size="sm"
              className="h-6 text-xs px-2"
              onClick={() => onAutoSeatGuests(filteredUnassigned.map((g) => g.id))}
            >
              <Armchair className="h-3 w-3 mr-1" />
              Usadit vše ({filteredUnassigned.length})
            </Button>
          )}
        </div>

        {/* Selection indicator */}
        {!isTouch && selectedGuestIds.size > 0 && (
          <div className="flex items-center gap-2 bg-primary/10 rounded px-2 py-1">
            <span className="text-xs font-medium flex-1">
              Vybráno: {selectedGuestIds.size} hostů
            </span>
            <Button
              variant="ghost"
              size="sm"
              className="h-5 text-xs px-1"
              onClick={() => setSelectedGuestIds(new Set())}
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        )}
      </div>

      {/* Grouped guest list */}
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {groups.map((group) => {
            const groupKey = group.label;
            const isCollapsed = collapsedGroups.has(groupKey);

            return (
              <div key={groupKey} className="rounded-md border bg-background">
                {/* Group header — draggable to assign group to table */}
                <div
                  className={`flex items-center gap-1.5 px-2 py-1.5 cursor-pointer hover:bg-muted/50 select-none ${
                    !isTouch && group.guests.some((g) => !g.eventTableId) ? "cursor-grab active:cursor-grabbing" : ""
                  }`}
                  draggable={!isTouch && group.guests.some((g) => !g.eventTableId)}
                  onDragStart={!isTouch ? (e) => handleGroupDragStart(e, group.guests) : undefined}
                  onClick={() => toggleGroup(groupKey)}
                >
                  {/* Group select checkbox */}
                  {!isTouch && (() => {
                    const unassignedIds = group.guests.filter((g) => !g.eventTableId).map((g) => g.id);
                    const selectedCount = unassignedIds.filter((id) => selectedGuestIds.has(id)).length;
                    const allSelected = unassignedIds.length > 0 && selectedCount === unassignedIds.length;
                    const someSelected = selectedCount > 0 && !allSelected;
                    return unassignedIds.length > 0 ? (
                      <Checkbox
                        checked={allSelected ? true : someSelected ? "indeterminate" : false}
                        onCheckedChange={(_e) => { selectGroupGuests(group.guests); }}
                        onClick={(e) => e.stopPropagation()}
                        className="h-3.5 w-3.5 shrink-0"
                      />
                    ) : null;
                  })()}
                  {isCollapsed ? (
                    <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  ) : (
                    <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  )}
                  {!isTouch && group.guests.some((g) => !g.eventTableId) && (
                    <GripVertical className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  )}
                  <span className="text-xs font-medium truncate flex-1">{group.label}</span>
                  <Badge variant="outline" className="text-[10px] px-1 h-4 shrink-0">
                    {group.guests.length}
                  </Badge>

                  {/* Auto-seat entire group */}
                  {group.guests.some((g) => !g.eventTableId) && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-5 w-5 shrink-0"
                      title="Automaticky usadit skupinu do volných stolů"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleAutoSeatGroup(group.guests);
                      }}
                    >
                      <Armchair className="h-3 w-3" />
                    </Button>
                  )}
                </div>

                {/* Individual guests */}
                {!isCollapsed && (
                  <div className="px-1.5 pb-1.5 space-y-0.5">
                    {group.guests.map((guest) => {
                      const canAssign = selectedTable && selectedTableGuests.length < selectedTable.capacity;
                      const isChecked = selectedGuestIds.has(guest.id);
                      return (
                        <div
                          key={guest.id}
                          draggable={!isTouch}
                          onDragStart={!isTouch ? (e) => handleDragStart(e, guest.id) : undefined}
                          onClick={(e) => {
                            if (isTouch) {
                              handleGuestTap(guest.id);
                            } else {
                              handleGuestClick(guest.id, e.shiftKey);
                            }
                          }}
                          className={`flex items-center gap-1.5 px-1.5 rounded text-xs group ${
                            isTouch
                              ? `py-2 min-h-[44px] bg-muted/30 ${canAssign ? "active:bg-primary/20 cursor-pointer" : ""}`
                              : `py-1 cursor-pointer select-none ${isChecked ? "bg-primary/10 ring-1 ring-primary/30" : "bg-muted/30"} hover:bg-muted/60`
                          }`}
                        >
                          {!isTouch && (
                            <div className={`w-3 h-3 shrink-0 rounded-sm border flex items-center justify-center ${
                              isChecked ? "bg-primary border-primary" : "border-muted-foreground/40"
                            }`}>
                              {isChecked && (
                                <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                                  <path d="M1.5 4L3 5.5L6.5 2" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                </svg>
                              )}
                            </div>
                          )}
                          <div className="flex-1 min-w-0 truncate">
                            {guest.firstName || guest.lastName
                              ? `${guest.firstName ?? ""} ${guest.lastName ?? ""}`.trim()
                              : `#${guest.id}`}
                          </div>
                          {guest.type === "child" && (
                            <span title="Dítě" className="shrink-0 text-orange-500"><Baby className="h-3.5 w-3.5" /></span>
                          )}
                          {guest.type === "infant" && (
                            <span title="Miminko" className="shrink-0 text-pink-400"><Baby className="h-3.5 w-3.5" /></span>
                          )}
                          {guest.type === "driver" && (
                            <span title="Řidič" className="shrink-0 text-blue-500"><Car className="h-3.5 w-3.5" /></span>
                          )}
                          {guest.type === "guide" && (
                            <span title="Průvodce" className="shrink-0 text-green-600"><Flag className="h-3.5 w-3.5" /></span>
                          )}
                          {/* Quick assign button — desktop only (touch uses tap) */}
                          {!isTouch && canAssign && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-4 w-4 shrink-0 opacity-0 group-hover:opacity-100"
                              onClick={(e) => { e.stopPropagation(); onAssignGuest(guest.id, selectedTable!.id); }}
                            >
                              +
                            </Button>
                          )}
                          {/* Touch indicator */}
                          {isTouch && canAssign && (
                            <span className="text-[10px] text-primary shrink-0">+ přiřadit</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}

          {filteredUnassigned.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-4">
              {unassignedGuests.length === 0 ? "Všichni hosté jsou přiřazeni" : "Žádné výsledky"}
            </p>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
