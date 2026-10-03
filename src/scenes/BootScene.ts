import Phaser from "phaser";
import { ASSETS, type AssetSpec } from "../config/assets";
import type { GameContext } from "../game/context";

const tick = (): Promise<void> => new Promise((resolve) => window.setTimeout(resolve, 0));

/** Loads file-based assets (if any are set in the manifest) and generates the rest. */
export class BootScene extends Phaser.Scene {
  constructor(private readonly ctx: GameContext) {
    super("Boot");
  }

  preload(): void {
    for (const spec of ASSETS) {
      if (!spec.file) continue;
      if (spec.frame) {
        this.load.spritesheet(spec.key, spec.file, {
          frameWidth: spec.frame.width,
          frameHeight: spec.frame.height,
        });
      } else {
        this.load.image(spec.key, spec.file);
      }
    }
    this.load.on("progress", (p: number) => this.ctx.setLoadingProgress(p * 0.4));
  }

  create(): void {
    void this.generate();
  }

  private async generate(): Promise<void> {
    const pending = ASSETS.filter((s) => !s.file);
    for (const [i, spec] of pending.entries()) {
      this.registerGenerated(spec);
      this.ctx.setLoadingProgress(0.4 + (0.6 * (i + 1)) / pending.length);
      await tick();
    }
    this.createAnimations();
    this.scene.start("World", { attract: true });
  }

  private registerGenerated(spec: AssetSpec): void {
    const canvas = spec.draw();
    const texture = this.textures.addCanvas(spec.key, canvas);
    if (!texture || !spec.frame) return;
    const cols = Math.floor(canvas.width / spec.frame.width);
    const rows = Math.floor(canvas.height / spec.frame.height);
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        texture.add(
          row * cols + col,
          0,
          col * spec.frame.width,
          row * spec.frame.height,
          spec.frame.width,
          spec.frame.height,
        );
      }
    }
  }

  private createAnimations(): void {
    const rows: Array<[string, number]> = [
      ["down", 0],
      ["up", 3],
      ["left", 6],
    ];
    for (const [dir, base] of rows) {
      this.anims.create({
        key: `walk-${dir}`,
        frames: this.anims.generateFrameNumbers("player", {
          frames: [base + 1, base, base + 2, base],
        }),
        frameRate: 8,
        repeat: -1,
      });
    }
    const loops: Array<[string, string, number[], number]> = [
      ["fountain", "fountain", [0, 1], 2],
      ["flag", "flag", [0, 1], 2.4],
      ["computer", "computer", [0, 1], 1.6],
      ["bug", "bug", [0, 1], 8],
      ["bird", "bird", [0, 1], 6],
      ["butterfly", "butterfly", [0, 1], 7],
      ["forge", "forge", [0, 1], 3],
      ["candle", "candle", [0, 1], 5],
      ["conveyor", "conveyor", [0, 1], 6],
      ["clock", "clock", [0, 1], 1],
      ["lamp-flicker", "lamp-flicker", [0, 1], 2.5],
    ];
    for (const [key, texture, frames, rate] of loops) {
      this.anims.create({
        key: `loop-${key}`,
        frames: this.anims.generateFrameNumbers(texture, { frames }),
        frameRate: rate,
        repeat: -1,
      });
    }
  }
}
