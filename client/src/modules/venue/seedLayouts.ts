/**
 * Default floor plan layouts for Folklore Garden buildings.
 * Based on real floor plans from PDF blueprints (Kovárna, Roubenka, Stodola).
 *
 * Coordinates are in canvas pixels. Room dimensions use CM_TO_PX_RATIO = 2.
 * Tables: 8-person rectangular (120×80), 6-person round (80×80).
 */

import type { FloorPlanElementType, TableShape, Building, FloorPlanTemplate } from "@shared/types";
import { api } from "@/shared/lib/api";

interface DefaultTable {
  tableName: string;
  shape: TableShape;
  capacity: number;
  widthPx: number;
  heightPx: number;
  positionX: number;
  positionY: number;
  rotation: number;
}

interface DefaultElement {
  elementType: FloorPlanElementType;
  label?: string;
  widthPx: number;
  heightPx: number;
  positionX: number;
  positionY: number;
  rotation: number;
  isLocked: boolean;
}

export interface DefaultLayout {
  tables: DefaultTable[];
  elements: DefaultElement[];
  /** Recommended room dimensions in cm */
  roomWidthCm: number;
  roomHeightCm: number;
}

// ─── Helper to generate numbered tables ─────────────────────────────────────

// 8-seat rectangular: 60×100 (2 cols × 4 rows of seat squares)
function rect8(name: string, x: number, y: number, rotation = 0): DefaultTable {
  return { tableName: name, shape: "rectangle", capacity: 8, widthPx: 60, heightPx: 100, positionX: x, positionY: y, rotation };
}

// 6-seat rectangular: 60×80 (2 cols × 3 rows of seat squares)
function rect6(name: string, x: number, y: number, rotation = 0): DefaultTable {
  return { tableName: name, shape: "rectangle", capacity: 6, widthPx: 60, heightPx: 80, positionX: x, positionY: y, rotation };
}

// 4-seat round: 60×60
function round4(name: string, x: number, y: number): DefaultTable {
  return { tableName: name, shape: "round", capacity: 4, widthPx: 60, heightPx: 60, positionX: x, positionY: y, rotation: 0 };
}

function el(type: FloorPlanElementType, x: number, y: number, w: number, h: number, label?: string, rotation = 0): DefaultElement {
  return { elementType: type, label, widthPx: w, heightPx: h, positionX: x, positionY: y, rotation, isLocked: true };
}

// ─── KOVÁRNA (Smithy) ───────────────────────────────────────────────────────
// Smaller venue: Stage left, BAR right, Entrance top-left
// 10 rectangular tables (8 seats each) in 3 rows
// Table spacing: ~70px horizontal, ~120px vertical

const kovarnaLayout: DefaultLayout = {
  roomWidthCm: 2000,
  roomHeightCm: 1200,
  elements: [
    el("entrance", 20, 20, 100, 80, "ENTRANCE"),
    el("stage", 20, 180, 140, 280, "STAGE"),
    el("bar", 820, 240, 100, 200, "BAR"),
  ],
  tables: [
    // Row 1 (top) — 4 tables
    rect8("Stůl 1", 220, 40),
    rect8("Stůl 2", 350, 40),
    rect8("Stůl 3", 480, 40),
    rect8("Stůl 4", 610, 40),
    // Row 2 (middle) — 3 tables
    rect8("Stůl 5", 220, 200),
    rect8("Stůl 6", 350, 200),
    rect8("Stůl 7", 480, 200),
    // Row 3 (bottom) — 3 tables
    rect8("Stůl 8", 220, 360),
    rect8("Stůl 9", 350, 360),
    rect8("Stůl 10", 480, 360),
  ],
};

// ─── ROUBENKA (Wooden House) ────────────────────────────────────────────────
// Based on img_6.png — 1:1 match of the real floor plan
// Large venue with STAGE+BAND center, 2 BARs, TERRACE, 2 ENTRANCES, etc.
// Tables: 8-seat rect (60×100), table spacing ~70h/115v
// Room: 3200×2200cm = 1600×1100px canvas

