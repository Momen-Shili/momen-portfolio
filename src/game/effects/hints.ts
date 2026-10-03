import type Phaser from "phaser";
import type { Zone } from "../../systems/interaction";

/** Zone kinds that get a twinkle: things you can look at, use or climb. */
const SPARKLE_ACTIONS = new Set(["item", "panel", "copy", "climb"]);
export const MAX_SPARKLES = 14;

/** Which zones should show a hotspot sparkle (pure, so it can be tested). */
export function sparkleZones(zones: readonly Zone[]): Zone[] {
  return zones
    .filter((z) => SPARKLE_ACTIONS.has(z.action.type) && z.id !== "exit")
    .slice(0, MAX_SPARKLES);
}

/**
 * Interaction feedback in the world: a bouncing arrow over the player whenever something can be
 * used, and a slow twinkle over each hotspot so they are easy to find. Sprites are created once.
 */
export class InteractionHints {
  private readonly arrow: Phaser.GameObjects.Image;
  private sparkles: Array<{ sprite: Phaser.GameObjects.Image; phase: number }> = [];
  private time = 0;

  constructor(
    private readonly scene: Phaser.Scene,
    zones: readonly Zone[],
    private readonly calm: boolean,
  ) {
    this.arrow = scene.add.image(0, 0, "arrow").setDepth(20_000).setVisible(false);
    this.setZones(zones);
  }

  /** Call again whenever the set of zones changes (a collected gem removes its zone). */
  setZones(zones: readonly Zone[]): void {
    for (const s of this.sparkles) s.sprite.destroy();
    this.sparkles = sparkleZones(zones).map((z, i) => ({
      sprite: this.scene.add
        .image(z.x + z.w / 2, z.y - 8, "spark")
        .setDepth(19_000)
        .setScale(0.6)
        .setAlpha(this.calm ? 0.6 : 0.3),
      phase: i * 0.9,
    }));
  }

  get sparkleCount(): number {
    return this.sparkles.length;
  }

  update(deltaMs: number, player: { x: number; y: number }, active: boolean): void {
    this.time += deltaMs / 1000;
    if (!active) {
      this.arrow.setVisible(false);
    } else {
      const bounce = this.calm ? 0 : Math.sin(this.time * 6) * 2;
      this.arrow.setVisible(true).setPosition(player.x, player.y - 28 + bounce);
    }
    if (this.calm) return;
    for (const s of this.sparkles) {
      s.sprite.setAlpha(0.2 + 0.7 * (0.5 + 0.5 * Math.sin(this.time * 2.2 + s.phase)));
    }
  }
}
