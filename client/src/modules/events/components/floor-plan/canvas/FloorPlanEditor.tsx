import { useRef, useState, useCallback, useEffect, useMemo } from "react";
import { Stage, Layer, Transformer } from "react-konva";
import type Konva from "konva";
import type { EventTable, EventGuest, FloorPlanElement, Room } from "@shared/types";
import { CanvasGrid } from "./CanvasGrid";
import { RoomBoundary } from "./RoomBoundary";
import { TableShape, type TableShapeHandle } from "./TableShape";
import { ElementShape, type ElementShapeHandle } from "./ElementShape";
import { GRID_SIZE, MIN_ZOOM, MAX_ZOOM, MAX_FIT_ZOOM, CM_TO_PX_RATIO } from "../constants";

function tablesOverlap(a: EventTable, b: EventTable): boolean {
  const ax = a.positionX ?? 0, ay = a.positionY ?? 0;
  const aw = a.widthPx ?? 80, ah = a.heightPx ?? 80;
  const bx = b.positionX ?? 0, by = b.positionY ?? 0;
  const bw = b.widthPx ?? 80, bh = b.heightPx ?? 80;
  return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
}

export interface FloorPlanEditorProps {
  tables: EventTable[];
  elements: FloorPlanElement[];
  guests: EventGuest[];
  room?: Room | null;
  canvasWidth: number;
  canvasHeight: number;
  selectedTableId: number | null;
  selectedElementId: number | null;
  onSelectTable: (id: number | null) => void;
  onSelectElement: (id: number | null) => void;
  onTableMove: (id: number, x: number, y: number) => void;
  onElementMove: (id: number, x: number, y: number) => void;
  onTableDoubleClick: (id: number) => void;
  onElementDoubleClick: (id: number) => void;
  onElementTransform?: (id: number, attrs: { width: number; height: number; rotation: number; x: number; y: number }) => void;
  onTableTransform?: (id: number, attrs: { width: number; height: number; rotation: number; x: number; y: number }) => void;
}

