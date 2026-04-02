import { useRef, useEffect } from "react";
import { Group, Rect, Circle, Ellipse, Text, Transformer } from "react-konva";
import type { KonvaEventObject } from "konva/lib/Node";
import type Konva from "konva";
import type { EventTable, EventGuest } from "@shared/types";

const TABLE_COLORS = {
  empty: "#e5e7eb",
  partial: "#fbbf24",
  full: "#ef4444",
  selected: "#3b82f6",
};

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

export function TableShape({
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
}: TableShapeProps) {
  const groupRef = useRef<Konva.Group>(null);
  const trRef = useRef<Konva.Transformer>(null);

  const x = table.positionX ?? 100;
  const y = table.positionY ?? 100;
  const w = table.widthPx ?? (table.shape === "round" ? 80 : 120);
  const h = table.heightPx ?? (table.shape === "round" ? 80 : 80);
  const guestCount = guests.length;
  const fillRatio = table.capacity > 0 ? guestCount / table.capacity : 0;

  const fillColor = table.color
    ? table.color
    : fillRatio === 0
    ? TABLE_COLORS.empty
    : fillRatio < 1
    ? TABLE_COLORS.partial
    : TABLE_COLORS.full;

  const strokeColor = isDropTarget ? "#22c55e" : hasCollision ? "#ef4444" : isSelected ? TABLE_COLORS.selected : "#d1d5db";
  const strokeWidth = isDropTarget ? 1.5 : hasCollision ? 1.5 : isSelected ? 1.5 : 0.75;

  const locked = table.isLocked;
  const snapToGrid = (val: number) => Math.round(val / gridSize) * gridSize;

  // Attach transformer when selected
  useEffect(() => {
    if (isSelected && trRef.current && groupRef.current && !locked) {
      trRef.current.nodes([groupRef.current]);
      trRef.current.getLayer()?.batchDraw();
    }
  }, [isSelected, locked]);

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

    // Reset scale, apply to width/height
    node.scaleX(1);
    node.scaleY(1);

    let newW = Math.max(40, Math.round(w * scaleX));
    let newH = Math.max(40, Math.round(h * scaleY));

    // Keep round/square aspect ratio
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

  // Show just the number — extract digits from tableName if no tableNumber set
  const label = table.tableNumber
    ? `${table.tableNumber}`
    : table.tableName.replace(/\D+/g, '') || table.tableName;
  const capacityLabel = `${guestCount}/${table.capacity}`;

  // Get dominant nationality
  const nationalities: Record<string, number> = {};
  guests.forEach((g) => {
    if (g.nationality) {
      nationalities[g.nationality] = (nationalities[g.nationality] || 0) + 1;
    }
  });
  const topNat = Object.entries(nationalities).sort((a, b) => b[1] - a[1])[0];

  // Children at this table
  const hasChildren = guests.some((g) => g.type === "child");

  const renderShape = () => {
    switch (table.shape) {
      case "round":
        return (
          <Circle
            x={w / 2}
            y={h / 2}
            radius={Math.min(w, h) / 2}
            fill={fillColor}
            stroke={strokeColor}
            strokeWidth={strokeWidth}
            opacity={0.9}
          />
        );
      case "oval":
        return (
          <Ellipse
            x={w / 2}
            y={h / 2}
            radiusX={w / 2}
            radiusY={h / 2}
            fill={fillColor}
            stroke={strokeColor}
            strokeWidth={strokeWidth}
            opacity={0.9}
          />
        );
      case "rectangle":
      case "square":
      default:
        return (
          <Rect
            x={0}
            y={0}
            width={w}
            height={h}
            fill={fillColor}
            stroke={strokeColor}
            strokeWidth={strokeWidth}
            cornerRadius={4}
            opacity={0.9}
          />
        );
    }
  };

  return (
    <>
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

        {/* Table label */}
        <Text
          x={0}
          y={h / 2 - 14}
          width={w}
          text={label}
          fontSize={12}
          fontStyle="bold"
          fill="#1f2937"
          align="center"
          listening={false}
        />

        {/* Capacity badge */}
        <Text
          x={0}
          y={h / 2 + 2}
          width={w}
          text={capacityLabel}
          fontSize={10}
          fill="#6b7280"
          align="center"
          listening={false}
        />

        {/* Nationality indicator */}
        {topNat && (
          <Text
            x={0}
            y={h / 2 + 16}
            width={w}
            text={topNat[0]}
            fontSize={9}
            fill="#9ca3af"
            align="center"
            listening={false}
          />
        )}

        {/* Children indicator */}
        {hasChildren && (
          <Text
            x={2}
            y={2}
            text="👶"
            fontSize={10}
            listening={false}
          />
        )}

        {/* Lock indicator */}
        {locked && (
          <Text
            x={w - 14}
            y={2}
            text="🔒"
            fontSize={10}
            listening={false}
          />
        )}
      </Group>

      {/* Transformer for resize/rotate when selected and not locked */}
      {isSelected && !locked && (
        <Transformer
          ref={trRef}
          rotateEnabled
          anchorSize={7}
          anchorStroke="#3b82f6"
          anchorFill="#ffffff"
          anchorCornerRadius={2}
          borderStroke="#3b82f6"
          borderStrokeWidth={1}
          enabledAnchors={
            table.shape === "round" || table.shape === "square"
              ? ["top-left", "top-right", "bottom-left", "bottom-right"]
              : ["top-left", "top-right", "bottom-left", "bottom-right", "middle-left", "middle-right", "top-center", "bottom-center"]
          }
          keepRatio={table.shape === "round" || table.shape === "square"}
          boundBoxFunc={(oldBox, newBox) => {
            if (newBox.width < 40 || newBox.height < 40) return oldBox;
            return newBox;
          }}
        />
      )}
    </>
  );
}
