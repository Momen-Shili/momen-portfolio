/** Bitmap font (5 rows, mostly 3 wide) for in-world signs and the social image. Uppercase only. */
type Glyph = readonly [string, string, string, string, string];

const GLYPH_ROWS: Record<string, Glyph> = {
  A: ["010", "101", "111", "101", "101"],
  B: ["110", "101", "110", "101", "110"],
  C: ["011", "100", "100", "100", "011"],
  D: ["110", "101", "101", "101", "110"],
  E: ["111", "100", "110", "100", "111"],
  F: ["111", "100", "110", "100", "100"],
  G: ["011", "100", "101", "101", "011"],
  H: ["101", "101", "111", "101", "101"],
  I: ["111", "010", "010", "010", "111"],
  J: ["001", "001", "001", "101", "010"],
  K: ["101", "101", "110", "101", "101"],
  L: ["100", "100", "100", "100", "111"],
  M: ["10001", "11011", "10101", "10001", "10001"],
  N: ["1001", "1101", "1011", "1001", "1001"],
  O: ["010", "101", "101", "101", "010"],
  P: ["110", "101", "110", "100", "100"],
  Q: ["010", "101", "101", "110", "011"],
  R: ["110", "101", "110", "101", "101"],
  S: ["011", "100", "010", "001", "110"],
  T: ["111", "010", "010", "010", "010"],
  U: ["101", "101", "101", "101", "111"],
  V: ["101", "101", "101", "101", "010"],
  W: ["10001", "10001", "10101", "11011", "10001"],
  X: ["101", "101", "010", "101", "101"],
  Y: ["101", "101", "010", "010", "010"],
  Z: ["111", "001", "010", "100", "111"],
  "-": ["000", "000", "111", "000", "000"],
  " ": ["000", "000", "000", "000", "000"],
};

export const GLYPH_HEIGHT = 5;
const SPACE: Glyph = ["000", "000", "000", "000", "000"];

function glyphOf(ch: string): Glyph {
  return GLYPH_ROWS[ch] ?? SPACE;
}

/** Width in font pixels: glyph widths plus one blank column between glyphs. */
export function textWidth(text: string, scale = 1): number {
  if (text.length === 0) return 0;
  let units = 0;
  for (const ch of text.toUpperCase()) units += glyphOf(ch)[0].length + 1;
  return (units - 1) * scale;
}

/** Calls `plot` for every lit pixel of `text`, with coordinates relative to the text origin. */
export function forEachTextPixel(
  text: string,
  scale: number,
  plot: (x: number, y: number, size: number) => void,
): void {
  let cursor = 0;
  for (const ch of text.toUpperCase()) {
    const glyph = glyphOf(ch);
    glyph.forEach((row, y) => {
      for (let x = 0; x < row.length; x++) {
        if (row[x] === "1") plot((cursor + x) * scale, y * scale, scale);
      }
    });
    cursor += glyph[0].length + 1;
  }
}
