import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/shared/lib/api";
import { useToast } from "@/shared/hooks/use-toast";
import type {
  EventTable, EventGuest, FloorPlanElement, Building,
  TableShape, FloorPlanElementType, FloorPlanTemplate,
} from "@shared/types";
import { DEFAULT_CAPACITY, DEFAULT_TABLE_SIZE, DEFAULT_ELEMENT_SIZE, GRID_SIZE } from "./constants";

let nextTempId = -1;
const getTempId = () => nextTempId--;

export function useFloorPlanState(eventId: number) {
  const { toast } = useToast();
  const qc = useQueryClient();

  // ── Fetch data ──
  const { data: floorPlan, isLoading: floorPlanLoading, isError: floorPlanError } = useQuery({
    queryKey: ["floor-plan", eventId],
    queryFn: () => api.get(`/api/events/${eventId}/floor-plan`),
  });

  const { data: allBuildings = [] } = useQuery<Building[]>({
    queryKey: ["buildings"],
    queryFn: () => api.get("/api/venue/buildings"),
  });

  const { data: eventSpacesData } = useQuery<{ spaces: string[] }>({
    queryKey: ["event-spaces", eventId],
    queryFn: () => api.get(`/api/events/${eventId}/spaces`),
  });

  // Filter buildings to only those selected as event spaces (by slug match)
  const buildings = useMemo(() => {
    const spaceNames = eventSpacesData?.spaces;
    if (!spaceNames || spaceNames.length === 0) return allBuildings;
    return allBuildings
      .map((b) => {
        // Check if the building slug matches any event space
        if (spaceNames.includes(b.slug)) return b;
        // Also check individual room slugs within buildings
        const matchingRooms = (b.rooms ?? []).filter((r) =>
          spaceNames.includes(r.slug)
        );
        if (matchingRooms.length > 0) return { ...b, rooms: matchingRooms };
        return null;
      })
      .filter((b): b is Building => b !== null);
  }, [allBuildings, eventSpacesData?.spaces]);

  const { data: templates = [] } = useQuery<FloorPlanTemplate[]>({
    queryKey: ["floor-plan-templates"],
    queryFn: () => api.get("/api/venue/templates"),
  });

  const { data: allEventGuests = [], isSuccess: guestsLoaded } = useQuery<EventGuest[]>({
    queryKey: ["event-guests", eventId],
    queryFn: () => api.get(`/api/events/${eventId}/guests`),
  });

  // ── Local state ──
  const [tables, setTables] = useState<EventTable[]>([]);
  const [elements, setElements] = useState<FloorPlanElement[]>([]);
  const [guests, setGuests] = useState<EventGuest[]>([]);
  const [selectedTableId, setSelectedTableId] = useState<number | null>(null);
  const [selectedElementId, setSelectedElementId] = useState<number | null>(null);
  const [selectedRoomId, setSelectedRoomId] = useState<number | null>(null);
  const [isDirty, setIsDirty] = useState(false);

  // All rooms flattened
  const allRooms = useMemo(
    () => buildings.flatMap((b) => b.rooms ?? []),
    [buildings]
  );

  const selectedRoom = allRooms.find((r) => r.id === selectedRoomId) || null;

  // Deselect items when switching rooms
  const handleSelectRoom = useCallback((roomId: number | null) => {
    setSelectedRoomId(roomId);
    setSelectedTableId(null);
    setSelectedElementId(null);
  }, []);

  // Auto-select first room when rooms load and none is selected
  useEffect(() => {
    if (allRooms.length > 0 && selectedRoomId === null) {
      setSelectedRoomId(allRooms[0].id);
    }
  }, [allRooms, selectedRoomId]);

  // Initialize from API data
  useEffect(() => {
    if (floorPlan) {
      setTables(floorPlan.tables ?? []);
      setElements(floorPlan.elements ?? []);
      // Reset local guest overrides — allEventGuests is the authoritative source
      setGuests([]);
      isInitialized.current = true;
      setIsDirty(false); // fresh data from server = not dirty
    }
  }, [floorPlan]);

  // Merge guests: allEventGuests (from API, has eventTableId) + local overrides (from user actions)
  // Local `guests` state only holds changes made since last save/load
  const mergedGuests = useMemo(() => {
    // Local overrides: guest assignments changed by user but not yet saved
    const localOverrides = new Map<number, number | undefined>();
    guests.forEach((g) => {
      localOverrides.set(g.id, g.eventTableId);
    });

    return allEventGuests.map((g) => ({
      ...g,
      eventTableId: localOverrides.has(g.id) ? localOverrides.get(g.id) : g.eventTableId,
    }));
  }, [allEventGuests, guests]);

  // Filter by selected room
  // Filter strictly by selected room — only show items belonging to that room
  const filteredTables = selectedRoomId
    ? tables.filter((t) => t.roomId === selectedRoomId)
    : tables;

  const filteredElements = selectedRoomId
    ? elements.filter((e) => e.roomId === selectedRoomId)
    : elements;

  // ── Auto-save state ──
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const autoSaveRef = useRef(false); // true = current save is auto (silent)
  const isInitialized = useRef(false); // prevent auto-save before first data load

  // ── Mutations ──
  const saveMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) => api.put(`/api/events/${eventId}/floor-plan`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["floor-plan", eventId] });
      qc.invalidateQueries({ queryKey: ["event-guests", eventId] });
      setIsDirty(false);
      setLastSavedAt(new Date());
      if (!autoSaveRef.current) {
        toast({ title: "Plánek uložen" });
      }
      autoSaveRef.current = false;
    },
    onError: () => {
      if (!autoSaveRef.current) {
        toast({ title: "Chyba při ukládání", variant: "destructive" });
      }
      autoSaveRef.current = false;
    },
  });

  const applyTemplateMutation = useMutation({
    mutationFn: (params: { templateId: number; roomId?: number | null }) =>
      api.post(`/api/events/${eventId}/floor-plan/from-template/${params.templateId}`, {
        roomId: params.roomId ?? null,
      }),
    onSuccess: () => {
      setIsDirty(false);
      qc.invalidateQueries({ queryKey: ["floor-plan", eventId] });
      qc.invalidateQueries({ queryKey: ["event-guests", eventId] });
      toast({ title: "Šablona aplikována" });
    },
  });

  const saveAsTemplateMutation = useMutation({
    mutationFn: (data: { name: string; roomId?: number | null }) =>
      api.post(`/api/events/${eventId}/floor-plan/save-as-template`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["floor-plan-templates"] });
      toast({ title: "Šablona uložena" });
    },
  });

  // ── Handlers ──
  const doSave = useCallback((silent: boolean) => {
    if (saveMutation.isPending) return;
    // Never save before guest data is loaded — would wipe assignments
    if (!guestsLoaded) return;
    autoSaveRef.current = silent;

    const assignments = mergedGuests
      .filter((g) => g.eventTableId)
      .map((g) => ({ guestId: g.id, tableId: g.eventTableId }));

    saveMutation.mutate({
      tables: tables.map((t) => ({
        id: t.id > 0 ? t.id : undefined,
        tempId: t.id < 0 ? t.id : undefined,
        tableName: t.tableName,
        room: t.room,
        roomId: t.roomId,
        capacity: t.capacity,
        positionX: t.positionX,
        positionY: t.positionY,
        shape: t.shape,
        widthPx: t.widthPx,
        heightPx: t.heightPx,
        rotation: t.rotation,
        tableNumber: t.tableNumber,
        color: t.color,
        isLocked: t.isLocked,
        sortOrder: t.sortOrder,
      })),
      elements: elements.map((e) => ({
        id: e.id > 0 ? e.id : undefined,
        elementType: e.elementType,
        label: e.label,
        roomId: e.roomId,
        positionX: e.positionX,
        positionY: e.positionY,
        widthPx: e.widthPx,
        heightPx: e.heightPx,
        rotation: e.rotation,
        shape: e.shape,
        shapeData: e.shapeData,
        color: e.color,
        isLocked: e.isLocked,
        sortOrder: e.sortOrder,
      })),
      assignments,
    });
  }, [tables, elements, mergedGuests, guestsLoaded, saveMutation]);

  const handleSave = () => doSave(false);

  // ── Auto-save: every 5 seconds when dirty (only after initial data load) ──
  useEffect(() => {
    if (!isDirty || !isInitialized.current || !guestsLoaded) return;
    const timer = setInterval(() => {
      if (isDirty && !saveMutation.isPending && isInitialized.current && guestsLoaded) {
        doSave(true);
      }
    }, 5000);
    return () => clearInterval(timer);
  }, [isDirty, doSave, guestsLoaded, saveMutation.isPending]);

  const handleTableMove = useCallback((id: number, x: number, y: number) => {
    setTables((prev) => prev.map((t) => (t.id === id ? { ...t, positionX: x, positionY: y } : t)));
    setIsDirty(true);
  }, []);

  const handleElementMove = useCallback((id: number, x: number, y: number) => {
    setElements((prev) => prev.map((e) => (e.id === id ? { ...e, positionX: x, positionY: y } : e)));
    setIsDirty(true);
  }, []);

  const handleAddTable = (shapeKey: string = "round") => {
    // "rectangle6" is a preset shortcut → rectangle shape with 6 capacity
    const actualShape: TableShape = shapeKey === "rectangle6" ? "rectangle" : (shapeKey as TableShape);
    const newTable: EventTable = {
      id: getTempId(),
      eventId,
      tableName: `Stůl ${tables.length + 1}`,
      room: selectedRoom?.slug ?? "cely_areal",
      roomId: selectedRoomId ?? undefined,
      capacity: DEFAULT_CAPACITY[shapeKey] ?? DEFAULT_CAPACITY[actualShape] ?? 6,
      positionX: 100 + Math.random() * 200,
      positionY: 100 + Math.random() * 200,
      shape: actualShape,
      widthPx: DEFAULT_TABLE_SIZE[shapeKey]?.width ?? DEFAULT_TABLE_SIZE[actualShape]?.width ?? 60,
      heightPx: DEFAULT_TABLE_SIZE[shapeKey]?.height ?? DEFAULT_TABLE_SIZE[actualShape]?.height ?? 100,
      rotation: 0,
      isLocked: false,
      sortOrder: tables.length,
    };
    setTables((prev) => [...prev, newTable]);
    setSelectedTableId(newTable.id);
    setIsDirty(true);
  };

  const handleAddElement = (elementType: FloorPlanElementType) => {
    const defaultSize = DEFAULT_ELEMENT_SIZE[elementType] ?? DEFAULT_ELEMENT_SIZE.custom;
    const newElement: FloorPlanElement = {
      id: getTempId(),
      eventId,
      roomId: selectedRoomId ?? undefined,
      elementType,
      label: undefined,
      positionX: 200 + Math.random() * 100,
      positionY: 200 + Math.random() * 100,
      widthPx: defaultSize.width,
      heightPx: defaultSize.height,
      rotation: 0,
      shape: "rectangle",
      isLocked: false,
      sortOrder: elements.length,
    };
    setElements((prev) => [...prev, newElement]);
    setSelectedElementId(newElement.id);
    setIsDirty(true);
  };

  const handleDuplicateTable = (id: number) => {
    const source = tables.find((t) => t.id === id);
    if (!source) return;
    const nextNumber = tables.length + 1;
    const copy: EventTable = {
      ...source,
      id: getTempId(),
      tableName: `Stůl ${nextNumber}`,
      tableNumber: nextNumber,
      positionX: (source.positionX ?? 100) + 40,
      positionY: (source.positionY ?? 100) + 40,
      isLocked: false,
      guests: [],
    };
    setTables((prev) => [...prev, copy]);
    setSelectedTableId(copy.id);
    setIsDirty(true);
  };

  const handleDeleteSelected = () => {
    if (selectedTableId) {
      const t = tables.find((t) => t.id === selectedTableId);
      if (t?.isLocked) return;
      setGuests((prev) =>
        prev.map((g) => (g.eventTableId === selectedTableId ? { ...g, eventTableId: undefined } : g))
      );
      setTables((prev) => prev.filter((t) => t.id !== selectedTableId));
      setSelectedTableId(null);
      setIsDirty(true);
    } else if (selectedElementId) {
      const el = elements.find((e) => e.id === selectedElementId);
      if (el?.isLocked) return;
      setElements((prev) => prev.filter((e) => e.id !== selectedElementId));
      setSelectedElementId(null);
      setIsDirty(true);
    }
  };

  const handleToggleLock = () => {
    if (selectedTableId) {
      setTables((prev) =>
        prev.map((t) => (t.id === selectedTableId ? { ...t, isLocked: !t.isLocked } : t))
      );
      setIsDirty(true);
    } else if (selectedElementId) {
      setElements((prev) =>
        prev.map((e) => (e.id === selectedElementId ? { ...e, isLocked: !e.isLocked } : e))
      );
      setIsDirty(true);
    }
  };

  const handleElementTransform = useCallback(
    (id: number, attrs: { width: number; height: number; rotation: number; x: number; y: number }) => {
      setElements((prev) =>
        prev.map((e) =>
          e.id === id
            ? { ...e, widthPx: attrs.width, heightPx: attrs.height, rotation: attrs.rotation, positionX: attrs.x, positionY: attrs.y }
            : e
        )
      );
      setIsDirty(true);
    },
    []
  );

  const handleTableTransform = useCallback(
    (id: number, attrs: { width: number; height: number; rotation: number; x: number; y: number }) => {
      setTables((prev) =>
        prev.map((t) =>
          t.id === id
            ? { ...t, widthPx: attrs.width, heightPx: attrs.height, rotation: attrs.rotation, positionX: attrs.x, positionY: attrs.y }
            : t
        )
      );
      setIsDirty(true);
    },
    []
  );

  const handleTableResize = useCallback((id: number, delta: number) => {
    setTables((prev) =>
      prev.map((t) => {
        if (t.id !== id) return t;
        const w = t.widthPx ?? 80;
        const h = t.heightPx ?? 80;
        if (t.shape === "round" || t.shape === "square") {
          const size = Math.max(40, w + delta);
          return { ...t, widthPx: size, heightPx: size };
        }
        return {
          ...t,
          widthPx: Math.max(40, w + delta),
          heightPx: Math.max(40, h + delta),
        };
      })
    );
    setIsDirty(true);
  }, []);

  const handleAssignGuest = (guestId: number, tableId: number) => {
    const table = tables.find((t) => t.id === tableId);
    if (table) {
      const currentCount = mergedGuests.filter((g) => g.eventTableId === tableId).length;
      if (currentCount >= table.capacity) {
        toast({ title: `Stůl "${table.tableName}" je plný (${table.capacity} míst)`, variant: "destructive" });
        return;
      }
    }
    setGuests((prev) => {
      const existing = prev.find((g) => g.id === guestId);
      if (existing) {
        return prev.map((g) => (g.id === guestId ? { ...g, eventTableId: tableId } : g));
      }
      return [...prev, { id: guestId, eventId, eventTableId: tableId } as EventGuest];
    });
    setIsDirty(true);
  };

  const handleAutoSeatGuests = useCallback((guestIds: number[]) => {
    if (guestIds.length === 0) return;

    // Build a snapshot of current occupancy
    const occupancy = new Map<number, number>();
    tables.forEach((t) => occupancy.set(t.id, 0));
    mergedGuests.forEach((g) => {
      if (g.eventTableId && occupancy.has(g.eventTableId)) {
        occupancy.set(g.eventTableId, occupancy.get(g.eventTableId)! + 1);
      }
    });

    // Only seat into tables in the selected room (or all if no room selected)
    const targetTables = selectedRoomId ? tables.filter((t) => t.roomId === selectedRoomId) : tables;
    const sortedTables = [...targetTables]
      .filter((t) => !t.isLocked)
      .map((t) => ({
        id: t.id,
        capacity: t.capacity,
        available: t.capacity - (occupancy.get(t.id) || 0),
      }))
      .filter((t) => t.available > 0)
      .sort((a, b) => b.available - a.available);

    const assignments: { guestId: number; tableId: number }[] = [];
    let tableIdx = 0;
    const remainingCapacity = new Map(sortedTables.map((t) => [t.id, t.available]));

    for (const guestId of guestIds) {
      // Already assigned?
      const existing = mergedGuests.find((g) => g.id === guestId);
      if (existing?.eventTableId) continue;

      // Find next table with space
      while (tableIdx < sortedTables.length && (remainingCapacity.get(sortedTables[tableIdx].id) || 0) <= 0) {
        tableIdx++;
      }
      if (tableIdx >= sortedTables.length) break;

      const table = sortedTables[tableIdx];
      assignments.push({ guestId, tableId: table.id });
      remainingCapacity.set(table.id, (remainingCapacity.get(table.id) || 0) - 1);
    }

    if (assignments.length === 0) {
      toast({ title: "Žádné volné místo u stolů", variant: "destructive" });
      return;
    }

    // Apply all assignments at once
    setGuests((prev) => {
      const assignMap = new Map(assignments.map((a) => [a.guestId, a.tableId]));
      const updated = prev.map((g) => {
        const tableId = assignMap.get(g.id);
        return tableId ? { ...g, eventTableId: tableId } : g;
      });
      // Add guests that aren't in local state yet
      const existingIds = new Set(prev.map((g) => g.id));
      const newGuests = assignments
        .filter((a) => !existingIds.has(a.guestId))
        .map((a) => ({ id: a.guestId, eventId, eventTableId: a.tableId }) as EventGuest);
      return [...updated, ...newGuests];
    });
    setIsDirty(true);

    const seated = assignments.length;
    const total = guestIds.filter((id) => !mergedGuests.find((g) => g.id === id)?.eventTableId).length;
    if (seated < total) {
      toast({ title: `Usazeno ${seated}/${total} hostů — nedostatek míst` });
    } else {
      toast({ title: `Usazeno ${seated} hostů` });
    }
  }, [tables, mergedGuests, eventId, selectedRoomId, toast]);

  const handleUnassignGuest = (guestId: number) => {
    setGuests((prev) => {
      const existing = prev.find((g) => g.id === guestId);
      if (existing) {
        return prev.map((g) => (g.id === guestId ? { ...g, eventTableId: undefined } : g));
      }
      // Guest not yet in local overrides — add them with no table assignment
      return [...prev, { id: guestId, eventId, eventTableId: undefined } as EventGuest];
    });
    setIsDirty(true);
  };

  const handleUpdateTable = (id: number, data: Record<string, unknown>) => {
    setTables((prev) => prev.map((t) => (t.id === id ? { ...t, ...data } : t)));
    setIsDirty(true);
  };

  const handleSaveRoomShape = useCallback(async (roomId: number, points: number[]) => {
    try {
      await api.put(`/api/venue/rooms/${roomId}`, { shapeData: { points } });
      qc.invalidateQueries({ queryKey: ["buildings"] });
      toast({ title: "Tvar místnosti uložen" });
    } catch {
      toast({ title: "Chyba při ukládání tvaru místnosti", variant: "destructive" });
    }
  }, [qc, toast]);

  const handleResetRoomShape = useCallback(async (roomId: number) => {
    try {
      await api.put(`/api/venue/rooms/${roomId}`, { shapeData: null });
      qc.invalidateQueries({ queryKey: ["buildings"] });
      toast({ title: "Tvar místnosti resetován na obdélník" });
    } catch {
      toast({ title: "Chyba při resetování tvaru", variant: "destructive" });
    }
  }, [qc, toast]);

  const handleSavePolygon = (targetId: number | null, points: number[]) => {
    if (targetId) {
      setElements((prev) =>
        prev.map((e) =>
          e.id === targetId ? { ...e, shape: "polygon", shapeData: { points } } : e
        )
      );
      setIsDirty(true);
    }
  };

  // ── Side effects ──

  // Batch assign multiple guests to a table (respects capacity)
  const handleAssignGuests = useCallback((guestIds: number[], tableId: number) => {
    const table = tables.find((t) => t.id === tableId);
    if (!table) return;
    const currentCount = mergedGuests.filter((g) => g.eventTableId === tableId).length;
    const available = table.capacity - currentCount;
    if (available <= 0) {
      toast({ title: `Stůl "${table.tableName}" je plný (${table.capacity} míst)`, variant: "destructive" });
      return;
    }
    const toAssign = guestIds.slice(0, available);
    const toAssignSet = new Set(toAssign);

    setGuests((prev) => {
      const existingIds = new Set(prev.map((g) => g.id));
      const updated = prev.map((g) =>
        toAssignSet.has(g.id) ? { ...g, eventTableId: tableId } : g
      );
      const newGuests = toAssign
        .filter((id) => !existingIds.has(id))
        .map((id) => ({ id, eventId, eventTableId: tableId }) as EventGuest);
      return [...updated, ...newGuests];
    });
    setIsDirty(true);

    if (toAssign.length < guestIds.length) {
      toast({
        title: `Usazeno ${toAssign.length}/${guestIds.length} — stůl plný`,
      });
    }
  }, [tables, mergedGuests, eventId, toast]);

  // Listen for guest drops from canvas — use ref to avoid stale closure
  const handleAssignGuestRef = useRef(handleAssignGuest);
  handleAssignGuestRef.current = handleAssignGuest;
  const handleAssignGuestsRef = useRef(handleAssignGuests);
  handleAssignGuestsRef.current = handleAssignGuests;
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail.guestIds) {
        handleAssignGuestsRef.current(detail.guestIds, detail.tableId);
      } else {
        handleAssignGuestRef.current(detail.guestId, detail.tableId);
      }
    };
    window.addEventListener("floorplan-guest-drop", handler);
    return () => window.removeEventListener("floorplan-guest-drop", handler);
  }, []);

  // Warn before leaving with unsaved changes
  useEffect(() => {
    if (!isDirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isDirty]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = document.activeElement?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;

      // Delete / Backspace — delete selected
      if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault();
        handleDeleteSelected();
        return;
      }

      // Escape — deselect
      if (e.key === "Escape") {
        setSelectedTableId(null);
        setSelectedElementId(null);
        return;
      }

      // Ctrl+D or Ctrl+C then Ctrl+V — duplicate selected table
      if ((e.ctrlKey || e.metaKey) && (e.key === "d" || e.key === "D")) {
        e.preventDefault();
        if (selectedTableId) handleDuplicateTable(selectedTableId);
        return;
      }

      // Ctrl+C — copy (store selection for paste)
      if ((e.ctrlKey || e.metaKey) && (e.key === "c" || e.key === "C")) {
        if (selectedTableId) {
          (window as unknown as Record<string, unknown>).__floorplan_copied_table = selectedTableId;
        }
        return;
      }

      // Ctrl+V — paste (duplicate copied table)
      if ((e.ctrlKey || e.metaKey) && (e.key === "v" || e.key === "V")) {
        const copiedId = (window as unknown as Record<string, unknown>).__floorplan_copied_table as number | undefined;
        if (copiedId) {
          handleDuplicateTable(copiedId);
        }
        return;
      }

      // Ctrl+S — save
      if ((e.ctrlKey || e.metaKey) && (e.key === "s" || e.key === "S")) {
        e.preventDefault();
        if (isDirty) handleSave();
        return;
      }

      // Ctrl+L — toggle lock
      if ((e.ctrlKey || e.metaKey) && (e.key === "l" || e.key === "L")) {
        e.preventDefault();
        handleToggleLock();
        return;
      }

      // Arrow keys — nudge selected table/element by grid step
      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)) {
        e.preventDefault();
        const step = e.shiftKey ? 1 : GRID_SIZE;
        const dx = e.key === "ArrowRight" ? step : e.key === "ArrowLeft" ? -step : 0;
        const dy = e.key === "ArrowDown" ? step : e.key === "ArrowUp" ? -step : 0;
        if (selectedTableId) {
          const t = tables.find((t) => t.id === selectedTableId);
          if (t && !t.isLocked) {
            handleTableMove(selectedTableId, (t.positionX ?? 0) + dx, (t.positionY ?? 0) + dy);
          }
        } else if (selectedElementId) {
          const el = elements.find((e) => e.id === selectedElementId);
          if (el && !el.isLocked) {
            handleElementMove(selectedElementId, el.positionX + dx, el.positionY + dy);
          }
        }
        return;
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTableId, selectedElementId, tables, elements, isDirty]);

  // ── Derived ──
  const selectedItem = selectedTableId
    ? tables.find((t) => t.id === selectedTableId)
    : selectedElementId
    ? elements.find((e) => e.id === selectedElementId)
    : null;
  const isSelectedLocked = selectedItem ? ('isLocked' in selectedItem ? selectedItem.isLocked : false) : false;

  return {
    // Data
    tables, elements, guests: mergedGuests,
    filteredTables, filteredElements,
    buildings, allRooms, selectedRoom, templates,
    floorPlanLoading, floorPlanError,

    // Selection
    selectedTableId, setSelectedTableId,
    selectedElementId, setSelectedElementId,
    selectedRoomId, setSelectedRoomId: handleSelectRoom,
    selectedItem, isSelectedLocked,

    // State
    isDirty,
    savePending: saveMutation.isPending,
    lastSavedAt,

    // Handlers
    handleSave,
    handleTableMove, handleElementMove,
    handleAddTable, handleAddElement,
    handleDeleteSelected, handleDuplicateTable, handleToggleLock,
    handleElementTransform, handleTableTransform, handleTableResize,
    handleAssignGuest, handleUnassignGuest, handleAutoSeatGuests,
    handleUpdateTable, handleSavePolygon, handleSaveRoomShape, handleResetRoomShape,
    applyTemplate: (id: number) => applyTemplateMutation.mutate({ templateId: id, roomId: selectedRoomId }),
    saveAsTemplate: (name: string) => saveAsTemplateMutation.mutate({ name, roomId: selectedRoomId }),
  };
}
