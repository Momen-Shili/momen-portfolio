import { describe, expect, it } from "vitest";
import { FUN_FACTS, PROJECTS } from "../src/content/portfolio";
import { achievementLines, funFactLine, SECRET_ART } from "../src/systems/quests/helpers";
import {
  BUG_COUNT,
  BUG_TARGET,
  BUG_TIME_MS,
  BugHunt,
} from "../src/systems/quests/minigames/bugHunt";
import {
  DEFAULT_FISHING,
  FishingSession,
  allFish,
  pickFish,
} from "../src/systems/quests/minigames/fishing";
import { IdleTracker } from "../src/systems/quests/minigames/idle";
import { MAX_FRAME_MS, clampFrame } from "../src/systems/quests/minigames/timing";
import { QUIZ_ROUNDS, buildQuiz } from "../src/systems/quests/minigames/quiz";
import { QuestEngine } from "../src/systems/quests/engine";
import { QUESTS } from "../src/systems/quests/definitions";
import { planTalk } from "../src/systems/quests/npcTalk";
import { ProgressStore } from "../src/systems/quests/storage";
import { runCommand } from "../src/systems/terminal";

/** Small deterministic PRNG so tests do not depend on Math.random. */
function seeded(seed: number): () => number {
  let a = seed;
  return () => {
    a = (a * 1664525 + 1013904223) % 4294967296;
    return a / 4294967296;
  };
}

/** Runs an update function in small steps, the way a real frame loop would. */
function stepFor(ms: number, update: (dt: number) => unknown, step = 50): void {
  for (let t = 0; t < ms; t += step) update(Math.min(step, ms - t));
}

const memory = () => {
  const data = new Map<string, string>();
  return {
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => void data.set(k, v),
    removeItem: (k: string) => void data.delete(k),
  };
};
const freshEngine = () => new QuestEngine(QUESTS, new ProgressStore(memory(), QUESTS));

describe("BugHunt", () => {
  const area = { x0: 0, y0: 0, x1: 160, y1: 120 };
  const make = (over: Partial<ConstructorParameters<typeof BugHunt>[0]> = {}) =>
    new BugHunt({ rng: seeded(7), area, isBlocked: () => false, ...over });

  it("spawns the bugs inside the area on free ground", () => {
    const blocked = (x: number) => x > 80; // the right half is an obstacle
    const hunt = make({ isBlocked: blocked });
    expect(hunt.bugs).toHaveLength(BUG_COUNT);
    for (const b of hunt.bugs) {
      expect(b.x).toBeGreaterThanOrEqual(0);
      expect(b.x).toBeLessThanOrEqual(80);
    }
  });

  it("keeps bugs inside the area and out of obstacles while running", () => {
    const blocked = (x: number, y: number) => x > 60 && x < 90 && y > 40 && y < 80;
    const hunt = make({ isBlocked: blocked });
    for (let i = 0; i < 600; i++) hunt.update(50);
    for (const b of hunt.bugs) {
      expect(b.x).toBeGreaterThanOrEqual(area.x0);
      expect(b.x).toBeLessThanOrEqual(area.x1);
      expect(b.y).toBeGreaterThanOrEqual(area.y0);
      expect(b.y).toBeLessThanOrEqual(area.y1);
      expect(blocked(b.x, b.y)).toBe(false);
    }
  });

  it("wins when the target number of bugs is squashed and then stops", () => {
    const hunt = make();
    const ids = hunt.bugs.slice(0, BUG_TARGET).map((b) => b.id);
    ids.forEach((id, i) => {
      expect(hunt.squash(id)).toBe(true);
      expect(hunt.status).toBe(i === BUG_TARGET - 1 ? "won" : "running");
    });
    expect(hunt.caught).toBe(BUG_TARGET);
    const remaining = hunt.bugs[0];
    expect(remaining && hunt.squash(remaining.id)).toBe(false);
  });

  it("times out without a fail state beyond that, and can be restarted with a new hunt", () => {
    const hunt = make();
    stepFor(BUG_TIME_MS + 1, (dt) => hunt.update(dt));
    expect(hunt.status).toBe("timeout");
    expect(hunt.timeLeft).toBe(0);
    const before = JSON.stringify(hunt.bugs);
    hunt.update(1000);
    expect(JSON.stringify(hunt.bugs)).toBe(before);
    expect(make().status).toBe("running");
  });

  it("is gentler with reduced motion: more time and slower bugs", () => {
    const normal = make();
    const gentle = make({ gentle: true });
    expect(gentle.timeLeft).toBe(normal.timeLeft * 2);
    const speed = (h: BugHunt) => Math.hypot(h.bugs[0]?.vx ?? 0, h.bugs[0]?.vy ?? 0);
    expect(speed(gentle)).toBeCloseTo(speed(normal) / 2);
  });

  it("finds the nearest bug within a radius (walk-into and tap)", () => {
    const hunt = make();
    const bug = hunt.bugs[0];
    if (!bug) throw new Error("no bug");
    expect(hunt.bugNear(bug.x + 2, bug.y + 2, 5)).not.toBeNull();
    expect(hunt.bugNear(-500, -500, 5)).toBeNull();
  });
});

