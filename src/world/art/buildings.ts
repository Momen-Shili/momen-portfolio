import { textWidth } from "../pixelFont";
import { createCanvas, disc, drawText, rect, shade, type Ctx } from "./pixel";

export const BUILDING_W = 96;
export const BUILDING_H = 80;

export type Deco = "house" | "workshop" | "library" | "post";

export interface BuildingStyle {
  roof: string;
  wall: string;
  trim: string;
  label: string;
  deco: Deco;
}

export const BUILDING_STYLES: Record<Deco, BuildingStyle> = {
  house: { roof: "#c0392b", wall: "#ead8b4", trim: "#7a4b2a", label: "HOUSE", deco: "house" },
  workshop: {
    roof: "#6b7a8f",
    wall: "#b98a5a",
    trim: "#4a3a2a",
    label: "WORKSHOP",
    deco: "workshop",
  },
  library: { roof: "#2f6fb0", wall: "#d9d0c0", trim: "#2b3a55", label: "LIBRARY", deco: "library" },
  post: { roof: "#2e8b57", wall: "#f0e6d0", trim: "#2a5d3a", label: "POST OFFICE", deco: "post" },
};

function drawRoof(ctx: Ctx, color: string): void {
  for (let r = 0; r < 28; r++) {
    const inset = Math.floor((27 - r) * 0.25);
    const left = r >= 23 ? 0 : 3 + inset;
    const right = BUILDING_W - left;
    const band = Math.floor(r / 4) % 2;
    rect(ctx, left, r, right - left, 1, band === 0 ? color : shade(color, -0.08));
    // shingle joints
    const offset = band === 0 ? 0 : 4;
    for (let x = left + offset; x < right; x += 8) rect(ctx, x, r, 1, 1, shade(color, -0.25));
    if (r % 4 === 3) rect(ctx, left, r, right - left, 1, shade(color, -0.22));
  }
  rect(ctx, 0, 27, BUILDING_W, 1, shade(color, -0.5));
  rect(ctx, 6, 0, BUILDING_W - 12, 1, shade(color, 0.25));
}

function drawWall(ctx: Ctx, style: BuildingStyle): void {
  rect(ctx, 4, 28, 88, 52, style.wall);
  rect(ctx, 4, 28, 88, 3, shade(style.wall, -0.3));
  const brick = shade(style.wall, -0.14);
  for (let y = 34, row = 0; y < 70; y += 6, row++) {
    rect(ctx, 4, y, 88, 1, brick);
    for (let x = 4 + (row % 2) * 6; x < 92; x += 12) rect(ctx, x, y + 1, 1, 5, brick);
  }
  rect(ctx, 4, 72, 88, 8, shade(style.wall, -0.32));
  rect(ctx, 4, 72, 88, 1, shade(style.wall, -0.5));
  rect(ctx, 4, 28, 1, 52, shade(style.wall, -0.4));
  rect(ctx, 91, 28, 1, 52, shade(style.wall, -0.4));
}

function drawWindow(ctx: Ctx, x: number, y: number, trim: string): void {
  rect(ctx, x - 1, y - 1, 18, 16, trim);
  rect(ctx, x, y, 16, 14, "#9fd6ff");
  rect(ctx, x + 2, y + 2, 4, 1, "#e4f6ff");
  rect(ctx, x + 2, y + 3, 1, 3, "#e4f6ff");
  rect(ctx, x + 7, y, 2, 14, trim);
  rect(ctx, x, y + 6, 16, 2, trim);
  rect(ctx, x - 2, y + 14, 20, 2, shade(trim, 0.2));
}

function drawDoor(ctx: Ctx, trim: string): void {
  rect(ctx, 37, 47, 22, 33, trim);
  rect(ctx, 40, 50, 16, 30, "#6b3f22");
  rect(ctx, 40, 50, 1, 1, trim);
  rect(ctx, 55, 50, 1, 1, trim);
  rect(ctx, 42, 53, 5, 11, "#7d4c2b");
  rect(ctx, 49, 53, 5, 11, "#7d4c2b");
  rect(ctx, 42, 67, 5, 10, "#7d4c2b");
  rect(ctx, 49, 67, 5, 10, "#7d4c2b");
  rect(ctx, 52, 66, 2, 2, "#f2c14e");
  rect(ctx, 34, 77, 28, 3, "#8c8c94");
  rect(ctx, 34, 77, 28, 1, "#b4b4bc");
}

function drawSign(ctx: Ctx, label: string): void {
  const width = textWidth(label) + 6;
  const x = Math.round(BUILDING_W / 2 - width / 2);
  rect(ctx, x, 33, width, 9, "#3a2410");
  rect(ctx, x + 1, 34, width - 2, 7, "#5b3a1e");
  drawText(ctx, label, x + 3, 35, "#f5e6b8");
}

function drawChimney(ctx: Ctx, x: number): void {
  rect(ctx, x, 2, 9, 16, "#8a4b3a");
  rect(ctx, x - 1, 1, 11, 3, "#5f3328");
  for (let y = 6; y < 18; y += 4) rect(ctx, x, y, 9, 1, "#6f3b2d");
}

function drawDeco(ctx: Ctx, style: BuildingStyle): void {
  switch (style.deco) {
    case "house":
      drawChimney(ctx, 68);
      rect(ctx, 14, 10, 14, 11, shade(style.roof, -0.35));
      rect(ctx, 15, 11, 12, 9, "#9fd6ff");
      rect(ctx, 20, 11, 1, 9, shade(style.roof, -0.35));
      break;
    case "workshop":
      drawChimney(ctx, 72);
      disc(ctx, 28, 14, 5, "#d6dae2");
      disc(ctx, 28, 14, 2, shade(style.roof, -0.2));
      for (const [dx, dy] of [
        [0, -7],
        [0, 7],
        [-7, 0],
        [7, 0],
      ] as const) {
        rect(ctx, 28 + dx - 1, 14 + dy - 1, 3, 3, "#d6dae2");
      }
      break;
    case "library":
      rect(ctx, 38, 8, 9, 11, "#fdf6e3");
      rect(ctx, 49, 8, 9, 11, "#fdf6e3");
      rect(ctx, 47, 8, 2, 11, "#8a5a33");
      for (let y = 11; y < 18; y += 3) {
        rect(ctx, 40, y, 5, 1, "#9aa7c0");
        rect(ctx, 51, y, 5, 1, "#9aa7c0");
      }
      break;
    case "post":
      rect(ctx, 38, 8, 20, 12, "#fdf6e3");
      rect(ctx, 38, 8, 20, 1, "#c9bfa5");
      for (let i = 0; i < 9; i++) {
        rect(ctx, 38 + i, 9 + i, 1, 1, "#c9bfa5");
        rect(ctx, 57 - i, 9 + i, 1, 1, "#c9bfa5");
      }
      rect(ctx, 46, 15, 4, 4, "#c0392b");
      break;
  }
}

export function drawBuilding(style: BuildingStyle): HTMLCanvasElement {
  const [canvas, ctx] = createCanvas(BUILDING_W, BUILDING_H);
  drawWall(ctx, style);
  drawRoof(ctx, style.roof);
  drawDeco(ctx, style);
  drawWindow(ctx, 12, 40, style.trim);
  drawWindow(ctx, 68, 40, style.trim);
  drawDoor(ctx, style.trim);
  drawSign(ctx, style.label);
  return canvas;
}
