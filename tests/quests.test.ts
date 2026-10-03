import { describe, expect, it, vi } from "vitest";
import { PROJECTS, SKILLS } from "../src/content/portfolio";
import { QuestEngine, matches } from "../src/systems/quests/engine";
import { QUESTS } from "../src/systems/quests/definitions";
import { GEM_IDS, gemLines, pickHighlight } from "../src/systems/quests/helpers";
import {
  ProgressStore,
  QUEST_KEY,
  createSafeStorage,
  initialState,
  parseState,
  type KeyValueStorage,
} from "../src/systems/quests/storage";
import type { QuestDef } from "../src/systems/quests/types";

function memoryStorage(): KeyValueStorage & { data: Map<string, string> } {
  const data = new Map<string, string>();
  return {
    data,
    getItem: (k) => data.get(k) ?? null,
    setItem: (k, v) => void data.set(k, v),
    removeItem: (k) => void data.delete(k),
  };
}

const engineWith = (defs: readonly QuestDef[] = QUESTS, storage = memoryStorage()) => ({
  engine: new QuestEngine(defs, new ProgressStore(storage, defs)),
  storage,
});

describe("trigger matching", () => {
  it("needs the same type and every where-field", () => {
    expect(
      matches(
        { type: "npc_talked", where: { npc: "clerk" } },
        { type: "npc_talked", npc: "clerk" },
      ),
    ).toBe(true);
    expect(
      matches(
        { type: "npc_talked", where: { npc: "clerk" } },
        { type: "npc_talked", npc: "guide" },
      ),
    ).toBe(false);
    expect(matches({ type: "npc_talked" }, { type: "parcel_delivered" })).toBe(false);
  });
});

describe("quest definitions", () => {
  it("have unique ids, badges and at least one step each", () => {
    expect(new Set(QUESTS.map((q) => q.id)).size).toBe(QUESTS.length);
    expect(new Set(QUESTS.map((q) => q.reward.badge.id)).size).toBe(QUESTS.length);
    for (const q of QUESTS) expect(q.steps.length).toBeGreaterThan(0);
  });

  it("give an unlock trigger to every quest that has a giver, and only those", () => {
    for (const q of QUESTS) expect(Boolean(q.unlock)).toBe(q.giver !== null);
  });
});

