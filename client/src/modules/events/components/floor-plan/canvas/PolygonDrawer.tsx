import { useState, useCallback, useRef, useEffect } from "react";
import { Stage, Layer, Line, Circle, Text } from "react-konva";
import type Konva from "konva";
import { Button } from "@/shared/components/ui/button";
import { Check, X, Undo2, RotateCcw } from "lucide-react";

interface PolygonDrawerProps {
  width: number;
  height: number;
  initialPoints?: number[];
  gridSize?: number;
  onSave: (points: number[]) => void;
  onCancel: () => void;
}

export function PolygonDrawer({
  width: _propWidth,
  height: propHeight,
  initialPoints,
  gridSize = 20,
  onSave,
  onCancel,
}: PolygonDrawerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [canvasSize, setCanvasSize] = useState({ width: 100, height: 100 });
  const [points, setPoints] = useState<number[]>(initialPoints ?? []);
  const [isDrawing, setIsDrawing] = useState(!initialPoints || initialPoints.length === 0);

  // Responsive: fill container width
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      const { width } = entries[0].contentRect;
      if (width > 100) {
        setCanvasSize({ width, height: Math.min(Math.round(width * 0.65), propHeight) });
      }
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [propHeight]);

  const width = canvasSize.width;
  const height = canvasSize.height;

  const snapToGrid = useCallback((val: number) => Math.round(val / gridSize) * gridSize, [gridSize]);

  const handleStageClick = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent>) => {
      if (!isDrawing) return;

      const stage = e.target.getStage();
      if (!stage) return;

      const pos = stage.getPointerPosition();
      if (!pos) return;

      const x = snapToGrid(pos.x);
      const y = snapToGrid(pos.y);

      // Close polygon if clicking near first point
      if (points.length >= 6) {
        const dx = x - points[0];
        const dy = y - points[1];
        if (Math.sqrt(dx * dx + dy * dy) < 15) {
          setIsDrawing(false);
          return;
        }
      }

      setPoints((prev) => [...prev, x, y]);
    },
    [isDrawing, points, snapToGrid]
  );

  const handleUndo = () => {
    setPoints((prev) => prev.slice(0, -2));
  };

  const handleReset = () => {
    setPoints([]);
    setIsDrawing(true);
  };

  const handleSave = () => {
    if (points.length >= 6) {
      onSave(points);
    }
  };

  // Handle vertex drag for editing existing polygons
  const handleVertexDrag = (index: number, x: number, y: number) => {
    const newPoints = [...points];
    newPoints[index * 2] = snapToGrid(x);
    newPoints[index * 2 + 1] = snapToGrid(y);
    setPoints(newPoints);
  };

  // Double-click vertex to delete it (min 3 vertices)
  const handleVertexDelete = (index: number) => {
    if (isDrawing) return;
    const vertexCount = points.length / 2;
    if (vertexCount <= 3) return; // Can't have less than 3 points
    const newPoints = [...points];
    newPoints.splice(index * 2, 2);
    setPoints(newPoints);
  };

  // Click on edge midpoint to insert a new vertex
  const handleInsertVertex = (afterIndex: number) => {
    if (isDrawing) return;
    const vertexCount = points.length / 2;
    const nextIndex = (afterIndex + 1) % vertexCount;
    const mx = snapToGrid((points[afterIndex * 2] + points[nextIndex * 2]) / 2);
    const my = snapToGrid((points[afterIndex * 2 + 1] + points[nextIndex * 2 + 1]) / 2);
    const newPoints = [...points];
    newPoints.splice((afterIndex + 1) * 2, 0, mx, my);
    setPoints(newPoints);
  };

  const vertices: { x: number; y: number; index: number }[] = [];
  for (let i = 0; i < points.length; i += 2) {
    vertices.push({ x: points[i], y: points[i + 1], index: i / 2 });
  }

  // Edge midpoints for inserting new vertices
  const edgeMidpoints = !isDrawing && vertices.length >= 3
    ? vertices.map((v, i) => {
        const next = vertices[(i + 1) % vertices.length];
        return { x: (v.x + next.x) / 2, y: (v.y + next.y) / 2, afterIndex: i };
      })
    : [];

  return (
    <div className="flex flex-col gap-3">
      {/* Toolbar */}
      <div className="flex items-center gap-2 p-2 bg-muted rounded-lg">
        <span className="text-sm font-medium">
          {isDrawing
            ? points.length === 0
              ? "Klikněte pro první bod tvaru"
              : `${vertices.length} bodů - klikněte poblíž prvního bodu pro uzavření`
            : `Polygon (${vertices.length} bodů) - táhněte bod, 2× klik = smazat, klik na hranu = přidat`}
        </span>
        <div className="flex-1" />
        <Button variant="ghost" size="sm" onClick={handleUndo} disabled={points.length < 2}>
          <Undo2 className="h-4 w-4 mr-1" />
          Zpět
        </Button>
        <Button variant="ghost" size="sm" onClick={handleReset}>
          <RotateCcw className="h-4 w-4 mr-1" />
          Reset
        </Button>
        <Button variant="outline" size="sm" onClick={onCancel}>
          <X className="h-4 w-4 mr-1" />
          Zrušit
        </Button>
        <Button size="sm" onClick={handleSave} disabled={points.length < 6}>
          <Check className="h-4 w-4 mr-1" />
          Uložit tvar
        </Button>
      </div>

      {/* Canvas */}
      <div ref={containerRef} className="w-full border rounded-lg overflow-hidden bg-white dark:bg-zinc-900">
        <Stage
          width={width}
          height={height}
          onClick={handleStageClick}
          style={{ cursor: isDrawing ? "crosshair" : "default" }}
        >
          <Layer>
            {/* Grid */}
            {Array.from({ length: Math.ceil(width / gridSize) + 1 }).map((_, i) => (
              <Line
                key={`gv-${i}`}
                points={[i * gridSize, 0, i * gridSize, height]}
                stroke="#e5e7eb"
                strokeWidth={0.3}
                listening={false}
              />
            ))}
            {Array.from({ length: Math.ceil(height / gridSize) + 1 }).map((_, i) => (
              <Line
                key={`gh-${i}`}
                points={[0, i * gridSize, width, i * gridSize]}
                stroke="#e5e7eb"
                strokeWidth={0.3}
                listening={false}
              />
            ))}

            {/* Polygon shape */}
            {points.length >= 4 && (
              <Line
                points={points}
                closed={!isDrawing}
                fill={isDrawing ? undefined : "rgba(99, 102, 241, 0.1)"}
                stroke="#6366f1"
                strokeWidth={2}
              />
            )}

            {/* Edge midpoints (click to insert vertex) */}
            {edgeMidpoints.map((mp) => (
              <Circle
                key={`mp-${mp.afterIndex}`}
                x={mp.x}
                y={mp.y}
                radius={4}
                fill="transparent"
                stroke="#6366f1"
                strokeWidth={1}
                dash={[2, 2]}
                opacity={0.5}
                onClick={() => handleInsertVertex(mp.afterIndex)}
                onTap={() => handleInsertVertex(mp.afterIndex)}
                hitStrokeWidth={10}
              />
            ))}

            {/* Vertices */}
            {vertices.map((v) => (
              <Circle
                key={`v-${v.index}`}
                x={v.x}
                y={v.y}
                radius={6}
                fill={v.index === 0 && isDrawing ? "#ef4444" : "#6366f1"}
                stroke="white"
                strokeWidth={2}
                draggable={!isDrawing}
                onDragEnd={(e) => handleVertexDrag(v.index, e.target.x(), e.target.y())}
                onDblClick={() => handleVertexDelete(v.index)}
                onDblTap={() => handleVertexDelete(v.index)}
              />
            ))}

            {/* First point highlight when drawing */}
            {isDrawing && points.length >= 6 && (
              <Circle
                x={points[0]}
                y={points[1]}
                radius={15}
                stroke="#ef4444"
                strokeWidth={1}
                dash={[4, 4]}
                listening={false}
              />
            )}

            {/* Dimension labels */}
            {!isDrawing && vertices.length >= 2 && (
              <Text
                x={10}
                y={height - 25}
                text={`Tvar: ${vertices.length} bodů`}
                fontSize={12}
                fill="#6b7280"
                listening={false}
              />
            )}
          </Layer>
        </Stage>
      </div>
    </div>
  );
}
