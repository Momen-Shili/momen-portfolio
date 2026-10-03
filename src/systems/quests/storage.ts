import type { CosmeticId, QuestDef, QuestProgress, QuestState, QuestStatus } from "./types";

/** The slice of the Web Storage API we use, so it can be faked in tests. */
export interface KeyValueStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

const NAMESPACE = "momen-portfolio:v1";
export const QUEST_KEY = `${NAMESPACE}:quests`;
export const AUDIO_KEY = `${NAMESPACE}:audio`;
const VERSION = 1;
const COSMETICS: readonly CosmeticId[] = ["gem-trail", "fishing-hat"];

/** Storage that never throws. Falls back to memory when localStorage is unavailable or blocked. */
export function createSafeStorage(
  getBackend: () => KeyValueStorage = () => window.localStorage,
): KeyValueStorage {
  const memory = new Map<string, string>();
  return {
    getItem(key) {
      try {
        return getBackend().getItem(key);
      } catch {
        return memory.get(key) ?? null;
      }
    },
    setItem(key, value) {
      try {
        getBackend().setItem(key, value);
      } catch {
        memory.set(key, value);
      }
    },
    removeItem(key) {
      try {
        getBackend().removeItem(key);
      } catch {
        memory.delete(key);
      }
    },
  };
}

export function initialState(defs: readonly QuestDef[]): QuestState {
  const quests: Record<string, QuestProgress> = {};
  for (const def of defs) {
    quests[def.id] = {
      status: def.unlock ? "locked" : "active",
      step: 0,
      count: 0,
      seen: [],
    };
  }
  return { quests, items: [], badges: [], cosmetics: [], celebrated: false };
}

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);
const isStatus = (v: unknown): v is QuestStatus => v === "locked" || v === "active" || v === "done";
const stringList = (v: unknown): string[] =>
  Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];

/**
 * Rebuilds a valid state from untrusted JSON. Unknown quests are dropped, missing ones start
 * fresh, and out-of-range numbers are clamped, so old or tampered saves never crash the game.
 */
export function parseState(raw: unknown, defs: readonly QuestDef[]): QuestState {
  const base = initialState(defs);
  if (!isRecord(raw) || raw["version"] !== VERSION) return base;

  const storedQuests = isRecord(raw["quests"]) ? raw["quests"] : {};
  const quests: Record<string, QuestProgress> = { ...base.quests };
  for (const def of defs) {
    const entry = storedQuests[def.id];
    if (!isRecord(entry) || !isStatus(entry["status"])) continue;
    const status = entry["status"];
    const stepRaw = typeof entry["step"] === "number" ? Math.trunc(entry["step"]) : 0;
    const step = Math.max(0, Math.min(def.steps.length, stepRaw));
    const countRaw = typeof entry["count"] === "number" ? Math.trunc(entry["count"]) : 0;
    quests[def.id] =
      status === "done"
        ? { status, step: def.steps.length, count: 0, seen: [] }
        : {
            status,
            step: Math.min(step, def.steps.length - 1),
            count: Math.max(0, countRaw),
            seen: stringList(entry["seen"]),
          };
  }

  const done = defs.filter((d) => quests[d.id]?.status === "done");
  const knownBadges = new Set(done.map((d) => d.reward.badge.id));
  const knownCosmetics = new Set(
    done.flatMap((d) => (d.reward.cosmetic ? [d.reward.cosmetic] : [])),
  );
  return {
    quests,
    items: stringList(raw["items"]),
    // Rewards are re-derived from completed quests so a edited save cannot grant extras.
    badges: stringList(raw["badges"]).filter((b) => knownBadges.has(b)),
    cosmetics: stringList(raw["cosmetics"]).filter(
      (c): c is CosmeticId =>
        COSMETICS.includes(c as CosmeticId) && knownCosmetics.has(c as CosmeticId),
    ),
    celebrated: raw["celebrated"] === true && done.length === defs.length,
  };
}

export class ProgressStore {
  constructor(
    private readonly storage: KeyValueStorage,
    private readonly defs: readonly QuestDef[],
  ) {}

  load(): QuestState {
    const text = this.storage.getItem(QUEST_KEY);
    if (!text) return initialState(this.defs);
    try {
      return parseState(JSON.parse(text) as unknown, this.defs);
    } catch {
      return initialState(this.defs);
    }
  }

  save(state: QuestState): void {
    this.storage.setItem(QUEST_KEY, JSON.stringify({ version: VERSION, ...state }));
  }

  clear(): void {
    this.storage.removeItem(QUEST_KEY);
  }
}
