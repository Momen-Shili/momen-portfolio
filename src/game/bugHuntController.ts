import Phaser from "phaser";
import { BUG_TARGET, BugHunt, type BugArea } from "../systems/quests/minigames/bugHunt";
import type { GameContext } from "./context";

const SQUASH_RADIUS = 9;
const TAP_RADIUS = 14;

/** Scene-side view of the bug hunt: sprites, squash effects and the on-screen counter. */
export class BugHuntController {
  private readonly hunt: BugHunt;
  private readonly sprites = new Map<number, Phaser.GameObjects.Sprite>();
  private finished = false;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly ctx: GameContext,
    area: BugArea,
    isBlocked: (x: number, y: number) => boolean,
    private readonly reduced: boolean,
  ) {
    this.hunt = new BugHunt({ rng: Math.random, area, isBlocked, gentle: reduced });
    for (const bug of this.hunt.bugs) {
      const sprite = scene.add.sprite(bug.x, bug.y, "bug", 0).setOrigin(0.5, 1);
      if (!reduced) sprite.play("loop-bug");
      // A generous hit area keeps taps forgiving on touch screens.
      sprite.setInteractive(new Phaser.Geom.Circle(6, 6, TAP_RADIUS), Phaser.Geom.Circle.Contains);
      sprite.on("pointerdown", () => this.squash(bug.id));
      this.sprites.set(bug.id, sprite);
    }
    this.ctx.audio.setScene("minigame");
    this.ctx.hud.showToast(`Squash ${BUG_TARGET} bugs! Walk into them or tap them.`);
    this.refreshHud();
  }

  get active(): boolean {
    return !this.finished;
  }

  update(deltaMs: number, playerX: number, playerY: number): void {
    if (this.finished) return;
    this.hunt.update(deltaMs);
    for (const bug of this.hunt.bugs) {
      const sprite = this.sprites.get(bug.id);
      if (!sprite) continue;
      sprite.setPosition(bug.x, bug.y).setDepth(bug.y);
      sprite.setFlipX(bug.vx < 0);
    }
    const touching = this.hunt.bugNear(playerX, playerY, SQUASH_RADIUS);
    if (touching !== null) this.squash(touching);
    if (this.finished) return;
    this.refreshHud();
    this.checkEnd();
  }

  /** `restoreMusic` is false when the whole scene is shutting down (the next scene sets its own). */
  destroy(restoreMusic = true): void {
    this.finished = true;
    if (restoreMusic) this.ctx.audio.setScene("town");
    this.ctx.minigameHud.hide();
    for (const sprite of this.sprites.values()) sprite.destroy();
    this.sprites.clear();
  }

  private squash(id: number): void {
    const bug = this.hunt.bugs.find((b) => b.id === id);
    if (!bug || !this.hunt.squash(id)) return;
    const sprite = this.sprites.get(id);
    this.sprites.delete(id);
    sprite?.destroy();
    const splat = this.scene.add
      .image(bug.x, bug.y, "splat")
      .setOrigin(0.5, 1)
      .setDepth(bug.y - 1);
    if (this.reduced) this.scene.time.delayedCall(700, () => splat.destroy());
    else {
      this.scene.tweens.add({
        targets: splat,
        alpha: 0,
        duration: 900,
        onComplete: () => splat.destroy(),
      });
    }
    this.ctx.audio.play("squash");
    this.refreshHud();
    this.checkEnd();
  }

  private refreshHud(): void {
    if (this.finished) return;
    const seconds = Math.ceil(this.hunt.timeLeft / 1000);
    this.ctx.minigameHud.show(`Bugs ${this.hunt.caught}/${BUG_TARGET}  ·  ${seconds}s`);
  }

  private checkEnd(): void {
    if (this.finished || this.hunt.status === "running") return;
    const won = this.hunt.status === "won";
    this.destroy();
    if (won) {
      this.ctx.hud.showToast("All bugs squashed! Nicely done.");
      this.ctx.quests.emit({ type: "minigame_won", game: "bug-hunt" });
    } else {
      this.ctx.hud.showToast("Time's up! Talk to the guide to try again.");
    }
  }
}