describe("QuestEngine", () => {
  it("starts quests locked when they have a giver and active otherwise", () => {
    const { engine } = engineWith();
    expect(engine.progress("delivery").status).toBe("locked");
    expect(engine.progress("skill-gems").status).toBe("active");
    expect(engine.doneCount).toBe(0);
  });

  it("unlocks a quest when its giver is talked to, and notifies", () => {
    const { engine } = engineWith();
    const notes = engine.emit({ type: "npc_talked", npc: "clerk" });
    expect(notes).toEqual([{ type: "started", questId: "delivery", title: "Special delivery" }]);
    expect(engine.progress("delivery").status).toBe("active");
    expect(engine.isOnStep("delivery", "deliver")).toBe(true);
  });

  it("ignores events for quests that are still locked", () => {
    const { engine } = engineWith();
    expect(engine.emit({ type: "parcel_delivered" })).toEqual([]);
    expect(engine.progress("delivery").status).toBe("locked");
  });

  it("counts distinct items towards a multi-count step and ignores repeats", () => {
    const { engine } = engineWith();
    const first = engine.emit({ type: "item_collected", id: GEM_IDS.Advanced });
    expect(first).toMatchObject([{ type: "step", count: 1, of: 3 }]);
    expect(engine.emit({ type: "item_collected", id: GEM_IDS.Advanced })).toEqual([]);
    engine.emit({ type: "item_collected", id: GEM_IDS.Proficient });
    expect(engine.progress("skill-gems")).toMatchObject({ status: "active", count: 2 });
  });

  it("completes a quest, grants the badge and cosmetic once, and records items", () => {
    const { engine } = engineWith();
    for (const id of Object.values(GEM_IDS)) engine.emit({ type: "item_collected", id });
    expect(engine.isDone("skill-gems")).toBe(true);
    expect(engine.state.badges).toEqual(["gem-hunter"]);
    expect(engine.state.cosmetics).toEqual(["gem-trail"]);
    expect(engine.hasItem("gem-growing")).toBe(true);
    // Replaying an event after completion changes nothing.
    expect(engine.emit({ type: "item_collected", id: GEM_IDS.Advanced })).toEqual([]);
    expect(engine.state.badges).toHaveLength(1);
  });

  it("emits all_done exactly when the last quest completes", () => {
    const { engine } = engineWith();
    engine.emit({ type: "npc_talked", npc: "clerk" });
    const mid = engine.emit({ type: "parcel_delivered" });
    expect(mid.map((n) => n.type)).toEqual(["quest_done"]);
    expect(engine.allDone).toBe(false);
    let last: ReturnType<typeof engine.emit> = [];
    for (const id of Object.values(GEM_IDS)) last = engine.emit({ type: "item_collected", id });
    expect(last.map((n) => n.type)).toEqual(["quest_done", "all_done"]);
    expect(engine.allDone).toBe(true);
  });

  it("notifies subscribers and supports unsubscribe", () => {
    const { engine } = engineWith();
    const listener = vi.fn();
    const off = engine.subscribe(listener);
    engine.emit({ type: "npc_talked", npc: "clerk" });
    expect(listener).toHaveBeenCalledTimes(1);
    off();
    engine.emit({ type: "parcel_delivered" });
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("never mutates a state object it handed out", () => {
    const { engine } = engineWith();
    const before = engine.state;
    const snapshot = JSON.stringify(before);
    engine.emit({ type: "npc_talked", npc: "clerk" });
    expect(JSON.stringify(before)).toBe(snapshot);
    expect(engine.state).not.toBe(before);
  });

  it("persists after every change and restores in a new engine", () => {
    const first = engineWith();
    first.engine.emit({ type: "npc_talked", npc: "clerk" });
    first.engine.emit({ type: "item_collected", id: GEM_IDS.Growing });
    expect(first.storage.data.has(QUEST_KEY)).toBe(true);

    const second = engineWith(QUESTS, first.storage);
    expect(second.engine.progress("delivery").status).toBe("active");
    expect(second.engine.progress("skill-gems").count).toBe(1);
    expect(second.engine.hasItem("gem-growing")).toBe(true);
  });

  it("resets progress and clears storage", () => {
    const { engine, storage } = engineWith();
    engine.emit({ type: "npc_talked", npc: "clerk" });
    engine.reset();
    expect(engine.progress("delivery").status).toBe("locked");
    expect(storage.data.has(QUEST_KEY)).toBe(false);
  });

  it("remembers that the celebration was shown", () => {
    const { engine } = engineWith();
    engine.markCelebrated();
    expect(engine.state.celebrated).toBe(true);
  });
});

describe("progress storage", () => {
  it("falls back to a fresh state for corrupt JSON or a wrong version", () => {
    const storage = memoryStorage();
    const store = new ProgressStore(storage, QUESTS);
    storage.setItem(QUEST_KEY, "{not json");
    expect(store.load()).toEqual(initialState(QUESTS));
    storage.setItem(QUEST_KEY, JSON.stringify({ version: 99, quests: {} }));
    expect(store.load()).toEqual(initialState(QUESTS));
  });

  it("drops unknown quests, clamps numbers and ignores forged rewards", () => {
    const state = parseState(
      {
        version: 1,
        quests: {
          "skill-gems": { status: "active", step: 99, count: -5, seen: ["a", 3, "b"] },
          ghost: { status: "done", step: 1, count: 0, seen: [] },
        },
        items: ["gem-advanced", 42],
        badges: ["gem-hunter", "courier", "made-up"],
        cosmetics: ["gem-trail", "fishing-hat", "crown"],
        celebrated: true,
      },
      QUESTS,
    );
    expect(state.quests["ghost"]).toBeUndefined();
    expect(state.quests["skill-gems"]).toEqual({
      status: "active",
      step: 0,
      count: 0,
      seen: ["a", "b"],
    });
    expect(state.items).toEqual(["gem-advanced"]);
    expect(state.badges).toEqual([]);
    expect(state.cosmetics).toEqual([]);
    expect(state.celebrated).toBe(false);
  });

  it("keeps a valid completed quest and its reward", () => {
    const state = parseState(
      {
        version: 1,
        quests: { delivery: { status: "done", step: 1, count: 0, seen: [] } },
        badges: ["courier"],
      },
      QUESTS,
    );
    expect(state.quests["delivery"]?.status).toBe("done");
    expect(state.badges).toEqual(["courier"]);
  });

  it("works when localStorage throws (private mode, blocked storage)", () => {
    const broken: KeyValueStorage = {
      getItem: () => {
        throw new Error("denied");
      },
      setItem: () => {
        throw new Error("denied");
      },
      removeItem: () => {
        throw new Error("denied");
      },
    };
    const safe = createSafeStorage(() => broken);
    expect(() => safe.setItem("k", "v")).not.toThrow();
    expect(safe.getItem("k")).toBe("v");
    safe.removeItem("k");
    expect(safe.getItem("k")).toBeNull();
    const { engine } = engineWith(QUESTS, safe as ReturnType<typeof memoryStorage>);
    expect(() => engine.emit({ type: "npc_talked", npc: "clerk" })).not.toThrow();
  });
});

describe("quest helpers", () => {
  it("lists exactly the skills of a gem's group, from the content file", () => {
    for (const group of ["Advanced", "Proficient", "Growing"] as const) {
      const text = gemLines(group)
        .map((l) => l.text)
        .join(" ");
      for (const s of SKILLS) expect(text.includes(s.name)).toBe(s.label === group);
    }
  });

  it("picks a project from the content file", () => {
    expect(PROJECTS).toContain(pickHighlight(() => 0));
    expect(pickHighlight(() => 0.9999)).toBe(PROJECTS[PROJECTS.length - 1]);
    expect(pickHighlight(() => 0)).toBe(PROJECTS[0]);
  });
});

import { describeNotification } from "../src/systems/quests/notify";
import { planTalk, type QuestView } from "../src/systems/quests/npcTalk";
import { NPCS } from "../src/content/npcs";

describe("NPC talk plans", () => {
  const view = (
    over: Partial<Record<"onDeliver" | "done" | "status", unknown>> = {},
  ): QuestView => ({
    isOnStep: (_q, step) => over.onDeliver === true && step === "deliver",
    isDone: () => over.done === true,
    progress: () => ({ status: (over.status as "locked" | "active" | "done") ?? "locked" }),
  });

  it("returns null for unknown NPCs", () => {
    expect(planTalk("nobody", view())).toBeNull();
  });

  it("always starts with the NPC's normal dialog and reports the conversation", () => {
    for (const id of Object.keys(NPCS)) {
      const plan = planTalk(id, view());
      expect(plan?.lines.slice(0, NPCS[id]?.lines.length ?? 0)).toEqual(NPCS[id]?.lines);
      expect(plan?.emit).toEqual([{ type: "npc_talked", npc: id }]);
    }
  });

  it("makes the clerk offer the parcel only while the quest is locked", () => {
    const text = (v: QuestView) =>
      planTalk("clerk", v)
        ?.lines.map((l) => l.text)
        .join(" ") ?? "";
    expect(text(view({ status: "locked" }))).toContain("parcel");
    expect(text(view({ status: "active", onDeliver: true }))).toContain(
      "Have you taken the parcel",
    );
    expect(text(view({ status: "done", done: true }))).toContain("Thank you");
  });

  it("makes the smith accept the parcel and queue the delivery only on the right step", () => {
    expect(planTalk("smith", view())?.after).toEqual([]);
    const plan = planTalk("smith", view({ onDeliver: true, status: "active" }));
    expect(plan?.after).toEqual([{ type: "deliver_parcel" }]);
  });

  it("agrees with the real engine end to end", () => {
    const { engine } = engineWith();
    expect(planTalk("clerk", engine)?.after).toEqual([]);
    engine.emit({ type: "npc_talked", npc: "clerk" });
    expect(planTalk("smith", engine)?.after).toEqual([{ type: "deliver_parcel" }]);
  });
});

describe("notification text", () => {
  it("describes each notification type", () => {
    expect(describeNotification({ type: "started", questId: "q", title: "T" })).toBe(
      "New quest: T",
    );
    expect(
      describeNotification({ type: "step", questId: "q", title: "T", text: "x", count: 1, of: 3 }),
    ).toBe("T: 1/3");
    expect(
      describeNotification({ type: "step", questId: "q", title: "T", text: "x", count: 1, of: 1 }),
    ).toBe("T: step complete");
    expect(
      describeNotification({
        type: "quest_done",
        questId: "q",
        title: "T",
        badge: { id: "b", name: "Bee", description: "d" },
      }),
    ).toBe("Quest complete: T. Badge earned: Bee");
    expect(describeNotification({ type: "all_done" })).toContain("complete");
  });
});
