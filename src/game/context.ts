import type { BuildingId } from "../content/buildings";
import type { Sfx } from "../systems/audio";
import type { InputState } from "../systems/input";
import type { QuestEngine } from "../systems/quests/engine";
import type { DialogBox } from "../ui/dialogBox";
import type { Hud } from "../ui/hud";
import type { PanelManager } from "../ui/panels";
import type { QuestDirector } from "./questDirector";

export interface WorldApi {
  teleport(target: BuildingId): void;
}

/** Everything the scenes need from the DOM/UI side, wired up in start.ts. */
export interface GameContext {
  input: InputState;
  panels: PanelManager;
  dialog: DialogBox;
  hud: Hud;
  sfx: Sfx;
  quests: QuestEngine;
  director: QuestDirector;
  /** True while the title screen, a panel or a dialog is open. */
  isBlocked(): boolean;
  setLoadingProgress(p: number): void;
  /** Called once the first world scene is ready. */
  onWorldReady(): void;
  world: WorldApi | null;
}
