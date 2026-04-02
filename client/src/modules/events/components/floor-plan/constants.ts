// Floor Plan Editor constants

// Grid
export const GRID_SIZE = 20;

// Zoom
export const MIN_ZOOM = 0.3;
export const MAX_ZOOM = 3;

// Default table capacities by shape
export const DEFAULT_CAPACITY: Record<string, number> = {
  round: 8,
  rectangle: 6,
  oval: 8,
  square: 4,
};

// Default table dimensions (px) by shape
export const DEFAULT_TABLE_SIZE: Record<string, { width: number; height: number }> = {
  round: { width: 80, height: 80 },
  rectangle: { width: 120, height: 80 },
  oval: { width: 120, height: 80 },
  square: { width: 80, height: 80 },
};

// Default element sizes (px) by type
export const DEFAULT_ELEMENT_SIZE: Record<string, { width: number; height: number }> = {
  stage: { width: 200, height: 100 },
  dance_floor: { width: 200, height: 200 },
  bar: { width: 150, height: 60 },
  buffet: { width: 180, height: 60 },
  entrance: { width: 80, height: 40 },
  wall: { width: 200, height: 10 },
  decoration: { width: 100, height: 100 },
  custom: { width: 100, height: 100 },
};

// Canvas scale: cm to px ratio (2cm = 1px)
export const CM_TO_PX_RATIO = 2;
