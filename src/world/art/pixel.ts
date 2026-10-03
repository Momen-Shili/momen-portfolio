import { forEachTextPixel } from "../pixelFont";

export type Ctx = CanvasRenderingContext2D;

export function createCanvas(w: number, h: number): [HTMLCanvasElement, Ctx] {
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("2D canvas is not available");
  ctx.imageSmoothingEnabled = false;
  return [canvas, ctx];
}

export function rect(ctx: Ctx, x: number, y: number, w: number, h: number, color: string): void {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w, h);
}

export function dot(ctx: Ctx, x: number, y: number, color: string): void {
  rect(ctx, x, y, 1, 1, color);
}

/** Pixel-art filled circle. */
export function disc(ctx: Ctx, cx: number, cy: number, r: number, color: string): void {
  ctx.fillStyle = color;
  for (let y = -r; y <= r; y++) {
    for (let x = -r; x <= r; x++) {
      if (x * x + y * y <= r * r + r * 0.6) ctx.fillRect(cx + x, cy + y, 1, 1);
    }
  }
}

/** Deterministic PRNG so generated art is identical on every load. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Lighten (amount > 0) or darken (amount < 0) a #rrggbb colour. */
export function shade(hex: string, amount: number): string {
  const n = parseInt(hex.slice(1), 16);
  const ch = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => {
    const target = amount >= 0 ? 255 : 0;
    return Math.round(v + (target - v) * Math.abs(amount));
  });
  return `#${ch.map((v) => v.toString(16).padStart(2, "0")).join("")}`;
}

/** Adds a 1px outline around opaque pixels. Leave a 1px transparent margin in the art. */
export function outline(canvas: HTMLCanvasElement, color: string): void {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const { width: w, height: h } = canvas;
  const src = ctx.getImageData(0, 0, w, h);
  const alpha = (x: number, y: number): number =>
    x < 0 || y < 0 || x >= w || y >= h ? 0 : (src.data[(y * w + x) * 4 + 3] ?? 0);
  ctx.fillStyle = color;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (alpha(x, y) > 0) continue;
      if (
        alpha(x - 1, y) > 128 ||
        alpha(x + 1, y) > 128 ||
        alpha(x, y - 1) > 128 ||
        alpha(x, y + 1) > 128
      ) {
        ctx.fillRect(x, y, 1, 1);
      }
    }
  }
}

export function drawText(ctx: Ctx, text: string, x: number, y: number, color: string): void {
  ctx.fillStyle = color;
  forEachTextPixel(text, 1, (px, py) => ctx.fillRect(x + px, y + py, 1, 1));
}
