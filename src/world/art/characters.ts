import { createCanvas, outline, rect, dot, type Ctx } from "./pixel";

export interface Palette {
  skin: string;
  hair: string;
  shirt: string;
  pants: string;
  shoes: string;
  longHair?: boolean;
  apron?: string;
  /** Wider, curly hair outline. */
  curly?: boolean;
  glasses?: string;
  /** White shirt collar and a tie, drawn on the front view. */
  tie?: { collar: string; color: string };
}

/** Matches the character sheet in art-source/: curly brown hair, glasses, navy suit, blue tie. */
export const PLAYER_PALETTE: Palette = {
  skin: "#eea965",
  hair: "#6b4226",
  shirt: "#2e3b50",
  pants: "#2e3b50",
  shoes: "#583417",
  curly: true,
  glasses: "#1f3a63",
  tie: { collar: "#f5f0e4", color: "#2f62a8" },
};

export const GUIDE_PALETTE: Palette = {
  skin: "#e9b88a",
  hair: "#d8d8d8",
  shirt: "#2e9e6b",
  pants: "#5b4636",
  shoes: "#3a2a1e",
};

export const SMITH_PALETTE: Palette = {
  skin: "#c98f63",
  hair: "#8a4b2a",
  shirt: "#b8483a",
  pants: "#3d3d46",
  shoes: "#222",
  apron: "#6e6e78",
};

export const CLERK_PALETTE: Palette = {
  skin: "#e9b88a",
  hair: "#a8782e",
  shirt: "#2e8b57",
  pants: "#3d3d46",
  shoes: "#222",
};

export const READER_PALETTE: Palette = {
  skin: "#f0c8a0",
  hair: "#1f1a24",
  shirt: "#8e5bd1",
  pants: "#2c2c3a",
  shoes: "#201a28",
  longHair: true,
};

/** Sheet layout: 3 columns (idle, walk A, walk B) x 3 rows (down, up, left). Right = flipped left. */
export const CHARACTER_FRAME = 16;

type Dir = "down" | "up" | "left";

function legs(ctx: Ctx, ox: number, oy: number, p: Palette, frame: number, side: boolean): void {
  const leftLift = frame === 1 ? 1 : 0;
  const rightLift = frame === 2 ? 1 : 0;
  if (side) {
    const lead = frame === 1 ? -1 : frame === 2 ? 1 : 0;
    rect(ctx, ox + 6 + lead, oy + 11, 3, 3, p.pants);
    rect(ctx, ox + 7 - lead, oy + 11, 3, 3, p.pants);
    rect(ctx, ox + 6 + lead, oy + 14, 3, 1, p.shoes);
    rect(ctx, ox + 7 - lead, oy + 14, 3, 1, p.shoes);
    return;
  }
  rect(ctx, ox + 5, oy + 11, 3, 3 - leftLift, p.pants);
  rect(ctx, ox + 8, oy + 11, 3, 3 - rightLift, p.pants);
  rect(ctx, ox + 5, oy + 14 - leftLift, 3, 1, p.shoes);
  rect(ctx, ox + 8, oy + 14 - rightLift, 3, 1, p.shoes);
}

