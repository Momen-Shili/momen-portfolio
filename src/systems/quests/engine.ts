import { ProgressStore, initialState } from "./storage";
import type {
  Notification,
  QuestDef,
  QuestEvent,
  QuestId,
  QuestProgress,
  QuestState,
  Trigger,
} from "./types";

type Listener = (notifications: readonly Notification[]) => void;

/** True when `event` has the trigger's type and every `where` field matches. */
export function matches(trigger: Trigger, event: QuestEvent): boolean {
  if (trigger.type !== event.type) return false;
  const fields = event as unknown as Record<string, unknown>;
  return Object.entries(trigger.where ?? {}).every(([key, value]) => fields[key] === value);
}

function needed(trigger: Trigger): number {
  return trigger.count ?? 1;
}

/**
 * Quest state machine. Scenes call `emit()` with game events; the engine decides what that means
 * for each quest. State is replaced, never mutated, and saved after every change.
 */
export class QuestEngine {
  private current: QuestState;
  private readonly listeners = new Set<Listener>();

  constructor(
    private readonly defs: readonly QuestDef[],
    private readonly store: ProgressStore,
  ) {
    this.current = store.load();
  }

  get state(): QuestState {
    return this.current;
  }

  get quests(): readonly QuestDef[] {
    return this.defs;
  }

  get total(): number {
    return this.defs.length;
  }

  get doneCount(): number {
    return this.defs.filter((d) => this.progress(d.id).status === "done").length;
  }

  get allDone(): boolean {
    return this.defs.length > 0 && this.doneCount === this.defs.length;
  }

  progress(id: QuestId): QuestProgress {
    const found = this.current.quests[id];
    if (!found) throw new Error(`Unknown quest: ${id}`);
    return found;
  }

  isDone(id: QuestId): boolean {
    return this.progress(id).status === "done";
  }

  isActive(id: QuestId): boolean {
    return this.progress(id).status === "active";
  }

  /** The step the player is working on, or null when the quest is locked or done. */
  currentStep(id: QuestId): { index: number; text: string; hint: string } | null {
    const def = this.def(id);
    const p = this.progress(id);
    const step = def.steps[p.step];
    if (p.status !== "active" || !step) return null;
    return { index: p.step, text: step.text, hint: step.hint };
  }

  /** True while the quest is active and waiting on the step with this id. */
  isOnStep(id: QuestId, stepId: string): boolean {
    const def = this.def(id);
    const p = this.progress(id);
    return p.status === "active" && def.steps[p.step]?.id === stepId;
  }

  hasItem(id: string): boolean {
    return this.current.items.includes(id);
  }

  hasBadge(id: string): boolean {
    return this.current.badges.includes(id);
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /** Feeds a game event into every quest. Returns what changed so the UI can react. */
  emit(event: QuestEvent): Notification[] {
    const notes: Notification[] = [];
    let state = this.current;

    if (event.type === "item_collected" && !state.items.includes(event.id)) {
      state = { ...state, items: [...state.items, event.id] };
    }

    for (const def of this.defs) {
      const progress = state.quests[def.id];
      if (!progress) continue;
      const result = this.advance(def, progress, event, state, notes);
      state = result;
    }

    if (state !== this.current) {
      this.current = state;
      this.store.save(state);
    }
    if (notes.length > 0) for (const listener of this.listeners) listener(notes);
    return notes;
  }

  markCelebrated(): void {
    if (this.current.celebrated) return;
    this.current = { ...this.current, celebrated: true };
    this.store.save(this.current);
  }

  reset(): void {
    this.store.clear();
    this.current = initialState(this.defs);
    for (const listener of this.listeners) listener([]);
  }

  private def(id: QuestId): QuestDef {
    const found = this.defs.find((d) => d.id === id);
    if (!found) throw new Error(`Unknown quest: ${id}`);
    return found;
  }

  private withProgress(state: QuestState, id: QuestId, progress: QuestProgress): QuestState {
    return { ...state, quests: { ...state.quests, [id]: progress } };
  }

  private advance(
    def: QuestDef,
    progress: QuestProgress,
    event: QuestEvent,
    state: QuestState,
    notes: Notification[],
  ): QuestState {
    if (progress.status === "locked") {
      if (!def.unlock || !matches(def.unlock, event)) return state;
      notes.push({ type: "started", questId: def.id, title: def.title });
      return this.withProgress(state, def.id, { status: "active", step: 0, count: 0, seen: [] });
    }
    if (progress.status !== "active") return state;

    const step = def.steps[progress.step];
    if (!step || !matches(step.trigger, event)) return state;

    const { distinct } = step.trigger;
    let count = progress.count;
    let seen = progress.seen;
    if (distinct) {
      const value = String((event as unknown as Record<string, unknown>)[distinct]);
      if (seen.includes(value)) return state;
      seen = [...seen, value];
      count = seen.length;
    } else {
      count += 1;
    }

    const goal = needed(step.trigger);
    if (count < goal) {
      notes.push({
        type: "step",
        questId: def.id,
        title: def.title,
        text: step.text,
        count,
        of: goal,
      });
      return this.withProgress(state, def.id, { ...progress, count, seen });
    }

    const nextIndex = progress.step + 1;
    if (nextIndex < def.steps.length) {
      notes.push({
        type: "step",
        questId: def.id,
        title: def.title,
        text: step.text,
        count: goal,
        of: goal,
      });
      return this.withProgress(state, def.id, {
        status: "active",
        step: nextIndex,
        count: 0,
        seen: [],
      });
    }

    const { badge, cosmetic } = def.reward;
    notes.push({ type: "quest_done", questId: def.id, title: def.title, badge, cosmetic });
    let next = this.withProgress(state, def.id, {
      status: "done",
      step: def.steps.length,
      count: 0,
      seen: [],
    });
    next = {
      ...next,
      badges: next.badges.includes(badge.id) ? next.badges : [...next.badges, badge.id],
      cosmetics:
        cosmetic && !next.cosmetics.includes(cosmetic)
          ? [...next.cosmetics, cosmetic]
          : next.cosmetics,
    };
    const everyQuestDone = this.defs.every(
      (d) => (d.id === def.id ? "done" : next.quests[d.id]?.status) === "done",
    );
    if (everyQuestDone) notes.push({ type: "all_done" });
    return next;
  }
}
