import { el, isTouchDevice } from "./dom";

export interface HudHandlers {
  onAction(): void;
  onToggleSound(): boolean;
  onHelp(): void;
  onQuests(): void;
  onSettings(): void;
}

/** In-game heads-up display: interaction prompt, toasts, quest button and the sound toggle. */
export class Hud {
  private readonly prompt: HTMLButtonElement;
  private readonly promptText: HTMLElement;
  private readonly questToasts: HTMLElement;
  private readonly soundBtn: HTMLButtonElement;
  private readonly questBtn: HTMLButtonElement;
  private readonly element: HTMLElement;
  private readonly questTimers = new Set<number>();
  private currentPrompt: string | null = null;

  constructor(root: HTMLElement, handlers: HudHandlers, soundOn: boolean) {
    const key = el("kbd", {}, isTouchDevice() ? "●" : "E");
    this.promptText = el("span", { class: "hud-prompt-text" });
    this.prompt = el("button", { type: "button", class: "hud-prompt" }, key, this.promptText);
    this.prompt.hidden = true;
    this.questToasts = el("div", { class: "quest-toasts", role: "status", "aria-live": "polite" });

    this.soundBtn = el("button", { type: "button", class: "hud-btn" });
    this.setSound(soundOn);
    this.questBtn = el("button", {
      type: "button",
      class: "hud-btn",
      "aria-keyshortcuts": "Q",
    });
    this.setQuestCount(0, 0);
    const settings = el(
      "button",
      { type: "button", class: "hud-btn", "aria-label": "Audio settings" },
      "Audio",
    );
    const help = el(
      "button",
      { type: "button", class: "hud-btn", "aria-label": "Show controls and overview" },
      "?",
    );

    this.element = el(
      "div",
      { class: "hud" },
      el("div", { class: "hud-top" }, this.questBtn, this.soundBtn, settings, help),
      this.prompt,
      this.questToasts,
    );
    root.append(this.element);

    const press = (button: HTMLButtonElement, run: () => void): void => {
      button.addEventListener("click", (e) => {
        run();
        // Mouse clicks should not leave focus on the button, or Space would re-trigger it.
        if (e.detail > 0) button.blur();
      });
    };
    press(this.prompt, handlers.onAction);
    press(this.soundBtn, () => this.setSound(handlers.onToggleSound()));
    press(this.questBtn, handlers.onQuests);
    press(settings, handlers.onSettings);
    press(help, handlers.onHelp);
  }

  setSound(on: boolean): void {
    this.soundBtn.setAttribute("aria-pressed", String(on));
    this.soundBtn.textContent = on ? "Sound: on" : "Sound: off";
  }

  setQuestCount(done: number, total: number): void {
    this.questBtn.textContent = `Quests ${done}/${total}`;
    this.questBtn.setAttribute("aria-label", `Quest log, ${done} of ${total} complete`);
  }

  setPrompt(text: string | null): void {
    if (text === this.currentPrompt) return;
    this.currentPrompt = text;
    this.prompt.hidden = text === null;
    this.promptText.textContent = text ?? "";
  }

  /** General short message. Shares one stack with quest toasts so they never overlap. */
  showToast(message: string, ms = 2600): void {
    this.showQuestToast(message, ms);
  }

  /** Small non-blocking message for quest progress. Several can stack; each fades on its own. */
  showQuestToast(message: string, ms = 4200): void {
    const item = el("p", { class: "quest-toast" }, message);
    this.questToasts.append(item);
    while (this.questToasts.children.length > 3) this.questToasts.firstElementChild?.remove();
    const timer = window.setTimeout(() => {
      item.remove();
      this.questTimers.delete(timer);
    }, ms);
    this.questTimers.add(timer);
  }

  setVisible(visible: boolean): void {
    this.element.hidden = !visible;
  }

  destroy(): void {
    for (const timer of this.questTimers) window.clearTimeout(timer);
    this.questTimers.clear();
    this.element.remove();
  }
}
