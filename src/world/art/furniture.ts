import { createCanvas, disc, dot, drawText, outline, rect, shade } from "./pixel";

const DARK = "#2a1c10";

/** Two 16x30 frames laid over a building's door: ajar, then wide open onto a warm interior. */
export function drawDoorOverlay(): HTMLCanvasElement {
  const [canvas, ctx] = createCanvas(32, 30);
  for (let f = 0; f < 2; f++) {
    const ox = f * 16;
    rect(ctx, ox, 0, 16, 30, "#2b1d28");
    rect(ctx, ox + 2, 24, 12, 6, "#c99564");
    rect(ctx, ox + 3, 4, 10, 20, "#4a3040");
    rect(ctx, ox + 5, 8, 6, 14, "#f2c14e");
    const leaf = f === 0 ? 7 : 3;
    rect(ctx, ox, 0, leaf, 30, "#6b3f22");
    rect(ctx, ox + leaf - 1, 0, 1, 30, "#4a2a14");
    rect(ctx, ox + 1, 4, Math.max(1, leaf - 3), 10, "#7d4c2b");
  }
  return canvas;
}

export function drawBed(): HTMLCanvasElement {
  const [canvas, ctx] = createCanvas(36, 30);
  rect(ctx, 2, 4, 32, 24, "#7a4b2a");
  rect(ctx, 3, 8, 30, 18, "#e8dcc0");
  rect(ctx, 3, 14, 30, 12, "#4a6fb0");
  rect(ctx, 3, 14, 30, 2, "#6a8fd0");
  rect(ctx, 5, 9, 12, 7, "#fffdf5");
  rect(ctx, 2, 2, 32, 4, "#5f3a20");
  outline(canvas, DARK);
  return canvas;
}

/** Seven workbenches, one per project, each with a different gadget on top (36x24 frames). */
export function drawBenches(): HTMLCanvasElement {
  const [canvas, ctx] = createCanvas(36 * 7, 26);
  for (let i = 0; i < 7; i++) {
    const ox = i * 36;
    rect(ctx, ox + 2, 10, 32, 6, "#a9743f");
    rect(ctx, ox + 2, 10, 32, 1, "#c99564");
    rect(ctx, ox + 3, 16, 3, 8, "#6f4526");
    rect(ctx, ox + 30, 16, 3, 8, "#6f4526");
    rect(ctx, ox + 5, 18, 26, 2, "#5f3a20");
    const colors = ["#e0405a", "#3d9be9", "#3ecf6e", "#d98c3f", "#8e5bd1", "#2fb5c9", "#e8c34a"];
    const c = colors[i] ?? "#e0405a";
    switch (i % 7) {
      case 0: // monitor
        rect(ctx, ox + 12, 1, 14, 9, "#cfc8b8");
        rect(ctx, ox + 14, 3, 10, 5, "#0c1a10");
        rect(ctx, ox + 15, 4, 6, 1, c);
        break;
      case 1: // gear
        disc(ctx, ox + 18, 6, 4, c);
        disc(ctx, ox + 18, 6, 1, "#33333b");
        break;
      case 2: // flask
        rect(ctx, ox + 14, 2, 3, 5, "#dfe9f0");
        disc(ctx, ox + 15, 8, 3, c);
        rect(ctx, ox + 22, 4, 3, 6, "#dfe9f0");
        rect(ctx, ox + 22, 7, 3, 3, c);
        break;
      case 3: // toolbox
        rect(ctx, ox + 10, 4, 14, 6, c);
        rect(ctx, ox + 15, 2, 4, 2, "#4a4a55");
        break;
      case 4: // circuit board
        rect(ctx, ox + 10, 6, 16, 4, "#2a6a3a");
        for (let k = 0; k < 4; k++) rect(ctx, ox + 12 + k * 4, 5, 2, 2, c);
        break;
      case 5: // lamp
        rect(ctx, ox + 18, 4, 2, 6, "#4a4a55");
        rect(ctx, ox + 14, 2, 10, 3, c);
        break;
      default: // stack of blocks
        rect(ctx, ox + 12, 6, 6, 4, c);
        rect(ctx, ox + 18, 6, 6, 4, shade(c, -0.25));
        rect(ctx, ox + 15, 2, 6, 4, shade(c, 0.2));
    }
  }
  outline(canvas, DARK);
  return canvas;
}

