import Phaser from "phaser";
import { mulberry32 } from "../../world/art/pixel";
import type { MapDef } from "../../world/mapTypes";
import { T, TILE } from "../../world/tiles";
import { BUILDING_PLACEMENTS } from "../../world/townMap";
import { dayPhaseAt, dayState } from "./dayCycle";
import { POOL_SIZES, effectSpriteCount } from "./effectBudget";
import { Pool } from "./pool";

interface Swayer {
  sprite: Phaser.GameObjects.Sprite;
  amp: number;
  freq: number;
  phase: number;
}

interface Particle {
  sprite: Phaser.GameObjects.Image;
  life: number;
  max: number;
  vx: number;
  vy: number;
}

interface Wanderer {
  sprite: Phaser.GameObjects.Sprite | Phaser.GameObjects.Image;
  hx: number;
  hy: number;
  tx: number;
  ty: number;
  turn: number;
  phase: number;
}

const CHIMNEYS: Record<string, number> = { house: 72, workshop: 76 };
const WINDOWS = [12, 68];

/** World effects for the town. Created once per scene start and updated every frame. */
export class AmbientEffects {
  private time = 0;
  private readonly sway: Swayer[] = [];
  private readonly rnd: () => number;
  private readonly view: Phaser.Geom.Rectangle;

  private readonly clouds: Array<{
    cloud: Phaser.GameObjects.Image;
    shadow: Phaser.GameObjects.Image;
    speed: number;
  }> = [];
  private readonly birds: Pool<Phaser.GameObjects.Sprite>;
  private birdTimer = 6000;
  private readonly butterflies: Wanderer[] = [];
  private readonly fireflies: Wanderer[] = [];
  private readonly leaves: Particle[] = [];
  private readonly droplets: Pool<Particle>;
  private readonly ripples: Pool<Particle>;
  private readonly smoke: Pool<Particle>;
  private readonly dust: Pool<Particle>;
  private readonly glows: Phaser.GameObjects.Image[] = [];
  private fountain: { x: number; y: number } | null = null;
  private pond: { x0: number; y0: number; x1: number; y1: number } | null = null;
  private splashTimer = 0;
  private rippleTimer = 0;
  private smokeTimer = 0;
  private tintTimer = 0;

