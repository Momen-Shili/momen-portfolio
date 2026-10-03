/**
 * Central asset manifest.
 *
 * Every texture the game uses is listed here. By default each one is generated in code
 * (src/world/art). To swap in real art, add a `file` to an entry (path relative to /public,
 * e.g. "art/player.png") and keep `frame` if it is a spritesheet - nothing else changes.
 */
import { drawBuilding, BUILDING_STYLES } from "../world/art/buildings";
import {
  CHARACTER_FRAME,
  CLERK_PALETTE,
  GUIDE_PALETTE,
  PLAYER_PALETTE,
  READER_PALETTE,
  SMITH_PALETTE,
  drawCharacterSheet,
} from "../world/art/characters";
import * as furniture from "../world/art/furniture";
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
  { key: "npc-clerk", frame: char, draw: () => drawCharacterSheet(CLERK_PALETTE) },

  { key: "building-house", draw: () => drawBuilding(BUILDING_STYLES.house) },
  { key: "building-workshop", draw: () => drawBuilding(BUILDING_STYLES.workshop) },
  { key: "building-library", draw: () => drawBuilding(BUILDING_STYLES.library) },
  { key: "building-post", draw: () => drawBuilding(BUILDING_STYLES.post) },

  { key: "tree", draw: props.drawTree },
  { key: "bush", draw: props.drawBush },
  { key: "bug", frame: { width: 12, height: 12 }, draw: props.drawBug },
  { key: "splat", draw: props.drawSplat },
  { key: "spark", draw: props.drawSpark },
  { key: "hat", draw: props.drawHat },
  { key: "gem", frame: { width: 12, height: 12 }, draw: props.drawGems },
  { key: "fountain", frame: { width: 32, height: 32 }, draw: props.drawFountain },
  { key: "lamp", draw: props.drawLamp },
  { key: "bench", draw: props.drawBench },
  { key: "board", draw: props.drawBoard },
  { key: "flag", frame: { width: 12, height: 16 }, draw: props.drawFlag },
  { key: "barrel", draw: props.drawBarrel },
  { key: "mailbox", draw: props.drawMailbox },
  { key: "anvil", draw: props.drawAnvil },

  { key: "door", frame: { width: 16, height: 30 }, draw: furniture.drawDoorOverlay },
  { key: "bed", draw: furniture.drawBed },
  { key: "benches", frame: { width: 36, height: 26 }, draw: furniture.drawBenches },
  { key: "toolwall", draw: furniture.drawToolWall },
  { key: "blueprint", draw: furniture.drawBlueprint },
  { key: "chalkboard", draw: furniture.drawChalkboard },
  { key: "forge", frame: { width: 36, height: 36 }, draw: furniture.drawForge },
  { key: "shelves", frame: { width: 34, height: 38 }, draw: furniture.drawShelves },
  { key: "readingdesk", draw: furniture.drawReadingDesk },
  { key: "globe", draw: furniture.drawGlobe },
  { key: "ladder", draw: furniture.drawLadder },
  { key: "candle", frame: { width: 10, height: 14 }, draw: furniture.drawCandle },
  { key: "mailboxwall", draw: furniture.drawMailboxWall },
  { key: "stampmachine", draw: furniture.drawStampMachine },
  { key: "counter", draw: furniture.drawCounter },
  { key: "conveyor", frame: { width: 72, height: 18 }, draw: furniture.drawConveyor },
  { key: "parcel", draw: furniture.drawParcel },
  { key: "writingdesk", draw: furniture.drawWritingDesk },
  { key: "parcelstack", draw: furniture.drawParcelStack },
  { key: "clock", frame: { width: 18, height: 18 }, draw: furniture.drawClock },
  { key: "lamp-flicker", frame: { width: 12, height: 28 }, draw: furniture.drawLampFlicker },
  { key: "mote", draw: furniture.drawMote },
  { key: "crate", draw: furniture.drawCrate },
  { key: "bookshelf", draw: props.drawBookshelf },
  // Framed portrait supplied by Momen (art-source/portrait.png, baked to 22x26 by hand).
  { key: "portrait", file: "art/portrait.png", draw: props.drawPortrait },
  { key: "frames", draw: props.drawFrames },
  { key: "computer", frame: { width: 34, height: 30 }, draw: props.drawComputerDesk },
  { key: "rug", draw: props.drawRug },
  { key: "plant", draw: props.drawPlant },
  { key: "window", draw: props.drawWindowInterior },
];
