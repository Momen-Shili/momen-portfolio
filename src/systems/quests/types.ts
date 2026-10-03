export type QuestId = string;
export type BadgeId = string;
export type CosmeticId = "gem-trail" | "fishing-hat";

/** Everything the scenes can tell the quest system. Scenes emit these; they never touch quest state. */
export type QuestEvent =
  | { type: "item_collected"; id: string }
  | { type: "npc_talked"; npc: string }
  | { type: "building_entered"; building: string }
  | { type: "command_run"; command: string }
  | { type: "minigame_won"; game: string }
  | { type: "parcel_delivered" }
  | { type: "fish_caught"; tag: string }
  | { type: "quiz_completed"; correct: number; rounds: number }
  | { type: "idle_at"; place: string };

export type EventType = QuestEvent["type"];

/** Matches an event by type and, optionally, by exact field values. */
export interface Trigger {
  type: EventType;
  /** Field name -> required value on the event. */
  where?: Record<string, string>;
  /** Count only distinct values of this event field (for example `tag`). */
  distinct?: string;
  /** How many matches complete the step (default 1). */
  count?: number;
}

export interface StepDef {
  id: string;
  text: string;
  hint: string;
  trigger: Trigger;
}

export interface BadgeDef {
  id: BadgeId;
  name: string;
  description: string;
}

export interface QuestDef {
  id: QuestId;
  title: string;
  /** NPC who offers the quest, or null when it is discovered by exploring. */
  giver: string | null;
  /** One line shown in the log. */
  blurb: string;
  /** Where to start; shown while the quest is still locked. */
  lockedHint: string;
  /** Required when `giver` is set: the event that unlocks the quest. */
  unlock?: Trigger;
  steps: readonly StepDef[];
  reward: { badge: BadgeDef; cosmetic?: CosmeticId };
}

export type QuestStatus = "locked" | "active" | "done";

export interface QuestProgress {
  status: QuestStatus;
  /** Index of the current step. */
  step: number;
  /** Matches counted towards the current step. */
  count: number;
  /** Distinct values seen for the current step (when the trigger is `distinct`). */
  seen: readonly string[];
}

export interface QuestState {
  quests: Readonly<Record<QuestId, QuestProgress>>;
  /** Everything the player has picked up (gems, parcels...). */
  items: readonly string[];
  badges: readonly BadgeId[];
  cosmetics: readonly CosmeticId[];
  celebrated: boolean;
}

export type Notification =
  | { type: "started"; questId: QuestId; title: string }
  | { type: "step"; questId: QuestId; title: string; text: string; count: number; of: number }
  | { type: "quest_done"; questId: QuestId; title: string; badge: BadgeDef; cosmetic?: CosmeticId }
  | { type: "all_done" };