const roubenkaLayout: DefaultLayout = {
  roomWidthCm: 3200,
  roomHeightCm: 2200,
  elements: [
    el("terrace", 440, 10, 340, 40, "TERRACE"),
    el("stage", 420, 380, 280, 180, "STAGE"),
    el("band", 440, 570, 220, 70, "BAND"),
    el("bar", 10, 460, 40, 220, "BAR"),
    el("bar", 1530, 330, 40, 220, "BAR"),
    el("entrance", 480, 960, 100, 40, "ENTRANCE"),
    el("entrance", 620, 960, 100, 40, "ENTRANCE"),
    el("stairs", 390, 940, 70, 50, "STAIRS"),
    el("stairs", 740, 940, 70, 50, "STAIRS"),
    el("photo", 1530, 580, 40, 100, "PHOTO"),
    el("exit", 10, 260, 30, 50, "EXIT"),
    el("exit", 1540, 170, 30, 50, "EXIT"),
  ],
  tables: (() => {
    const t: DefaultTable[] = [];
    let n = 1;
    const H = 70; // horizontal spacing between tables
    const V = 115; // vertical spacing between tables

    // ── Terrace area (upper-left, angled tables) ──
    // 2 columns × 4 rows, with diagonal rotation
    t.push(rect8(`Stůl ${n++}`, 60, 60, -25));
    t.push(rect8(`Stůl ${n++}`, 130, 60, -20));
    t.push(rect8(`Stůl ${n++}`, 200, 60, -15));
    t.push(rect8(`Stůl ${n++}`, 270, 60, -10));
    t.push(rect8(`Stůl ${n++}`, 60, 175, -25));
    t.push(rect8(`Stůl ${n++}`, 130, 175, -20));
    t.push(rect8(`Stůl ${n++}`, 200, 175, -15));
    t.push(rect8(`Stůl ${n++}`, 270, 175, -10));

    // ── Top section above stage — Row 1 ──
    // Long row of 8 tables
    const topX1 = 380;
    const topY1 = 70;
    for (let i = 0; i < 8; i++) {
      t.push(rect8(`Stůl ${n++}`, topX1 + i * H, topY1));
    }
    // ── Top section — Row 2 ──
    const topY2 = topY1 + V;
    for (let i = 0; i < 8; i++) {
      t.push(rect8(`Stůl ${n++}`, topX1 + i * H, topY2));
    }

    // ── Far right top group (near EXIT) ──
    // 3 columns × 2 rows
    const frX = 1080;
    t.push(rect8(`Stůl ${n++}`, frX, 70));
    t.push(rect8(`Stůl ${n++}`, frX + H, 70));
    t.push(rect8(`Stůl ${n++}`, frX + H * 2, 70));
    t.push(rect8(`Stůl ${n++}`, frX, 70 + V));
    t.push(rect8(`Stůl ${n++}`, frX + H, 70 + V));
    t.push(rect8(`Stůl ${n++}`, frX + H * 2, 70 + V));

    // ── Left of stage — 3 cols × 3 rows ──
    const lsX = 70;
    const lsY = 340;
    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 3; col++) {
        t.push(rect8(`Stůl ${n++}`, lsX + col * H, lsY + row * V));
      }
    }

    // ── Right of stage — 4 cols × 3 rows ──
    const rsX = 860;
    const rsY = 320;
    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 4; col++) {
        t.push(rect8(`Stůl ${n++}`, rsX + col * H, rsY + row * V));
      }
    }

    // ── Bottom-left group — 3 cols × 3 rows ──
    const blX = 70;
    const blY = 700;
    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 3; col++) {
        t.push(rect8(`Stůl ${n++}`, blX + col * H, blY + row * V));
      }
    }

    // ── Bottom-right group (near PHOTO) — 3 tables ──
    t.push(rect8(`Stůl ${n++}`, 1080, 720));
    t.push(rect8(`Stůl ${n++}`, 1150, 720));
    t.push(rect8(`Stůl ${n++}`, 1080, 835));
    t.push(rect8(`Stůl ${n++}`, 1150, 835));

    return t;
  })(),
};

// ─── STODOLA (Barn) ─────────────────────────────────────────────────────────
// BAR top-left, STAGE bottom-center, 1st balcony right, 2nd balcony far-right
// ENTRANCE left-lower, mix of rect and round tables

const stodolaLayout: DefaultLayout = {
  roomWidthCm: 2800,
  roomHeightCm: 2000,
  elements: [
    el("bar", 20, 20, 100, 40, "BAR"),
    el("stage", 380, 800, 280, 100, "STAGE"),
    el("balcony", 820, 80, 30, 560, "1. balkon"),
    el("balcony", 1020, 80, 30, 560, "2. balkon"),
    el("entrance", 20, 620, 40, 100, "ENTRANCE"),
  ],
  tables: (() => {
    const t: DefaultTable[] = [];
    let n = 1;
    const H = 70;
    const V = 115;

    // Upper-left group — 2 cols × 3 rows
    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 2; col++) {
        t.push(rect8(`Stůl ${n++}`, 160 + col * H, 60 + row * V));
      }
    }

    // Round table
    t.push(round4(`Stůl ${n++}`, 360, 80));

    // Center column group — 2 cols × 4 rows
    const ccX = 420;
    for (let row = 0; row < 4; row++) {
      for (let col = 0; col < 2; col++) {
        t.push(rect8(`Stůl ${n++}`, ccX + col * H, 120 + row * V));
      }
    }

    // Left entrance area table
    t.push(rect8(`Stůl ${n++}`, 80, 420));

    // Long banquet tables bottom-left (12-seat, wider)
    const longTable = (name: string, x: number, y: number): DefaultTable => ({
      tableName: name, shape: "rectangle", capacity: 12, widthPx: 200, heightPx: 60, positionX: x, positionY: y, rotation: 0,
    });
    t.push(longTable(`Stůl ${n++}`, 60, 520));
    t.push(longTable(`Stůl ${n++}`, 60, 600));
    t.push(longTable(`Stůl ${n++}`, 60, 700));
    t.push(longTable(`Stůl ${n++}`, 60, 780));

    // 1st balcony tables — 2 cols × 4 rows
    for (let row = 0; row < 4; row++) {
      for (let col = 0; col < 2; col++) {
        t.push(rect8(`Stůl ${n++}`, 860 + col * H, 100 + row * V));
      }
    }

    // 2nd balcony tables — 1 col × 4 rows
    for (let row = 0; row < 4; row++) {
      t.push(rect8(`Stůl ${n++}`, 1060, 100 + row * V));
    }

    // Bottom-right tables near stage
    t.push(rect8(`Stůl ${n++}`, 720, 800));
    t.push(rect8(`Stůl ${n++}`, 790, 800));

    return t;
  })(),
};

