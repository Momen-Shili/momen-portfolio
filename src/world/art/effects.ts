import { createCanvas, disc, dot, outline, rect } from "./pixel";

/** Three cloud shapes in one sheet: 64x30 frames. */
export function drawClouds(): HTMLCanvasElement {
  const [canvas, ctx] = createCanvas(64 * 3, 30);
  const shapes: Array<Array<[number, number, number]>> = [
    [
      [18, 18, 9],
      [32, 14, 12],
      [46, 18, 9],
    ],
    [
      [14, 18, 7],
      [26, 15, 10],
      [38, 17, 8],
      [50, 19, 6],
    ],
    [
      [20, 16, 10],
      [36, 14, 11],
      [48, 18, 7],
    ],
  ];
  shapes.forEach((discs, i) => {
    const ox = i * 64;
    for (const [x, y, r] of discs) disc(ctx, ox + x, y, r, "#ffffff");
    // Soft, slightly flattened underside instead of a hard box.
    for (const [x, y, r] of discs) disc(ctx, ox + x, y + 3, Math.max(3, r - 2), "#e6eef8");
    for (const [x, y, r] of discs.slice(0, 2))
      disc(ctx, ox + x - 2, y - 3, Math.max(2, r - 5), "#ffffff");
  });
  return canvas;
}

export function drawCloudShadow(): HTMLCanvasElement {
  const [canvas, ctx] = createCanvas(60, 22);
  ctx.fillStyle = "#000000";
  ctx.beginPath();
  ctx.ellipse(30, 11, 28, 9, 0, 0, Math.PI * 2);
  ctx.fill();
  return canvas;
}

/** Bird with flapping wings: two 14x8 frames. */
export function drawBird(): HTMLCanvasElement {
  const [canvas, ctx] = createCanvas(28, 8);
  rect(ctx, 5, 3, 4, 3, "#33333b");
  dot(ctx, 9, 3, "#33333b");
  dot(ctx, 10, 3, "#f2a73a");
  rect(ctx, 1, 1, 4, 2, "#33333b");
  rect(ctx, 14 + 5, 3, 4, 3, "#33333b");
  dot(ctx, 14 + 9, 3, "#33333b");
  dot(ctx, 14 + 10, 3, "#f2a73a");
  rect(ctx, 14 + 1, 5, 4, 2, "#33333b");
  return canvas;
}

/** Butterfly: two 8x8 frames, wings open and closed. */
export function drawButterfly(): HTMLCanvasElement {
  const [canvas, ctx] = createCanvas(16, 8);
  rect(ctx, 3, 2, 2, 4, "#2a1c10");
  rect(ctx, 0, 1, 3, 3, "#ff8fb1");
  rect(ctx, 5, 1, 3, 3, "#ff8fb1");
  rect(ctx, 0, 4, 3, 2, "#ffd34e");
  rect(ctx, 5, 4, 3, 2, "#ffd34e");
  rect(ctx, 8 + 3, 2, 2, 4, "#2a1c10");
  rect(ctx, 8 + 2, 2, 1, 3, "#ff8fb1");
  rect(ctx, 8 + 5, 2, 1, 3, "#ff8fb1");
  return canvas;
}

export function drawLeaf(): HTMLCanvasElement {
  const [canvas, ctx] = createCanvas(6, 6);
  rect(ctx, 1, 2, 4, 2, "#d98c3f");
  rect(ctx, 2, 1, 2, 4, "#e8a24f");
  dot(ctx, 4, 4, "#8a4b2a");
  return canvas;
}

export function drawDroplet(): HTMLCanvasElement {
  const [canvas, ctx] = createCanvas(3, 4);
  rect(ctx, 1, 0, 1, 4, "#bfe6ff");
  rect(ctx, 0, 1, 3, 2, "#8fd0f5");
  return canvas;
}

export function drawRipple(): HTMLCanvasElement {
  const [canvas, ctx] = createCanvas(24, 12);
  ctx.strokeStyle = "#dff2ff";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.ellipse(12, 6, 10, 4, 0, 0, Math.PI * 2);
  ctx.stroke();
  return canvas;
}

export function drawPuff(): HTMLCanvasElement {
  const [canvas, ctx] = createCanvas(12, 12);
  disc(ctx, 6, 6, 4, "#e4e4ee");
  disc(ctx, 5, 5, 2, "#ffffff");
  return canvas;
}

export function drawDust(): HTMLCanvasElement {
  const [canvas, ctx] = createCanvas(10, 6);
  disc(ctx, 3, 3, 2, "#e8dcc0");
  disc(ctx, 7, 3, 2, "#d8caa8");
  return canvas;
}

/** Warm light behind a window, shown in the evening. */
export function drawGlow(): HTMLCanvasElement {
  const [canvas, ctx] = createCanvas(18, 16);
  rect(ctx, 1, 1, 16, 14, "#ffd37a");
  rect(ctx, 4, 4, 10, 8, "#fff0b8");
  return canvas;
}

export function drawTuft(): HTMLCanvasElement {
  const [canvas, ctx] = createCanvas(9, 9);
  rect(ctx, 4, 2, 1, 7, "#4f9d3b");
  rect(ctx, 2, 4, 1, 5, "#5fae4a");
  rect(ctx, 6, 3, 1, 6, "#5fae4a");
  rect(ctx, 1, 6, 1, 3, "#4f9d3b");
  rect(ctx, 7, 5, 1, 4, "#4f9d3b");
  return canvas;
}

export function drawArrow(): HTMLCanvasElement {
  const [canvas, ctx] = createCanvas(10, 8);
  rect(ctx, 1, 0, 8, 2, "#ffd34e");
  rect(ctx, 2, 2, 6, 2, "#ffd34e");
  rect(ctx, 3, 4, 4, 2, "#ffd34e");
  rect(ctx, 4, 6, 2, 1, "#ffd34e");
  outline(canvas, "#3e2813");
  return canvas;
}

export function drawExclaim(): HTMLCanvasElement {
  const [canvas, ctx] = createCanvas(12, 14);
  rect(ctx, 1, 1, 10, 9, "#fffdf5");
  rect(ctx, 5, 10, 2, 2, "#fffdf5");
  rect(ctx, 5, 2, 2, 5, "#c0392b");
  rect(ctx, 5, 8, 2, 1, "#c0392b");
  outline(canvas, "#3e2813");
  return canvas;
}

export function drawSolid(): HTMLCanvasElement {
  const [canvas, ctx] = createCanvas(4, 4);
  rect(ctx, 0, 0, 4, 4, "#ffffff");
  return canvas;
}
