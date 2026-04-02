import { Rect, Line, Text } from "react-konva";

interface RoomBoundaryProps {
  width: number;
  height: number;
  shapeData?: { points: number[] } | null;
  color?: string;
  name?: string;
}

export function RoomBoundary({ width, height, shapeData, color = "#6366f1", name }: RoomBoundaryProps) {
  if (shapeData?.points && shapeData.points.length >= 6) {
    return (
      <>
        <Line
          points={shapeData.points}
          closed
          fill={`${color}08`}
          stroke={color}
          strokeWidth={2}
          dash={[8, 4]}
          listening={false}
        />
        {name && (
          <Text
            x={10}
            y={10}
            text={name}
            fontSize={14}
            fill={color}
            opacity={0.6}
            listening={false}
          />
        )}
      </>
    );
  }

  return (
    <>
      <Rect
        x={0}
        y={0}
        width={width}
        height={height}
        fill={`${color}05`}
        stroke={color}
        strokeWidth={2}
        dash={[8, 4]}
        listening={false}
      />
      {name && (
        <Text
          x={10}
          y={10}
          text={name}
          fontSize={14}
          fill={color}
          opacity={0.6}
          listening={false}
        />
      )}
    </>
  );
}
