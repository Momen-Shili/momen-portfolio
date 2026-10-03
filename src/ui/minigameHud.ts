import { el } from "./dom";

/** One-line status for a running mini-game (for example the bug counter). Not a live region. */
export class MinigameHud {
  private readonly element: HTMLElement;
  private text = "";

  constructor(root: HTMLElement) {
    this.element = el("div", { class: "minigame-hud", "aria-hidden": "true" });
    this.element.hidden = true;
    root.append(this.element);
  }

  show(text: string): void {
    this.element.hidden = false;
    if (text === this.text) return;
    this.text = text;
    this.element.textContent = text;
  }

  hide(): void {
    this.element.hidden = true;
    this.text = "";
  }

  destroy(): void {
    this.element.remove();
  }
}