function drawFrame(ctx: Ctx, ox: number, oy: number, dir: Dir, frame: number, p: Palette): void {
  if (dir === "down") {
    legs(ctx, ox, oy, p, frame, false);
    rect(ctx, ox + 4, oy + 7, 8, 4, p.shirt);
    if (p.apron) rect(ctx, ox + 5, oy + 8, 6, 3, p.apron);
    rect(ctx, ox + 3, oy + 7, 1, 2, p.shirt);
    rect(ctx, ox + 12, oy + 7, 1, 2, p.shirt);
    rect(ctx, ox + 3, oy + 9, 1, 2, p.skin);
    rect(ctx, ox + 12, oy + 9, 1, 2, p.skin);
    rect(ctx, ox + 5, oy + 2, 6, 5, p.skin);
    rect(ctx, ox + 5, oy + 1, 6, 2, p.hair);
    rect(ctx, ox + 4, oy + 2, 1, p.longHair ? 6 : 2, p.hair);
    rect(ctx, ox + 11, oy + 2, 1, p.longHair ? 6 : 2, p.hair);
    if (p.curly) {
      rect(ctx, ox + 4, oy + 1, 8, 1, p.hair);
      rect(ctx, ox + 3, oy + 2, 1, 3, p.hair);
      rect(ctx, ox + 12, oy + 2, 1, 3, p.hair);
      dot(ctx, ox + 6, oy + 3, p.hair);
      dot(ctx, ox + 9, oy + 3, p.hair);
    }
    if (p.glasses) rect(ctx, ox + 5, oy + 4, 6, 1, p.glasses);
    dot(ctx, ox + 6, oy + 4, "#222");
    dot(ctx, ox + 9, oy + 4, "#222");
    if (p.tie) {
      rect(ctx, ox + 7, oy + 7, 2, 4, p.tie.collar);
      rect(ctx, ox + 7, oy + 8, 2, 3, p.tie.color);
    }
  } else if (dir === "up") {
    legs(ctx, ox, oy, p, frame, false);
    rect(ctx, ox + 4, oy + 7, 8, 4, p.shirt);
    rect(ctx, ox + 3, oy + 7, 1, 2, p.shirt);
    rect(ctx, ox + 12, oy + 7, 1, 2, p.shirt);
    rect(ctx, ox + 3, oy + 9, 1, 2, p.skin);
    rect(ctx, ox + 12, oy + 9, 1, 2, p.skin);
    rect(ctx, ox + 5, oy + 2, 6, 5, p.hair);
    rect(ctx, ox + 5, oy + 1, 6, 1, p.hair);
    rect(ctx, ox + 4, oy + 2, 1, p.longHair ? 6 : 3, p.hair);
    rect(ctx, ox + 11, oy + 2, 1, p.longHair ? 6 : 3, p.hair);
    if (p.curly) {
      rect(ctx, ox + 4, oy + 1, 8, 1, p.hair);
      rect(ctx, ox + 3, oy + 2, 1, 4, p.hair);
      rect(ctx, ox + 12, oy + 2, 1, 4, p.hair);
    }
    if (p.longHair) rect(ctx, ox + 5, oy + 7, 6, 2, p.hair);
  } else {
    legs(ctx, ox, oy, p, frame, true);
    rect(ctx, ox + 5, oy + 7, 6, 4, p.shirt);
    if (p.apron) rect(ctx, ox + 5, oy + 8, 3, 3, p.apron);
    rect(ctx, ox + 7, oy + 8, 2, 3, p.shirt);
    rect(ctx, ox + 7, oy + 10, 2, 1, p.skin);
    rect(ctx, ox + 5, oy + 2, 5, 5, p.skin);
    rect(ctx, ox + 5, oy + 1, 6, 2, p.hair);
    rect(ctx, ox + 8, oy + 2, 3, p.longHair ? 6 : 4, p.hair);
    if (p.curly) {
      rect(ctx, ox + 5, oy + 1, 7, 1, p.hair);
      rect(ctx, ox + 11, oy + 2, 1, 4, p.hair);
      rect(ctx, ox + 4, oy + 2, 1, 2, p.hair);
    }
    if (p.glasses) rect(ctx, ox + 5, oy + 4, 3, 1, p.glasses);
    dot(ctx, ox + 6, oy + 4, "#222");
  }
}

export function drawCharacterSheet(palette: Palette): HTMLCanvasElement {
  const size = CHARACTER_FRAME;
  const [canvas, ctx] = createCanvas(size * 3, size * 3);
  const dirs: Dir[] = ["down", "up", "left"];
  dirs.forEach((dir, row) => {
    for (let frame = 0; frame < 3; frame++) {
      drawFrame(ctx, frame * size, row * size, dir, frame, palette);
    }
  });
  outline(canvas, "#1c1626");
  return canvas;
}

export const FRAME_DOWN = 0;
export const FRAME_UP = 3;
export const FRAME_LEFT = 6;
