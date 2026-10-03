// Draws the footer's walking pixel character (public/art/walker.png): 3 frames, 16x16 each,
// scaled 3x with nearest-neighbour. Same look as the in-game player: curly hair, glasses, navy suit.
// Run: npm run walker
import { mkdirSync } from "node:fs";
import sharp from "sharp";

const PALETTE = {
  ".": null,
  o: [28, 22, 38, 255], // outline
  h: [107, 66, 38, 255], // hair
  s: [238, 169, 101, 255], // skin
  g: [31, 58, 99, 255], // glasses
  n: [46, 59, 80, 255], // suit
  w: [245, 240, 228, 255], // collar
  b: [88, 52, 23, 255], // shoes
};

// Side view, facing right. Frame 0 stands, frames 1 and 2 are the walking steps.
const FRAMES = [
  [
    "................",
    "....oooooo......",
    "...ohhhhhho.....",
    "..ohhhhhhhho....",
    "..ohhhsssso.....",
    "..ohhsssggso....",
    "...oossssso.....",
    "....ossssso.....",
    "...onnwnnno.....",
    "..onnnnnnnno....",
    "..onnnnnnnso....",
    "...onnnnnno.....",
    "...onnoonno.....",
    "...onno.onno....",
    "...obbo.obbo....",
    "................",
  ],
  [
    "................",
    "....oooooo......",
    "...ohhhhhho.....",
    "..ohhhhhhhho....",
    "..ohhhsssso.....",
    "..ohhsssggso....",
    "...oossssso.....",
    "....ossssso.....",
    "...onnwnnno.....",
    "..onnnnnnnno....",
    "..snnnnnnnno....",
    "...onnnnnno.....",
    "...onnnonno.....",
    "..onno..onno....",
    "..obbo...obbo...",
    "................",
  ],
  [
    "................",
    "....oooooo......",
    "...ohhhhhho.....",
    "..ohhhhhhhho....",
    "..ohhhsssso.....",
    "..ohhsssggso....",
    "...oossssso.....",
    "....ossssso.....",
    "...onnwnnno.....",
    "..onnnnnnnno....",
    "..onnnnnnnns....",
    "...onnnnnno.....",
    "...onnnonno.....",
    "....onno.onno...",
    "....obbo..obbo..",
    "................",
  ],
];

const SIZE = 16;
const SCALE = 3;
const sheet = Buffer.alloc(SIZE * FRAMES.length * SIZE * 4);
FRAMES.forEach((rows, f) => {
  if (rows.length !== SIZE) throw new Error(`frame ${f} must have ${SIZE} rows`);
  rows.forEach((row, y) => {
    if (row.length !== SIZE) throw new Error(`frame ${f} row ${y} must be ${SIZE} wide`);
    [...row].forEach((ch, x) => {
      const colour = PALETTE[ch];
      if (colour === undefined) throw new Error(`unknown palette key "${ch}"`);
      if (!colour) return;
      const i = (y * SIZE * FRAMES.length + f * SIZE + x) * 4;
      sheet.set(colour, i);
    });
  });
});

mkdirSync("public/art", { recursive: true });
await sharp(sheet, { raw: { width: SIZE * FRAMES.length, height: SIZE, channels: 4 } })
  .resize(SIZE * FRAMES.length * SCALE, SIZE * SCALE, { kernel: "nearest" })
  .png({ compressionLevel: 9 })
  .toFile("public/art/walker.png");
console.warn("public/art/walker.png written");
