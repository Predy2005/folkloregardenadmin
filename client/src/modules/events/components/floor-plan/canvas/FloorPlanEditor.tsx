import { useRef, useState, useCallback, useEffect, useMemo } from "react";
import { Stage, Layer } from "react-konva";
import type Konva from "konva";
import type { EventTable, EventGuest, FloorPlanElement, Room, TableShape as TableShapeType, FloorPlanElementType } from "@shared/types";
import { CanvasGrid } from "./CanvasGrid";
import { RoomBoundary } from "./RoomBoundary";
import { TableShape } from "./TableShape";
import { ElementShape } from "./ElementShape";
import { GRID_SIZE, MIN_ZOOM, MAX_ZOOM, CM_TO_PX_RATIO } from "../constants";

// AABB collision check between two tables
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
  onDropGuest?: (tableId: number, guestId: number) => void;
}

export function FloorPlanEditor({
  tables,
  elements,
  guests,
  room,
  canvasWidth,
  canvasHeight,
  selectedTableId,
  selectedElementId,
  onSelectTable,
  onSelectElement,
  onTableMove,
  onElementMove,
  onTableDoubleClick,
  onElementDoubleClick,
  onElementTransform,
  onTableTransform,
}: FloorPlanEditorProps) {
  const stageRef = useRef<Konva.Stage>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [stageSize, setStageSize] = useState({ width: 0, height: 0 });
  const [zoom, setZoom] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [dropTargetTableId, setDropTargetTableId] = useState<number | null>(null);
  const initialFitDone = useRef(false);
  const prevRoomId = useRef<number | null | undefined>(undefined);

  // Room dimensions for the canvas
  const roomWidth = room ? room.widthCm / CM_TO_PX_RATIO : canvasWidth;
  const roomHeight = room ? room.heightCm / CM_TO_PX_RATIO : canvasHeight;

  // Measure available space from a separate hidden measurement div
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

  // Zoom with mouse wheel — anchor to pointer position
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

  // Click on empty space deselects
  const handleStageClick = (e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
    if (e.target === stageRef.current) {
      onSelectTable(null);
      onSelectElement(null);
    }
  };

  // Fit to room — only called explicitly (button, room switch, initial load)
  const fitToRoom = useCallback(() => {
    const sw = stageSize.width || 800;
    const sh = stageSize.height || 600;
    const scaleX = sw / (roomWidth + 40);
    const scaleY = sh / (roomHeight + 40);
    const scale = Math.min(scaleX, scaleY, 1);
    setZoom(scale);
    setPosition({
      x: (sw - roomWidth * scale) / 2,
      y: (sh - roomHeight * scale) / 2,
    });
  }, [stageSize.width, stageSize.height, roomWidth, roomHeight]);

  // Fit ONLY on initial load or room switch — not on every rerender
  useEffect(() => {
    const currentRoomId = room?.id ?? null;
    if (!initialFitDone.current || currentRoomId !== prevRoomId.current) {
      initialFitDone.current = true;
      prevRoomId.current = currentRoomId;
      fitToRoom();
    }
  }, [room?.id, fitToRoom]);

  // Detect colliding table IDs
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

  // Get guests for a specific table
  const getTableGuests = (tableId: number) =>
    guests.filter((g) => g.eventTableId === tableId);

  // Find table under screen coordinates
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

  // Highlight table during drag
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const tableId = findTableAtScreenPos(e.clientX, e.clientY);
    setDropTargetTableId(tableId);
  }, [findTableAtScreenPos]);

  // Handle HTML5 drop (for sidebar guest drag)
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDropTargetTableId(null);

    const guestId = parseInt(e.dataTransfer.getData("guestId"), 10);
    if (isNaN(guestId)) return;

    const tableId = findTableAtScreenPos(e.clientX, e.clientY);
    if (tableId != null) {
      const table = tables.find((t) => t.id === tableId);
      if (table) {
        const currentGuests = getTableGuests(table.id);
        if (currentGuests.length < table.capacity) {
          window.dispatchEvent(new CustomEvent("floorplan-guest-drop", {
            detail: { tableId: table.id, guestId },
          }));
        }
      }
    }
  }, [tables, guests, findTableAtScreenPos]);

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 bg-white dark:bg-zinc-900 rounded-lg border"
      style={{ overflow: "hidden" }}
      onDragOver={handleDragOver}
      onDragLeave={() => setDropTargetTableId(null)}
      onDrop={handleDrop}
    >
      {/* Invisible measurement div — always reflects true available space */}
      <div ref={measureRef} className="absolute inset-0 pointer-events-none" style={{ zIndex: -1 }} />

      {/* Zoom controls */}
      <div className="absolute top-2 right-2 z-10 flex flex-col gap-1">
        <button
          className="w-8 h-8 rounded bg-white dark:bg-zinc-800 border shadow-sm text-sm font-bold hover:bg-gray-50"
          onClick={() => setZoom((z) => Math.min(MAX_ZOOM, z * 1.2))}
        >
          +
        </button>
        <button
          className="w-8 h-8 rounded bg-white dark:bg-zinc-800 border shadow-sm text-xs hover:bg-gray-50"
          onClick={fitToRoom}
        >
          Fit
        </button>
        <button
          className="w-8 h-8 rounded bg-white dark:bg-zinc-800 border shadow-sm text-sm font-bold hover:bg-gray-50"
          onClick={() => setZoom((z) => Math.max(MIN_ZOOM, z / 1.2))}
        >
          -
        </button>
        <div className="text-center text-xs text-muted-foreground mt-1">
          {Math.round(zoom * 100)}%
        </div>
      </div>

      <div style={{
        width: stageSize.width || 1,
        height: stageSize.height || 1,
        overflow: "hidden",
        position: "absolute",
        top: 0,
        left: 0,
      }}>
      <Stage
        ref={stageRef}
        width={stageSize.width || 1}
        height={stageSize.height || 1}
        scaleX={zoom}
        scaleY={zoom}
        x={position.x}
        y={position.y}
        draggable
        onClick={handleStageClick}
        onTap={handleStageClick}
        onWheel={handleWheel}
        onDragEnd={(e) => {
          if (e.target === stageRef.current) {
            setPosition({ x: e.target.x(), y: e.target.y() });
          }
        }}
      >
        {/* Grid layer */}
        <Layer listening={false}>
          <CanvasGrid width={roomWidth} height={roomHeight} gridSize={GRID_SIZE} />
          <RoomBoundary
            width={roomWidth}
            height={roomHeight}
            shapeData={room?.shapeData}
            color={room?.color || "#6366f1"}
            name={room?.name}
          />
        </Layer>

        {/* Elements layer (stages, dance floors, etc.) */}
        <Layer>
          {elements.map((el) => (
            <ElementShape
              key={`el-${el.id}`}
              element={el}
              isSelected={selectedElementId === el.id}
              gridSize={GRID_SIZE}
              onSelect={(id) => {
                onSelectElement(id);
                onSelectTable(null);
              }}
              onDragEnd={onElementMove}
              onDoubleClick={onElementDoubleClick}
              onTransformEnd={onElementTransform}
            />
          ))}
        </Layer>

        {/* Tables layer */}
        <Layer>
          {tables.map((table) => (
            <TableShape
              key={`table-${table.id}`}
              table={table}
              guests={getTableGuests(table.id)}
              isSelected={selectedTableId === table.id}
              gridSize={GRID_SIZE}
              hasCollision={collidingTableIds.has(table.id)}
              isDropTarget={dropTargetTableId === table.id}
              onSelect={(id) => {
                onSelectTable(id);
                onSelectElement(null);
              }}
              onDragEnd={onTableMove}
              onDoubleClick={onTableDoubleClick}
              onTransformEnd={onTableTransform}
            />
          ))}
        </Layer>
      </Stage>
      </div>

      {/* Empty state overlay */}
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
