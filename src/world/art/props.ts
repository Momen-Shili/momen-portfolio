import { PROFILE } from "../../content/portfolio";
import { textWidth } from "../pixelFont";
import { createCanvas, disc, dot, drawText, outline, rect, shade } from "./pixel";

const OUTLINE = "#1d2a1f";

export function drawTree(): HTMLCanvasElement {
  const [canvas, ctx] = createCanvas(26, 34);
  rect(ctx, 11, 24, 4, 9, "#6b4423");
  rect(ctx, 14, 24, 1, 9, "#4f3118");
  rect(ctx, 8, 31, 10, 2, "rgba(0,0,0,0.22)");
  disc(ctx, 13, 18, 6, "#1f6a2b");
  disc(ctx, 13, 13, 9, "#2f8f3a");
  disc(ctx, 8, 17, 6, "#2f8f3a");
  disc(ctx, 18, 17, 6, "#2a8535");
  disc(ctx, 10, 10, 4, "#44b04d");
  disc(ctx, 16, 9, 3, "#44b04d");
  dot(ctx, 8, 14, "#6bd06f");
  dot(ctx, 15, 7, "#6bd06f");
  outline(canvas, OUTLINE);
  return canvas;
}

/** Three 12x12 frames: ruby (Advanced), sapphire (Proficient), emerald (Growing). */
export function drawGems(): HTMLCanvasElement {
  const [canvas, ctx] = createCanvas(36, 12);
  const colors = ["#e0405a", "#3d9be9", "#3ecf6e"];
  const rows: ReadonlyArray<[number, number]> = [
    [4, 7],
    [3, 8],
    [2, 9],
    [1, 10],
    [1, 10],
    [2, 9],
    [3, 8],
    [4, 7],
    [5, 6],
  ];
  colors.forEach((color, f) => {
    const ox = f * 12;
    rows.forEach(([x0, x1], i) => {
      const y = i + 1;
      const tone = i < 3 ? shade(color, 0.3) : i < 5 ? color : shade(color, -0.3);
      rect(ctx, ox + x0, y, x1 - x0 + 1, 1, tone);
    });
    rect(ctx, ox + 5, 4, 2, 1, shade(color, 0.55));
    dot(ctx, ox + 4, 3, "#ffffff");
  });
  outline(canvas, "#2a1c10");
  return canvas;
}

export function drawBush(): HTMLCanvasElement {
  const [canvas, ctx] = createCanvas(18, 14);
  disc(ctx, 9, 7, 5, "#2a8535");
  disc(ctx, 5, 8, 4, "#2f8f3a");
  disc(ctx, 13, 8, 4, "#2f8f3a");
  disc(ctx, 7, 6, 2, "#44b04d");
  dot(ctx, 12, 5, "#ff8fb1");
  dot(ctx, 5, 9, "#ff8fb1");
  outline(canvas, OUTLINE);
  return canvas;
}

/** Two frames, 32x32 each: stone basin with water and a spout. */
export function drawFountain(): HTMLCanvasElement {
  const [canvas, ctx] = createCanvas(64, 32);
  for (let f = 0; f < 2; f++) {
    const ox = f * 32;
    rect(ctx, ox + 2, 12, 28, 18, "#8d8d98");
    rect(ctx, ox + 3, 11, 26, 2, "#bdbdc8");
    rect(ctx, ox + 4, 14, 24, 13, "#3d8fd1");
    rect(ctx, ox + 4, 14, 24, 2, "#2f78b3");
    const ripples = f === 0 ? [7, 19] : [10, 22];
    for (const x of ripples) {
      rect(ctx, ox + x, 20, 5, 1, "#8fd0f5");
      rect(ctx, ox + x + 3, 24, 4, 1, "#8fd0f5");
    }
    rect(ctx, ox + 2, 27, 28, 3, "#6f6f7a");
    rect(ctx, ox + 14, 6, 4, 16, "#a6a6b2");
    rect(ctx, ox + 12, 4, 8, 3, "#bdbdc8");
    const jet = f === 0 ? 2 : 4;
    rect(ctx, ox + 15, 4 - jet, 2, jet, "#bfe6ff");
    dot(ctx, ox + 13, 4 - jet + 1, "#bfe6ff");
    dot(ctx, ox + 18, 4 - jet + 2, "#bfe6ff");
  }
  outline(canvas, "#2a2a33");
  return canvas;
}

export function drawLamp(): HTMLCanvasElement {
  const [canvas, ctx] = createCanvas(10, 26);
  rect(ctx, 4, 8, 2, 16, "#3a3a46");
  rect(ctx, 3, 22, 4, 3, "#2a2a33");
  rect(ctx, 2, 2, 6, 7, "#f7d774");
  rect(ctx, 3, 3, 2, 3, "#fff3c0");
  rect(ctx, 1, 1, 8, 2, "#2a2a33");
  outline(canvas, "#1b1b22");
  return canvas;
}

