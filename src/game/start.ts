import Phaser from "phaser";
import { AudioEngine } from "../audio/engine";
import { BootScene } from "../scenes/BootScene";
import { WorldScene } from "../scenes/WorldScene";
import { InputState } from "../systems/input";
import { QUESTS } from "../systems/quests/definitions";
import { QuestEngine } from "../systems/quests/engine";
import { describeNotification } from "../systems/quests/notify";
import { ProgressStore, createSafeStorage } from "../systems/quests/storage";
import { DialogBox } from "../ui/dialogBox";
import { FishingCard } from "../ui/fishingCard";
import { MinigameHud } from "../ui/minigameHud";
import { el, isTouchDevice } from "../ui/dom";
import { Hud } from "../ui/hud";
import { hideLoading, setLoadingProgress } from "../ui/loading";
import { PanelManager } from "../ui/panels";
import { showTitle } from "../ui/title";
import { VirtualControls } from "../ui/virtualControls";
import type { GameContext } from "./context";
import { QuestDirector } from "./questDirector";

export interface RunningGame {
  destroy(): void;
}

export function startGame(root: HTMLElement): RunningGame {
  const canvasHost = el("div", { class: "game-canvas" });
  const ui = el("div", { class: "game-ui" });
  root.replaceChildren(canvasHost, ui);

  const storage = createSafeStorage();
  const audio = new AudioEngine(storage);
  const quests = new QuestEngine(QUESTS, new ProgressStore(storage, QUESTS));
  const state = { title: true, panel: false, dialog: false, fishing: false };
  const isBlocked = (): boolean => state.title || state.panel || state.dialog || state.fishing;
  const input = new InputState(window, isBlocked);
  let game: Phaser.Game | null = null;
  let closeTitle: (() => void) | null = null;

  const syncUi = (): void => {
    controls?.setVisible(!isBlocked());
    hud.setVisible(!state.title);
    if (isBlocked()) hud.setPrompt(null);
    // Music gets quieter and duller while something is open on top of the world.
    audio.setDucked(state.panel || state.dialog || state.fishing);
  };
  /** The world freezes while a panel or dialog is open (the title keeps it ambient). */
  const freezeWorld = (frozen: boolean): void => {
    if (!game) return;
    if (frozen && game.scene.isActive("World")) game.scene.pause("World");
    else if (!frozen && game.scene.isPaused("World")) game.scene.resume("World");
  };

  const ctx: GameContext = {
    input,
    audio,
    quests,
    world: null,
    isBlocked,
    setLoadingProgress,
    onWorldReady: () => {
      hideLoading();
      closeTitle = showTitle(ui, {
        remembered: audio.settings.choice,
        onStart: (withSound) => {
          // Both buttons are real clicks, so the browser allows audio to start here.
          audio.start(withSound);
          state.title = false;
          input.reset();
          hud.setSound(audio.isOn);
          closeTitle = null;
          syncUi();
        },
      });
    },
    // Assigned below; they need `ctx` to exist first.
    panels: null as unknown as PanelManager,
    dialog: null as unknown as DialogBox,
    hud: null as unknown as Hud,
    director: null as unknown as QuestDirector,
    fishing: null as unknown as FishingCard,
    minigameHud: null as unknown as MinigameHud,
  };

  const panels = new PanelManager(ui, {
    onChange: (open) => {
      state.panel = open;
      input.reset();
      if (!open) audio.play("close");
      freezeWorld(open || state.dialog);
      syncUi();
    },
    teleport: (target) => ctx.world?.teleport(target),
    quests,
    audio,
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
      onToggleSound: () => audio.toggleMuted(),
      onHelp: () => {
        if (!isBlocked()) panels.open("board");
      },
      onQuests: () => {
        if (!isBlocked()) panels.open("quests");
      },
      onSettings: () => {
        if (!isBlocked()) panels.open("settings");
      },
    },
    false,
  );
  hud.setVisible(false);
  const stopAudioUi = audio.subscribe(() => hud.setSound(audio.isOn));
  const controls = isTouchDevice() ? new VirtualControls(ui, input) : null;
  controls?.setVisible(false);
  const minigameHud = new MinigameHud(ui);
  const fishing = new FishingCard(ui, {
    caughtTags: () => quests.progress("fishing").seen,
    onCatch: (fish) => {
      audio.play("catch");
      quests.emit({ type: "fish_caught", tag: fish.tag });
    },
    onBite: () => audio.play("bite"),
    onResult: (kind) => {
      if (kind === "early" || kind === "missed") audio.play("miss");
    },
    onChange: (open) => {
      state.fishing = open;
      input.reset();
      freezeWorld(open || state.panel || state.dialog);
      syncUi();
    },
  });
  const director = new QuestDirector(quests, { dialog, panels }, () => ctx.world);
  Object.assign(ctx, { panels, dialog, hud, director, fishing, minigameHud });

  /** Opens the celebration once the player is free (not mid-dialog or mid-panel). */
  let celebrationTimer = 0;
  const celebrateSoon = (attempt = 0): void => {
    window.clearTimeout(celebrationTimer);
    celebrationTimer = window.setTimeout(() => {
      if (!isBlocked()) {
        audio.playJingle();
        panels.open("celebration");
      } else if (attempt < 20) celebrateSoon(attempt + 1);
    }, 1500);
  };
  const refreshQuestUi = (): void => hud.setQuestCount(quests.doneCount, quests.total);
  refreshQuestUi();
  const stopQuestUi = quests.subscribe((notes) => {
    refreshQuestUi();
    for (const note of notes) {
      hud.showQuestToast(describeNotification(note));
      if (note.type === "step" || note.type === "started") audio.play("quest");
      if (note.type === "quest_done") audio.play("complete");
      if (note.type === "all_done") celebrateSoon();
    }
  });

  /** Q opens the quest log and M toggles sound, from anywhere in the game. */
  const onGlobalKey = (e: KeyboardEvent): void => {
    if (e.ctrlKey || e.metaKey || e.altKey || e.repeat) return;
    const tag = (e.target as HTMLElement | null)?.tagName;
    if (tag === "INPUT" || tag === "TEXTAREA") return;
    const key = e.key.toLowerCase();
    if (key === "m" && !state.title) {
      e.preventDefault();
      const on = audio.toggleMuted();
      hud.setSound(on);
      hud.showToast(on ? "Sound on" : "Sound off", 1400);
    } else if (key === "q" && !isBlocked()) {
      e.preventDefault();
      panels.open("quests");
    }
  };
  window.addEventListener("keydown", onGlobalKey);

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
    // Phaser's own sound manager is off: all audio goes through AudioEngine.
    audio: { noAudio: true },
    scene: [new BootScene(ctx), new WorldScene(ctx)],
  });

  if (import.meta.env.DEV) {
    (window as unknown as { __game: Phaser.Game; __audio: AudioEngine }).__game = game;
    (window as unknown as { __audio: AudioEngine }).__audio = audio;
  }

  return {
    destroy: () => {
      closeTitle?.();
      window.removeEventListener("keydown", onGlobalKey);
      stopQuestUi();
      stopAudioUi();
      window.clearTimeout(celebrationTimer);
      fishing.close();
      minigameHud.destroy();
      input.destroy();
      panels.destroy();
      dialog.close();
      hud.destroy();
      controls?.destroy();
      audio.destroy();
      game?.destroy(true);
      game = null;
      root.replaceChildren();
    },
  };
}
