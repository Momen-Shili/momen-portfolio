import type { BuildingId } from "../content/buildings";
import type { AudioEngine } from "../audio/engine";
import type { InputState } from "../systems/input";
import type { QuestEngine } from "../systems/quests/engine";
import type { DialogBox } from "../ui/dialogBox";
import type { Hud } from "../ui/hud";
import type { PanelManager } from "../ui/panels";
import type { FishingCard } from "../ui/fishingCard";
import type { MinigameHud } from "../ui/minigameHud";
import type { QuestDirector } from "./questDirector";

export interface WorldApi {
  teleport(target: BuildingId): void;
  /** Starts (or restarts) the plaza bug hunt. Does nothing outside the town. */
  startBugHunt(): void;
  /** Rebuilds the current map in place (used when the effects setting changes). */
  restartHere(): void;
}

/** Everything the scenes need from the DOM/UI side, wired up in start.ts. */
export interface GameContext {
  input: InputState;
  panels: PanelManager;
  dialog: DialogBox;
  hud: Hud;
  audio: AudioEngine;
  quests: QuestEngine;
  director: QuestDirector;
  fishing: FishingCard;
  /** Full-screen multiply layer that tints the town toward evening (DOM, so it never touches the HUD). */
  dayTint: HTMLElement;
  /** Milliseconds since the game started; drives the day and evening cycle across map changes. */
  clock(): number;
  minigameHud: MinigameHud;
  /** True while the title screen, a panel or a dialog is open. */
  isBlocked(): boolean;
  setLoadingProgress(p: number): void;
  /** Called once the first world scene is ready. */
  onWorldReady(): void;
  world: WorldApi | null;
}