export function drawBench(): HTMLCanvasElement {
  const [canvas, ctx] = createCanvas(26, 16);
  rect(ctx, 2, 3, 22, 3, "#a9743f");
  rect(ctx, 2, 3, 22, 1, "#c99564");
  rect(ctx, 2, 7, 22, 3, "#8f5f35");
  rect(ctx, 3, 10, 2, 4, "#3a3a46");
  rect(ctx, 21, 10, 2, 4, "#3a3a46");
  outline(canvas, "#2a1c10");
  return canvas;
}

export function drawBoard(): HTMLCanvasElement {
  const [canvas, ctx] = createCanvas(34, 28);
  rect(ctx, 4, 12, 3, 14, "#5b3a1e");
  rect(ctx, 27, 12, 3, 14, "#5b3a1e");
  rect(ctx, 2, 2, 30, 18, "#8f5f35");
  rect(ctx, 3, 3, 28, 16, "#c99564");
  const notes: Array<[number, number, number, number, string]> = [
    [5, 5, 8, 7, "#fdf6e3"],
    [15, 6, 7, 6, "#ffe08a"],
    [24, 5, 6, 8, "#cfe8ff"],
    [7, 13, 9, 4, "#fdf6e3"],
    [19, 14, 8, 4, "#ffd1dc"],
  ];
  for (const [x, y, w, h, c] of notes) {
    rect(ctx, x, y, w, h, c);
    dot(ctx, x + Math.floor(w / 2), y, "#c0392b");
  }
  outline(canvas, "#2a1c10");
  return canvas;
}

/** Two frames, 10x16 each. */
export function drawFlag(): HTMLCanvasElement {
  const [canvas, ctx] = createCanvas(24, 16);
  for (let f = 0; f < 2; f++) {
    const ox = f * 12;
    rect(ctx, ox + 1, 0, 1, 16, "#3a3a46");
    const wave = f === 0 ? 0 : 1;
    rect(ctx, ox + 2, 1, 8, 2, "#d94f3a");
    rect(ctx, ox + 2, 3 + wave, 8, 2, "#d94f3a");
    rect(ctx, ox + 2, 5, 7, 1, "#b13a29");
    dot(ctx, ox + 9, 2 + wave, "#d94f3a");
  }
  return canvas;
}

export function drawBarrel(): HTMLCanvasElement {
  const [canvas, ctx] = createCanvas(16, 18);
  rect(ctx, 3, 2, 10, 14, "#9a6a3e");
  rect(ctx, 2, 4, 12, 10, "#a9743f");
  rect(ctx, 2, 5, 12, 1, "#3a3a46");
  rect(ctx, 2, 11, 12, 1, "#3a3a46");
  rect(ctx, 4, 3, 8, 1, "#c99564");
  outline(canvas, "#2a1c10");
  return canvas;
}

export function drawMailbox(): HTMLCanvasElement {
  const [canvas, ctx] = createCanvas(14, 22);
  rect(ctx, 6, 12, 2, 9, "#4a4a55");
  rect(ctx, 2, 3, 10, 9, "#c0392b");
  rect(ctx, 2, 3, 10, 2, "#e0584a");
  rect(ctx, 4, 8, 6, 1, "#7a1f16");
  rect(ctx, 10, 1, 1, 5, "#f2c14e");
  outline(canvas, "#2a1c10");
  return canvas;
}

export function drawAnvil(): HTMLCanvasElement {
  const [canvas, ctx] = createCanvas(20, 14);
  rect(ctx, 2, 2, 16, 4, "#5a5a66");
  rect(ctx, 2, 2, 16, 1, "#8a8a96");
  rect(ctx, 14, 3, 4, 2, "#5a5a66");
  rect(ctx, 6, 6, 8, 3, "#44444e");
  rect(ctx, 4, 9, 12, 3, "#33333b");
  outline(canvas, "#15151a");
  return canvas;
}

// ---- interior ----

export function drawBookshelf(): HTMLCanvasElement {
  const [canvas, ctx] = createCanvas(34, 34);
  rect(ctx, 1, 1, 32, 32, "#6b4423");
  rect(ctx, 3, 3, 28, 28, "#3e2813");
  const colors = ["#c0392b", "#2f6fb0", "#e0a82e", "#2e8b57", "#8e5bd1", "#d98c3f"];
  for (let shelf = 0; shelf < 3; shelf++) {
    const y = 4 + shelf * 9;
    rect(ctx, 3, y + 8, 28, 1, "#8f5f35");
    let x = 4;
    let i = shelf * 2;
    while (x < 29) {
      const w = 2 + ((i * 3) % 3);
      const h = 5 + ((i * 5) % 3);
      rect(ctx, x, y + 8 - h, w, h, colors[i % colors.length] ?? "#c0392b");
      x += w + 1;
      i++;
    }
  }
  outline(canvas, "#1c1008");
  return canvas;
}

