import type { Zone } from "../systems/interaction";
import type { MapDef, PropDef } from "./mapTypes";
import { T, TILE } from "./tiles";

export const HOUSE_COLS = 18;
export const HOUSE_ROWS = 11;

function px(t: number): number {
  return t * TILE;
}

export function buildHouse(): MapDef {
  const cols = HOUSE_COLS;
  const rows = HOUSE_ROWS;
  const ground = new Array<number>(cols * rows).fill(T.FLOOR);
  const blocked = new Array<boolean>(cols * rows).fill(false);
  const set = (x: number, y: number, tile: number, block: boolean): void => {
    ground[y * cols + x] = tile;
    blocked[y * cols + x] = block;
  };

  for (let x = 0; x < cols; x++) {
    set(x, 0, T.WALL, true);
    set(x, 1, T.WALL, true);
    set(x, 2, T.WALL_BASE, true);
    set(x, rows - 1, T.WALL_BASE, true);
  }
  for (let y = 3; y < rows - 1; y++) {
    set(0, y, T.WALL, true);
    set(cols - 1, y, T.WALL, true);
  }
  set(8, rows - 1, T.DOOR_IN, true);
  set(9, rows - 1, T.DOOR_IN, true);

  // Desk with the retro computer takes two tiles of floor.
  blocked[3 * cols + 14] = true;
  blocked[3 * cols + 15] = true;
  blocked[3 * cols + 16] = true;

  const props: PropDef[] = [
    { texture: "rug", x: px(9), y: px(7) + 4, flat: true },
    { texture: "bookshelf", x: px(2), y: px(3) },
    { texture: "portrait", x: 88, y: 44 },
    { texture: "window", x: 128, y: 40 },
    { texture: "frames", x: 176, y: 40 },
    {
      texture: "computer",
      x: 240,
      y: px(4),
      anim: true,
    },
    { texture: "plant", x: px(17) - 6, y: px(3) + 2 },
  ];

  const zones: Zone[] = [
    {
      id: "portrait",
      x: 64,
      y: px(3),
      w: 48,
      h: 32,
      prompt: "Read about Momen",
      action: { type: "panel", panel: "about" },
    },
    {
      id: "frames",
      x: 144,
      y: px(3),
      w: 64,
      h: 32,
      prompt: "Read the experience wall",
      action: { type: "panel", panel: "about" },
    },
    {
      id: "computer",
      x: 208,
      y: px(4),
      w: 64,
      h: 28,
      prompt: "Use the retro computer",
      action: { type: "panel", panel: "terminal" },
    },
    {
      id: "exit",
      x: px(7),
      y: px(8),
      w: 4 * TILE,
      h: 2 * TILE,
      prompt: "Leave the house",
      action: { type: "exit", map: "town", spawn: "door-house" },
    },
  ];

  return {
    id: "house",
    cols,
    rows,
    ground,
    blocked,
    waterTiles: [],
    props,
    npcs: [],
    zones,
    spawns: { in: { x: 144, y: px(9) + 12 } },
    background: "#1b1423",
  };
}