  constructor(
    scene: Phaser.Scene,
    private readonly map: MapDef,
    private readonly tintEl: HTMLElement,
    private readonly clockMs: () => number,
  ) {
    this.rnd = mulberry32(777);
    this.view = scene.cameras.main.worldView;
    const mapW = map.cols * TILE;
    const mapH = map.rows * TILE;

    // Clouds drift slowly across the whole map; each casts a soft shadow on the ground.
    for (let i = 0; i < POOL_SIZES.clouds; i++) {
      const cloud = scene.add
        .image(this.rnd() * mapW, 40 + this.rnd() * (mapH - 80), "cloud", i % 3)
        .setDepth(15_000)
        .setAlpha(0.7);
      const shadow = scene.add
        .image(cloud.x, cloud.y + 110, "cloudshadow")
        .setDepth(-80)
        .setAlpha(0.1);
      this.clouds.push({ cloud, shadow, speed: 4 + this.rnd() * 5 });
    }

    this.birds = new Pool(POOL_SIZES.birds, () =>
      scene.add.sprite(0, 0, "bird", 0).setDepth(15_100).setVisible(false),
    );

    const grass = this.grassSpots();
    for (let i = 0; i < POOL_SIZES.butterflies; i++) {
      const spot = this.pick(grass);
      this.butterflies.push(
        this.wanderer(scene.add.sprite(spot.x, spot.y, "butterfly", 0).setDepth(spot.y + 20), spot),
      );
    }
    for (let i = 0; i < POOL_SIZES.fireflies; i++) {
      const spot = this.pick(grass);
      const dot = scene.add
        .image(spot.x, spot.y, "mote")
        .setTint(0xd8ff6a)
        .setDepth(14_000)
        .setAlpha(0);
      this.fireflies.push(this.wanderer(dot, spot));
    }
    for (let i = 0; i < POOL_SIZES.leaves; i++) {
      const sprite = scene.add.image(-100, -100, "leaf").setDepth(14_000);
      this.leaves.push({ sprite, life: this.rnd() * 6, max: 0, vx: 0, vy: 0 });
    }

    const particle = (texture: string, depth: number) => (): Particle => ({
      sprite: scene.add.image(0, 0, texture).setDepth(depth).setVisible(false),
      life: 0,
      max: 1,
      vx: 0,
      vy: 0,
    });
    this.droplets = new Pool(POOL_SIZES.droplets, particle("droplet", 5000));
    this.ripples = new Pool(POOL_SIZES.ripples, particle("ripple", -90));
    this.smoke = new Pool(POOL_SIZES.smoke, particle("puff", 13_000));
    this.dust = new Pool(POOL_SIZES.dust, particle("dust", 4000));

    // Grass tufts that sway.
    for (let i = 0; i < POOL_SIZES.tufts; i++) {
      const spot = this.pick(grass);
      const tuft = scene.add.sprite(spot.x, spot.y, "tuft").setOrigin(0.5, 1).setDepth(spot.y);
      this.registerSway(tuft, 0.14, 1.4 + this.rnd());
    }

    // Warm light behind the windows in the evening.
    for (const { bx, by } of BUILDING_PLACEMENTS) {
      for (const wx of WINDOWS) {
        this.glows.push(
          scene.add
            .image(bx * TILE + wx, by * TILE + 40, "glow")
            .setOrigin(0, 0)
            .setDisplaySize(16, 14)
            .setDepth((by + 5) * TILE + 1)
            .setAlpha(0),
        );
      }
    }

    const fountain = map.props.find((p) => p.texture === "fountain");
    if (fountain) this.fountain = { x: fountain.x, y: fountain.y - 26 };
    if (map.waterTiles.length > 0) {
      let x0 = Infinity;
      let y0 = Infinity;
      let x1 = -Infinity;
      let y1 = -Infinity;
      for (const index of map.waterTiles) {
        const tx = index % map.cols;
        const ty = Math.floor(index / map.cols);
        x0 = Math.min(x0, tx * TILE);
        y0 = Math.min(y0, ty * TILE);
        x1 = Math.max(x1, (tx + 1) * TILE);
        y1 = Math.max(y1, (ty + 1) * TILE);
      }
      this.pond = { x0, y0, x1, y1 };
    }
  }

  /** Makes a sprite sway gently around its base. Only sprites in view are updated. */
  registerSway(sprite: Phaser.GameObjects.Sprite, amp: number, freq = 1): void {
    this.sway.push({ sprite, amp, freq, phase: this.rnd() * 6.28 });
  }

  /** A small puff of dust where the player just stepped. */
  footstep(x: number, y: number): void {
    this.spawn(this.dust, x + (this.rnd() - 0.5) * 4, y - 1, 0, -3, 0.4);
  }

  private spawn(
    pool: Pool<Particle>,
    x: number,
    y: number,
    vx: number,
    vy: number,
    life: number,
  ): Particle | null {
    const p = pool.acquire();
    if (!p) return null;
    p.life = life;
    p.max = life;
    p.vx = vx;
    p.vy = vy;
    p.sprite.setPosition(x, y).setVisible(true).setAlpha(0.6).setScale(1);
    return p;
  }

  private grassSpots(): Array<{ x: number; y: number }> {
    const spots: Array<{ x: number; y: number }> = [];
    const { cols, rows, ground, blocked } = this.map;
    for (let y = 3; y < rows - 3; y++) {
      for (let x = 3; x < cols - 3; x++) {
        const tile = ground[y * cols + x];
        const grassy =
          tile === T.GRASS || tile === T.GRASS2 || tile === T.FLOWER_W || tile === T.FLOWER_Y;
        if (grassy && !blocked[y * cols + x]) spots.push({ x: x * TILE + 8, y: y * TILE + 12 });
      }
    }
    return spots.length > 0 ? spots : [{ x: 100, y: 100 }];
  }

  private pick<U>(items: readonly U[]): U {
    return items[Math.floor(this.rnd() * items.length)] as U;
  }

