export interface Axis {
  x: number;
  y: number;
}

const LEFT = new Set(["arrowleft", "a"]);
const RIGHT = new Set(["arrowright", "d"]);
const UP = new Set(["arrowup", "w"]);
const DOWN = new Set(["arrowdown", "s"]);
const ACTION = new Set(["e", " ", "spacebar"]);
const GAME_KEYS = new Set([...LEFT, ...RIGHT, ...UP, ...DOWN, ...ACTION]);

function isTypingTarget(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  if (!el || typeof el.tagName !== "string") return false;
  return el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable === true;
}

/** Normalises a raw axis so diagonals are not faster than straight lines. */
export function normalizeAxis(x: number, y: number): Axis {
  const len = Math.hypot(x, y);
  if (len === 0) return { x: 0, y: 0 };
  const scale = len > 1 ? 1 / len : 1;
  return { x: x * scale, y: y * scale };
}

/**
 * Keyboard + virtual-joystick input. Phaser's own keyboard plugin is not used because its
 * key capture would swallow typing in the contact form and the terminal.
 */
export class InputState {
  private readonly held = new Set<string>();
  private virtual: Axis = { x: 0, y: 0 };
  private actionQueued = false;

  constructor(
    private readonly target: EventTarget,
    private readonly isBlocked: () => boolean = () => false,
  ) {
    target.addEventListener("keydown", this.onKeyDown as EventListener);
    target.addEventListener("keyup", this.onKeyUp as EventListener);
    target.addEventListener("blur", this.reset);
  }

  destroy(): void {
    this.target.removeEventListener("keydown", this.onKeyDown as EventListener);
    this.target.removeEventListener("keyup", this.onKeyUp as EventListener);
    this.target.removeEventListener("blur", this.reset);
  }

  readonly reset = (): void => {
    this.held.clear();
    this.virtual = { x: 0, y: 0 };
    this.actionQueued = false;
  };

  private readonly onKeyDown = (e: KeyboardEvent): void => {
    const key = e.key.toLowerCase();
    if (!GAME_KEYS.has(key)) return;
    if (isTypingTarget(e.target) || this.isBlocked()) return;
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    // Space on a focused button or link must still activate it natively.
    const el = e.target as HTMLElement | null;
    const onControl = el?.tagName === "BUTTON" || el?.tagName === "A";
    const nativeSpace = onControl && (key === " " || key === "spacebar");
    if (nativeSpace) return;
    e.preventDefault();
    if (ACTION.has(key)) {
      if (!e.repeat) this.actionQueued = true;
      return;
    }
    this.held.add(key);
  };

  private readonly onKeyUp = (e: KeyboardEvent): void => {
    this.held.delete(e.key.toLowerCase());
  };

  setVirtualAxis(x: number, y: number): void {
    this.virtual = { x, y };
  }

  pressAction(): void {
    this.actionQueued = true;
  }

  /** Raw axis from keys and joystick, clamped to a unit circle. */
  getAxis(): Axis {
    const has = (set: Set<string>) => [...set].some((k) => this.held.has(k));
    const kx = (has(RIGHT) ? 1 : 0) - (has(LEFT) ? 1 : 0);
    const ky = (has(DOWN) ? 1 : 0) - (has(UP) ? 1 : 0);
    if (kx !== 0 || ky !== 0) return normalizeAxis(kx, ky);
    return normalizeAxis(this.virtual.x, this.virtual.y);
  }

  /** True once per press of E / Space / the on-screen action button. */
  consumeAction(): boolean {
    const pressed = this.actionQueued;
    this.actionQueued = false;
    return pressed;
  }
}
