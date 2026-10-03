import Phaser from "phaser";
import type { BuildingId } from "../content/buildings";
import type { GameContext } from "../game/context";
import { findInteraction, type Zone } from "../systems/interaction";
import { prefersReducedMotion } from "../ui/dom";
import type { Facing, MapDef, NpcDef } from "../world/mapTypes";
import { getMap } from "../world/maps";
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
  }

  create(): void {
    this.buildGround();
    this.buildProps();
    this.refreshZones();
    this.buildNpcs();
    this.buildPlayer();
    this.buildColliders();
    this.setupCamera();

    this.ctx.world = { teleport: (target) => this.teleport(target) };
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.scale.off("resize", this.applyCamera, this);
      this.ctx.world = null;
    });

    if (!this.reduced && !this.firstRun) this.cameras.main.fadeIn(220, 0, 0, 0);
    if (this.firstRun) this.ctx.onWorldReady();
  }

  update(): void {
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
    for (const p of this.mapDef.props) {
      if (p.item && this.ctx.quests.hasItem(p.item)) continue;
      const sprite = this.add.sprite(p.x, p.y, p.texture, p.frame ?? 0);
      if (p.item) this.itemSprites.set(p.item, sprite);
      sprite.setOrigin(p.originX ?? 0.5, 1);
      sprite.setDepth(p.flat ? -50 : p.y);
      if (p.anim && !this.reduced) sprite.play(`loop-${p.texture}`);
    }
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
        this.ctx.sfx.play("open");
        this.ctx.panels.open(action.panel);
        break;
      case "enter":
      case "exit":
        this.changeMap(action.map, action.spawn);
        break;
      case "dialog":
        this.ctx.sfx.play("talk");
        this.ctx.director.talk(action.npc);
        break;
      case "gem":
        this.ctx.sfx.play("wish");
        this.ctx.director.collectGem(action.group);
        this.refreshCollectibles();
        break;
      case "wish":
        this.ctx.sfx.play("wish");
        this.ctx.hud.showToast("Plink! You toss a coin into the fountain and make a wish.");
        break;
    }
  }

  private changeMap(map: string, spawn: string): void {
    if (this.transitioning) return;
    this.transitioning = true;
    (this.player.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
    this.ctx.hud.setPrompt(null);
    this.ctx.sfx.play("open");
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
