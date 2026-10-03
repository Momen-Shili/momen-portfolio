import type Phaser from "phaser";

interface Mote {
  sprite: Phaser.GameObjects.Image;
  vx: number;
  vy: number;
  phase: number;
}

/**
 * Slowly drifting dust motes for building interiors. All sprites are created once up front (a
 * fixed pool) and only moved afterwards, so it costs no allocations per frame.
 */
export class DustMotes {
  private readonly motes: Mote[] = [];
  private time = 0;

  constructor(
    scene: Phaser.Scene,
    count: number,
    private readonly bounds: { x0: number; y0: number; x1: number; y1: number },
    seed = 1,
  ) {
    let s = seed;
    const rnd = (): number => {
      s = (s * 1664525 + 1013904223) % 4294967296;
      return s / 4294967296;
    };
    for (let i = 0; i < count; i++) {
      const sprite = scene.add
        .image(
          bounds.x0 + rnd() * (bounds.x1 - bounds.x0),
          bounds.y0 + rnd() * (bounds.y1 - bounds.y0),
          "mote",
        )
        .setDepth(9_000)
        .setAlpha(0.5)
        .setScale(0.7);
      this.motes.push({
        sprite,
        vx: (rnd() - 0.5) * 3,
        vy: -0.5 - rnd() * 1.5,
        phase: rnd() * 6.28,
      });
    }
  }

  get count(): number {
    return this.motes.length;
  }

  update(deltaMs: number): void {
    const dt = deltaMs / 1000;
    this.time += dt;
    const { x0, y0, x1, y1 } = this.bounds;
    for (const m of this.motes) {
      const { sprite } = m;
      sprite.x += (m.vx + Math.sin(this.time + m.phase) * 1.2) * dt;
      sprite.y += m.vy * dt;
      // Wrap around the room instead of leaving it.
      if (sprite.y < y0) sprite.y = y1;
      if (sprite.x < x0) sprite.x = x1;
      if (sprite.x > x1) sprite.x = x0;
      sprite.setAlpha(0.25 + 0.3 * (0.5 + 0.5 * Math.sin(this.time * 1.3 + m.phase)));
    }
  }
}
