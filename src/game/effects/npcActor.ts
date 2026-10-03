import type Phaser from "phaser";
import type { Facing, NpcDef } from "../../world/mapTypes";

const FRAME_BASE: Record<Facing, number> = { down: 0, up: 3, left: 6, right: 6 };
const NEAR = 56;
const FAR = 84;
const WAVE_MS = 700;
const COOLDOWN_MS = 8000;

/** Which way an NPC at (nx, ny) should face to look at a player at (px, py). */
export function facingToward(nx: number, ny: number, px: number, py: number): Facing {
  const dx = px - nx;
  const dy = py - ny;
  if (Math.abs(dx) > Math.abs(dy)) return dx < 0 ? "left" : "right";
  return dy < 0 ? "up" : "down";
}

/**
 * Brings an NPC to life: a gentle idle bob, turning to look at the player, a wave and an
 * exclamation mark when the player walks up, and (for some NPCs) a small wander. With `calm` set
 * (reduced effects) it only turns to face the player; nothing moves on its own.
 */
export class NpcActor {
  private near = false;
  private waveLeft = 0;
  private cooldown = 0;
  private time: number;
  private readonly bubble: Phaser.GameObjects.Image;
  private bubbleLeft = 0;
  private facing: Facing;

  constructor(
    private readonly sprite: Phaser.GameObjects.Sprite,
    private readonly def: NpcDef,
    scene: Phaser.Scene,
    private readonly options: { wander: boolean; calm: boolean },
  ) {
    this.facing = def.facing;
    this.time = (def.x % 13) * 0.4;
    this.bubble = scene.add
      .image(def.x, def.y - 22, "exclaim")
      .setDepth(20_000)
      .setVisible(false);
  }

  update(deltaMs: number, playerX: number, playerY: number): void {
    const dt = deltaMs / 1000;
    this.time += dt;
    this.cooldown = Math.max(0, this.cooldown - deltaMs);
    const dist = Math.hypot(playerX - this.def.x, playerY - this.def.y);
    const wasNear = this.near;
    if (!this.near && dist < NEAR) this.near = true;
    else if (this.near && dist > FAR) this.near = false;

    // One place decides the facing, so wandering and "face the player" never fight each other.
    let wanted: Facing;
    if (this.near) wanted = facingToward(this.def.x, this.def.y, playerX, playerY);
    else if (this.options.wander && !this.options.calm) {
      wanted = Math.cos(this.time * 0.35) > 0 ? "right" : "left";
    } else wanted = this.def.facing;
    if (wanted !== this.facing) this.setFacing(wanted);

    if (this.options.calm) return;

    if (this.near && !wasNear && this.cooldown === 0) {
      this.waveLeft = WAVE_MS;
      this.bubbleLeft = 1500;
      this.cooldown = COOLDOWN_MS;
      this.bubble.setVisible(true).setScale(0.2);
    }

    // Idle bob, plus a small side-to-side wander while the player is not close.
    const bob = -0.8 * (0.5 + 0.5 * Math.sin(this.time * 2.2));
    const wander = this.options.wander && !this.near ? Math.sin(this.time * 0.35) * 8 : 0;
    this.sprite.setPosition(this.def.x + wander, this.def.y + bob);

    if (this.waveLeft > 0) {
      this.waveLeft = Math.max(0, this.waveLeft - deltaMs);
      this.sprite.setRotation(Math.sin((WAVE_MS - this.waveLeft) / 55) * 0.12);
    } else if (this.sprite.rotation !== 0) {
      this.sprite.setRotation(0);
    }

    if (this.bubbleLeft > 0) {
      this.bubbleLeft = Math.max(0, this.bubbleLeft - deltaMs);
      const t = 1 - this.bubbleLeft / 1500;
      this.bubble
        .setPosition(this.sprite.x, this.def.y - 22 - Math.min(1, t * 6) * 4)
        .setScale(Math.min(1, 0.2 + t * 8))
        .setAlpha(t > 0.8 ? (1 - t) * 5 : 1);
      if (this.bubbleLeft === 0) this.bubble.setVisible(false);
    }
  }

  private setFacing(facing: Facing): void {
    this.facing = facing;
    this.sprite.setFrame(FRAME_BASE[facing]).setFlipX(facing === "right");
  }
}