export function drawToolWall(): HTMLCanvasElement {
  const [canvas, ctx] = createCanvas(52, 32);
  rect(ctx, 1, 1, 50, 30, "#8f6a3a");
  rect(ctx, 3, 3, 46, 26, "#b58a50");
  for (let y = 6; y < 28; y += 5) for (let x = 6; x < 48; x += 5) dot(ctx, x, y, "#8f6a3a");
  rect(ctx, 8, 6, 3, 14, "#9aa0ac"); // saw handle
  rect(ctx, 6, 6, 7, 3, "#c8ccd6");
  rect(ctx, 20, 8, 2, 14, "#7a4b2a"); // hammer
  rect(ctx, 16, 6, 10, 4, "#6b6f7a");
  rect(ctx, 32, 6, 8, 2, "#c8ccd6"); // wrench
  rect(ctx, 32, 6, 2, 12, "#c8ccd6");
  rect(ctx, 30, 16, 6, 3, "#c8ccd6");
  rect(ctx, 42, 8, 3, 14, "#d98c3f"); // screwdriver
  rect(ctx, 42, 4, 3, 5, "#33333b");
  outline(canvas, DARK);
  return canvas;
}

export function drawBlueprint(): HTMLCanvasElement {
  const [canvas, ctx] = createCanvas(46, 32);
  rect(ctx, 1, 1, 44, 30, "#6b4a2a");
  rect(ctx, 3, 3, 40, 26, "#2a5fa8");
  for (let x = 6; x < 42; x += 6) rect(ctx, x, 3, 1, 26, "#4a7fc8");
  for (let y = 6; y < 28; y += 6) rect(ctx, 3, y, 40, 1, "#4a7fc8");
  rect(ctx, 10, 10, 14, 10, "#cfe3ff");
  rect(ctx, 12, 12, 10, 6, "#2a5fa8");
  rect(ctx, 28, 8, 10, 14, "#cfe3ff");
  rect(ctx, 30, 10, 6, 10, "#2a5fa8");
  outline(canvas, DARK);
  return canvas;
}

export function drawChalkboard(): HTMLCanvasElement {
  const [canvas, ctx] = createCanvas(66, 32);
  rect(ctx, 1, 1, 64, 30, "#8f6a3a");
  rect(ctx, 3, 3, 60, 26, "#24493a");
  drawText(ctx, "STATUS", 8, 6, "#f4f0e0");
  const dots = ["#7fd05f", "#6ab0f0", "#f2c14e", "#b99aff", "#ff8f8f", "#d6d6d6"];
  dots.forEach((c, i) => {
    rect(ctx, 8 + i * 9, 16, 6, 6, c);
    rect(ctx, 8 + i * 9, 24, 6, 1, "#f4f0e0");
  });
  outline(canvas, DARK);
  return canvas;
}

/** Forge with a flickering fire: two 36x36 frames. */
export function drawForge(): HTMLCanvasElement {
  const [canvas, ctx] = createCanvas(72, 36);
  for (let f = 0; f < 2; f++) {
    const ox = f * 36;
    rect(ctx, ox + 2, 8, 32, 26, "#6a6a74");
    rect(ctx, ox + 2, 8, 32, 3, "#8a8a96");
    rect(ctx, ox + 8, 14, 20, 16, "#1b1423");
    const h = f === 0 ? 10 : 13;
    rect(ctx, ox + 10, 30 - h, 16, h, "#e0603a");
    rect(ctx, ox + 13, 30 - h + 3, 10, h - 3, "#f2a73a");
    rect(ctx, ox + 16, 30 - h + 6, 4, h - 6, "#ffe27a");
    rect(ctx, ox + 12, 0, 12, 9, "#55555f");
  }
  outline(canvas, DARK);
  return canvas;
}

