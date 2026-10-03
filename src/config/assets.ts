/**
 * Central asset manifest.
 *
 * Every texture the game uses is listed here. By default each one is generated in code
 * (src/world/art). To swap in real art, add a `file` to an entry (path relative to /public,
 * e.g. "assets/player.png") and keep `frame` if it is a spritesheet - nothing else changes.
 */
import { drawBuilding, BUILDING_STYLES } from "../world/art/buildings";
import {
  CHARACTER_FRAME,
  GUIDE_PALETTE,
  PLAYER_PALETTE,
  READER_PALETTE,
  SMITH_PALETTE,
  drawCharacterSheet,
} from "../world/art/characters";
import * as props from "../world/art/props";
import { drawTileset } from "../world/art/tiles";

export interface AssetSpec {
  key: string;
  /** Path under /public. When set, the file is loaded instead of the generated art. */
  file?: string;
  /** Frame size for spritesheets. Omit for single images. */
  frame?: { width: number; height: number };
  draw: () => HTMLCanvasElement;
}

const char = { width: CHARACTER_FRAME, height: CHARACTER_FRAME };

export const ASSETS: readonly AssetSpec[] = [
  { key: "tiles", draw: drawTileset },
  { key: "player", frame: char, draw: () => drawCharacterSheet(PLAYER_PALETTE) },
  { key: "npc-guide", frame: char, draw: () => drawCharacterSheet(GUIDE_PALETTE) },
  { key: "npc-smith", frame: char, draw: () => drawCharacterSheet(SMITH_PALETTE) },
  { key: "npc-reader", frame: char, draw: () => drawCharacterSheet(READER_PALETTE) },

  { key: "building-house", draw: () => drawBuilding(BUILDING_STYLES.house) },
  { key: "building-workshop", draw: () => drawBuilding(BUILDING_STYLES.workshop) },
  { key: "building-library", draw: () => drawBuilding(BUILDING_STYLES.library) },
  { key: "building-post", draw: () => drawBuilding(BUILDING_STYLES.post) },

  { key: "tree", draw: props.drawTree },
  { key: "bush", draw: props.drawBush },
  { key: "fountain", frame: { width: 32, height: 32 }, draw: props.drawFountain },
  { key: "lamp", draw: props.drawLamp },
  { key: "bench", draw: props.drawBench },
  { key: "board", draw: props.drawBoard },
  { key: "flag", frame: { width: 12, height: 16 }, draw: props.drawFlag },
  { key: "barrel", draw: props.drawBarrel },
  { key: "mailbox", draw: props.drawMailbox },
  { key: "anvil", draw: props.drawAnvil },

  { key: "bookshelf", draw: props.drawBookshelf },
  { key: "portrait", draw: props.drawPortrait },
  { key: "frames", draw: props.drawFrames },
  { key: "computer", frame: { width: 34, height: 30 }, draw: props.drawComputerDesk },
  { key: "rug", draw: props.drawRug },
  { key: "plant", draw: props.drawPlant },
  { key: "window", draw: props.drawWindowInterior },
];
