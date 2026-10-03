import { el, isTouchDevice } from "./dom";

/** In-game heads-up display: interaction prompt, toast messages and the sound toggle. */
export class Hud {
  private readonly prompt: HTMLButtonElement;
  private readonly promptText: HTMLElement;
  private readonly toast: HTMLElement;
  private readonly soundBtn: HTMLButtonElement;
  private readonly element: HTMLElement;
  private toastTimer = 0;
  private currentPrompt: string | null = null;

  constructor(
    root: HTMLElement,
    handlers: { onAction(): void; onToggleSound(): boolean; onHelp(): void },
    soundOn: boolean,
  ) {
    const key = el("kbd", {}, isTouchDevice() ? "●" : "E");
    this.promptText = el("span", { class: "hud-prompt-text" });
    this.prompt = el("button", { type: "button", class: "hud-prompt" }, key, this.promptText);
    this.prompt.hidden = true;
    this.toast = el("div", { class: "hud-toast", role: "status", "aria-live": "polite" });

    this.soundBtn = el("button", {
      type: "button",
      class: "hud-btn",
      "aria-pressed": String(soundOn),
    });
    this.setSound(soundOn);
    const help = el(
      "button",
      { type: "button", class: "hud-btn", "aria-label": "Show controls and overview" },
      "?",
    );

    this.element = el(
      "div",
      { class: "hud" },
      el("div", { class: "hud-top" }, this.soundBtn, help),
      this.prompt,
      this.toast,
    );
    root.append(this.element);

    this.prompt.addEventListener("click", (e) => {
      handlers.onAction();
      if (e.detail > 0) this.prompt.blur();
    });
    this.soundBtn.addEventListener("click", (e) => {
      this.setSound(handlers.onToggleSound());
      if (e.detail > 0) this.soundBtn.blur();
    });
    help.addEventListener("click", (e) => {
      handlers.onHelp();
      if (e.detail > 0) help.blur();
    });
  }

  setSound(on: boolean): void {
    this.soundBtn.setAttribute("aria-pressed", String(on));
    this.soundBtn.textContent = on ? "Sound: on" : "Sound: off";
  }

  setPrompt(text: string | null): void {
    if (text === this.currentPrompt) return;
    this.currentPrompt = text;
    this.prompt.hidden = text === null;
    this.promptText.textContent = text ?? "";
  }

  showToast(message: string, ms = 2600): void {
    window.clearTimeout(this.toastTimer);
    this.toast.textContent = message;
    this.toast.classList.add("is-visible");
    this.toastTimer = window.setTimeout(() => this.toast.classList.remove("is-visible"), ms);
  }

  setVisible(visible: boolean): void {
    this.element.hidden = !visible;
  }

  destroy(): void {
    window.clearTimeout(this.toastTimer);
    this.element.remove();
  }
}