/** Three tall bookshelves tinted ruby, sapphire and emerald (34x36 each), one per skill group. */
export function drawShelves(): HTMLCanvasElement {
  const [canvas, ctx] = createCanvas(34 * 3, 38);
  const trims = ["#a8323f", "#2b6fb0", "#2e8b57"];
  const books = [
    ["#e0405a", "#f2c14e", "#fffdf5", "#c0392b"],
    ["#3d9be9", "#8fd0f5", "#fffdf5", "#2f6fb0"],
    ["#3ecf6e", "#b9f0c1", "#fffdf5", "#2e8b57"],
  ];
  for (let s = 0; s < 3; s++) {
    const ox = s * 34;
    rect(ctx, ox + 1, 3, 32, 34, "#6b4423");
    rect(ctx, ox + 3, 5, 28, 30, "#3e2813");
    rect(ctx, ox + 1, 1, 32, 3, trims[s] ?? "#a8323f");
    for (let shelf = 0; shelf < 3; shelf++) {
      const y = 6 + shelf * 10;
      rect(ctx, ox + 3, y + 9, 28, 1, "#8f5f35");
      let x = 4;
      let i = shelf + s;
      while (x < 29) {
        const w = 2 + ((i * 3) % 3);
        const h = 6 + ((i * 5) % 3);
        rect(ctx, ox + x, y + 9 - h, w, h, books[s]?.[i % 4] ?? "#c0392b");
        x += w + 1;
        i++;
      }
    }
  }
  outline(canvas, DARK);
  return canvas;
}

export function drawReadingDesk(): HTMLCanvasElement {
  const [canvas, ctx] = createCanvas(38, 30);
  rect(ctx, 2, 10, 34, 6, "#a9743f");
  rect(ctx, 2, 10, 34, 1, "#c99564");
  rect(ctx, 4, 16, 3, 12, "#6f4526");
  rect(ctx, 31, 16, 3, 12, "#6f4526");
  rect(ctx, 8, 4, 10, 7, "#fffdf5");
  rect(ctx, 18, 4, 10, 7, "#fffdf5");
  rect(ctx, 17, 4, 2, 7, "#8a5a33");
  for (let y = 6; y < 10; y += 2) {
    rect(ctx, 10, y, 6, 1, "#9aa7c0");
    rect(ctx, 20, y, 6, 1, "#9aa7c0");
  }
  rect(ctx, 30, 3, 2, 8, "#4a4a55");
  rect(ctx, 28, 1, 6, 3, "#2b6fb0");
  outline(canvas, DARK);
  return canvas;
}

export function drawGlobe(): HTMLCanvasElement {
  const [canvas, ctx] = createCanvas(22, 30);
  rect(ctx, 9, 20, 4, 8, "#6f4526");
  rect(ctx, 5, 26, 12, 3, "#5f3a20");
  disc(ctx, 11, 11, 9, "#3d8fd1");
  disc(ctx, 8, 9, 3, "#69b84f");
  disc(ctx, 14, 14, 3, "#69b84f");
  rect(ctx, 11, 1, 1, 20, "#c99a2e");
  outline(canvas, DARK);
  return canvas;
}

export function drawLadder(): HTMLCanvasElement {
  const [canvas, ctx] = createCanvas(18, 44);
  rect(ctx, 2, 1, 3, 42, "#a9743f");
  rect(ctx, 13, 1, 3, 42, "#a9743f");
  for (let y = 5; y < 42; y += 7) rect(ctx, 5, y, 8, 2, "#c99564");
  outline(canvas, DARK);
  return canvas;
}

