import { clampFrame } from "./timing";

export const BUG_TARGET = 7;
export const BUG_COUNT = 10;
export const BUG_TIME_MS = 30_000;
const BASE_SPEED = 26;

export interface Bug {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  /** Milliseconds until the bug picks a new direction. */
  turnIn: number;
}

export interface BugArea {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

export type BugHuntStatus = "running" | "won" | "timeout";

export interface BugHuntOptions {
  rng: () => number;
  area: BugArea;
  /** True when the world pixel is not walkable (fountain, benches, lamps...). */
  isBlocked: (x: number, y: number) => boolean;
  /** Reduced motion: slower bugs and double the time. */
  gentle?: boolean;
}

/** Bug hunt rules and bug movement. Rendering lives in the scene; this has no Phaser in it. */
export class BugHunt {
  readonly bugs: Bug[] = [];
  caught = 0;
  timeLeft: number;
  status: BugHuntStatus = "running";
  private readonly speed: number;

  constructor(private readonly opts: BugHuntOptions) {
    this.timeLeft = opts.gentle ? BUG_TIME_MS * 2 : BUG_TIME_MS;
    this.speed = opts.gentle ? BASE_SPEED / 2 : BASE_SPEED;
    for (let id = 0; id < BUG_COUNT; id++) this.bugs.push(this.spawn(id));
  }

  get remaining(): number {
    return Math.max(0, BUG_TARGET - this.caught);
  }

  private spawn(id: number): Bug {
    const { area, rng, isBlocked } = this.opts;
    let x = area.x0;
    let y = area.y0;
    for (let tries = 0; tries < 60; tries++) {
      x = area.x0 + rng() * (area.x1 - area.x0);
      y = area.y0 + rng() * (area.y1 - area.y0);
      if (!isBlocked(x, y)) break;
    }
    return { id, x, y, ...this.heading(), turnIn: this.nextTurn() };
  }

  private heading(): { vx: number; vy: number } {
    const angle = this.opts.rng() * Math.PI * 2;
    return { vx: Math.cos(angle) * this.speed, vy: Math.sin(angle) * this.speed };
  }

  private nextTurn(): number {
    return 700 + this.opts.rng() * 900;
  }

  update(rawDtMs: number): void {
    if (this.status !== "running") return;
    const dtMs = clampFrame(rawDtMs);
    this.timeLeft = Math.max(0, this.timeLeft - dtMs);
    const dt = dtMs / 1000;
    const { area, isBlocked } = this.opts;
    for (const bug of this.bugs) {
      bug.turnIn -= dtMs;
      if (bug.turnIn <= 0) {
        Object.assign(bug, this.heading());
        bug.turnIn = this.nextTurn();
      }
      const nx = bug.x + bug.vx * dt;
      const ny = bug.y + bug.vy * dt;
      const xOk = nx >= area.x0 && nx <= area.x1 && !isBlocked(nx, bug.y);
      const yOk = ny >= area.y0 && ny <= area.y1 && !isBlocked(bug.x, ny);
      // Bounce off walls and obstacles by turning around on the blocked axis.
      if (xOk) bug.x = nx;
      else bug.vx = -bug.vx;
      if (yOk) bug.y = ny;
      else bug.vy = -bug.vy;
    }
    if (this.timeLeft <= 0) this.status = "timeout";
  }

  /** Removes a bug. Returns true if it was there. Reaching the target wins the game. */
  squash(id: number): boolean {
    if (this.status !== "running") return false;
    const index = this.bugs.findIndex((b) => b.id === id);
    if (index < 0) return false;
    this.bugs.splice(index, 1);
    this.caught += 1;
    if (this.caught >= BUG_TARGET) this.status = "won";
    return true;
  }

  /** Id of the nearest bug within `radius` of a point (player feet or a tap), or null. */
  bugNear(x: number, y: number, radius: number): number | null {
    let best: Bug | null = null;
    let bestDist = radius;
    for (const bug of this.bugs) {
      const d = Math.hypot(bug.x - x, bug.y - y);
      if (d <= bestDist) {
        best = bug;
        bestDist = d;
      }
    }
    return best ? best.id : null;
  }
}