export function FloorPlanEditor({
  tables, elements, guests, room,
  canvasWidth, canvasHeight,
  selectedTableId, selectedElementId,
  onSelectTable, onSelectElement,
  onTableMove, onElementMove,
  onTableDoubleClick, onElementDoubleClick,
  onElementTransform, onTableTransform,
}: FloorPlanEditorProps) {
  const stageRef = useRef<Konva.Stage>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const trRef = useRef<Konva.Transformer>(null);
  const [stageSize, setStageSize] = useState({ width: 0, height: 0 });
  const [zoom, setZoom] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [dropTargetTableId, setDropTargetTableId] = useState<number | null>(null);
  const [isDraggable, setIsDraggable] = useState(true);
  const initialFitDone = useRef(false);
  const prevRoomId = useRef<number | null | undefined>(undefined);

  // Pinch-to-zoom state
  const lastPinchDist = useRef<number | null>(null);
  const lastPinchCenter = useRef<{ x: number; y: number } | null>(null);

  // Refs to shape components
  const tableRefs = useRef<Map<number, TableShapeHandle>>(new Map());
  const elementRefs = useRef<Map<number, ElementShapeHandle>>(new Map());

  // Room dimensions: auto-expand to always contain all content
  const baseRoomWidth = room ? room.widthCm / CM_TO_PX_RATIO : canvasWidth;
  const baseRoomHeight = room ? room.heightCm / CM_TO_PX_RATIO : canvasHeight;

  const { roomWidth, roomHeight } = useMemo(() => {
    let maxX = baseRoomWidth;
    let maxY = baseRoomHeight;
    for (const t of tables) {
      const right = (t.positionX ?? 0) + (t.widthPx ?? 60) + 20;
      const bottom = (t.positionY ?? 0) + (t.heightPx ?? 100) + 30; // extra for label below
      if (right > maxX) maxX = right;
      if (bottom > maxY) maxY = bottom;
    }
    for (const e of elements) {
      const right = e.positionX + e.widthPx + 20;
      const bottom = e.positionY + e.heightPx + 20;
      if (right > maxX) maxX = right;
      if (bottom > maxY) maxY = bottom;
    }
    return { roomWidth: maxX, roomHeight: maxY };
  }, [baseRoomWidth, baseRoomHeight, tables, elements]);

  // ── Shared Transformer ──
  useEffect(() => {
    if (!trRef.current) return;
    let node: Konva.Group | null = null;
    let isLocked = false;

    if (selectedTableId) {
      node = tableRefs.current.get(selectedTableId)?.getNode() ?? null;
      isLocked = tables.find((t) => t.id === selectedTableId)?.isLocked ?? false;
    } else if (selectedElementId) {
      node = elementRefs.current.get(selectedElementId)?.getNode() ?? null;
      isLocked = elements.find((e) => e.id === selectedElementId)?.isLocked ?? false;
    }

    if (node && !isLocked) {
      trRef.current.nodes([node]);
      const table = selectedTableId ? tables.find((t) => t.id === selectedTableId) : null;
      const isRoundOrSquare = table && (table.shape === "round" || table.shape === "square");
      trRef.current.keepRatio(!!isRoundOrSquare);
      trRef.current.enabledAnchors(
        isRoundOrSquare
          ? ["top-left", "top-right", "bottom-left", "bottom-right"]
          : ["top-left", "top-right", "bottom-left", "bottom-right", "middle-left", "middle-right", "top-center", "bottom-center"]
      );
    } else {
      trRef.current.nodes([]);
    }
    trRef.current.getLayer()?.batchDraw();
  }, [selectedTableId, selectedElementId, tables, elements]);

  // ── ResizeObserver ──
  const measureRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const measureEl = measureRef.current;
    if (!measureEl) return;
    const measure = () => {
      const w = measureEl.offsetWidth;
      const h = measureEl.offsetHeight;
      if (w > 0 && h > 0) {
        setStageSize((prev) => {
          if (Math.abs(prev.width - w) > 1 || Math.abs(prev.height - h) > 1) {
            return { width: w, height: h };
          }
          return prev;
        });
      }
    };
    measure();
    const observer = new ResizeObserver(() => measure());
    observer.observe(measureEl);
    return () => observer.disconnect();
  }, []);

  // ── Fit to room (no 1.0 cap — scales up to fill viewport) ──
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

  // Fit on initial load or room switch
  useEffect(() => {
    const currentRoomId = room?.id ?? null;
    if (!initialFitDone.current || currentRoomId !== prevRoomId.current) {
      initialFitDone.current = true;
      prevRoomId.current = currentRoomId;
      fitToRoom();
    }
  }, [room?.id, fitToRoom]);

  // ── Auto-refit when container size changes (fullscreen, rotation, sidebar collapse) ──
  const prevStageSize = useRef({ width: 0, height: 0 });
  useEffect(() => {
    if (!initialFitDone.current) return;
    const prev = prevStageSize.current;
    if (Math.abs(prev.width - stageSize.width) > 10 || Math.abs(prev.height - stageSize.height) > 10) {
      prevStageSize.current = { width: stageSize.width, height: stageSize.height };
      fitToRoom();
    }
  }, [stageSize.width, stageSize.height, fitToRoom]);

  // ── Mouse wheel zoom ──
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

  // ── Pinch-to-zoom (two-finger gesture) ──
  const handleTouchMove = useCallback((e: Konva.KonvaEventObject<TouchEvent>) => {
    const touches = e.evt.touches;
    if (touches.length !== 2) {
      lastPinchDist.current = null;
      lastPinchCenter.current = null;
      return;
    }

    e.evt.preventDefault();
    setIsDraggable(false); // disable pan during pinch

    const stage = stageRef.current;
    const rect = containerRef.current?.getBoundingClientRect();
    if (!stage || !rect) return;

    const p1 = { x: touches[0].clientX, y: touches[0].clientY };
    const p2 = { x: touches[1].clientX, y: touches[1].clientY };
    const dist = Math.hypot(p2.x - p1.x, p2.y - p1.y);
    const center = { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 };

    if (lastPinchDist.current != null) {
      const oldScale = stage.scaleX();
      const scaleFactor = dist / lastPinchDist.current;
      const newScale = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, oldScale * scaleFactor));

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
    lastPinchCenter.current = center;
  }, []);

  const handleTouchEnd = useCallback(() => {
    lastPinchDist.current = null;
    lastPinchCenter.current = null;
    setIsDraggable(true);
  }, []);

  // ── Stage click/tap ──
  const handleStageClick = (e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
    if (e.target === stageRef.current) {
      onSelectTable(null);
      onSelectElement(null);
    }
  };

  // ── Collision detection ──
  const collidingTableIds = useMemo(() => {
    const ids = new Set<number>();
    for (let i = 0; i < tables.length; i++) {
      for (let j = i + 1; j < tables.length; j++) {
        if (tablesOverlap(tables[i], tables[j])) {
          ids.add(tables[i].id);
          ids.add(tables[j].id);
        }
      }
    }
    return ids;
  }, [tables]);

  const getTableGuests = (tableId: number) =>
    guests.filter((g) => g.eventTableId === tableId);

  // ── Guest drag-drop ──
  const findTableAtScreenPos = useCallback((clientX: number, clientY: number): number | null => {
    const container = containerRef.current;
    if (!container) return null;
    const rect = container.getBoundingClientRect();
    const pointerX = (clientX - rect.left - position.x) / zoom;
    const pointerY = (clientY - rect.top - position.y) / zoom;
    for (const table of tables) {
      const tx = table.positionX ?? 0, ty = table.positionY ?? 0;
      const tw = table.widthPx ?? 80, th = table.heightPx ?? 80;
      if (pointerX >= tx && pointerX <= tx + tw && pointerY >= ty && pointerY <= ty + th) {
        return table.id;
      }
    }
    return null;
  }, [tables, position, zoom]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDropTargetTableId(findTableAtScreenPos(e.clientX, e.clientY));
  }, [findTableAtScreenPos]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDropTargetTableId(null);
    const guestId = parseInt(e.dataTransfer.getData("guestId"), 10);
    if (isNaN(guestId)) return;
    const tableId = findTableAtScreenPos(e.clientX, e.clientY);
    if (tableId != null) {
      const table = tables.find((t) => t.id === tableId);
      if (table && getTableGuests(table.id).length < table.capacity) {
        window.dispatchEvent(new CustomEvent("floorplan-guest-drop", {
          detail: { tableId: table.id, guestId },
        }));
      }
    }
  }, [tables, guests, findTableAtScreenPos]);

  // ── Ref callbacks ──
  const setTableRef = useCallback((id: number, handle: TableShapeHandle | null) => {
    if (handle) tableRefs.current.set(id, handle);
    else tableRefs.current.delete(id);
  }, []);

  const setElementRef = useCallback((id: number, handle: ElementShapeHandle | null) => {
    if (handle) elementRefs.current.set(id, handle);
    else elementRefs.current.delete(id);
  }, []);

  // ── Touch-friendly zoom button size ──
  const isTouch = typeof window !== "undefined" && ("ontouchstart" in window || navigator.maxTouchPoints > 0);
  const btnClass = isTouch
    ? "w-11 h-11 rounded-lg bg-white dark:bg-zinc-800 border shadow-md text-base font-bold hover:bg-gray-50 active:bg-gray-100"
    : "w-8 h-8 rounded bg-white dark:bg-zinc-800 border shadow-sm text-sm font-bold hover:bg-gray-50";

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 bg-white dark:bg-zinc-900 rounded-lg border"
      style={{ overflow: "hidden", touchAction: "none" }}
      onDragOver={handleDragOver}
      onDragLeave={() => setDropTargetTableId(null)}
      onDrop={handleDrop}
    >
      <div ref={measureRef} className="absolute inset-0 pointer-events-none" style={{ zIndex: -1 }} />

      {/* Zoom controls */}
      <div className="absolute top-2 right-2 z-10 flex flex-col gap-1">
        <button className={btnClass} onClick={() => setZoom((z) => Math.min(MAX_ZOOM, z * 1.2))}>+</button>
        <button className={btnClass.replace("font-bold", "text-xs")} onClick={fitToRoom}>Fit</button>
        <button className={btnClass} onClick={() => setZoom((z) => Math.max(MIN_ZOOM, z / 1.2))}>-</button>
        <div className="text-center text-xs text-muted-foreground mt-1">{Math.round(zoom * 100)}%</div>
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
            <RoomBoundary width={roomWidth} height={roomHeight} shapeData={room?.shapeData} color={room?.color || "#6366f1"} name={room?.name} />
          </Layer>

          <Layer>
            {elements.map((el) => (
              <ElementShape
                key={`el-${el.id}`}
                ref={(handle) => setElementRef(el.id, handle)}
                element={el}
                isSelected={selectedElementId === el.id}
                gridSize={GRID_SIZE}
                onSelect={(id) => { onSelectElement(id); onSelectTable(null); }}
                onDragEnd={onElementMove}
                onDoubleClick={onElementDoubleClick}
                onTransformEnd={onElementTransform}
              />
            ))}
          </Layer>

          <Layer>
            {tables.map((table) => (
              <TableShape
                key={`table-${table.id}`}
                ref={(handle) => setTableRef(table.id, handle)}
                table={table}
                guests={getTableGuests(table.id)}
                isSelected={selectedTableId === table.id}
                gridSize={GRID_SIZE}
                hasCollision={collidingTableIds.has(table.id)}
                isDropTarget={dropTargetTableId === table.id}
                onSelect={(id) => { onSelectTable(id); onSelectElement(null); }}
                onDragEnd={onTableMove}
                onDoubleClick={onTableDoubleClick}
                onTransformEnd={onTableTransform}
              />
            ))}
            <Transformer
              ref={trRef}
              rotateEnabled
              anchorSize={isTouch ? 12 : 7}
              anchorStroke="#3b82f6"
              anchorFill="#ffffff"
              anchorCornerRadius={2}
              borderStroke="#3b82f6"
              borderStrokeWidth={1}
              boundBoxFunc={(oldBox, newBox) => {
                if (newBox.width < 40 || newBox.height < 40) return oldBox;
                return newBox;
              }}
            />
          </Layer>
        </Stage>
      </div>

      {tables.length === 0 && elements.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-center p-6 rounded-lg bg-background/80 backdrop-blur-sm border">
            <p className="text-muted-foreground text-sm">
              Prázdný plánek — přidejte stoly a prvky pomocí tlačítek v toolbaru
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
