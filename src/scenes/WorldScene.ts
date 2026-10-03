import Phaser from "phaser";
import type { BuildingId } from "../content/buildings";
import { BugHuntController } from "../game/bugHuntController";
import type { GameContext } from "../game/context";
import { findInteraction, type Zone } from "../systems/interaction";
import { funFactLine } from "../systems/quests/helpers";
import { IdleTracker } from "../systems/quests/minigames/idle";
import { clampFrame } from "../systems/quests/minigames/timing";
import { prefersReducedMotion } from "../ui/dom";
import type { Facing, MapDef, NpcDef, PropDef } from "../world/mapTypes";
import { getMap } from "../world/maps";
import { PLAZA_PX } from "../world/townMap";
import { T, TILE } from "../world/tiles";

const PLAYER_SPEED = 74;
const BODY_W = 10;
const BODY_H = 6;
const FRAME_BASE: Record<Facing, number> = { down: 0, up: 3, left: 6, right: 6 };

interface WorldData {
  map?: string;
  spawn?: string;
  attract?: boolean;
}

/** One scene renders every map (town, house interior); changing maps restarts it with new data. */
export class WorldScene extends Phaser.Scene {
  private mapDef!: MapDef;
  private spawnName = "start";
  private firstRun = false;
  private player!: Phaser.Physics.Arcade.Sprite;
  private facing: Facing = "down";
  private transitioning = false;
  /** Collectible sprites by item id, removed when the player picks them up. */
  private readonly itemSprites = new Map<string, Phaser.GameObjects.Sprite>();
  private zones: Zone[] = [];
  private bugHunt: BugHuntController | null = null;
  private readonly watch = new IdleTracker();
  private hat: Phaser.GameObjects.Image | null = null;
  private trailMs = 0;
  private stepDistance = 0;
  private stopQuestWatch: (() => void) | null = null;
  private readonly reduced = prefersReducedMotion();

  constructor(private readonly ctx: GameContext) {
    super("World");
  }

  init(data: WorldData): void {
    this.mapDef = getMap(data.map ?? "town");
    this.spawnName = data.spawn ?? "start";
    this.firstRun = data.attract === true;
    this.transitioning = false;
    this.facing = "down";
    this.itemSprites.clear();
    this.bugHunt = null;
    this.hat = null;
    this.trailMs = 0;
    this.stepDistance = 0;
    this.watch.reset();
  }

