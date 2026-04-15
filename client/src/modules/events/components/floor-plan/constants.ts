// Floor Plan Editor constants

// Grid
export const GRID_SIZE = 20;

// Zoom
export const MIN_ZOOM = 0.3;
export const MAX_ZOOM = 3;
export const MAX_FIT_ZOOM = 2.0; // max zoom for auto-fit (prevents over-zoom on tiny rooms)

// Default table capacities by shape
export const DEFAULT_CAPACITY: Record<string, number> = {
  round: 4,
  rectangle: 8,
  rectangle6: 6,
  oval: 8,
  square: 4,
};

// Default table dimensions (px) by shape
// Rectangle 8 seats: 2 cols × 4 rows of seat squares
// Rectangle 6 seats: 2 cols × 3 rows of seat squares
// Round 4 seats: circle
export const DEFAULT_TABLE_SIZE: Record<string, { width: number; height: number }> = {
  round: { width: 60, height: 60 },
  rectangle: { width: 60, height: 100 },
  rectangle6: { width: 60, height: 80 },
  oval: { width: 80, height: 60 },
  square: { width: 60, height: 60 },
};

// Seat grid layout for rendering seat squares inside tables
// cols × rows based on capacity
export function getSeatGrid(capacity: number, shape: string): { cols: number; rows: number } {
  if (shape === "round" || shape === "oval") {
    return { cols: 0, rows: 0 }; // round tables don't show grid
  }
  if (capacity <= 4) return { cols: 2, rows: 2 };
  if (capacity <= 6) return { cols: 2, rows: 3 };
  if (capacity <= 8) return { cols: 2, rows: 4 };
  if (capacity <= 10) return { cols: 2, rows: 5 };
  if (capacity <= 12) return { cols: 3, rows: 4 };
  return { cols: 3, rows: Math.ceil(capacity / 3) };
}

// Default element sizes (px) by type
export const DEFAULT_ELEMENT_SIZE: Record<string, { width: number; height: number }> = {
  stage: { width: 200, height: 100 },
  dance_floor: { width: 200, height: 200 },
  bar: { width: 150, height: 60 },
  buffet: { width: 180, height: 60 },
  entrance: { width: 80, height: 40 },
  exit: { width: 60, height: 30 },
  wall: { width: 200, height: 10 },
  decoration: { width: 100, height: 100 },
  custom: { width: 100, height: 100 },
  band: { width: 180, height: 80 },
  photo: { width: 60, height: 120 },
  stairs: { width: 80, height: 60 },
  terrace: { width: 300, height: 60 },
  balcony: { width: 40, height: 200 },
};

// Canvas scale: cm to px ratio (2cm = 1px)
export const CM_TO_PX_RATIO = 2;