  private wanderer(sprite: Wanderer["sprite"], spot: { x: number; y: number }): Wanderer {
    return {
      sprite,
      hx: spot.x,
      hy: spot.y,
      tx: spot.x,
      ty: spot.y,
      turn: this.rnd() * 2,
      phase: this.rnd() * 6.28,
    };
  }

  private inView(x: number, y: number, margin: number): boolean {
    const v = this.view;
    return x > v.x - margin && x < v.right + margin && y > v.y - margin && y < v.bottom + margin;
  }

  update(deltaMs: number, player: { x: number; y: number; moving: boolean }): void {
    const dt = deltaMs / 1000;
    this.time += dt;
    const state = dayState(dayPhaseAt(this.clockMs()));

    this.tintTimer -= deltaMs;
    if (this.tintTimer <= 0) {
      this.tintTimer = 400;
      this.tintEl.style.background = `#${state.tint.toString(16).padStart(6, "0")}`;
    }
    for (const glow of this.glows) glow.setAlpha(state.evening * 0.75);

    this.updateSway();
    this.updateClouds(dt);
    this.updateBirds(deltaMs);
    this.updateWanderers(dt, state.evening);
    this.updateLeaves(dt);
    this.updateFountain(deltaMs, player);
    this.updatePondRipples(deltaMs, player);
    this.updateSmoke(deltaMs);
    for (const pool of [this.droplets, this.ripples, this.smoke, this.dust])
      this.updateParticles(pool, dt);
  }

  private updateSway(): void {
    for (const s of this.sway) {
      if (!this.inView(s.sprite.x, s.sprite.y, 48)) continue;
      s.sprite.setRotation(Math.sin(this.time * s.freq + s.phase) * s.amp);
    }
  }

  private updateClouds(dt: number): void {
    const mapW = this.map.cols * TILE;
    for (const c of this.clouds) {
      c.cloud.x += c.speed * dt;
      if (c.cloud.x > mapW + 80) {
        c.cloud.x = -80;
        c.cloud.y = 40 + this.rnd() * (this.map.rows * TILE - 80);
      }
      c.shadow.setPosition(c.cloud.x + 20, c.cloud.y + 110);
    }
  }

  private updateBirds(deltaMs: number): void {
    this.birdTimer -= deltaMs;
    if (this.birdTimer <= 0) {
      this.birdTimer = 12_000 + this.rnd() * 14_000;
      const bird = this.birds.acquire();
      if (bird) {
        bird
          .setPosition(this.view.x - 20, this.view.y + 16 + this.rnd() * 60)
          .setVisible(true)
          .play("loop-bird");
      }
    }
    this.birds.forEachActive((bird) => {
      bird.x += 44 * (deltaMs / 1000);
      bird.y += Math.sin(this.time * 2 + bird.x * 0.05) * 0.15;
      if (bird.x > this.view.right + 24) {
        bird.setVisible(false).anims.stop();
        this.birds.release(bird);
      }
    });
  }

  private updateWanderers(dt: number, evening: number): void {
    const dayVisible = 1 - Math.min(1, evening * 1.6);
    const nightVisible = Math.min(1, Math.max(0, (evening - 0.3) * 1.6));
    for (const list of [this.butterflies, this.fireflies]) {
      const isFly = list === this.fireflies;
      for (const w of list) {
        const visible = isFly ? nightVisible : dayVisible;
        w.sprite.setVisible(visible > 0.02);
        if (visible <= 0.02) continue;
        w.turn -= dt;
        if (w.turn <= 0) {
          w.turn = 1 + this.rnd() * 1.8;
          w.tx = w.hx + (this.rnd() - 0.5) * 80;
          w.ty = w.hy + (this.rnd() - 0.5) * 50;
        }
        const speed = isFly ? 9 : 16;
        const dx = w.tx - w.sprite.x;
        const dy = w.ty - w.sprite.y;
        const len = Math.hypot(dx, dy) || 1;
        w.sprite.x += (dx / len) * speed * dt;
        w.sprite.y += (dy / len) * speed * dt + Math.sin(this.time * 6 + w.phase) * 0.12;
        if (isFly) {
          w.sprite.setAlpha(
            visible * (0.35 + 0.65 * (0.5 + 0.5 * Math.sin(this.time * 2.4 + w.phase))),
          );
        } else {
          w.sprite.setAlpha(visible).setDepth(w.sprite.y + 20);
          (w.sprite as Phaser.GameObjects.Sprite).setFlipX(dx < 0);
        }
      }
    }
  }

