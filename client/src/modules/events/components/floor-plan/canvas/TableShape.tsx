import { useRef, forwardRef, useImperativeHandle } from "react";
import { Group, Rect, Circle, Ellipse, Text } from "react-konva";
import type { KonvaEventObject } from "konva/lib/Node";
import type Konva from "konva";
import type { EventTable, EventGuest } from "@shared/types";
import { getSeatGrid } from "../constants";

const TABLE_COLORS = {
  empty: "#f5f5f0",       // light beige like PDF
  partial: "#fef3c7",     // warm yellow
  full: "#fecaca",        // soft red
  selected: "#3b82f6",
  seatStroke: "#c8c4b8",  // seat border - soft brown/gray like PDF
  seatFill: "#ffffff",    // white seat fill
  seatOccupied: "#e8e4d8", // occupied seat - slightly darker
};

export interface TableShapeHandle {
  getNode: () => Konva.Group | null;
}

interface TableShapeProps {
  table: EventTable;
  guests: EventGuest[];
  isSelected: boolean;
  gridSize: number;
  hasCollision?: boolean;
  isDropTarget?: boolean;
  onSelect: (id: number) => void;
  onDragEnd: (id: number, x: number, y: number) => void;
  onDoubleClick: (id: number) => void;
  onTransformEnd?: (id: number, attrs: { width: number; height: number; rotation: number; x: number; y: number }) => void;
}

