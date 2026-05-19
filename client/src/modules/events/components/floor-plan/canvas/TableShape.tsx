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
  /** Optional financial indicator shown as a small badge in the top-right corner. */
  financials?: { hasIncome: boolean; hasExpense: boolean };
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
  financials,
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

  // Národnost se na canvas záměrně nezobrazuje — admin ji vidí v side panelu
  // jako badge na guest kartě. Tady je důležitější seznam rezervací.
  const childCount = guests.filter((g) => g.type === "child" || g.type === "infant").length;
  const driverCount = guests.filter((g) => g.type === "driver").length;
  const guideCount = guests.filter((g) => g.type === "guide").length;
  const hasSpecialTypes = childCount > 0 || driverCount > 0 || guideCount > 0;

  // Seskupení hostů u stolu podle rezervace. Label = kontaktní jméno z rezervace
  // (např. "Novák ×8"), což je čitelnější než `#708`. Manuálně přidaní hosté
  // (bez reservationId) jdou do bucketu "Ručně".
  //
  // Konva `ellipsis` prop nefunguje spolehlivě s `wrap="none"` a uppercase /
  // číslice / lomítka jsou ~6.5 px široké při fontSize 8 (lowercase je ~5 px),
  // takže odhady na základě průměru selhávaly u stringů jako "4-GTS 05ESEE1526/26QR".
  // Truncate řešíme v JS s konzervativnějšími 6.5 px/znak; `×N` suffix necháváme
  // viditelný (admin musí vědět počet hostů), ořez jde do jména. Plus `height`
  // na <Text> níž jako safety net ať se případný overflow vizuálně ořeže.
  const truncateLabel = (name: string, suffix: string, availableWidth: number): string => {
    const suffixLen = suffix.length;
    const maxTotal = Math.max(suffixLen + 2, Math.floor((availableWidth - 4) / 6.5));
    if (name.length + suffixLen <= maxTotal) return `${name}${suffix}`;
    const nameMax = Math.max(1, maxTotal - suffixLen - 1);
    return `${name.slice(0, nameMax)}…${suffix}`;
  };

  const reservationGroups = (() => {
    const groups = new Map<number | "manual", { count: number; name: string | null }>();
    guests.forEach((g) => {
      const key = g.reservationId ?? "manual";
      const existing = groups.get(key);
      if (existing) {
        existing.count++;
      } else {
        groups.set(key, { count: 1, name: g.reservationContactName ?? null });
      }
    });
    const availableWidth = w - 8; // matchuje padding níž v render
    return Array.from(groups.entries())
      .sort((a, b) => b[1].count - a[1].count)
      .map(([id, info]) => {
        const baseName = id === "manual" ? "Ručně" : (info.name ?? `#${id}`);
        const suffix = ` ×${info.count}`;
        return {
          id,
          count: info.count,
          label: truncateLabel(baseName, suffix, availableWidth),
        };
      });
  })();
  // Maximální počet řádků viditelných uvnitř stolu — víc se ořízne na "+N…".
  const maxReservationLines = Math.max(0, Math.floor((h - 28) / 11));
  const visibleGroups = reservationGroups.slice(0, maxReservationLines);
  const hiddenGroupsCount = reservationGroups.length - visibleGroups.length;

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

      {/* Reservation breakdown — jeden řádek na unikátní rezervaci u tohoto
          stolu. Pomáhá u-stolu vidět "8 hostů z rezervace #708" vs "1 host
          z #708, 1 z #712, 6 ručně". Pokud se počet rezervací nevejde dovnitř
          stolu, zbytek se zkrátí na "+N…" a detail je v side panelu po kliknutí. */}
      {guestCount > 0 && visibleGroups.length > 0 && (
        <>
          {visibleGroups.map((group, i) => (
            <Text
              key={`res-${group.id}`}
              x={4}
              y={(table.shape === "round" || table.shape === "oval") ? h / 2 + 18 + i * 10 : 14 + i * 10}
              width={w - 8}
              height={9}
              text={group.label}
              fontSize={8}
              fill="#374151"
              align="left"
              wrap="none"
              ellipsis
              listening={false}
            />
          ))}
          {hiddenGroupsCount > 0 && (
            <Text
              x={4}
              y={(table.shape === "round" || table.shape === "oval")
                ? h / 2 + 18 + visibleGroups.length * 10
                : 14 + visibleGroups.length * 10}
              width={w - 8}
              height={9}
              text={`+${hiddenGroupsCount} dalších`}
              fontSize={8}
              fill="#9ca3af"
              align="left"
              wrap="none"
              ellipsis
              listening={false}
            />
          )}
        </>
      )}

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

      {/* Guest type indicators */}
      {hasSpecialTypes && (() => {
        const icons: { emoji: string; count: number }[] = [];
        if (driverCount > 0) icons.push({ emoji: "🚗", count: driverCount });
        if (guideCount > 0) icons.push({ emoji: "🚩", count: guideCount });
        if (childCount > 0) icons.push({ emoji: "👶", count: childCount });
        return icons.map((icon, i) => (
          <Text
            key={i}
            x={2 + i * 22}
            y={-12}
            text={`${icon.emoji}${icon.count > 1 ? icon.count : ""}`}
            fontSize={9}
            listening={false}
          />
        ));
      })()}

      {locked && (
        <Text x={w - 12} y={-10} text="🔒" fontSize={9} listening={false} />
      )}

      {/* Financial indicator — visible whenever the table has any linked cash movement. */}
      {financials && (financials.hasIncome || financials.hasExpense) && (
        <Text
          x={w - 26}
          y={-10}
          text={
            financials.hasIncome && financials.hasExpense ? "💰"
            : financials.hasIncome ? "💵"
            : "🧾"
          }
          fontSize={11}
          listening={false}
        />
      )}
    </Group>
  );
});