// ─── Registry ───────────────────────────────────────────────────────────────

/**
 * Map of building slug → default layout.
 * These slugs should match the Building.slug values in the database.
 */
export const DEFAULT_LAYOUTS: Record<string, DefaultLayout> = {
  kovarna: kovarnaLayout,
  roubenka: roubenkaLayout,
  stodola: stodolaLayout,
};

/**
 * Lookup layout by building slug OR name.
 */
function getDefaultLayout(building: Building): DefaultLayout | null {
  // Try slug first, then name — normalize both
  const candidates = [building.slug, building.name].map(
    (s) => (s ?? "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z]/g, "")
  );
  for (const text of candidates) {
    if (text.includes("kovar") || text.includes("smithy")) return kovarnaLayout;
    if (text.includes("rouben") || text.includes("wooden")) return roubenkaLayout;
    if (text.includes("stodol") || text.includes("barn")) return stodolaLayout;
  }
  return DEFAULT_LAYOUTS[building.slug] ?? null;
}

// ─── Template seeding ───────────────────────────────────────────────────────

const BUILDING_TEMPLATE_NAMES: Record<string, string> = {
  kovarna: "Kovárna - výchozí rozvržení",
  roubenka: "Roubenka - výchozí rozvržení",
  stodola: "Stodola - výchozí rozvržení",
};

export interface SeedResult {
  created: number;
  skipped: string[];
  errors: string[];
}

/**
 * Create default templates via API for each building that has a layout definition.
 * Skips buildings that already have a template.
 */
export async function seedDefaultTemplates(
  buildings: Building[],
  existingTemplates: FloorPlanTemplate[]
): Promise<SeedResult> {
  const result: SeedResult = { created: 0, skipped: [], errors: [] };

  if (buildings.length === 0) {
    result.errors.push("Nejsou žádné budovy. Nejprve vytvořte budovy v sekci Areál > Budovy a místnosti.");
    return result;
  }

  for (const building of buildings) {
    const layout = getDefaultLayout(building);
    if (!layout) {
      result.skipped.push(`${building.name} (slug: "${building.slug}") — žádný výchozí plánek`);
      continue;
    }

    // Find the first room in this building to assign the template
    const rooms = building.rooms ?? [];
    if (rooms.length === 0) {
      result.errors.push(`${building.name} — nemá žádné místnosti. Přidejte místnost v Budovy a místnosti.`);
      continue;
    }
    const room = rooms[0];

    // Check if a template for this room already exists
    const existing = existingTemplates.find((t) => t.roomId === room.id);
    if (existing) {
      result.skipped.push(`${building.name} / ${room.name} — šablona "${existing.name}" již existuje`);
      continue;
    }

    const templateName = BUILDING_TEMPLATE_NAMES[building.slug] ?? `${building.name} - výchozí rozvržení`;

    try {
      await api.post("/api/venue/templates", {
        name: templateName,
        description: `Výchozí rozvržení dle plánku budovy ${building.name}`,
        roomId: room.id,
        isDefault: true,
        layoutData: {
          tables: layout.tables.map((t) => ({
            tableName: t.tableName,
            shape: t.shape,
            capacity: t.capacity,
            widthPx: t.widthPx,
            heightPx: t.heightPx,
            positionX: t.positionX,
            positionY: t.positionY,
            rotation: t.rotation,
          })),
          elements: layout.elements.map((e) => ({
            elementType: e.elementType,
            label: e.label,
            widthPx: e.widthPx,
            heightPx: e.heightPx,
            positionX: e.positionX,
            positionY: e.positionY,
            rotation: e.rotation,
            shape: "rectangle",
            isLocked: e.isLocked,
          })),
        },
      });
      result.created++;
    } catch (err) {
      result.errors.push(`${building.name} — chyba API: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  return result;
}
