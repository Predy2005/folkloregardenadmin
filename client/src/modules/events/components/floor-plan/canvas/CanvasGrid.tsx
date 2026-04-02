import { Line } from "react-konva";

interface CanvasGridProps {
  width: number;
  height: number;
  gridSize: number;
}

export function CanvasGrid({ width, height, gridSize }: CanvasGridProps) {
  const lines = [];

  // Vertical lines
  for (let x = 0; x <= width; x += gridSize) {
    lines.push(
      <Line
        key={`v-${x}`}
        points={[x, 0, x, height]}
        stroke="#e5e7eb"
        strokeWidth={x % (gridSize * 5) === 0 ? 0.5 : 0.25}
        listening={false}
      />
    );
  }

  // Horizontal lines
  for (let y = 0; y <= height; y += gridSize) {
    lines.push(
      <Line
        key={`h-${y}`}
        points={[0, y, width, y]}
        stroke="#e5e7eb"
        strokeWidth={y % (gridSize * 5) === 0 ? 0.5 : 0.25}
        listening={false}
      />
    );
  }

  return <>{lines}</>;
}