/** Candle with a flickering flame: two 10x14 frames. */
export function drawCandle(): HTMLCanvasElement {
  const [canvas, ctx] = createCanvas(20, 14);
  for (let f = 0; f < 2; f++) {
    const ox = f * 10;
    rect(ctx, ox + 3, 6, 4, 7, "#f4f0e0");
    rect(ctx, ox + 2, 12, 6, 2, "#c99a2e");
    rect(ctx, ox + 4 + f, 2, 2, 4, "#f2a73a");
    dot(ctx, ox + 4 + f, 3, "#ffe27a");
  }
  return canvas;
}

export function drawMailboxWall(): HTMLCanvasElement {
  const [canvas, ctx] = createCanvas(70, 36);
  rect(ctx, 1, 1, 68, 34, "#5a6a7a");
  const colors = ["#c0392b", "#2f6fb0", "#e0a82e", "#2e8b57", "#8e5bd1", "#d98c3f"];
  for (let row = 0; row < 2; row++) {
    for (let col = 0; col < 6; col++) {
      const x = 4 + col * 11;
      const y = 4 + row * 15;
      rect(ctx, x, y, 9, 12, colors[(col + row * 2) % 6] ?? "#c0392b");
      rect(ctx, x + 1, y + 1, 7, 2, shade(colors[(col + row * 2) % 6] ?? "#c0392b", 0.35));
      rect(ctx, x + 2, y + 8, 5, 1, "#1b1b22");
      rect(ctx, x + 7, y - 1, 1, 4, "#f2c14e");
    }
  }
  outline(canvas, DARK);
  return canvas;
}

export function drawStampMachine(): HTMLCanvasElement {
  const [canvas, ctx] = createCanvas(24, 30);
  rect(ctx, 2, 14, 20, 14, "#6a6a74");
  rect(ctx, 2, 14, 20, 2, "#8a8a96");
  rect(ctx, 9, 3, 6, 12, "#c0392b");
  rect(ctx, 7, 1, 10, 4, "#8f2d3a");
  rect(ctx, 5, 22, 14, 4, "#fdf6e3");
  rect(ctx, 14, 22, 3, 4, "#c0392b");
  outline(canvas, DARK);
  return canvas;
}

export function drawCounter(): HTMLCanvasElement {
  const [canvas, ctx] = createCanvas(88, 26);
  rect(ctx, 2, 4, 84, 20, "#8f5f35");
  rect(ctx, 2, 2, 84, 4, "#c99564");
  for (let x = 6; x < 84; x += 14) rect(ctx, x, 9, 10, 12, "#7a4b2a");
  rect(ctx, 4, 3, 80, 1, "#e0b88a");
  outline(canvas, DARK);
  return canvas;
}

/** Conveyor belt: two 72x16 frames with the belt stripes shifted. */
export function drawConveyor(): HTMLCanvasElement {
  const [canvas, ctx] = createCanvas(144, 18);
  for (let f = 0; f < 2; f++) {
    const ox = f * 72;
    rect(ctx, ox + 2, 4, 68, 10, "#3a3a46");
    for (let x = f * 3; x < 66; x += 6) rect(ctx, ox + 3 + x, 6, 2, 6, "#55555f");
    rect(ctx, ox + 2, 2, 68, 3, "#8a8a96");
    rect(ctx, ox + 2, 14, 68, 3, "#6a6a74");
    disc(ctx, ox + 5, 9, 3, "#6a6a74");
    disc(ctx, ox + 67, 9, 3, "#6a6a74");
  }
  outline(canvas, DARK);
  return canvas;
}

export function drawParcel(): HTMLCanvasElement {
  const [canvas, ctx] = createCanvas(14, 12);
  rect(ctx, 1, 2, 12, 9, "#c99564");
  rect(ctx, 1, 2, 12, 2, "#e0b88a");
  rect(ctx, 6, 2, 2, 9, "#b8434f");
  rect(ctx, 1, 6, 12, 1, "#b8434f");
  outline(canvas, DARK);
  return canvas;
}

