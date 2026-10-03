import type { BuildingId } from "../content/buildings";
import type { Sfx } from "../systems/audio";
import type { InputState } from "../systems/input";
import type { DialogBox } from "../ui/dialogBox";
import type { Hud } from "../ui/hud";
import type { PanelManager } from "../ui/panels";

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
  /** True while the title screen, a panel or a dialog is open. */
  isBlocked(): boolean;
  setLoadingProgress(p: number): void;
  /** Called once the first world scene is ready. */
  onWorldReady(): void;
  world: WorldApi | null;
}
