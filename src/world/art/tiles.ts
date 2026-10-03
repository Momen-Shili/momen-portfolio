import { T, TILE, TILE_COUNT } from "../tiles";
import { createCanvas, dot, mulberry32, rect, shade, type Ctx } from "./pixel";

type TileDrawer = (ctx: Ctx, ox: number, rnd: () => number) => void;

const GRASS = "#69b84f";

function speckle(ctx: Ctx, ox: number, rnd: () => number, color: string, count: number): void {
  for (let i = 0; i < count; i++)
    dot(ctx, ox + Math.floor(rnd() * TILE), Math.floor(rnd() * TILE), color);
}

function grass(ctx: Ctx, ox: number, rnd: () => number, base = GRASS): void {
  rect(ctx, ox, 0, TILE, TILE, base);
  speckle(ctx, ox, rnd, shade(base, -0.12), 7);
  speckle(ctx, ox, rnd, shade(base, 0.14), 4);
}

function blade(ctx: Ctx, x: number, y: number, color: string): void {
  dot(ctx, x, y, color);
  dot(ctx, x, y - 1, color);
}

function flower(ctx: Ctx, x: number, y: number, petal: string): void {
  dot(ctx, x, y - 1, petal);
  dot(ctx, x, y + 1, petal);
  dot(ctx, x - 1, y, petal);
  dot(ctx, x + 1, y, petal);
  dot(ctx, x, y, "#ffd54a");
}

function wave(ctx: Ctx, ox: number, rows: number[]): void {
  for (const y of rows) {
    rect(ctx, ox + 3, y, 4, 1, "#8fd0f5");
    rect(ctx, ox + 10, y + 5, 4, 1, "#8fd0f5");
  }
}

const DRAWERS: Record<number, TileDrawer> = {
  [T.GRASS]: (ctx, ox, rnd) => grass(ctx, ox, rnd),
  [T.GRASS2]: (ctx, ox, rnd) => {
    grass(ctx, ox, rnd);
    for (let i = 0; i < 4; i++) {
      blade(ctx, ox + 1 + Math.floor(rnd() * 14), 2 + Math.floor(rnd() * 13), "#4f9d3b");
    }
  },
  [T.FLOWER_W]: (ctx, ox, rnd) => {
    grass(ctx, ox, rnd);
    flower(ctx, ox + 4, 5, "#ffffff");
    flower(ctx, ox + 11, 11, "#f6f2ff");
  },
  [T.FLOWER_Y]: (ctx, ox, rnd) => {
    grass(ctx, ox, rnd);
    flower(ctx, ox + 11, 4, "#ff8fb1");
    flower(ctx, ox + 5, 11, "#ff8fb1");
  },
  [T.DARK_GRASS]: (ctx, ox, rnd) => grass(ctx, ox, rnd, "#3f8f3b"),
  [T.PATH]: (ctx, ox, rnd) => {
    rect(ctx, ox, 0, TILE, TILE, "#a58e65");
    for (let row = 0; row < 4; row++) {
      const offset = row % 2 === 0 ? 0 : 2;
      for (let col = -1; col < 4; col++) {
        const x = ox + col * 4 + offset;
        const tone = shade("#d4c19a", (rnd() - 0.5) * 0.18);
        rect(ctx, Math.max(x, ox), row * 4, Math.min(3, ox + TILE - Math.max(x, ox)), 3, tone);
      }
    }
  },
  [T.PLAZA]: (ctx, ox, rnd) => {
    rect(ctx, ox, 0, TILE, TILE, "#c9bea3");
    for (let y = 0; y < 2; y++) {
      for (let x = 0; x < 2; x++) {
        const tone = (x + y) % 2 === 0 ? "#e6dcc3" : "#dcd1b5";
        rect(ctx, ox + x * 8, y * 8, 7, 7, tone);
      }
    }
    speckle(ctx, ox, rnd, "#c2b697", 3);
  },
  [T.WATER_A]: (ctx, ox) => {
    rect(ctx, ox, 0, TILE, TILE, "#3d8fd1");
    wave(ctx, ox, [2, 8]);
  },
  [T.WATER_B]: (ctx, ox) => {
    rect(ctx, ox, 0, TILE, TILE, "#3d8fd1");
    wave(ctx, ox, [4, 10]);
  },
  [T.SAND]: (ctx, ox, rnd) => {
    rect(ctx, ox, 0, TILE, TILE, "#e8d9a0");
    speckle(ctx, ox, rnd, "#d4c286", 8);
    speckle(ctx, ox, rnd, "#f4ead0", 4);
  },
  [T.FLOOR]: (ctx, ox, rnd) => {
    rect(ctx, ox, 0, TILE, TILE, "#b8814f");
    for (let row = 0; row < 4; row++) {
      rect(ctx, ox, row * 4 + 3, TILE, 1, "#8f5f35");
      const joint = ox + ((row * 7 + 5) % TILE);
      rect(ctx, joint, row * 4, 1, 3, "#9a6a3e");
    }
    speckle(ctx, ox, rnd, "#c99564", 4);
  },
  [T.WALL]: (ctx, ox) => {
    rect(ctx, ox, 0, TILE, TILE, "#d9c3a0");
    for (let x = 0; x < TILE; x += 4) rect(ctx, ox + x, 0, 1, TILE, "#cdb58f");
  },
  [T.WALL_BASE]: (ctx, ox) => {
    rect(ctx, ox, 0, TILE, TILE, "#d9c3a0");
    for (let x = 0; x < TILE; x += 4) rect(ctx, ox + x, 0, 1, 8, "#cdb58f");
    rect(ctx, ox, 8, TILE, 8, "#7a5233");
    rect(ctx, ox, 8, TILE, 1, "#a17047");
    rect(ctx, ox, 15, TILE, 1, "#5a3a22");
    rect(ctx, ox + 7, 9, 1, 6, "#5f3d24");
  },
  [T.DOOR_IN]: (ctx, ox) => {
    rect(ctx, ox, 0, TILE, TILE, "#5a3a22");
    rect(ctx, ox + 1, 1, 14, 15, "#8a5a33");
    rect(ctx, ox + 3, 3, 10, 12, "#74481f");
    rect(ctx, ox + 11, 9, 2, 2, "#f2c14e");
  },
  [T.VOID]: (ctx, ox) => rect(ctx, ox, 0, TILE, TILE, "#1b1423"),
};

export function drawTileset(): HTMLCanvasElement {
  const [canvas, ctx] = createCanvas(TILE * TILE_COUNT, TILE);
  const rnd = mulberry32(1337);
  for (let i = 0; i < TILE_COUNT; i++) {
    const draw = DRAWERS[i];
    if (draw) draw(ctx, i * TILE, rnd);
  }
  return canvas;
}
