import { useRef, forwardRef, useImperativeHandle } from "react";
import { Group, Rect, Circle, Line, Text } from "react-konva";
import type { KonvaEventObject } from "konva/lib/Node";
import type Konva from "konva";
import type { FloorPlanElement } from "@shared/types";

const ELEMENT_COLORS: Record<string, string> = {
  stage: "#8b5cf6",
  dance_floor: "#ec4899",
  bar: "#f59e0b",
  buffet: "#10b981",
  entrance: "#6366f1",
  exit: "#ef4444",
  wall: "#6b7280",
  decoration: "#a855f7",
  custom: "#78716c",
  band: "#7c3aed",
  photo: "#06b6d4",
  stairs: "#64748b",
  terrace: "#84cc16",
  balcony: "#d97706",
};

const ELEMENT_LABELS: Record<string, string> = {
  stage: "STAGE",
  dance_floor: "Taneční parket",
  bar: "BAR",
  buffet: "Bufet",
  entrance: "ENTRANCE",
  exit: "EXIT",
  wall: "Stěna",
  decoration: "Dekorace",
  custom: "Vlastní",
  band: "BAND",
  photo: "PHOTO",
  stairs: "STAIRS",
  terrace: "TERRACE",
  balcony: "BALCONY",
};

export interface ElementShapeHandle {
  getNode: () => Konva.Group | null;
}

interface ElementShapeProps {
  element: FloorPlanElement;
  isSelected: boolean;
  gridSize: number;
  onSelect: (id: number) => void;
  onDragEnd: (id: number, x: number, y: number) => void;
  onDoubleClick: (id: number) => void;
  onTransformEnd?: (id: number, attrs: { width: number; height: number; rotation: number; x: number; y: number }) => void;
}

export const ElementShape = forwardRef<ElementShapeHandle, ElementShapeProps>(function ElementShape({
  element,
  isSelected,
  gridSize,
  onSelect,
  onDragEnd,
  onDoubleClick,
  onTransformEnd,
}, ref) {
  const groupRef = useRef<Konva.Group>(null);
  const color = element.color || ELEMENT_COLORS[element.elementType] || "#78716c";
  const label = element.label || ELEMENT_LABELS[element.elementType] || element.elementType;
  const locked = element.isLocked;

  useImperativeHandle(ref, () => ({
    getNode: () => groupRef.current,
  }));

  const snapToGrid = (val: number) => Math.round(val / gridSize) * gridSize;

  const handleDragEnd = (e: KonvaEventObject<DragEvent>) => {
    if (locked) return;
    const newX = snapToGrid(e.target.x());
    const newY = snapToGrid(e.target.y());
    e.target.x(newX);
    e.target.y(newY);
    onDragEnd(element.id, newX, newY);
  };

  const handleClick = (e: KonvaEventObject<MouseEvent | TouchEvent>) => {
    e.cancelBubble = true;
    onSelect(element.id);
  };

  const handleTransformEnd = () => {
    const node = groupRef.current;
    if (!node || !onTransformEnd) return;

    const scaleX = node.scaleX();
    const scaleY = node.scaleY();
    node.scaleX(1);
    node.scaleY(1);

    onTransformEnd(element.id, {
      x: Math.round(node.x()),
      y: Math.round(node.y()),
      width: Math.max(20, Math.round(element.widthPx * scaleX)),
      height: Math.max(20, Math.round(element.heightPx * scaleY)),
      rotation: Math.round(node.rotation()),
    });
  };

  const hasPolygonPoints = element.shapeData?.points && element.shapeData.points.length >= 6;

  const renderShape = () => {
    if (hasPolygonPoints) {
      return (
        <Line
          points={element.shapeData!.points!}
          closed
          fill={`${color}30`}
          stroke={color}
          strokeWidth={isSelected ? 3 : 2}
        />
      );
    }

    if (element.shape === "circle") {
      return (
        <Circle
          x={element.widthPx / 2}
          y={element.heightPx / 2}
          radius={Math.min(element.widthPx, element.heightPx) / 2}
          fill={`${color}30`}
          stroke={color}
          strokeWidth={isSelected ? 3 : 2}
          dash={locked ? undefined : [6, 3]}
        />
      );
    }

    return (
      <Rect
        x={0}
        y={0}
        width={element.widthPx}
        height={element.heightPx}
        fill={`${color}30`}
        stroke={color}
        strokeWidth={isSelected ? 3 : 2}
        dash={locked ? undefined : [6, 3]}
        cornerRadius={4}
      />
    );
  };

  return (
    <Group
      ref={groupRef}
      x={element.positionX}
      y={element.positionY}
      draggable={!locked}
      rotation={element.rotation || 0}
      onClick={handleClick}
      onTap={handleClick}
      onDblClick={() => onDoubleClick(element.id)}
      onDblTap={() => onDoubleClick(element.id)}
      onDragEnd={handleDragEnd}
      onDragStart={() => !locked && onSelect(element.id)}
      onTransformEnd={handleTransformEnd}
    >
      {renderShape()}

      <Text
        x={0}
        y={hasPolygonPoints ? 10 : element.heightPx / 2 - 14}
        width={hasPolygonPoints ? undefined : element.widthPx}
        text={label}
        fontSize={12}
        fontStyle="bold"
        fill={color}
        align="center"
        listening={false}
      />

      {locked && (
        <Text
          x={element.widthPx - 16}
          y={2}
          text="🔒"
          fontSize={10}
          listening={false}
        />
      )}
    </Group>
  );
});
