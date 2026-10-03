import type { Zone } from "../systems/interaction";
import type { BuildingId } from "../content/buildings";
import { GEM_IDS, type SkillGroup } from "../systems/quests/helpers";
import { mulberry32 } from "./art/pixel";
import type { MapDef, NpcDef, PropDef, Spawn } from "./mapTypes";
import { T, TILE } from "./tiles";

export const TOWN_COLS = 48;
export const TOWN_ROWS = 36;

interface Placement {
  id: Exclude<BuildingId, "board">;
  bx: number;
  by: number;
}

/** Footprint is 6x5 tiles; the door faces south. */
export const BUILDING_PLACEMENTS: readonly Placement[] = [
  { id: "house", bx: 6, by: 4 },
  { id: "workshop", bx: 34, by: 4 },
  { id: "library", bx: 6, by: 26 },
  { id: "post", bx: 34, by: 26 },
];

const BUILDING_W_TILES = 6;
const BUILDING_H_TILES = 5;
const PLAZA = { x0: 18, y0: 15, x1: 29, y1: 24 };
const FOUNTAIN = { tx: 23, ty: 19 };
const BOARD = { tx: 20, ty: 16 };
const POND = { x0: 10, y0: 17, x1: 14, y1: 20 };

/** Skill gems tucked into corners of the town, one per skill group. */
const GEM_SPOTS: ReadonlyArray<{ group: SkillGroup; tx: number; ty: number; frame: number }> = [
  { group: "Advanced", tx: 3, ty: 8, frame: 0 },
  { group: "Proficient", tx: 44, ty: 22, frame: 1 },
  { group: "Growing", tx: 44, ty: 3, frame: 2 },
];

class Grid {
  readonly ground: number[];
  readonly blocked: boolean[];
  readonly reserved: boolean[];

  constructor(
    readonly cols: number,
    readonly rows: number,
  ) {
    this.ground = new Array<number>(cols * rows).fill(T.GRASS);
    this.blocked = new Array<boolean>(cols * rows).fill(false);
    this.reserved = new Array<boolean>(cols * rows).fill(false);
  }

  inside(x: number, y: number): boolean {
    return x >= 0 && y >= 0 && x < this.cols && y < this.rows;
  }

  idx(x: number, y: number): number {
    return y * this.cols + x;
  }

  paint(x0: number, y0: number, x1: number, y1: number, tile: number): void {
    for (let y = y0; y <= y1; y++)
      for (let x = x0; x <= x1; x++) this.ground[this.idx(x, y)] = tile;
  }

  block(x0: number, y0: number, x1: number, y1: number): void {
    for (let y = y0; y <= y1; y++)
      for (let x = x0; x <= x1; x++) this.blocked[this.idx(x, y)] = true;
  }

  reserve(x0: number, y0: number, x1: number, y1: number): void {
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) if (this.inside(x, y)) this.reserved[this.idx(x, y)] = true;
    }
  }

  isFree(x: number, y: number, margin: number): boolean {
    for (let yy = y - margin; yy <= y + margin; yy++) {
      for (let xx = x - margin; xx <= x + margin; xx++) {
        if (!this.inside(xx, yy) || this.reserved[this.idx(xx, yy)]) return false;
      }
    }
    return true;
  }
}

function tilePx(t: number): number {
  return t * TILE;
}

function inBorder(x: number, y: number): boolean {
  return x < 2 || y < 2 || x >= TOWN_COLS - 2 || y >= TOWN_ROWS - 2;
}

