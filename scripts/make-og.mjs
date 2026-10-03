// Generates public/og-image.png (1200x630) with no dependencies.
// Run: npm run og   (Node 22.6+ strips the TypeScript types of the imported modules)
import { mkdirSync, writeFileSync } from "node:fs";
import { crc32, deflateSync } from "node:zlib";
import { PROFILE } from "../src/content/portfolio.ts";
import { forEachTextPixel, textWidth } from "../src/world/pixelFont.ts";

const W = 1200;
const H = 630;
const px = new Uint8Array(W * H * 3);

const hex = (c) => [(c >> 16) & 255, (c >> 8) & 255, c & 255];

function rect(x, y, w, h, color) {
  const [r, g, b] = hex(color);
  for (let yy = Math.max(0, y); yy < Math.min(H, y + h); yy++) {
    for (let xx = Math.max(0, x); xx < Math.min(W, x + w); xx++) {
      const i = (yy * W + xx) * 3;
      px[i] = r;
      px[i + 1] = g;
      px[i + 2] = b;
    }
  }
}

function disc(cx, cy, r, color) {
  for (let y = -r; y <= r; y++) {
    for (let x = -r; x <= r; x++) {
      if (x * x + y * y <= r * r) rect(cx + x, cy + y, 1, 1, color);
    }
  }
}

function text(str, x, y, scale, color) {
  forEachTextPixel(str, scale, (tx, ty, size) => rect(x + tx, y + ty, size, size, color));
}

const U = 12; // one "art pixel" = 12 screen pixels, so the scene stays chunky

function art(x, y, w, h, color) {
  rect(x * U, y * U, w * U, h * U, color);
}

// Sky, grass and road.
art(0, 0, 100, 32, 0x8fd0f5);
art(0, 32, 100, 21, 0x69b84f);
art(0, 40, 100, 4, 0xd4c19a);
for (let i = 0; i < 100; i += 4) art(i, 40, 1, 4, 0xa58e65);

// Clouds.
for (const [cx, cy] of [
  [12, 5],
  [70, 8],
  [88, 3],
]) {
  art(cx, cy, 8, 2, 0xffffff);
  art(cx + 2, cy - 1, 4, 1, 0xffffff);
}

function building(bx, roof, wall) {
  art(bx, 30, 18, 10, wall);
  for (let r = 0; r < 6; r++) art(bx - 1 + r, 24 + r, 20 - r * 2, 1, roof);
  art(bx - 1, 30, 20, 1, roof);
  art(bx + 7, 34, 4, 6, 0x6b3f22);
  art(bx + 2, 33, 3, 3, 0x9fd6ff);
  art(bx + 13, 33, 3, 3, 0x9fd6ff);
}
building(2, 0xc0392b, 0xead8b4);
building(80, 0x6b7a8f, 0xb98a5a);

function tree(tx, ty) {
  art(tx + 2, ty + 5, 1, 4, 0x6b4423);
  disc((tx + 2) * U + 6, (ty + 3) * U, 38, 0x2f8f3a);
  disc((tx + 2) * U - 8, (ty + 2) * U - 8, 16, 0x44b04d);
}
for (const tx of [24, 28, 68, 72]) tree(tx, 31);
for (const tx of [2, 40, 56, 94]) tree(tx, 44);

// Title card.
const cardW = 760;
const cardH = 300;
const cx = (W - cardW) / 2;
const cy = 150;
rect(cx + 14, cy + 14, cardW, cardH, 0x1b1423);
rect(cx, cy, cardW, cardH, 0x3e2813);
rect(cx + 8, cy + 8, cardW - 16, cardH - 16, 0xc99a2e);
rect(cx + 14, cy + 14, cardW - 28, cardH - 28, 0xf6ecd4);

const name = PROFILE.name.toUpperCase();
const nameScale = 14;
text(name, Math.round((W - textWidth(name, nameScale)) / 2), cy + 72, nameScale, 0x2b2118);
const title = PROFILE.title.toUpperCase();
const titleScale = 8;
text(title, Math.round((W - textWidth(title, titleScale)) / 2), cy + 190, titleScale, 0x5a4631);

// PNG encode.
const raw = Buffer.alloc((W * 3 + 1) * H);
for (let y = 0; y < H; y++) {
  raw[y * (W * 3 + 1)] = 0;
  Buffer.from(px.buffer, y * W * 3, W * 3).copy(raw, y * (W * 3 + 1) + 1);
}
function chunk(type, data) {
  const body = Buffer.concat([Buffer.from(type), data]);
  const out = Buffer.alloc(8 + data.length + 4);
  out.writeUInt32BE(data.length, 0);
  body.copy(out, 4);
  out.writeUInt32BE(crc32(body) >>> 0, 8 + data.length);
  return out;
}
const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(W, 0);
ihdr.writeUInt32BE(H, 4);
ihdr[8] = 8; // bit depth
ihdr[9] = 2; // RGB
const png = Buffer.concat([
  Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
  chunk("IHDR", ihdr),
  chunk("IDAT", deflateSync(raw, { level: 9 })),
  chunk("IEND", Buffer.alloc(0)),
]);
mkdirSync("public", { recursive: true });
writeFileSync("public/og-image.png", png);
console.warn(`public/og-image.png written (${(png.length / 1024).toFixed(0)} KB)`);