describe("fishing", () => {
  it("builds fish from the project tags, with the projects that use them", () => {
    const fish = allFish();
    const tags = new Set(PROJECTS.flatMap((p) => p.tags));
    expect(fish.map((f) => f.tag).sort()).toEqual([...tags].sort());
    const supabase = fish.find((f) => f.tag === "Supabase");
    expect(supabase?.projects).toEqual(["Mentra", "Dari (دار)"]);
    for (const f of fish) {
      for (const name of f.projects) {
        expect(PROJECTS.find((p) => p.name === name)?.tags).toContain(f.tag);
      }
    }
  });

  it("favours fish the player has not caught yet", () => {
    const rng = seeded(3);
    const caught = allFish()
      .slice(0, allFish().length - 1)
      .map((f) => f.tag);
    let newOnes = 0;
    for (let i = 0; i < 400; i++) if (!caught.includes(pickFish(rng, caught).tag)) newOnes++;
    expect(newOnes).toBeGreaterThan(400 / allFish().length);
  });

  it("bites after the wait and lets the player catch inside the window", () => {
    const s = new FishingSession(() => 0, []);
    expect(s.phase).toBe("waiting");
    stepFor(DEFAULT_FISHING.minWaitMs - 1, (dt) => s.update(dt), 10);
    expect(s.phase).toBe("waiting");
    expect(s.update(2)).toBeNull();
    expect(s.phase).toBe("bite");
    const result = s.press();
    expect(result?.kind).toBe("caught");
    expect(s.phase).toBe("ended");
    expect(s.press()).toBeNull();
  });

  it("only spooks the fish when pressed early, then keeps waiting", () => {
    const s = new FishingSession(() => 0, []);
    expect(s.press()).toEqual({ kind: "early" });
    expect(s.phase).toBe("waiting");
    stepFor(DEFAULT_FISHING.minWaitMs + 1, (dt) => s.update(dt));
    expect(s.phase).toBe("bite");
  });

  it("lets the fish get away when the bite window passes", () => {
    const s = new FishingSession(() => 0, []);
    stepFor(DEFAULT_FISHING.minWaitMs + 1, (dt) => s.update(dt));
    const results: unknown[] = [];
    stepFor(DEFAULT_FISHING.biteWindowMs + 100, (dt) => results.push(s.update(dt)));
    expect(results).toContainEqual({ kind: "missed" });
    expect(s.phase).toBe("ended");
    expect(s.update(1000)).toBeNull();
  });
});

describe("quiz", () => {
  it("builds four rounds with one correct tag and two wrong ones", () => {
    for (let seed = 1; seed <= 25; seed++) {
      const rounds = buildQuiz(seeded(seed));
      expect(rounds).toHaveLength(QUIZ_ROUNDS);
      expect(new Set(rounds.map((r) => r.project)).size).toBe(QUIZ_ROUNDS);
      for (const round of rounds) {
        const project = PROJECTS.find((p) => p.name === round.project);
        expect(project).toBeDefined();
        expect(round.options).toHaveLength(3);
        expect(new Set(round.options).size).toBe(3);
        const right = round.options.filter((o) => project?.tags.includes(o));
        expect(right).toEqual([round.answer]);
        expect(round.projectTags).toEqual(project?.tags);
      }
    }
  });
});

describe("night watch", () => {
  it("fires once after ten still seconds in the zone", () => {
    const idle = new IdleTracker(10_000);
    const still = { inZone: true, moving: false };
    let fired = 0;
    stepFor(9_900, (dt) => idle.update(dt, still) && fired++, 100);
    expect(fired).toBe(0);
    stepFor(200, (dt) => idle.update(dt, still) && fired++, 100);
    expect(fired).toBe(1);
    stepFor(5_000, (dt) => idle.update(dt, still) && fired++, 100);
    expect(fired).toBe(1);
  });

  it("resets when the player moves or leaves the zone", () => {
    const idle = new IdleTracker(1000);
    const still = { inZone: true, moving: false };
    stepFor(900, (dt) => idle.update(dt, still), 50);
    idle.update(16, { inZone: true, moving: true });
    let fired = false;
    stepFor(900, (dt) => (fired ||= idle.update(dt, still)), 50);
    expect(fired).toBe(false);
    idle.update(16, { inZone: false, moving: false });
    stepFor(900, (dt) => (fired ||= idle.update(dt, still)), 50);
    expect(fired).toBe(false);
    stepFor(200, (dt) => (fired ||= idle.update(dt, still)), 50);
    expect(fired).toBe(true);
  });
});