export function drawWritingDesk(): HTMLCanvasElement {
  const [canvas, ctx] = createCanvas(38, 30);
  rect(ctx, 2, 10, 34, 6, "#a9743f");
  rect(ctx, 2, 10, 34, 1, "#c99564");
  rect(ctx, 4, 16, 3, 12, "#6f4526");
  rect(ctx, 31, 16, 3, 12, "#6f4526");
  rect(ctx, 8, 4, 14, 8, "#fffdf5");
  rect(ctx, 10, 6, 10, 1, "#9aa7c0");
  rect(ctx, 10, 8, 7, 1, "#9aa7c0");
  rect(ctx, 24, 2, 2, 9, "#2f62a8");
  rect(ctx, 28, 6, 5, 4, "#1b1b22");
  outline(canvas, DARK);
  return canvas;
}

export function drawParcelStack(): HTMLCanvasElement {
  const [canvas, ctx] = createCanvas(24, 20);
  rect(ctx, 2, 10, 12, 9, "#c99564");
  rect(ctx, 8, 2, 12, 9, "#b8885a");
  rect(ctx, 13, 10, 8, 9, "#d6a86e");
  rect(ctx, 7, 10, 2, 9, "#b8434f");
  rect(ctx, 13, 2, 2, 9, "#b8434f");
  outline(canvas, DARK);
  return canvas;
}

/** Wall clock with a ticking second hand: two 18x18 frames. */
export function drawClock(): HTMLCanvasElement {
  const [canvas, ctx] = createCanvas(36, 18);
  for (let f = 0; f < 2; f++) {
    const ox = f * 18;
    disc(ctx, ox + 9, 9, 7, "#6b4423");
    disc(ctx, ox + 9, 9, 6, "#fffdf5");
    rect(ctx, ox + 9, 4, 1, 5, "#1b1b22");
    rect(ctx, ox + 9, 9, 4, 1, "#1b1b22");
    if (f === 0) rect(ctx, ox + 9, 9, 1, 5, "#c0392b");
    else rect(ctx, ox + 9, 9, 5, 1, "#c0392b");
  }
  outline(canvas, DARK);
  return canvas;
}

/** Standing lamp with a gentle flicker: two 12x28 frames. */
export function drawLampFlicker(): HTMLCanvasElement {
  const [canvas, ctx] = createCanvas(24, 28);
  for (let f = 0; f < 2; f++) {
    const ox = f * 12;
    rect(ctx, ox + 5, 9, 2, 17, "#3a3a46");
    rect(ctx, ox + 3, 24, 6, 3, "#2a2a33");
    rect(ctx, ox + 2, 3, 8, 7, f === 0 ? "#f7d774" : "#ffe9a0");
    rect(ctx, ox + 3, 4, 2, 3, "#fff3c0");
    rect(ctx, ox + 1, 2, 10, 2, "#2a2a33");
  }
  outline(canvas, DARK);
  return canvas;
}

export function drawMote(): HTMLCanvasElement {
  const [canvas, ctx] = createCanvas(3, 3);
  rect(ctx, 1, 0, 1, 3, "#fff3c0");
  rect(ctx, 0, 1, 3, 1, "#fff3c0");
  return canvas;
}

export function drawCrate(): HTMLCanvasElement {
  const [canvas, ctx] = createCanvas(18, 18);
  rect(ctx, 1, 1, 16, 16, "#a9743f");
  rect(ctx, 1, 1, 16, 2, "#c99564");
  rect(ctx, 1, 8, 16, 2, "#7a4b2a");
  rect(ctx, 8, 1, 2, 16, "#7a4b2a");
  outline(canvas, DARK);
  return canvas;
}