  create(): void {
    this.buildGround();
    this.buildProps();
    this.refreshZones();
    this.buildNpcs();
    this.buildPlayer();
    this.buildColliders();
    this.setupCamera();

    this.stopQuestWatch = this.ctx.quests.subscribe(() => this.syncQuestVisuals());
    this.ctx.audio.setScene(this.mapDef.id === "house" ? "interior" : "town");
    this.ctx.world = {
      teleport: (target) => this.teleport(target),
      startBugHunt: () => this.startBugHunt(),
    };
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.scale.off("resize", this.applyCamera, this);
      this.stopQuestWatch?.();
      this.stopQuestWatch = null;
      this.bugHunt?.destroy(false);
      this.bugHunt = null;
      this.ctx.world = null;
    });

    if (!this.reduced && !this.firstRun) this.cameras.main.fadeIn(220, 0, 0, 0);
    if (this.firstRun) this.ctx.onWorldReady();
  }

  update(_time: number, rawDelta: number): void {
    const delta = clampFrame(rawDelta);
    if (this.transitioning) return;
    const body = this.player.body as Phaser.Physics.Arcade.Body;

    if (this.ctx.isBlocked()) {
      body.setVelocity(0, 0);
      this.setIdle();
      return;
    }

    const axis = this.ctx.input.getAxis();
    body.setVelocity(axis.x * PLAYER_SPEED, axis.y * PLAYER_SPEED);
    this.updateFacing(axis.x, axis.y);
    this.player.setDepth(this.player.y);

    const zone = findInteraction(body.center.x, body.center.y, this.zones);
    this.ctx.hud.setPrompt(zone ? zone.prompt : null);
    if (this.ctx.input.consumeAction() && zone) this.perform(zone);

    if (this.bugHunt) {
      this.bugHunt.update(delta, body.center.x, body.center.y);
      if (!this.bugHunt.active) this.bugHunt = null;
    }
    const moving = axis.x !== 0 || axis.y !== 0;
    this.updateFootsteps(delta, moving);
    this.updateNightWatch(delta, moving, body);
    this.updateCosmetics(delta, moving);
  }

  // ---- building the world ----

  private buildGround(): void {
    const { cols, rows, ground } = this.mapDef;
    const data: number[][] = [];
    for (let y = 0; y < rows; y++) data.push(ground.slice(y * cols, (y + 1) * cols));
    const map = this.make.tilemap({ data, tileWidth: TILE, tileHeight: TILE });
    const tileset = map.addTilesetImage("tiles", "tiles", TILE, TILE, 0, 0);
    if (!tileset) throw new Error("Tileset 'tiles' could not be created");
    const layer = map.createLayer(0, tileset, 0, 0);
    if (!layer) throw new Error("Ground layer could not be created");
    layer.setDepth(-100);

    if (this.mapDef.waterTiles.length > 0 && !this.reduced) {
      let alt = false;
      this.time.addEvent({
        delay: 650,
        loop: true,
        callback: () => {
          alt = !alt;
          for (const index of this.mapDef.waterTiles) {
            layer.putTileAt(alt ? T.WATER_B : T.WATER_A, index % cols, Math.floor(index / cols));
          }
        },
      });
    }
  }

  private buildProps(): void {
    for (const p of this.mapDef.props) this.addProp(p);
  }

  private addProp(p: PropDef): void {
    if (p.item && (this.ctx.quests.hasItem(p.item) || this.itemSprites.has(p.item))) return;
    const sprite = this.add.sprite(p.x, p.y, p.texture, p.frame ?? 0);
    if (p.item) this.itemSprites.set(p.item, sprite);
    sprite.setOrigin(p.originX ?? 0.5, 1);
    sprite.setDepth(p.flat ? -50 : p.y);
    if (p.anim && !this.reduced) sprite.play(`loop-${p.texture}`);
  }

  private buildNpcs(): void {
    for (const npc of this.mapDef.npcs) this.addNpc(npc);
  }

  private addNpc(npc: NpcDef): void {
    const sprite = this.add.sprite(npc.x, npc.y, npc.texture, FRAME_BASE[npc.facing]);
    sprite
      .setOrigin(0.5, 1)
      .setDepth(npc.y)
      .setFlipX(npc.facing === "right");
    if (!this.reduced) {
      this.tweens.add({
        targets: sprite,
        y: npc.y - 1,
        duration: 900 + (npc.x % 7) * 40,
        yoyo: true,
        repeat: -1,
        ease: "Sine.easeInOut",
      });
    }
  }

  private buildPlayer(): void {
    const spawn = this.mapDef.spawns[this.spawnName] ?? Object.values(this.mapDef.spawns)[0];
    if (!spawn) throw new Error(`Map ${this.mapDef.id} has no spawn points`);
    this.player = this.physics.add.sprite(spawn.x, spawn.y, "player", 0);
    this.player.setOrigin(0.5, 1);
    const body = this.player.body as Phaser.Physics.Arcade.Body;
    body.setSize(BODY_W, BODY_H);
    body.setOffset((16 - BODY_W) / 2, 16 - BODY_H);
    this.player.setDepth(this.player.y);
  }

  /** Merges blocked tiles into horizontal runs so the physics world stays small. */
  private buildColliders(): void {
    const { cols, rows, blocked } = this.mapDef;
    const walls: Phaser.GameObjects.Zone[] = [];
    for (let y = 0; y < rows; y++) {
      let x = 0;
      while (x < cols) {
        if (!blocked[y * cols + x]) {
          x++;
          continue;
        }
        const start = x;
        while (x < cols && blocked[y * cols + x]) x++;
        const w = (x - start) * TILE;
        const wall = this.add.zone(start * TILE + w / 2, y * TILE + TILE / 2, w, TILE);
        this.physics.add.existing(wall, true);
        walls.push(wall);
      }
    }
    this.physics.add.collider(this.player, walls);
  }

  private setupCamera(): void {
    const cam = this.cameras.main;
    cam.setBackgroundColor(this.mapDef.background);
    cam.setRoundPixels(true);
    this.applyCamera();
    cam.startFollow(this.player, true, this.reduced ? 1 : 0.14, this.reduced ? 1 : 0.14);
    cam.centerOn(this.player.x, this.player.y - 6);
    this.scale.on("resize", this.applyCamera, this);
  }

  private readonly applyCamera = (): void => {
    const cam = this.cameras.main;
    const { width, height } = this.scale;
    cam.setSize(width, height);
    // Integer zoom keeps pixels square; the smaller screen side decides how much town is visible.
    const zoom = Math.max(2, Math.floor(Math.min(width, height) / 170));
    cam.setZoom(zoom);
    const mapW = this.mapDef.cols * TILE;
    const mapH = this.mapDef.rows * TILE;
    const boundsW = Math.max(mapW, width / zoom);
    const boundsH = Math.max(mapH, height / zoom);
    cam.setBounds(mapW / 2 - boundsW / 2, mapH / 2 - boundsH / 2, boundsW, boundsH);
  };

  /** A soft step every ~18 pixels walked. */
  private updateFootsteps(delta: number, moving: boolean): void {
    if (!moving) {
      this.stepDistance = 0;
      return;
    }
    this.stepDistance += (PLAYER_SPEED * delta) / 1000;
    if (this.stepDistance < 18) return;
    this.stepDistance = 0;
    this.ctx.audio.play("step");
  }

  // ---- side quests ----

  private startBugHunt(): void {
    if (this.mapDef.id !== "town") return;
    this.bugHunt?.destroy();
    const { cols, blocked } = this.mapDef;
    const isBlocked = (x: number, y: number): boolean =>
      blocked[Math.floor(y / TILE) * cols + Math.floor(x / TILE)] === true;
    this.bugHunt = new BugHuntController(this, this.ctx, PLAZA_PX, isBlocked, this.reduced);
  }

  /** Standing still by the fountain for a while unlocks the Night watch quest (once). */
  private updateNightWatch(delta: number, moving: boolean, body: Phaser.Physics.Arcade.Body): void {
    if (this.ctx.quests.isDone("night-watch")) return;
    const fountain = this.mapDef.zones.find((z) => z.id === "fountain");
    const inZone = fountain
      ? findInteraction(body.center.x, body.center.y, [fountain]) !== null
      : false;
    if (!this.watch.update(delta, { inZone, moving })) return;
    this.sparkle(fountain);
    const fact = funFactLine();
    this.ctx.hud.showToast(
      fact
        ? `Stars twinkle over the fountain. Fun fact: ${fact}`
        : "Stars twinkle over the fountain.",
      4500,
    );
    this.ctx.audio.play("complete");
    this.ctx.quests.emit({ type: "idle_at", place: "fountain" });
  }

  /** A few slow, fading sparkles. Skipped for reduced motion; nothing flashes. */
  private sparkle(zone: Zone | undefined): void {
    if (this.reduced || !zone) return;
    const cx = zone.x + zone.w / 2;
    const cy = zone.y + zone.h / 2 - 16;
    const tints = [0xfff3c0, 0x8fd0f5, 0xffb3c7, 0xb9f0c1];
    for (let burst = 0; burst < 3; burst++) {
      for (let i = 0; i < 10; i++) {
        const angle = (i / 10) * Math.PI * 2;
        const star = this.add
          .image(cx, cy, "spark")
          .setDepth(10_000)
          .setTint(tints[(i + burst) % tints.length] ?? 0xffffff)
          .setAlpha(0);
        this.tweens.add({
          targets: star,
          x: cx + Math.cos(angle) * (22 + burst * 10),
          y: cy + Math.sin(angle) * (22 + burst * 10) - 8,
          alpha: { from: 0.9, to: 0 },
          delay: burst * 500,
          duration: 1400,
          ease: "Sine.easeOut",
          onComplete: () => star.destroy(),
        });
      }
    }
  }

  /** Quest reward cosmetics: the straw fishing hat and the gem trail. */
  private updateCosmetics(delta: number, moving: boolean): void {
    const owned = this.ctx.quests.state.cosmetics;
    if (owned.includes("fishing-hat")) {
      this.hat ??= this.add.image(0, 0, "hat").setOrigin(0.5, 1);
      this.hat.setPosition(this.player.x, this.player.y - 11).setDepth(this.player.y + 0.5);
    }
    if (!owned.includes("gem-trail") || this.reduced || !moving) return;
    this.trailMs += delta;
    if (this.trailMs < 130) return;
    this.trailMs = 0;
    const gem = this.add
      .sprite(this.player.x, this.player.y - 3, "gem", Phaser.Math.Between(0, 2))
      .setScale(0.5)
      .setDepth(this.player.y - 1);
    this.tweens.add({
      targets: gem,
      alpha: 0,
      y: gem.y - 5,
      duration: 900,
      onComplete: () => gem.destroy(),
    });
  }

  /** Keeps the hat and the collectible gems in step with the quest state, including after a reset. */
  private syncQuestVisuals(): void {
    if (!this.ctx.quests.state.cosmetics.includes("fishing-hat") && this.hat) {
      this.hat.destroy();
      this.hat = null;
    }
    for (const p of this.mapDef.props) if (p.item) this.addProp(p);
    this.refreshCollectibles();
  }

  // ---- collectibles ----

  /** Interaction zones minus the ones for items the player already owns. */
  private refreshZones(): void {
    this.zones = this.mapDef.zones.filter((z) => !z.item || !this.ctx.quests.hasItem(z.item));
  }

  private refreshCollectibles(): void {
    for (const [item, sprite] of this.itemSprites) {
      if (!this.ctx.quests.hasItem(item)) continue;
      sprite.destroy();
      this.itemSprites.delete(item);
    }
    this.refreshZones();
    this.ctx.hud.setPrompt(null);
  }

  // ---- movement and interaction ----

  private updateFacing(x: number, y: number): void {
    if (x === 0 && y === 0) {
      this.setIdle();
      return;
    }
    if (Math.abs(x) > Math.abs(y)) this.facing = x < 0 ? "left" : "right";
    else this.facing = y < 0 ? "up" : "down";
    const key = this.facing === "right" ? "left" : this.facing;
    this.player.setFlipX(this.facing === "right");
    this.player.anims.play(`walk-${key}`, true);
  }

  private setIdle(): void {
    this.player.anims.stop();
    this.player.setFrame(FRAME_BASE[this.facing]);
    this.player.setFlipX(this.facing === "right");
  }

  private perform(zone: Zone): void {
    const { action } = zone;
    switch (action.type) {
      case "panel":
        this.ctx.audio.play("open");
        this.ctx.panels.open(action.panel);
        break;
      case "enter":
      case "exit":
        this.changeMap(action.map, action.spawn);
        break;
      case "dialog":
        this.ctx.audio.play("talk");
        this.ctx.director.talk(action.npc);
        break;
      case "fish":
        this.ctx.audio.play("open");
        this.ctx.fishing.open();
        break;
      case "gem":
        this.ctx.audio.play("pickup");
        this.ctx.director.collectGem(action.group);
        this.refreshCollectibles();
        break;
      case "wish":
        this.ctx.audio.play("wish");
        this.ctx.hud.showToast("Plink! You toss a coin into the fountain and make a wish.");
        break;
    }
  }

  private changeMap(map: string, spawn: string): void {
    if (this.transitioning) return;
    this.transitioning = true;
    (this.player.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
    this.ctx.hud.setPrompt(null);
    this.ctx.audio.play("open");
    const go = (): void => {
      this.scene.restart({ map, spawn });
    };
    if (this.reduced) {
      go();
      return;
    }
    this.cameras.main.fadeOut(180, 0, 0, 0);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, go);
  }

  private teleport(target: BuildingId): void {
    const spawnName = `door-${target}`;
    if (this.mapDef.id !== "town") {
      this.changeMap("town", spawnName);
      return;
    }
    const spawn = this.mapDef.spawns[spawnName];
    if (!spawn) return;
    const body = this.player.body as Phaser.Physics.Arcade.Body;
    body.reset(spawn.x, spawn.y);
    this.facing = "down";
    this.setIdle();
    this.cameras.main.centerOn(spawn.x, spawn.y - 6);
  }
}