  private updateLeaves(dt: number): void {
    for (const leaf of this.leaves) {
      leaf.life -= dt;
      if (leaf.life <= 0 || leaf.sprite.y > this.view.bottom + 12) {
        leaf.life = 6 + this.rnd() * 8;
        leaf.vy = 10 + this.rnd() * 10;
        leaf.vx = (this.rnd() - 0.3) * 8;
        leaf.sprite.setPosition(
          this.view.x + this.rnd() * this.view.width,
          this.view.y - 8 - this.rnd() * 20,
        );
      }
      leaf.sprite.x += (leaf.vx + Math.sin(this.time * 1.6 + leaf.life) * 7) * dt;
      leaf.sprite.y += leaf.vy * dt;
      leaf.sprite.setRotation(leaf.sprite.rotation + dt * 1.5);
    }
  }

  private updateFountain(deltaMs: number, player: { x: number; y: number }): void {
    const f = this.fountain;
    if (!f || Math.hypot(player.x - f.x, player.y - f.y) > 240) return;
    this.splashTimer -= deltaMs;
    if (this.splashTimer > 0) return;
    this.splashTimer = 150;
    this.spawn(
      this.droplets,
      f.x + (this.rnd() - 0.5) * 6,
      f.y,
      (this.rnd() - 0.5) * 22,
      -(34 + this.rnd() * 18),
      0.8,
    );
  }

  private updatePondRipples(
    deltaMs: number,
    player: { x: number; y: number; moving: boolean },
  ): void {
    const pond = this.pond;
    if (!pond) return;
    this.rippleTimer -= deltaMs;
    const near =
      player.x > pond.x0 - 30 &&
      player.x < pond.x1 + 30 &&
      player.y > pond.y0 - 30 &&
      player.y < pond.y1 + 30;
    if (!near || !player.moving || this.rippleTimer > 0) return;
    this.rippleTimer = 420;
    const x = Phaser.Math.Clamp(player.x, pond.x0 + 6, pond.x1 - 6);
    const y = Phaser.Math.Clamp(player.y, pond.y0 + 4, pond.y1 - 4);
    this.spawn(this.ripples, x, y, 0, 0, 0.9);
  }

  private updateSmoke(deltaMs: number): void {
    this.smokeTimer -= deltaMs;
    if (this.smokeTimer > 0) return;
    this.smokeTimer = 800;
    for (const { id, bx, by } of BUILDING_PLACEMENTS) {
      const cx = CHIMNEYS[id];
      if (cx === undefined) continue;
      const x = bx * TILE + cx;
      const y = by * TILE + 2;
      if (this.inView(x, y, 80)) this.spawn(this.smoke, x, y, 4 + this.rnd() * 3, -9, 3);
    }
  }

  /** Moves, fades and recycles the particles of one pool. */
  private updateParticles(pool: Pool<Particle>, dt: number): void {
    pool.forEachActive((p) => {
      p.life -= dt;
      if (p.life <= 0) {
        p.sprite.setVisible(false);
        pool.release(p);
        return;
      }
      const t = 1 - p.life / p.max;
      const isDroplet = pool === this.droplets;
      if (isDroplet) p.vy += 90 * dt;
      p.sprite.x += p.vx * dt;
      p.sprite.y += p.vy * dt;
      if (pool === this.smoke) p.sprite.setScale(0.6 + t * 0.9).setAlpha(0.45 * (1 - t));
      else if (pool === this.ripples) p.sprite.setScale(0.4 + t * 1.1).setAlpha(0.55 * (1 - t));
      else if (pool === this.dust) p.sprite.setScale(0.5 + t * 0.6).setAlpha(0.6 * (1 - t));
      else p.sprite.setAlpha(0.9 * (1 - t * t));
    });
  }

  /** Counts for measuring the performance budget. */
  stats(): { sprites: number; active: number } {
    return {
      sprites: effectSpriteCount(),
      active:
        this.birds.active +
        this.droplets.active +
        this.ripples.active +
        this.smoke.active +
        this.dust.active,
    };
  }
}
