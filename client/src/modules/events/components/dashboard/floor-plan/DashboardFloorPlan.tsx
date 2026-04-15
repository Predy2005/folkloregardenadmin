import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/shared/hooks/use-toast";
import { Stage, Layer } from "react-konva";
import type Konva from "konva";
import { api } from "@/shared/lib/api";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import {
  Maximize, Minimize, Search, X, Building2, Loader2, Check, Armchair,
} from "lucide-react";
import type { EventTable, EventGuest, FloorPlanElement, Building } from "@shared/types";
import { TableShape } from "../../floor-plan/canvas/TableShape";
import { ElementShape } from "../../floor-plan/canvas/ElementShape";
import { CanvasGrid } from "../../floor-plan/canvas/CanvasGrid";
import { RoomBoundary } from "../../floor-plan/canvas/RoomBoundary";
import { GRID_SIZE, MIN_ZOOM, MAX_ZOOM, MAX_FIT_ZOOM, CM_TO_PX_RATIO } from "../../floor-plan/constants";
import { TableActionPanel } from "./TableActionPanel";
import { FloorPlanSidebar } from "../../floor-plan/canvas/FloorPlanSidebar";

interface DashboardFloorPlanProps {
  eventId: number;
}

export function DashboardFloorPlan({ eventId }: DashboardFloorPlanProps) {
  // ── Ensure EventGuest records are up-to-date once on mount ─────────────
  // (idempotent — preserves existing table assignments and presence state)
  const [synced, setSynced] = useState(false);
  useEffect(() => {
    let cancelled = false;
    api.post(`/api/events/${eventId}/guests/sync`)
      .catch(() => { /* non-fatal: guests may still be loaded from a prior sync */ })
      .finally(() => { if (!cancelled) setSynced(true); });
    return () => { cancelled = true; };
  }, [eventId]);

  // Data fetching
  const { data: floorPlan } = useQuery({
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

  const { data: allGuests = [] } = useQuery<(EventGuest & { menuName?: string | null })[]>({
    queryKey: ["event-guests", eventId],
    queryFn: () => api.get(`/api/events/${eventId}/guests`),
    // Wait for initial sync so we don't cache stale IDs that may get recreated.
    enabled: synced,
    refetchInterval: 30000,
  });

  // Per-table movement summary (for floor-plan 💰 indicator)
  interface TableMovementSummary {
    tableId: number;
    hasIncome: boolean;
    hasExpense: boolean;
    incomeTotal: number;
    expenseTotal: number;
  }
  const { data: movementsSummary = [] } = useQuery<TableMovementSummary[]>({
    queryKey: ["table-movements-summary", eventId],
    queryFn: () => api.get(`/api/events/${eventId}/tables/movements-summary`),
    refetchInterval: 30000,
  });
  const movementsByTable = useMemo(() => {
    const m = new Map<number, { hasIncome: boolean; hasExpense: boolean }>();
    for (const s of movementsSummary) {
      m.set(s.tableId, { hasIncome: s.hasIncome, hasExpense: s.hasExpense });
    }
    return m;
  }, [movementsSummary]);

  // Filter buildings to event spaces
  const buildings = useMemo(() => {
    const spaceNames = eventSpacesData?.spaces;
    if (!spaceNames || spaceNames.length === 0) return allBuildings;
    return allBuildings
      .map((b) => {
        if (spaceNames.includes(b.slug)) return b;
        const matchingRooms = (b.rooms ?? []).filter((r) => spaceNames.includes(r.slug));
        if (matchingRooms.length > 0) return { ...b, rooms: matchingRooms };
        return null;
      })
      .filter((b): b is Building => b !== null);
  }, [allBuildings, eventSpacesData?.spaces]);

  const allRooms = useMemo(() => buildings.flatMap((b) => b.rooms ?? []), [buildings]);

  const tables: EventTable[] = floorPlan?.tables ?? [];
  const elements: FloorPlanElement[] = floorPlan?.elements ?? [];

  // Mutations for guest assignment (drag-drop, click-to-assign, auto-seat)
  const qc = useQueryClient();
  const { toast } = useToast();

  // Track in-flight saves → show "ukládám" / "uloženo" indicator in the toolbar.
  const [saveCount, setSaveCount] = useState(0);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);

  // Optimistic patch of an EventGuest's eventTableId in the cache — UI reacts
  // instantly, API call runs in the background. Reverted on error.
  type GuestCache = (EventGuest & { menuName?: string | null })[];
  const applyOptimisticAssign = useCallback((guestId: number, tableId: number | null) => {
    const key = ["event-guests", eventId];
    const previous = qc.getQueryData<GuestCache>(key);
    qc.setQueryData<GuestCache>(key, (old) =>
      (old ?? []).map((g) => (g.id === guestId ? { ...g, eventTableId: tableId ?? undefined } : g))
    );
    return previous;
  }, [qc, eventId]);

  const assignMutation = useMutation({
    mutationFn: (data: { guestId: number; targetTableId: number }) =>
      api.post(`/api/events/${eventId}/reassign-guest`, data),
    onMutate: async (vars) => {
      setSaveCount((n) => n + 1);
      await qc.cancelQueries({ queryKey: ["event-guests", eventId] });
      const previous = applyOptimisticAssign(vars.guestId, vars.targetTableId);
      return { previous };
    },
    onSuccess: () => {
      setLastSavedAt(new Date());
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) qc.setQueryData(["event-guests", eventId], ctx.previous);
      toast({ title: "Chyba pri usazovani", variant: "destructive" });
    },
    onSettled: () => {
      setSaveCount((n) => Math.max(0, n - 1));
      qc.invalidateQueries({ queryKey: ["event-guests", eventId] });
      qc.invalidateQueries({ queryKey: ["floor-plan", eventId] });
    },
  });

  const unassignMutation = useMutation({
    mutationFn: (guestId: number) => api.post(`/api/events/${eventId}/unseat-guest`, { guestId }),
    onMutate: async (guestId) => {
      setSaveCount((n) => n + 1);
      await qc.cancelQueries({ queryKey: ["event-guests", eventId] });
      const previous = applyOptimisticAssign(guestId, null);
      return { previous };
    },
    onSuccess: () => {
      setLastSavedAt(new Date());
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) qc.setQueryData(["event-guests", eventId], ctx.previous);
      toast({ title: "Chyba pri uvolneni hosta", variant: "destructive" });
    },
    onSettled: () => {
      setSaveCount((n) => Math.max(0, n - 1));
      qc.invalidateQueries({ queryKey: ["event-guests", eventId] });
      qc.invalidateQueries({ queryKey: ["floor-plan", eventId] });
    },
  });


  // State
  const [selectedRoomId, setSelectedRoomId] = useState<number | null>(null);
  const [dropTargetTableId, setDropTargetTableId] = useState<number | null>(null);
  const [selectedTableId, setSelectedTableId] = useState<number | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);
  // Standalone "seat guests" panel — lets the operator open the full reservation list
  // (drag-drop, multi-select, auto-seat) without having to select a table first.
  const [globalSeatPanelOpen, setGlobalSeatPanelOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [highlightedTableId, setHighlightedTableId] = useState<number | null>(null);

  // Canvas state
  const stageRef = useRef<Konva.Stage>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const measureRef = useRef<HTMLDivElement>(null);
  const [stageSize, setStageSize] = useState({ width: 0, height: 0 });
  const [zoom, setZoom] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDraggable, setIsDraggable] = useState(true);
  const lastPinchDist = useRef<number | null>(null);
  const initialFitDone = useRef(false);
  const prevRoomId = useRef<number | null | undefined>(undefined);

  // Auto-select first room
  useEffect(() => {
    if (allRooms.length > 0 && selectedRoomId === null) {
      setSelectedRoomId(allRooms[0].id);
    }
  }, [allRooms, selectedRoomId]);

  const selectedRoom = allRooms.find((r) => r.id === selectedRoomId) || null;

  // Filter by room
  const filteredTables = selectedRoomId
    ? tables.filter((t) => t.roomId === selectedRoomId)
    : tables;
  const filteredElements = selectedRoomId
    ? elements.filter((e) => e.roomId === selectedRoomId)
    : elements;

  // Room dimensions
  const baseRoomWidth = selectedRoom ? selectedRoom.widthCm / CM_TO_PX_RATIO : 800;
  const baseRoomHeight = selectedRoom ? selectedRoom.heightCm / CM_TO_PX_RATIO : 600;

  const { roomWidth, roomHeight } = useMemo(() => {
    let maxX = baseRoomWidth;
    let maxY = baseRoomHeight;
    for (const t of filteredTables) {
      const right = (t.positionX ?? 0) + (t.widthPx ?? 60) + 20;
      const bottom = (t.positionY ?? 0) + (t.heightPx ?? 100) + 30;
      if (right > maxX) maxX = right;
      if (bottom > maxY) maxY = bottom;
    }
    for (const e of filteredElements) {
      const right = e.positionX + e.widthPx + 20;
      const bottom = e.positionY + e.heightPx + 20;
      if (right > maxX) maxX = right;
      if (bottom > maxY) maxY = bottom;
    }
    return { roomWidth: maxX, roomHeight: maxY };
  }, [baseRoomWidth, baseRoomHeight, filteredTables, filteredElements]);

  // Guest helpers
  const getTableGuests = useCallback(
    (tableId: number) => allGuests.filter((g) => g.eventTableId === tableId),
    [allGuests]
  );

  // ── Batch assign: ONE round-trip for many guests, ONE cache invalidation. ──
  // Used by auto-seat and multi-drop. Optimistic UI updates all guests upfront
  // so the operator sees the result instantly for 220+ guests.
  const batchAssign = useCallback(async (
    pairs: { guestId: number; targetTableId: number | null }[],
  ): Promise<{ appliedCount?: number; errors?: { guestId: number; error: string }[] }> => {
    if (pairs.length === 0) return { appliedCount: 0 };

    setSaveCount((n) => n + 1);
    // Optimistic: patch the whole list in one cache write
    const key = ["event-guests", eventId];
    await qc.cancelQueries({ queryKey: key });
    const previous = qc.getQueryData<(EventGuest & { menuName?: string | null })[]>(key);
    const assignmentMap = new Map(pairs.map((p) => [p.guestId, p.targetTableId]));
    qc.setQueryData<(EventGuest & { menuName?: string | null })[]>(key, (old) =>
      (old ?? []).map((g) => assignmentMap.has(g.id)
        ? { ...g, eventTableId: assignmentMap.get(g.id) ?? undefined }
        : g
      )
    );

    try {
      const res = await api.post<{ appliedCount: number; errors: { guestId: number; error: string }[] }>(
        `/api/events/${eventId}/assign-guests-batch`,
        { assignments: pairs.map((p) => ({ guestId: p.guestId, targetTableId: p.targetTableId })) }
      );
      setLastSavedAt(new Date());
      return res;
    } catch {
      // Rollback optimistic patch
      if (previous) qc.setQueryData(key, previous);
      toast({ title: "Chyba pri hromadnem usazovani", variant: "destructive" });
      return {};
    } finally {
      setSaveCount((n) => Math.max(0, n - 1));
      // Single invalidation at the end for BOTH queries
      qc.invalidateQueries({ queryKey: ["event-guests", eventId] });
      qc.invalidateQueries({ queryKey: ["floor-plan", eventId] });
    }
  }, [eventId, qc, toast]);

  // Auto-seat: fill available seats in the current room, largest-free-first.
  // Plans all assignments client-side, then sends ONE batch request.
  const handleAutoSeatGuests = useCallback(async (guestIds: number[]) => {
    if (guestIds.length === 0) return;

    const roomTables = selectedRoomId
      ? tables.filter((t) => t.roomId === selectedRoomId)
      : tables;

    const occupancy = new Map<number, number>();
    for (const t of roomTables) occupancy.set(t.id, 0);
    for (const g of allGuests) {
      if (g.eventTableId && occupancy.has(g.eventTableId)) {
        occupancy.set(g.eventTableId, (occupancy.get(g.eventTableId) ?? 0) + 1);
      }
    }

    const sorted = roomTables
      .filter((t) => !t.isLocked)
      .map((t) => ({ id: t.id, free: t.capacity - (occupancy.get(t.id) ?? 0) }))
      .filter((t) => t.free > 0)
      .sort((a, b) => b.free - a.free);

    const plan: { guestId: number; targetTableId: number }[] = [];
    let idx = 0;
    for (const guestId of guestIds) {
      while (idx < sorted.length && sorted[idx].free <= 0) idx++;
      if (idx >= sorted.length) break;
      plan.push({ guestId, targetTableId: sorted[idx].id });
      sorted[idx].free -= 1;
    }

    if (plan.length === 0) {
      toast({ title: "Nedostatek volnych mist", variant: "destructive" });
      return;
    }

    const res = await batchAssign(plan);
    const applied = res.appliedCount ?? 0;
    toast({
      title: plan.length === guestIds.length
        ? `Usazeno ${applied} hostu`
        : `Usazeno ${applied}/${guestIds.length} — nedostatek mist`,
    });
  }, [selectedRoomId, tables, allGuests, batchAssign, toast]);

  // Listen for guest drops from the FloorPlanSidebar (via window event).
  // Single drop → single endpoint. Multi-drop → batch endpoint.
  useEffect(() => {
    const handler = async (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (!detail?.tableId) return;
      const target = tables.find((t) => t.id === detail.tableId);
      if (!target) return;

      const used = allGuests.filter((g) => g.eventTableId === detail.tableId).length;
      const free = target.capacity - used;
      if (free <= 0) {
        toast({ title: `Stul je plny (${target.capacity} mist)`, variant: "destructive" });
        return;
      }

      const ids: number[] = detail.guestIds ?? (detail.guestId != null ? [detail.guestId] : []);
      const toAssign = ids.slice(0, free);
      if (toAssign.length === 0) return;

      if (toAssign.length === 1) {
        await assignMutation.mutateAsync({ guestId: toAssign[0], targetTableId: detail.tableId });
      } else {
        await batchAssign(toAssign.map((guestId) => ({ guestId, targetTableId: detail.tableId })));
      }

      if (toAssign.length < ids.length) {
        toast({ title: `Usazeno ${toAssign.length}/${ids.length} — stul plny` });
      } else if (toAssign.length > 1) {
        toast({ title: `Usazeno ${toAssign.length} hostu` });
      }
    };
    window.addEventListener("floorplan-guest-drop", handler);
    return () => window.removeEventListener("floorplan-guest-drop", handler);
  }, [tables, allGuests, assignMutation, batchAssign, toast]);

  // Find table at pointer coords (canvas space)
  const findTableAtScreenPos = useCallback((clientX: number, clientY: number): number | null => {
    const container = containerRef.current;
    if (!container) return null;
    const rect = container.getBoundingClientRect();
    const px = (clientX - rect.left - position.x) / zoom;
    const py = (clientY - rect.top - position.y) / zoom;
    for (const t of filteredTables) {
      const tx = t.positionX ?? 0, ty = t.positionY ?? 0;
      const tw = t.widthPx ?? 80, th = t.heightPx ?? 80;
      if (px >= tx && px <= tx + tw && py >= ty && py <= ty + th) return t.id;
    }
    return null;
  }, [filteredTables, position, zoom]);

  const handleCanvasDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDropTargetTableId(findTableAtScreenPos(e.clientX, e.clientY));
  }, [findTableAtScreenPos]);

  const handleCanvasDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDropTargetTableId(null);
    const tableId = findTableAtScreenPos(e.clientX, e.clientY);
    if (tableId == null) return;

    const guestIdsRaw = e.dataTransfer.getData("guestIds");
    if (guestIdsRaw) {
      try {
        const guestIds: number[] = JSON.parse(guestIdsRaw);
        window.dispatchEvent(new CustomEvent("floorplan-guest-drop", { detail: { tableId, guestIds } }));
      } catch { /* ignore */ }
      return;
    }
    const guestId = parseInt(e.dataTransfer.getData("guestId"), 10);
    if (!isNaN(guestId)) {
      window.dispatchEvent(new CustomEvent("floorplan-guest-drop", { detail: { tableId, guestId } }));
    }
  }, [findTableAtScreenPos]);

  // ResizeObserver
  useEffect(() => {
    const el = measureRef.current;
    if (!el) return;
    const measure = () => {
      const w = el.offsetWidth;
      const h = el.offsetHeight;
      if (w > 0 && h > 0) {
        setStageSize((prev) =>
          Math.abs(prev.width - w) > 1 || Math.abs(prev.height - h) > 1
            ? { width: w, height: h }
            : prev
        );
      }
    };
    measure();
    const observer = new ResizeObserver(() => measure());
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Fit to room
  const fitToRoom = useCallback(() => {
    const sw = stageSize.width || 800;
    const sh = stageSize.height || 600;
    const padding = 40;
    const scaleX = sw / (roomWidth + padding);
    const scaleY = sh / (roomHeight + padding);
    const scale = Math.min(scaleX, scaleY, MAX_FIT_ZOOM);
    setZoom(scale);
    setPosition({
      x: (sw - roomWidth * scale) / 2,
      y: (sh - roomHeight * scale) / 2,
    });
  }, [stageSize.width, stageSize.height, roomWidth, roomHeight]);

  // Fit on room switch
  useEffect(() => {
    const currentRoomId = selectedRoom?.id ?? null;
    if (!initialFitDone.current || currentRoomId !== prevRoomId.current) {
      initialFitDone.current = true;
      prevRoomId.current = currentRoomId;
      fitToRoom();
    }
  }, [selectedRoom?.id, fitToRoom]);

  // Refit on size change
  const prevStageSize = useRef({ width: 0, height: 0 });
  useEffect(() => {
    if (!initialFitDone.current) return;
    const prev = prevStageSize.current;
    if (Math.abs(prev.width - stageSize.width) > 10 || Math.abs(prev.height - stageSize.height) > 10) {
      prevStageSize.current = { width: stageSize.width, height: stageSize.height };
      fitToRoom();
    }
  }, [stageSize.width, stageSize.height, fitToRoom]);

  // Wheel zoom
  const handleWheel = useCallback((e: Konva.KonvaEventObject<WheelEvent>) => {
    e.evt.preventDefault();
    const stage = stageRef.current;
    if (!stage) return;
    const oldScale = stage.scaleX();
    const pointer = stage.getPointerPosition();
    if (!pointer) return;
    const mousePointTo = {
      x: (pointer.x - stage.x()) / oldScale,
      y: (pointer.y - stage.y()) / oldScale,
    };
    const direction = e.evt.deltaY > 0 ? -1 : 1;
    const scaleBy = 1.08;
    const newScale = direction > 0
      ? Math.min(MAX_ZOOM, oldScale * scaleBy)
      : Math.max(MIN_ZOOM, oldScale / scaleBy);
    setZoom(newScale);
    setPosition({
      x: pointer.x - mousePointTo.x * newScale,
      y: pointer.y - mousePointTo.y * newScale,
    });
  }, []);

  // Pinch-to-zoom
  const handleTouchMove = useCallback((e: Konva.KonvaEventObject<TouchEvent>) => {
    const touches = e.evt.touches;
    if (touches.length !== 2) {
      lastPinchDist.current = null;
      return;
    }
    e.evt.preventDefault();
    setIsDraggable(false);
    const stage = stageRef.current;
    const rect = containerRef.current?.getBoundingClientRect();
    if (!stage || !rect) return;
    const p1 = { x: touches[0].clientX, y: touches[0].clientY };
    const p2 = { x: touches[1].clientX, y: touches[1].clientY };
    const dist = Math.hypot(p2.x - p1.x, p2.y - p1.y);
    const center = { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 };
    if (lastPinchDist.current != null) {
      const oldScale = stage.scaleX();
      const newScale = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, oldScale * (dist / lastPinchDist.current)));
      const pointerX = center.x - rect.left;
      const pointerY = center.y - rect.top;
      const mousePointTo = {
        x: (pointerX - stage.x()) / oldScale,
        y: (pointerY - stage.y()) / oldScale,
      };
      setZoom(newScale);
      setPosition({
        x: pointerX - mousePointTo.x * newScale,
        y: pointerY - mousePointTo.y * newScale,
      });
    }
    lastPinchDist.current = dist;
  }, []);

  const handleTouchEnd = useCallback(() => {
    lastPinchDist.current = null;
    setIsDraggable(true);
  }, []);

  // Table tap → open action panel (and close the global seat panel, they share the same slot)
  const handleTableTap = useCallback((id: number | null) => {
    if (id == null) return;
    setGlobalSeatPanelOpen(false);
    setSelectedTableId(id);
    setPanelOpen(true);
  }, []);

  // Stage click → deselect
  const handleStageClick = (e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
    if (e.target === stageRef.current) {
      setSelectedTableId(null);
    }
  };

  // Table search
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase();
    return tables.filter((t) => {
      const num = t.tableNumber?.toString() ?? "";
      const name = t.tableName.toLowerCase();
      return num.includes(q) || name.includes(q);
    });
  }, [tables, searchQuery]);

  const handleSearchSelect = (table: EventTable) => {
    // Switch to table's room if needed
    if (table.roomId && table.roomId !== selectedRoomId) {
      setSelectedRoomId(table.roomId);
    }
    setHighlightedTableId(table.id);
    setSearchOpen(false);
    setSearchQuery("");

    // Center on table
    const sw = stageSize.width || 800;
    const sh = stageSize.height || 600;
    const tx = table.positionX ?? 0;
    const ty = table.positionY ?? 0;
    const tw = table.widthPx ?? 80;
    const th = table.heightPx ?? 80;
    const centerX = tx + tw / 2;
    const centerY = ty + th / 2;
    const targetZoom = 1.5;
    setZoom(targetZoom);
    setPosition({
      x: sw / 2 - centerX * targetZoom,
      y: sh / 2 - centerY * targetZoom,
    });

    // Open action panel after a brief delay
    setTimeout(() => {
      setSelectedTableId(table.id);
      setPanelOpen(true);
    }, 300);

    // Remove highlight after 3s
    setTimeout(() => setHighlightedTableId(null), 3000);
  };

  // Escape exits fullscreen
  useEffect(() => {
    if (!isFullscreen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsFullscreen(false);
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [isFullscreen]);

  // Stats
  const totalCapacity = filteredTables.reduce((s, t) => s + t.capacity, 0);
  const seatedGuests = allGuests.filter((g) =>
    g.eventTableId && filteredTables.some((t) => t.id === g.eventTableId)
  ).length;

  const isTouch = typeof window !== "undefined" && ("ontouchstart" in window || navigator.maxTouchPoints > 0);
  const btnClass = isTouch
    ? "w-11 h-11 rounded-lg bg-white dark:bg-zinc-800 border shadow-md text-base font-bold hover:bg-gray-50 active:bg-gray-100"
    : "w-8 h-8 rounded bg-white dark:bg-zinc-800 border shadow-sm text-sm font-bold hover:bg-gray-50";

  const selectedTable = selectedTableId ? tables.find((t) => t.id === selectedTableId) ?? null : null;

  return (
    <div
      className={
        isFullscreen
          ? "fixed inset-0 z-50 bg-background flex flex-col"
          // Tall enough that the unassigned-reservations list in seat mode can breathe.
          // Uses viewport math so it scales on tablets; min-h keeps it usable on desktops.
          : "flex flex-col h-[calc(100vh-240px)] min-h-[560px]"
      }
    >
      {/* Toolbar */}
      <div className="flex items-center gap-2 p-2 border-b bg-card flex-shrink-0 flex-wrap">
        {/* Room tabs */}
        <div className="flex items-center gap-1 flex-1 overflow-x-auto">
          {buildings.map((building) =>
            (building.rooms ?? []).map((room) => (
              <button
                key={room.id}
                className={`
                  px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap touch-manipulation
                  transition-colors select-none
                  ${selectedRoomId === room.id
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "bg-muted hover:bg-muted/80 text-muted-foreground"
                  }
                `}
                onClick={() => {
                  // Close any open side panel — the selected table may not belong to the new room.
                  if (panelOpen || selectedTableId !== null) {
                    setPanelOpen(false);
                    setSelectedTableId(null);
                  }
                  if (globalSeatPanelOpen) setGlobalSeatPanelOpen(false);
                  setSelectedRoomId(room.id);
                }}
              >
                <Building2 className="h-3 w-3 inline mr-1" />
                {room.name}
              </button>
            ))
          )}
        </div>

        {/* Stats */}
        <Badge variant="secondary" className="text-xs shrink-0">
          {filteredTables.length} stolu
        </Badge>
        <Badge variant="secondary" className="text-xs shrink-0">
          {seatedGuests}/{totalCapacity}
        </Badge>

        {/* Save indicator — visible whenever a seat/unseat operation is in flight
            or recently completed. Confirms auto-save to the operator. */}
        {saveCount > 0 ? (
          <Badge variant="outline" className="text-xs shrink-0 gap-1 border-amber-400 text-amber-700 bg-amber-50">
            <Loader2 className="h-3 w-3 animate-spin" />
            Ukladam
          </Badge>
        ) : lastSavedAt ? (
          <Badge variant="outline" className="text-xs shrink-0 gap-1 border-green-400 text-green-700 bg-green-50">
            <Check className="h-3 w-3" />
            {lastSavedAt.toLocaleTimeString("cs-CZ", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
          </Badge>
        ) : null}

        {/* Seat guests — opens the reservation list without needing a table selected first.
            Supports drag-drop onto any table, multi-select, and auto-seat-all. */}
        <Button
          variant={globalSeatPanelOpen ? "default" : "outline"}
          size="sm"
          className="h-9 shrink-0 touch-manipulation"
          onClick={() => {
            // Opening the seat panel takes priority over the per-table action panel.
            if (!globalSeatPanelOpen) {
              setPanelOpen(false);
              setSelectedTableId(null);
            }
            setGlobalSeatPanelOpen(!globalSeatPanelOpen);
          }}
          title="Usadit hosty"
        >
          <Armchair className="h-4 w-4 mr-1" />
          Usadit
        </Button>

        {/* Search */}
        <Button
          variant="outline"
          size="sm"
          className="h-9 w-9 shrink-0 touch-manipulation"
          onClick={() => setSearchOpen(!searchOpen)}
        >
          <Search className="h-4 w-4" />
        </Button>

        {/* Fullscreen */}
        <Button
          variant="outline"
          size="sm"
          className="h-9 w-9 shrink-0 touch-manipulation"
          onClick={() => setIsFullscreen(!isFullscreen)}
        >
          {isFullscreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
        </Button>
      </div>

      {/* Search bar */}
      {searchOpen && (
        <div className="p-2 border-b bg-card">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Cislo nebo nazev stolu..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-9 h-10 text-base"
              autoFocus
            />
            {searchQuery && (
              <button
                className="absolute right-3 top-1/2 -translate-y-1/2 touch-manipulation"
                onClick={() => setSearchQuery("")}
              >
                <X className="h-4 w-4 text-muted-foreground" />
              </button>
            )}
          </div>
          {searchResults.length > 0 && (
            <div className="mt-2 max-h-48 overflow-y-auto space-y-1">
              {searchResults.map((t) => {
                const gCount = getTableGuests(t.id).length;
                const roomName = allRooms.find((r) => r.id === t.roomId)?.name;
                return (
                  <button
                    key={t.id}
                    className="w-full flex items-center justify-between p-2 rounded-lg bg-muted/50 hover:bg-muted text-sm touch-manipulation"
                    onClick={() => handleSearchSelect(t)}
                  >
                    <span className="font-medium">{t.tableName}</span>
                    <span className="text-muted-foreground text-xs">
                      {gCount}/{t.capacity} {roomName && `- ${roomName}`}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
          {searchQuery && searchResults.length === 0 && (
            <p className="mt-2 text-sm text-muted-foreground text-center">Stul nenalezen</p>
          )}
        </div>
      )}

      {/* Canvas + side panel */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
      <div
        ref={containerRef}
        className="flex-1 relative bg-white dark:bg-zinc-900 overflow-hidden min-w-0"
        style={{ touchAction: "none" }}
        onDragOver={handleCanvasDragOver}
        onDragLeave={() => setDropTargetTableId(null)}
        onDrop={handleCanvasDrop}
      >
        <div ref={measureRef} className="absolute inset-0 pointer-events-none" style={{ zIndex: -1 }} />

        {/* Zoom controls */}
        <div className="absolute top-2 right-2 z-10 flex flex-col gap-1">
          <button className={btnClass} onClick={() => setZoom((z) => Math.min(MAX_ZOOM, z * 1.2))}>+</button>
          <button className={btnClass.replace("font-bold", "text-xs")} onClick={fitToRoom}>Fit</button>
          <button className={btnClass} onClick={() => setZoom((z) => Math.max(MIN_ZOOM, z / 1.2))}>-</button>
        </div>

        <div style={{ width: stageSize.width || 1, height: stageSize.height || 1, overflow: "hidden", position: "absolute", top: 0, left: 0 }}>
          <Stage
            ref={stageRef}
            width={stageSize.width || 1}
            height={stageSize.height || 1}
            scaleX={zoom}
            scaleY={zoom}
            x={position.x}
            y={position.y}
            draggable={isDraggable}
            onClick={handleStageClick}
            onTap={handleStageClick}
            onWheel={handleWheel}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onDragEnd={(e) => {
              if (e.target === stageRef.current) {
                setPosition({ x: e.target.x(), y: e.target.y() });
              }
            }}
          >
            <Layer listening={false}>
              <CanvasGrid width={roomWidth} height={roomHeight} gridSize={GRID_SIZE} />
              <RoomBoundary
                width={roomWidth}
                height={roomHeight}
                shapeData={selectedRoom?.shapeData}
                color={selectedRoom?.color || "#6366f1"}
                name={selectedRoom?.name}
              />
            </Layer>

            <Layer listening={false}>
              {filteredElements.map((el) => (
                <ElementShape
                  key={`el-${el.id}`}
                  element={{ ...el, isLocked: true }}
                  isSelected={false}
                  gridSize={GRID_SIZE}
                  onSelect={() => {}}
                  onDragEnd={() => {}}
                  onDoubleClick={() => {}}
                />
              ))}
            </Layer>

            <Layer>
              {filteredTables.map((table) => (
                <TableShape
                  key={`table-${table.id}`}
                  table={{ ...table, isLocked: true }}
                  guests={getTableGuests(table.id)}
                  isSelected={selectedTableId === table.id || highlightedTableId === table.id}
                  gridSize={GRID_SIZE}
                  hasCollision={false}
                  isDropTarget={dropTargetTableId === table.id}
                  financials={movementsByTable.get(table.id)}
                  onSelect={handleTableTap}
                  onDragEnd={() => {}}
                  onDoubleClick={handleTableTap}
                />
              ))}
            </Layer>
          </Stage>
        </div>

        {filteredTables.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="text-center p-6 rounded-lg bg-background/80 backdrop-blur-sm border">
              <p className="text-muted-foreground text-sm">
                Zadny planek pro tuto mistnost. Nastavte rozlozeni v editoru.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Side panel — non-modal flex sibling so the floor plan stays visible.
          Two mutually-exclusive modes: per-table action panel OR global seat-guest sidebar. */}
      {panelOpen && selectedTable && (
        <TableActionPanel
          onClose={() => { setPanelOpen(false); setSelectedTableId(null); }}
          table={selectedTable}
          guests={allGuests}
          allTables={tables}
          allRooms={allRooms}
          buildings={buildings}
          eventId={eventId}
          selectedRoom={selectedRoom}
          onAssignGuest={(guestId, tableId) => assignMutation.mutate({ guestId, targetTableId: tableId })}
          onUnassignGuest={(guestId) => unassignMutation.mutate(guestId)}
          onAutoSeatGuests={handleAutoSeatGuests}
        />
      )}

      {globalSeatPanelOpen && !panelOpen && (
        <aside className="w-full sm:w-80 border-l bg-card flex flex-col flex-shrink-0">
          <div className="px-3 py-2 border-b flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 min-w-0">
              <Armchair className="h-4 w-4 text-primary shrink-0" />
              <span className="text-sm font-semibold truncate">Usadit hosty</span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 shrink-0"
              onClick={() => setGlobalSeatPanelOpen(false)}
              title="Zavrit"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex-1 min-h-0 flex">
            <FloorPlanSidebar
              guests={allGuests}
              tables={tables}
              selectedTableId={null /* no focus target — user drags onto canvas */}
              room={selectedRoom}
              onAssignGuest={(guestId, tableId) => assignMutation.mutate({ guestId, targetTableId: tableId })}
              onUnassignGuest={(guestId) => unassignMutation.mutate(guestId)}
              onAutoSeatGuests={handleAutoSeatGuests}
            />
          </div>
        </aside>
      )}
      </div>
    </div>
  );
}
