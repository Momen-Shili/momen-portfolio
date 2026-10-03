import type { BuildingId } from "../../content/buildings.ts";
import type { Zone, ZoneAction } from "../../systems/interaction.ts";
import type { Facing, MapDef, NpcDef, PropDef, Spawn } from "../mapTypes.ts";
import { T, TILE } from "../tiles.ts";

export interface InteriorTheme {
  floor: number;
  wall: number;
  wallBase: number;
  background: string;
}

interface FurnitureOptions {
  frame?: number;
  anim?: boolean;
  flat?: boolean;
  /** Tile rows the object blocks, counted upwards from its base row (default 1). */
  blockRows?: number;
  /** Show the sprite but do not block movement (rugs, wall hangings). */
  decor?: boolean;
}

/**
 * Small helper for laying out a building interior in tile coordinates. The room has three wall
 * rows on top, a wall row at the bottom with the door, and wall columns at both sides. Objects are
 * placed by their base tile (the row the player stands in front of), and hotspots are the zones
 * just below that row.
 */
export class InteriorBuilder {
  readonly ground: number[];
  readonly blocked: boolean[];
  private readonly props: PropDef[] = [];
  private readonly zones: Zone[] = [];
  private readonly npcs: NpcDef[] = [];
  private readonly spawns: Record<string, Spawn> = {};
  private motes = 0;

  constructor(
    private readonly id: string,
    private readonly building: BuildingId,
    private readonly cols: number,
    private readonly rows: number,
    private readonly theme: InteriorTheme,
    private readonly doorCol: number,
  ) {
    this.ground = new Array<number>(cols * rows).fill(theme.floor);
    this.blocked = new Array<boolean>(cols * rows).fill(false);
    for (let x = 0; x < cols; x++) {
      this.setTile(x, 0, theme.wall, true);
      this.setTile(x, 1, theme.wall, true);
      this.setTile(x, 2, theme.wallBase, true);
      this.setTile(x, rows - 1, theme.wallBase, true);
    }
    for (let y = 3; y < rows - 1; y++) {
      this.setTile(0, y, theme.wall, true);
      this.setTile(cols - 1, y, theme.wall, true);
    }
    this.setTile(doorCol, rows - 1, T.DOOR_IN, true);
    this.setTile(doorCol + 1, rows - 1, T.DOOR_IN, true);
  }

  private setTile(x: number, y: number, tile: number, block: boolean): void {
    this.ground[y * this.cols + x] = tile;
    this.blocked[y * this.cols + x] = block;
  }

  private blockRect(x0: number, y0: number, x1: number, y1: number): void {
    for (let y = y0; y <= y1; y++)
      for (let x = x0; x <= x1; x++) this.blocked[y * this.cols + x] = true;
  }

  /** Sprite hung on the wall (or any non-blocking picture). `x`,`bottom` are pixels. */
  hang(texture: string, x: number, bottom: number, options: FurnitureOptions = {}): this {
    this.props.push({
      texture,
      x,
      y: bottom,
      frame: options.frame,
      anim: options.anim,
      flat: options.flat,
    });
    return this;
  }

  /** Furniture standing on its base tile row `ty`, `w` tiles wide starting at column `tx`. */
  furniture(
    texture: string,
    tx: number,
    ty: number,
    w: number,
    options: FurnitureOptions = {},
  ): this {
    this.hang(texture, (tx + w / 2) * TILE, (ty + 1) * TILE, options);
    if (!options.decor) {
      const rows = options.blockRows ?? 1;
      this.blockRect(tx, ty - rows + 1, tx + w - 1, ty);
    }
    return this;
  }

  /** The zone just in front of (below) base row `ty`, `w` tiles wide from column `tx`. */
  hotspot(
    id: string,
    tx: number,
    ty: number,
    w: number,
    prompt: string,
    action: ZoneAction,
    item?: string,
  ): this {
    this.zones.push({
      id,
      x: tx * TILE - 6,
      y: (ty + 1) * TILE - 2,
      w: w * TILE + 12,
      h: 28,
      prompt,
      action,
      item,
    });
    return this;
  }

  /** A collectible with its own zone, hidden once the player owns it. */
  collectible(
    id: string,
    texture: string,
    frame: number,
    tx: number,
    ty: number,
    item: string,
    action: ZoneAction,
  ): this {
    this.props.push({ texture, frame, x: tx * TILE + 8, y: (ty + 1) * TILE - 2, item });
    this.zones.push({
      id,
      x: tx * TILE - 8,
      y: ty * TILE - 8,
      w: 32,
      h: 32,
      prompt: "Pick up the glinting gem",
      action,
      item,
    });
    return this;
  }

  npc(id: string, texture: string, tx: number, ty: number, facing: Facing, reach = 0): this {
    const x = tx * TILE + 8;
    const y = ty * TILE + 14;
    this.npcs.push({ id, texture, x, y, facing });
    this.blockRect(tx, ty, tx, ty);
    this.zones.push({
      id: `npc-${id}`,
      x: x - 26,
      y: y - 30,
      w: 52,
      h: 44 + reach,
      prompt: "Talk",
      action: { type: "dialog", npc: id },
    });
    return this;
  }

  ambientMotes(count: number): this {
    this.motes = count;
    return this;
  }

  build(label: string): MapDef {
    const door = this.doorCol;
    const rows = this.rows;
    const spawnX = (door + 1) * TILE;
    this.spawns["in"] = { x: spawnX, y: (rows - 2) * TILE + 12 };
    this.zones.push({
      id: "exit",
      x: (door - 1) * TILE,
      y: (rows - 3) * TILE,
      w: 4 * TILE,
      h: 2 * TILE,
      prompt: `Leave the ${label}`,
      action: {
        type: "exit",
        map: "town",
        spawn: `door-${this.building}`,
        building: this.building,
      },
    });
    return {
      id: this.id,
      cols: this.cols,
      rows,
      ground: this.ground,
      blocked: this.blocked,
      waterTiles: [],
      props: this.props,
      npcs: this.npcs,
      zones: this.zones,
      spawns: this.spawns,
      background: this.theme.background,
      ambient: this.motes > 0 ? { motes: this.motes } : undefined,
    };
  }
}