describe("terminal additions", () => {
  it("hides the secret command from help but runs it and reports the quest event", () => {
    expect(runCommand("help").lines.join("\n")).not.toContain("xyzzy");
    const result = runCommand("XYZZY");
    expect(result.lines).toEqual([...SECRET_ART]);
    expect(result.events).toEqual([{ type: "command_run", command: "xyzzy" }]);
  });

  it("lists achievements, with and without quest data", () => {
    expect(runCommand("help").lines.join("\n")).toContain("achievements");
    expect(runCommand("achievements").lines.join(" ")).toContain("No quest data");
    const engine = freshEngine();
    const out = runCommand("achievements", { achievements: () => achievementLines(engine) }).lines;
    expect(out[0]).toBe("Quests: 0 / 7 complete");
    expect(out).toHaveLength(8);
  });

  it("shows done, in-progress and locked quests distinctly", () => {
    const engine = freshEngine();
    engine.emit({ type: "npc_talked", npc: "clerk" });
    engine.emit({ type: "parcel_delivered" });
    engine.emit({ type: "item_collected", id: "gem-advanced" });
    const lines = achievementLines(engine);
    expect(lines).toContain("  [x] Special delivery - Courier");
    expect(lines).toContain("  [ ] Skill gems (1/3)");
    expect(lines.some((l) => l.startsWith("  [ ] ???"))).toBe(true);
    expect(lines.join("\n")).not.toContain("Bug hunt");
  });
});

describe("NPC quest dialog", () => {
  it("makes the guide offer the bug hunt, then only a retry, then nothing", () => {
    const engine = freshEngine();
    expect(planTalk("guide", engine)?.after).toEqual([{ type: "start_bug_hunt" }]);
    engine.emit({ type: "npc_talked", npc: "guide" });
    expect(planTalk("guide", engine)?.after).toEqual([{ type: "start_bug_hunt" }]);
    engine.emit({ type: "minigame_won", game: "bug-hunt" });
    expect(planTalk("guide", engine)?.after).toEqual([]);
  });

  it("makes the librarian hint at the secret and offer the quiz until it is done", () => {
    const engine = freshEngine();
    const first = planTalk("reader", engine);
    expect(first?.lines.map((l) => l.text).join(" ")).toContain("ancient cave adventure");
    expect(first?.after).toEqual([{ type: "open_quiz" }]);
    engine.emit({ type: "npc_talked", npc: "reader" });
    engine.emit({ type: "quiz_completed", correct: 4, rounds: 4 });
    engine.emit({ type: "command_run", command: "xyzzy" });
    const later = planTalk("reader", engine);
    expect(later?.after).toEqual([]);
    expect(later?.lines.map((l) => l.text).join(" ")).not.toContain("cave");
  });
});

describe("fun facts", () => {
  it("is empty by default and degrades gracefully", () => {
    expect(Array.isArray(FUN_FACTS)).toBe(true);
    expect(FUN_FACTS).toHaveLength(0);
    expect(funFactLine()).toBeNull();
    const lines = planTalk("guide", freshEngine())?.lines.map((l) => l.text) ?? [];
    expect(lines.some((t) => t.startsWith("Fun fact"))).toBe(false);
  });

  it("is used when it has entries", () => {
    FUN_FACTS.push("Test fact.");
    try {
      expect(funFactLine(() => 0)).toBe("Test fact.");
      const lines = planTalk("guide", freshEngine(), () => 0)?.lines.map((l) => l.text) ?? [];
      expect(lines).toContain("Fun fact: Test fact.");
    } finally {
      FUN_FACTS.length = 0;
    }
  });
});

describe("frame clamp (tab refocus, slow devices)", () => {
  it("caps a single huge step so the bug hunt cannot time out in one frame", () => {
    const hunt = new BugHunt({
      rng: seeded(5),
      area: { x0: 0, y0: 0, x1: 160, y1: 120 },
      isBlocked: () => false,
    });
    hunt.update(60_000);
    expect(hunt.status).toBe("running");
    expect(hunt.timeLeft).toBeGreaterThan(BUG_TIME_MS - 200);
  });

  it("keeps bugs out of obstacles even after a huge step", () => {
    const blocked = (x: number) => x > 70 && x < 90;
    const hunt = new BugHunt({
      rng: seeded(9),
      area: { x0: 0, y0: 0, x1: 160, y1: 120 },
      isBlocked: blocked,
    });
    hunt.update(30_000);
    for (const b of hunt.bugs) expect(blocked(b.x)).toBe(false);
  });

  it("does not let a hidden tab complete night watch or end a fishing bite window", () => {
    const idle = new IdleTracker(10_000);
    expect(idle.update(600_000, { inZone: true, moving: false })).toBe(false);
    const s = new FishingSession(() => 0, []);
    expect(s.update(600_000)).toBeNull();
    expect(s.phase).toBe("waiting");
  });

  it("ignores negative and non-finite steps", () => {
    expect(clampFrame(-5)).toBe(0);
    expect(clampFrame(Number.NaN)).toBe(0);
    expect(clampFrame(Number.POSITIVE_INFINITY)).toBe(0);
    expect(clampFrame(40)).toBe(40);
    expect(clampFrame(10_000)).toBe(MAX_FRAME_MS);
  });
});
