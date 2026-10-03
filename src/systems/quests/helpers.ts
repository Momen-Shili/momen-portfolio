import { FUN_FACTS, PROJECTS, SKILLS, type Project, type Skill } from "../../content/portfolio";
import type { DialogLine } from "../dialog";
import type { QuestDef, QuestProgress } from "./types";

export type SkillGroup = Skill["label"];

/** Gem item ids, one per skill group. */
export const GEM_IDS: Readonly<Record<SkillGroup, string>> = {
  Advanced: "gem-advanced",
  Proficient: "gem-proficient",
  Growing: "gem-growing",
};

/** Popup text for a gem: the group's skills, straight from the content file. */
export function gemLines(group: SkillGroup): DialogLine[] {
  const names = SKILLS.filter((s) => s.label === group).map((s) => s.name);
  return [
    { speaker: `${group} gem`, text: `You found the ${group} gem! It glows for these skills:` },
    { speaker: `${group} gem`, text: names.join(", ") + "." },
  ];
}

/** The project highlighted when a parcel is delivered. `random` is injectable for tests. */
export function pickHighlight(random: () => number = Math.random): Project {
  const index = Math.min(PROJECTS.length - 1, Math.floor(random() * PROJECTS.length));
  return PROJECTS[index] as Project;
}

/** A random entry from FUN_FACTS, or null while the list is empty. */
export function funFactLine(random: () => number = Math.random): string | null {
  if (FUN_FACTS.length === 0) return null;
  const index = Math.min(FUN_FACTS.length - 1, Math.floor(random() * FUN_FACTS.length));
  return FUN_FACTS[index] ?? null;
}

/** The slice of the quest engine the terminal's `achievements` command reads. */
export interface AchievementSource {
  quests: readonly QuestDef[];
  doneCount: number;
  total: number;
  progress(id: string): QuestProgress;
}

/** Plain-text progress for the terminal. Locked quests stay mysterious but show their hint. */
export function achievementLines(source: AchievementSource): string[] {
  const lines = [`Quests: ${source.doneCount} / ${source.total} complete`];
  for (const def of source.quests) {
    const p = source.progress(def.id);
    if (p.status === "done") {
      lines.push(`  [x] ${def.title} - ${def.reward.badge.name}`);
    } else if (p.status === "locked") {
      lines.push(`  [ ] ??? (${def.lockedHint})`);
    } else {
      const goal = def.steps[p.step]?.trigger.count ?? 1;
      lines.push(`  [ ] ${def.title}${goal > 1 ? ` (${p.count}/${goal})` : ""}`);
    }
  }
  return lines;
}

export const SECRET_ART: readonly string[] = [
  "      .-------------------.",
  "     /  X Y Z Z Y         /|",
  "    /___________________ / |",
  "    |  ___     ___      |  |",
  "    | |   |   |   |     | /",
  "    |_|___|___|___|_____|/",
  "",
  'A hollow voice whispers: "Plugh." The chest swings open.',
  "A badge floats out of the dust and lands in your pocket.",
];
