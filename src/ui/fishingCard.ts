import { FishingSession, type Fish, type FishingResult } from "../systems/quests/minigames/fishing";
import { bidiNames, el } from "./dom";

export interface FishingHandlers {
  /** Tags already caught for the quest, so new catches are favoured. */
  caughtTags(): readonly string[];
  onCatch(fish: Fish): void;
  onChange(open: boolean): void;
  /** Sound hooks. */
  onBite?(): void;
  onResult?(kind: FishingResult["kind"]): void;
}

/**
 * Fishing mini-game card (real DOM, keyboard and touch operable). Cast, wait for the bobber to
 * dip, then press E / Space / Enter or the button. Esc stops fishing. No failure state.
 */
export class FishingCard {
  private box: HTMLElement | null = null;
  private session: FishingSession | null = null;
  private status!: HTMLElement;
  private bobber!: HTMLElement;
  private action!: HTMLButtonElement;
  private raf = 0;
  private last = 0;
  private returnFocus: HTMLElement | null = null;

  constructor(
    private readonly root: HTMLElement,
    private readonly handlers: FishingHandlers,
    private readonly rng: () => number = Math.random,
  ) {}

  get isOpen(): boolean {
    return this.box !== null;
  }

  open(): void {
    if (this.box) return;
    this.returnFocus =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    this.status = el("p", { class: "fishing-status", role: "status", "aria-live": "polite" });
    this.bobber = el("div", { class: "bobber", "aria-hidden": "true" });
    this.action = el("button", { type: "button", class: "btn-primary fishing-action" }, "Reel in");
    const stop = el("button", { type: "button", class: "btn-ghost" }, "Stop fishing");
    this.box = el(
      "div",
      { class: "fishing-card", role: "dialog", "aria-label": "Fishing" },
      el("div", { class: "fishing-pond", "aria-hidden": "true" }, this.bobber),
      this.status,
      el("div", { class: "fishing-buttons" }, this.action, stop),
      el("p", { class: "fishing-hint" }, "E / Space / Enter to cast and reel in. Esc to stop."),
    );
    this.root.append(this.box);
    window.addEventListener("keydown", this.onKeyDown, true);
    this.action.addEventListener("click", () => this.press());
    stop.addEventListener("click", () => this.close());
    this.handlers.onChange(true);
    this.cast();
    this.action.focus({ preventScroll: true });
  }

  close(): void {
    if (!this.box) return;
    window.cancelAnimationFrame(this.raf);
    window.removeEventListener("keydown", this.onKeyDown, true);
    this.box.remove();
    this.box = null;
    this.session = null;
    this.handlers.onChange(false);
    const target = this.returnFocus;
    this.returnFocus = null;
    if (target && document.contains(target)) target.focus({ preventScroll: true });
  }

  private cast(): void {
    this.session = new FishingSession(this.rng, this.handlers.caughtTags());
    this.bobber.className = "bobber";
    this.action.textContent = "Reel in";
    this.status.textContent = "Waiting for a bite…";
    this.last = performance.now();
    window.cancelAnimationFrame(this.raf);
    this.raf = window.requestAnimationFrame(this.tick);
  }

  private readonly tick = (now: number): void => {
    const session = this.session;
    if (!session || !this.box) return;
    const wasBite = session.phase === "bite";
    const result = session.update(now - this.last);
    this.last = now;
    if (!wasBite && session.phase === "bite") {
      this.bobber.className = "bobber is-bite";
      this.status.textContent = "A bite! Press E now!";
      this.handlers.onBite?.();
    }
    if (result) this.finish(result);
    else this.raf = window.requestAnimationFrame(this.tick);
  };

  private press(): void {
    const session = this.session;
    // Once a cast has ended, the same button casts again.
    if (!session || session.phase === "ended") {
      this.cast();
      return;
    }
    const result = session.press();
    if (result) this.finish(result);
  }

  private finish(result: FishingResult): void {
    this.handlers.onResult?.(result.kind);
    if (result.kind === "early") {
      this.status.textContent = "Too early! You spooked the fish. Wait for the bobber to dip.";
      this.raf = window.requestAnimationFrame((t) => {
        this.last = t;
        this.raf = window.requestAnimationFrame(this.tick);
      });
      return;
    }
    window.cancelAnimationFrame(this.raf);
    this.bobber.className = "bobber";
    this.action.textContent = "Cast again";
    if (result.kind === "caught") {
      const { tag, projects } = result.fish;
      this.status.replaceChildren(
        `You caught a ${tag} fish! It belongs to `,
        ...bidiNames(projects),
        ".",
      );
      this.handlers.onCatch(result.fish);
    } else {
      this.status.textContent = "It got away! Cast again whenever you like.";
    }
  }

  private readonly onKeyDown = (event: KeyboardEvent): void => {
    if (event.key === "Escape") {
      event.preventDefault();
      this.close();
      return;
    }
    const advance =
      event.key === "e" || event.key === "E" || event.key === " " || event.key === "Enter";
    if (!advance || event.repeat) return;
    // On a focused button, Space/Enter already click it.
    const onButton = (event.target as HTMLElement | null)?.tagName === "BUTTON";
    if (onButton && (event.key === " " || event.key === "Enter")) return;
    event.preventDefault();
    this.press();
  };
}
