import { DialogRunner, type DialogLine } from "../systems/dialog";
import { el } from "./dom";

/** NPC speech box. Advances with E / Space / Enter or a click, closes with Esc. */
export class DialogBox {
  private box: HTMLElement | null = null;
  private runner: DialogRunner | null = null;
  private returnFocus: HTMLElement | null = null;
  private speaker!: HTMLElement;
  private text!: HTMLElement;
  private next!: HTMLButtonElement;
  private onClose: (() => void) | null = null;

  constructor(
    private readonly root: HTMLElement,
    private readonly onChange: (open: boolean) => void,
  ) {}

  get isOpen(): boolean {
    return this.box !== null;
  }

  /** `onClose` runs after the box closes, however it was closed (finished or Esc). */
  open(lines: readonly DialogLine[], onClose?: () => void): void {
    this.onClose = null;
    if (this.box) this.close();
    this.onClose = onClose ?? null;
    this.runner = new DialogRunner(lines);
    this.returnFocus =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    this.speaker = el("p", { class: "dialog-speaker" });
    this.text = el("p", { class: "dialog-text" });
    this.next = el("button", { type: "button", class: "dialog-next" }, "Next");
    this.box = el(
      "div",
      { class: "dialog-box", role: "dialog", "aria-label": "Conversation", "aria-live": "polite" },
      this.speaker,
      this.text,
      this.next,
    );
    this.next.addEventListener("click", () => this.advance());
    this.root.append(this.box);
    window.addEventListener("keydown", this.onKeyDown, true);
    this.render();
    this.onChange(true);
    this.next.focus({ preventScroll: true });
  }

  close(): void {
    if (!this.box) return;
    window.removeEventListener("keydown", this.onKeyDown, true);
    this.box.remove();
    this.box = null;
    this.runner = null;
    this.onChange(false);
    const target = this.returnFocus;
    this.returnFocus = null;
    if (target && document.contains(target)) target.focus({ preventScroll: true });
    const callback = this.onClose;
    this.onClose = null;
    callback?.();
  }

  private advance(): void {
    if (!this.runner) return;
    if (this.runner.advance()) this.close();
    else this.render();
  }

  private render(): void {
    if (!this.runner) return;
    const { speaker, text } = this.runner.current;
    const { index, total } = this.runner.position;
    this.speaker.textContent = speaker;
    this.text.textContent = text;
    this.next.textContent = this.runner.isLast ? "Close" : `Next (${index}/${total})`;
  }

  private readonly onKeyDown = (event: KeyboardEvent): void => {
    if (event.key === "Escape") {
      event.preventDefault();
      this.close();
      return;
    }
    const isAdvanceKey =
      event.key === "e" || event.key === "E" || event.key === " " || event.key === "Enter";
    if (!isAdvanceKey || event.repeat) return;
    // On the focused button, Space/Enter already trigger a click.
    if (event.target === this.next && (event.key === " " || event.key === "Enter")) return;
    event.preventDefault();
    this.advance();
  };
}