export const TableShape = forwardRef<TableShapeHandle, TableShapeProps>(function TableShape({
  table,
  guests,
  isSelected,
  gridSize,
  hasCollision,
  isDropTarget,
  onSelect,
  onDragEnd,
  onDoubleClick,
  onTransformEnd,
}, ref) {
  const groupRef = useRef<Konva.Group>(null);

  useImperativeHandle(ref, () => ({
    getNode: () => groupRef.current,
  }));

  const x = table.positionX ?? 100;
  const y = table.positionY ?? 100;
  const w = table.widthPx ?? (table.shape === "round" ? 60 : 60);
  const h = table.heightPx ?? (table.shape === "round" ? 60 : 100);
  const guestCount = guests.length;
  const fillRatio = table.capacity > 0 ? guestCount / table.capacity : 0;

  const borderColor = isDropTarget ? "#22c55e" : hasCollision ? "#ef4444" : isSelected ? TABLE_COLORS.selected : TABLE_COLORS.seatStroke;
  const borderWidth = isDropTarget ? 2 : hasCollision ? 2 : isSelected ? 2 : 1;

  const locked = table.isLocked;
  const snapToGrid = (val: number) => Math.round(val / gridSize) * gridSize;

  const handleDragEnd = (e: KonvaEventObject<DragEvent>) => {
    const newX = snapToGrid(e.target.x());
    const newY = snapToGrid(e.target.y());
    e.target.x(newX);
    e.target.y(newY);
    onDragEnd(table.id, newX, newY);
  };

  const handleClick = (e: KonvaEventObject<MouseEvent | TouchEvent>) => {
    e.cancelBubble = true;
    onSelect(table.id);
  };

  const handleDblClick = (e: KonvaEventObject<MouseEvent | TouchEvent>) => {
    e.cancelBubble = true;
    onDoubleClick(table.id);
  };

  const handleTransformEnd = () => {
    const node = groupRef.current;
    if (!node || !onTransformEnd) return;

    const scaleX = node.scaleX();
    const scaleY = node.scaleY();
    node.scaleX(1);
    node.scaleY(1);

    let newW = Math.max(40, Math.round(w * scaleX));
    let newH = Math.max(40, Math.round(h * scaleY));

    if (table.shape === "round" || table.shape === "square") {
      const size = Math.max(newW, newH);
      newW = size;
      newH = size;
    }

    onTransformEnd(table.id, {
      x: Math.round(node.x()),
      y: Math.round(node.y()),
      width: newW,
      height: newH,
      rotation: Math.round(node.rotation()),
    });
  };

  const label = table.tableNumber
    ? `${table.tableNumber}`
    : table.tableName.replace(/\D+/g, '') || table.tableName;

  // Get dominant nationality
  const nationalities: Record<string, number> = {};
  guests.forEach((g) => {
    if (g.nationality) {
      nationalities[g.nationality] = (nationalities[g.nationality] || 0) + 1;
    }
  });
  const topNat = Object.entries(nationalities).sort((a, b) => b[1] - a[1])[0];
  const hasChildren = guests.some((g) => g.type === "child");

  // Render seat grid for rectangular tables
  const renderSeatGrid = () => {
    const grid = getSeatGrid(table.capacity, table.shape);
    if (grid.cols === 0) return null;

    const padding = 3;
    const gap = 2;
    const availW = w - padding * 2;
    const availH = h - padding * 2;
    const seatW = (availW - gap * (grid.cols - 1)) / grid.cols;
    const seatH = (availH - gap * (grid.rows - 1)) / grid.rows;

    const seats: JSX.Element[] = [];
    let seatIdx = 0;

    for (let row = 0; row < grid.rows; row++) {
      for (let col = 0; col < grid.cols; col++) {
        const sx = padding + col * (seatW + gap);
        const sy = padding + row * (seatH + gap);
        const isOccupied = seatIdx < guestCount;

        seats.push(
          <Rect
            key={`seat-${row}-${col}`}
            x={sx}
            y={sy}
            width={seatW}
            height={seatH}
            fill={isOccupied ? TABLE_COLORS.seatOccupied : TABLE_COLORS.seatFill}
            stroke={TABLE_COLORS.seatStroke}
            strokeWidth={0.5}
            cornerRadius={1}
            listening={false}
          />
        );
        seatIdx++;
      }
    }

    return seats;
  };

  const renderShape = () => {
    switch (table.shape) {
      case "round":
        return (
          <>
            <Circle
              x={w / 2}
              y={h / 2}
              radius={Math.min(w, h) / 2}
              fill={fillRatio === 0 ? TABLE_COLORS.empty : fillRatio < 1 ? TABLE_COLORS.partial : TABLE_COLORS.full}
              stroke={borderColor}
              strokeWidth={borderWidth}
              dash={[4, 3]}
            />
            <Text
              x={0}
              y={h / 2 - 6}
              width={w}
              text={label}
              fontSize={11}
              fontStyle="bold"
              fill="#4b5563"
              align="center"
              listening={false}
            />
          </>
        );
      case "oval":
        return (
          <>
            <Ellipse
              x={w / 2}
              y={h / 2}
              radiusX={w / 2}
              radiusY={h / 2}
              fill={fillRatio === 0 ? TABLE_COLORS.empty : fillRatio < 1 ? TABLE_COLORS.partial : TABLE_COLORS.full}
              stroke={borderColor}
              strokeWidth={borderWidth}
              dash={[4, 3]}
            />
            <Text
              x={0}
              y={h / 2 - 6}
              width={w}
              text={label}
              fontSize={11}
              fontStyle="bold"
              fill="#4b5563"
              align="center"
              listening={false}
            />
          </>
        );
      case "rectangle":
      case "square":
      default:
        return (
          <>
            <Rect
              x={0}
              y={0}
              width={w}
              height={h}
              fill={TABLE_COLORS.empty}
              stroke={borderColor}
              strokeWidth={borderWidth}
              dash={[4, 3]}
              cornerRadius={2}
            />
            {renderSeatGrid()}
          </>
        );
    }
  };

  return (
    <Group
      ref={groupRef}
      x={x}
      y={y}
      draggable={!locked}
      rotation={table.rotation || 0}
      onClick={handleClick}
      onTap={handleClick}
      onDblClick={handleDblClick}
      onDblTap={handleDblClick}
      onDragEnd={handleDragEnd}
      onDragStart={() => !locked && onSelect(table.id)}
      onTransformEnd={handleTransformEnd}
    >
      {renderShape()}

      {table.shape !== "round" && table.shape !== "oval" && (
        <Text
          x={0}
          y={h + 2}
          width={w}
          text={`${label} (${guestCount}/${table.capacity})`}
          fontSize={8}
          fill="#6b7280"
          align="center"
          listening={false}
        />
      )}

      {(table.shape === "round" || table.shape === "oval") && (
        <Text
          x={0}
          y={h / 2 + 6}
          width={w}
          text={`${guestCount}/${table.capacity}`}
          fontSize={9}
          fill="#6b7280"
          align="center"
          listening={false}
        />
      )}

      {topNat && (
        <Text
          x={0}
          y={table.shape === "round" || table.shape === "oval" ? h / 2 + 18 : h + 12}
          width={w}
          text={topNat[0]}
          fontSize={8}
          fill="#9ca3af"
          align="center"
          listening={false}
        />
      )}

      {hasChildren && (
        <Text x={2} y={-10} text="👶" fontSize={9} listening={false} />
      )}

      {locked && (
        <Text x={w - 12} y={-10} text="🔒" fontSize={9} listening={false} />
      )}
    </Group>
  );
});
