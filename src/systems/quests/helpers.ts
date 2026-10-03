import { PROJECTS, SKILLS, type Project, type Skill } from "../../content/portfolio";
import type { DialogLine } from "../dialog";

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