/** Framed initials stand in for a portrait until a real pixel portrait is provided. */
export function drawPortrait(): HTMLCanvasElement {
  const [canvas, ctx] = createCanvas(22, 26);
  rect(ctx, 1, 1, 20, 24, "#c99a2e");
  rect(ctx, 3, 3, 16, 20, "#e4572e");
  rect(ctx, 3, 3, 16, 1, "#f08a63");
  const initials = PROFILE.initials;
  drawText(ctx, initials, Math.round(11 - textWidth(initials) / 2), 11, "#fff8e4");
  outline(canvas, "#3a2a08");
  return canvas;
}

export function drawFrames(): HTMLCanvasElement {
  const [canvas, ctx] = createCanvas(40, 20);
  for (let i = 0; i < 3; i++) {
    const x = 1 + i * 13;
    rect(ctx, x, 2, 12, 15, "#8f6a2a");
    rect(ctx, x + 1, 3, 10, 13, "#fdf6e3");
    rect(ctx, x + 3, 6, 6, 1, "#9aa7c0");
    rect(ctx, x + 3, 9, 6, 1, "#9aa7c0");
    rect(ctx, x + 4, 12, 4, 2, "#c0392b");
  }
  outline(canvas, "#3a2a08");
  return canvas;
}

/** Two frames, 34x30 each: desk with a CRT; frame 1 shows the blinking cursor. */
export function drawComputerDesk(): HTMLCanvasElement {
  const [canvas, ctx] = createCanvas(68, 30);
  for (let f = 0; f < 2; f++) {
    const ox = f * 34;
    rect(ctx, ox + 1, 14, 32, 5, "#a9743f");
    rect(ctx, ox + 1, 14, 32, 1, "#c99564");
    rect(ctx, ox + 3, 19, 3, 9, "#7a4b2a");
    rect(ctx, ox + 28, 19, 3, 9, "#7a4b2a");
    rect(ctx, ox + 8, 1, 18, 13, "#cfc8b8");
    rect(ctx, ox + 10, 3, 14, 9, "#0c1a10");
    rect(ctx, ox + 11, 4, 8, 1, "#47e06a");
    rect(ctx, ox + 11, 6, 11, 1, "#47e06a");
    rect(ctx, ox + 11, 8, 6, 1, "#47e06a");
    if (f === 1) rect(ctx, ox + 18, 8, 2, 1, "#c8ffd4");
    rect(ctx, ox + 14, 12, 6, 2, "#aaa392");
    rect(ctx, ox + 9, 15, 16, 2, "#e4dfd2");
  }
  outline(canvas, "#2a1c10");
  return canvas;
}

export function drawRug(): HTMLCanvasElement {
  const [canvas, ctx] = createCanvas(64, 40);
  rect(ctx, 0, 0, 64, 40, "#8f2d3a");
  rect(ctx, 3, 3, 58, 34, "#b8434f");
  rect(ctx, 6, 6, 52, 28, "#8f2d3a");
  rect(ctx, 9, 9, 46, 22, "#d9a441");
  rect(ctx, 11, 11, 42, 18, "#b8434f");
  for (let x = 0; x < 64; x += 4) {
    rect(ctx, x, -0, 2, 1, "#e8d9a0");
    rect(ctx, x, 39, 2, 1, "#e8d9a0");
  }
  return canvas;
}

export function drawPlant(): HTMLCanvasElement {
  const [canvas, ctx] = createCanvas(16, 24);
  rect(ctx, 4, 15, 8, 8, "#a9553a");
  rect(ctx, 4, 15, 8, 2, "#c9694a");
  disc(ctx, 8, 9, 4, "#2f8f3a");
  disc(ctx, 5, 11, 3, "#44b04d");
  disc(ctx, 11, 11, 3, "#2a8535");
  outline(canvas, "#1d2a1f");
  return canvas;
}

export function drawWindowInterior(): HTMLCanvasElement {
  const [canvas, ctx] = createCanvas(28, 28);
  rect(ctx, 1, 1, 26, 26, "#7a4b2a");
  rect(ctx, 3, 3, 22, 22, "#8fd0f5");
  rect(ctx, 3, 3, 22, 8, "#b7e3fa");
  rect(ctx, 13, 3, 2, 22, "#7a4b2a");
  rect(ctx, 3, 13, 22, 2, "#7a4b2a");
  rect(ctx, 5, 6, 5, 2, "#ffffff");
  rect(ctx, 17, 17, 6, 2, shade("#ffffff", -0.05));
  outline(canvas, "#2a1c10");
  return canvas;
}
