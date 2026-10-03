import { PROJECTS } from "../../../content/portfolio";
import { clampFrame } from "./timing";

export interface Fish {
  /** The project tag the fish is named after. */
  tag: string;
  /** Projects that use that tag, straight from the content file. */
  projects: string[];
}

export type FishPhase = "waiting" | "bite" | "ended";
export type FishingResult = { kind: "early" } | { kind: "caught"; fish: Fish } | { kind: "missed" };

export interface FishingConfig {
  minWaitMs: number;
  maxWaitMs: number;
  biteWindowMs: number;
}

export const DEFAULT_FISHING: FishingConfig = {
  minWaitMs: 1500,
  maxWaitMs: 4000,
  biteWindowMs: 1600,
};

/** Every distinct tag across the projects, with the projects that carry it. */
export function allFish(): Fish[] {
  const byTag = new Map<string, string[]>();
  for (const project of PROJECTS) {
    for (const tag of project.tags) byTag.set(tag, [...(byTag.get(tag) ?? []), project.name]);
  }
  return [...byTag.entries()].map(([tag, projects]) => ({ tag, projects }));
}

/** Picks a fish, favouring tags the player has not caught yet so three distinct catches stay easy. */
export function pickFish(rng: () => number, caughtTags: readonly string[]): Fish {
  const fish = allFish();
  const weights = fish.map((f) => (caughtTags.includes(f.tag) ? 1 : 3));
  let roll = rng() * weights.reduce((a, b) => a + b, 0);
  for (const [i, f] of fish.entries()) {
    roll -= weights[i] ?? 1;
    if (roll < 0) return f;
  }
  return fish[fish.length - 1] as Fish;
}

/**
 * One cast. Wait for the bite, press inside the window to catch. Pressing early only spooks the
 * fish (the wait restarts); missing the window ends the cast. There is no penalty either way.
 */
export class FishingSession {
  phase: FishPhase = "waiting";
  private timer: number;

  constructor(
    private readonly rng: () => number,
    private readonly caughtTags: readonly string[],
    private readonly config: FishingConfig = DEFAULT_FISHING,
  ) {
    this.timer = this.nextWait();
  }

  private nextWait(): number {
    const { minWaitMs, maxWaitMs } = this.config;
    return minWaitMs + this.rng() * (maxWaitMs - minWaitMs);
  }

  /** Advances time. Returns "missed" when the bite window runs out. */
  update(dtMs: number): FishingResult | null {
    if (this.phase === "ended") return null;
    this.timer -= clampFrame(dtMs);
    if (this.timer > 0) return null;
    if (this.phase === "waiting") {
      this.phase = "bite";
      this.timer = this.config.biteWindowMs;
      return null;
    }
    this.phase = "ended";
    return { kind: "missed" };
  }

  press(): FishingResult | null {
    if (this.phase === "ended") return null;
    if (this.phase === "waiting") {
      this.timer = this.nextWait();
      return { kind: "early" };
    }
    this.phase = "ended";
    return { kind: "caught", fish: pickFish(this.rng, this.caughtTags) };
  }
}
