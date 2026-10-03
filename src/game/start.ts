import Phaser from "phaser";
import { BootScene } from "../scenes/BootScene";
import { WorldScene } from "../scenes/WorldScene";
import { Sfx } from "../systems/audio";
import { InputState } from "../systems/input";
import { DialogBox } from "../ui/dialogBox";
import { el, isTouchDevice } from "../ui/dom";
import { Hud } from "../ui/hud";
import { hideLoading, setLoadingProgress } from "../ui/loading";
import { PanelManager } from "../ui/panels";
import { showTitle } from "../ui/title";
import { VirtualControls } from "../ui/virtualControls";
import type { GameContext } from "./context";

export interface RunningGame {
  destroy(): void;
}

export function startGame(root: HTMLElement): RunningGame {
  const canvasHost = el("div", { class: "game-canvas" });
  const ui = el("div", { class: "game-ui" });
  root.replaceChildren(canvasHost, ui);

  const sfx = new Sfx();
  const state = { title: true, panel: false, dialog: false };
  const isBlocked = (): boolean => state.title || state.panel || state.dialog;
  const input = new InputState(window, isBlocked);
  let game: Phaser.Game | null = null;
  let closeTitle: (() => void) | null = null;

  const syncUi = (): void => {
    controls?.setVisible(!isBlocked());
    hud.setVisible(!state.title);
    if (isBlocked()) hud.setPrompt(null);
  };
  /** The world freezes while a panel or dialog is open (the title keeps it ambient). */
  const freezeWorld = (frozen: boolean): void => {
    if (!game) return;
    if (frozen && game.scene.isActive("World")) game.scene.pause("World");
    else if (!frozen && game.scene.isPaused("World")) game.scene.resume("World");
  };

  const ctx: GameContext = {
    input,
    sfx,
    world: null,
    isBlocked,
    setLoadingProgress,
    onWorldReady: () => {
      hideLoading();
      closeTitle = showTitle(ui, {
        soundOn: sfx.enabled,
        onToggleSound: () => {
          sfx.setEnabled(!sfx.enabled);
          return sfx.enabled;
        },
        onStart: () => {
          state.title = false;
          input.reset();
          hud.setSound(sfx.enabled);
          closeTitle = null;
          syncUi();
        },
      });
    },
    // Assigned below; they need `ctx` to exist first.
    panels: null as unknown as PanelManager,
    dialog: null as unknown as DialogBox,
    hud: null as unknown as Hud,
  };

  const panels = new PanelManager(ui, {
    onChange: (open) => {
      state.panel = open;
      input.reset();
      if (!open) sfx.play("close");
      freezeWorld(open || state.dialog);
      syncUi();
    },
    teleport: (target) => ctx.world?.teleport(target),
  });
  const dialog = new DialogBox(ui, (open) => {
    state.dialog = open;
    input.reset();
    freezeWorld(open || state.panel);
    syncUi();
  });
  const hud = new Hud(
    ui,
    {
      onAction: () => input.pressAction(),
      onToggleSound: () => {
        sfx.setEnabled(!sfx.enabled);
        return sfx.enabled;
      },
      onHelp: () => {
        if (!isBlocked()) panels.open("board");
      },
    },
    false,
  );
  hud.setVisible(false);
  const controls = isTouchDevice() ? new VirtualControls(ui, input) : null;
  controls?.setVisible(false);
  Object.assign(ctx, { panels, dialog, hud });

  game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: canvasHost,
    backgroundColor: "#1b1423",
    pixelArt: true,
    roundPixels: true,
    banner: false,
    scale: { mode: Phaser.Scale.RESIZE, width: "100%", height: "100%" },
    physics: { default: "arcade", arcade: { gravity: { x: 0, y: 0 } } },
    input: { keyboard: false, gamepad: false },
    audio: { noAudio: true },
    scene: [new BootScene(ctx), new WorldScene(ctx)],
  });

  if (import.meta.env.DEV) (window as unknown as { __game: Phaser.Game }).__game = game;

  return {
    destroy: () => {
      closeTitle?.();
      input.destroy();
      panels.destroy();
      dialog.close();
      hud.destroy();
      controls?.destroy();
      sfx.destroy();
      game?.destroy(true);
      game = null;
      root.replaceChildren();
    },
  };
}
