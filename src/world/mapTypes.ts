import type { Zone } from "../systems/interaction";

export type Facing = "down" | "up" | "left" | "right";

export interface PropDef {
  texture: string;
  /** Bottom-centre of the sprite, in world pixels. */
  x: number;
  y: number;
  frame?: number;
  /** Plays the looping `loop-<texture>` animation (skipped for reduced motion). */
  anim?: boolean;
  /** Draw below everything else (rugs). */
  flat?: boolean;
  /** Pivot X as a fraction of the sprite width (defaults to 0.5). */
  originX?: number;
  /** Collectible id: the sprite is hidden once the player owns this item. */
  item?: string;
}

export interface NpcDef {
  id: string;
  texture: string;
  /** Feet position in world pixels. */
  x: number;
  y: number;
  facing: Facing;
}

export interface Spawn {
  /** Feet position in world pixels. */
  x: number;
  y: number;
}

export interface MapDef {
  id: string;
  cols: number;
  rows: number;
  /** Row-major tile indices (see tiles.ts). */
  ground: number[];
  /** Row-major collision grid, one flag per tile. */
  blocked: boolean[];
  /** Water tiles that swap between two frames for ambient animation. */
  waterTiles: number[];
  props: PropDef[];
  npcs: NpcDef[];
  zones: Zone[];
  spawns: Record<string, Spawn>;
  background: string;
  /** Ambient effects: floating dust motes (count). Skipped for reduced motion. */
  ambient?: { motes: number };
}

export function tileIndex(def: Pick<MapDef, "cols">, tx: number, ty: number): number {
  return ty * def.cols + tx;
}