export function buildTown(): MapDef {
  const g = new Grid(TOWN_COLS, TOWN_ROWS);
  const rnd = mulberry32(20240607);
  const props: PropDef[] = [];
  const zones: Zone[] = [];
  const spawns: Record<string, Spawn> = {};

  // Base grass with a little variety.
  for (let y = 0; y < TOWN_ROWS; y++) {
    for (let x = 0; x < TOWN_COLS; x++) {
      const r = rnd();
      let tile: number = T.GRASS;
      if (inBorder(x, y)) tile = T.DARK_GRASS;
      else if (r < 0.1) tile = T.GRASS2;
      else if (r < 0.14) tile = T.FLOWER_W;
      else if (r < 0.18) tile = T.FLOWER_Y;
      g.ground[g.idx(x, y)] = tile;
    }
  }

  // Roads.
  g.paint(3, 11, 44, 12, T.PATH);
  g.paint(3, 32, 44, 33, T.PATH);
  g.paint(23, 11, 24, 33, T.PATH);
  g.reserve(3, 11, 44, 12);
  g.reserve(3, 32, 44, 33);
  g.reserve(23, 11, 24, 33);

  // Plaza.
  g.paint(PLAZA.x0, PLAZA.y0, PLAZA.x1, PLAZA.y1, T.PLAZA);
  g.reserve(PLAZA.x0 - 1, PLAZA.y0 - 1, PLAZA.x1 + 1, PLAZA.y1 + 1);

  // Pond with a sand shore.
  g.paint(POND.x0 - 1, POND.y0 - 1, POND.x1 + 1, POND.y1 + 1, T.SAND);
  g.paint(POND.x0, POND.y0, POND.x1, POND.y1, T.WATER_A);
  g.block(POND.x0, POND.y0, POND.x1, POND.y1);
  g.reserve(POND.x0 - 2, POND.y0 - 2, POND.x1 + 2, POND.y1 + 2);
  const waterTiles: number[] = [];
  for (let y = POND.y0; y <= POND.y1; y++) {
    for (let x = POND.x0; x <= POND.x1; x++) waterTiles.push(g.idx(x, y));
  }

  // Buildings, door paths, signs, zones.
  for (const { id, bx, by } of BUILDING_PLACEMENTS) {
    const facesNorthRoad = by < 12;
    g.block(bx, by, bx + BUILDING_W_TILES - 1, by + BUILDING_H_TILES - 1);
    g.reserve(bx - 1, by - 1, bx + BUILDING_W_TILES, by + BUILDING_H_TILES + 1);
    const standRow = by + BUILDING_H_TILES;
    const pathEnd = facesNorthRoad ? 11 : 32;
    g.paint(bx + 2, standRow, bx + 3, pathEnd, T.PATH);
    g.paint(bx + 1, standRow, bx + 4, standRow, T.PATH);

    props.push({ texture: `building-${id}`, x: tilePx(bx) + 48, y: tilePx(by + BUILDING_H_TILES) });
    props.push({
      texture: "flag",
      x: tilePx(bx) + 82,
      y: tilePx(by) + 6,
      originX: 1 / 12,
      anim: true,
    });

    const spawn: Spawn = { x: tilePx(bx) + 48, y: tilePx(standRow) + 14 };
    spawns[`door-${id}`] = spawn;

    const base = { x: tilePx(bx + 1), y: tilePx(standRow), w: 4 * TILE, h: 28 };
    const zoneById: Record<Placement["id"], Zone> = {
      house: {
        id,
        ...base,
        prompt: "Enter the house (About)",
        action: { type: "enter", map: "house", spawn: "in" },
      },
      workshop: {
        id,
        ...base,
        prompt: "Open the workshop (Projects)",
        action: { type: "panel", panel: "projects" },
      },
      library: {
        id,
        ...base,
        prompt: "Open the library (Skills)",
        action: { type: "panel", panel: "skills" },
      },
      post: {
        id,
        ...base,
        prompt: "Open the post office (Contact)",
        action: { type: "panel", panel: "contact" },
      },
    };
    zones.push(zoneById[id]);
  }

  // Fountain, notice board, lamps, benches.
  g.block(FOUNTAIN.tx, FOUNTAIN.ty, FOUNTAIN.tx + 1, FOUNTAIN.ty + 1);
  props.push({
    texture: "fountain",
    x: tilePx(FOUNTAIN.tx) + TILE,
    y: tilePx(FOUNTAIN.ty + 2),
    anim: true,
  });
  zones.push({
    id: "fountain",
    x: tilePx(FOUNTAIN.tx - 1),
    y: tilePx(FOUNTAIN.ty - 1),
    w: 4 * TILE,
    h: 4 * TILE,
    prompt: "Toss a coin in the fountain",
    action: { type: "wish" },
  });

  g.block(BOARD.tx, BOARD.ty, BOARD.tx + 1, BOARD.ty);
  props.push({ texture: "board", x: tilePx(BOARD.tx) + TILE, y: tilePx(BOARD.ty + 1) });
  zones.push({
    id: "board",
    x: tilePx(BOARD.tx - 1),
    y: tilePx(BOARD.ty + 1),
    w: 4 * TILE,
    h: 24,
    prompt: "Read the notice board",
    action: { type: "panel", panel: "board" },
  });
  spawns["door-board"] = { x: tilePx(BOARD.tx) + TILE, y: tilePx(BOARD.ty + 1) + 14 };

  for (const [lx, ly] of [
    [PLAZA.x0, PLAZA.y0],
    [PLAZA.x1, PLAZA.y0],
    [PLAZA.x0, PLAZA.y1],
    [PLAZA.x1, PLAZA.y1],
  ] as const) {
    g.block(lx, ly, lx, ly);
    props.push({ texture: "lamp", x: tilePx(lx) + 8, y: tilePx(ly + 1) });
  }
  for (const bx of [26, 20]) {
    g.block(bx, 22, bx + 1, 22);
    props.push({ texture: "bench", x: tilePx(bx) + TILE, y: tilePx(23) });
  }

  // Workshop and post office decor.
  g.block(33, 9, 33, 9);
  props.push({ texture: "barrel", x: tilePx(33) + 8, y: tilePx(10) });
  g.block(41, 9, 41, 9);
  props.push({ texture: "anvil", x: tilePx(41) + 8, y: tilePx(10) });
  g.block(39, 31, 39, 31);
  props.push({ texture: "mailbox", x: tilePx(39) + 8, y: tilePx(32) });

  // Hidden skill gems. Reserved first so scattered trees never wall them in.
  for (const { group, tx, ty, frame } of GEM_SPOTS) {
    g.reserve(tx - 1, ty - 1, tx + 1, ty + 1);
    const item = GEM_IDS[group];
    props.push({ texture: "gem", frame, x: tilePx(tx) + 8, y: tilePx(ty + 1) - 2, item });
    zones.push({
      id: `gem-${group.toLowerCase()}`,
      x: tilePx(tx) - 8,
      y: tilePx(ty) - 8,
      w: 32,
      h: 32,
      prompt: "Pick up the glinting gem",
      action: { type: "gem", group },
      item,
    });
  }

  // Border trees (impassable) and scattered decor.
  const trees: Array<[number, number]> = [];
  for (let y = 0; y < TOWN_ROWS; y++) {
    for (let x = 0; x < TOWN_COLS; x++) {
      if (!inBorder(x, y)) continue;
      g.block(x, y, x, y);
      g.reserve(x, y, x, y);
      const outer = x === 0 || y === 0 || x === TOWN_COLS - 1 || y === TOWN_ROWS - 1;
      if (outer || (x + y) % 2 === 0) trees.push([x, y]);
    }
  }
  for (let attempt = 0; attempt < 260 && trees.length < 400; attempt++) {
    const x = 3 + Math.floor(rnd() * (TOWN_COLS - 6));
    const y = 3 + Math.floor(rnd() * (TOWN_ROWS - 6));
    if (attempt < 70 && g.isFree(x, y, 1)) {
      g.block(x, y, x, y);
      g.reserve(x, y, x, y);
      trees.push([x, y]);
    } else if (attempt >= 70 && g.isFree(x, y, 0)) {
      g.block(x, y, x, y);
      g.reserve(x, y, x, y);
      props.push({ texture: "bush", x: tilePx(x) + 8, y: tilePx(y + 1) });
    }
  }
  for (const [x, y] of trees) props.push({ texture: "tree", x: tilePx(x) + 8, y: tilePx(y + 1) });

  // NPCs.
  const npcs: NpcDef[] = [
    { id: "guide", texture: "npc-guide", x: tilePx(28) + 8, y: tilePx(19) + 14, facing: "left" },
    { id: "smith", texture: "npc-smith", x: tilePx(40) + 8, y: tilePx(10) + 14, facing: "left" },
    { id: "reader", texture: "npc-reader", x: tilePx(12) + 8, y: tilePx(31) + 14, facing: "left" },
    { id: "clerk", texture: "npc-clerk", x: tilePx(33) + 8, y: tilePx(31) + 14, facing: "right" },
  ];
  for (const npc of npcs) {
    const tx = Math.floor(npc.x / TILE);
    const ty = Math.floor((npc.y - 2) / TILE);
    g.block(tx, ty, tx, ty);
    zones.push({
      id: `npc-${npc.id}`,
      x: npc.x - 26,
      y: npc.y - 30,
      w: 52,
      h: 44,
      prompt: "Talk",
      action: { type: "dialog", npc: npc.id },
    });
  }

  spawns["start"] = { x: tilePx(24) + 8, y: tilePx(23) + 14 };

  return {
    id: "town",
    cols: TOWN_COLS,
    rows: TOWN_ROWS,
    ground: g.ground,
    blocked: g.blocked,
    waterTiles,
    props,
    npcs,
    zones,
    spawns,
    background: "#3f8f3b",
  };
}
