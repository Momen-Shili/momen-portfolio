import type { DialogLine } from "../systems/dialog";
import { PROFILE, PROJECTS, type ProjectStatus } from "./portfolio";

export interface NpcContent {
  id: string;
  name: string;
  lines: DialogLine[];
}

function joinNames(items: readonly string[]): string {
  if (items.length <= 1) return items.join("");
  return `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
}

function namesWithStatus(status: ProjectStatus): string[] {
  return PROJECTS.filter((p) => p.status === status).map((p) => p.name);
}

const live = namesWithStatus("Live");
const first = (name: string, text: string): DialogLine => ({ speaker: name, text });

/** NPC dialog. Facts are derived from portfolio.ts so they cannot drift from the content. */
export const NPCS: Record<string, NpcContent> = {
  guide: {
    id: "guide",
    name: "Town guide",
    lines: [
      first(
        "Town guide",
        `Welcome to ${PROFILE.name}'s town! Every building here is a section of the portfolio.`,
      ),
      first(
        "Town guide",
        "The house is About, the workshop holds Projects, the library has Skills, and the post office is for Contact.",
      ),
      first(
        "Town guide",
        "Walk up to a door and press E or Space. The notice board on the plaza has the full overview.",
      ),
    ],
  },
  smith: {
    id: "smith",
    name: "Workshop smith",
    lines: [
      first(
        "Workshop smith",
        `Welcome to the workshop! There are ${PROJECTS.length} projects on the shelves, from SaaS products to freelance e-commerce work.`,
      ),
      first(
        "Workshop smith",
        `${joinNames(live)} ${live.length === 1 ? "is" : "are"} live right now.`,
      ),
      first(
        "Workshop smith",
        "Every workbench holds one project, and the blueprint board opens the full list.",
      ),
    ],
  },
  clerk: {
    id: "clerk",
    name: "Post office clerk",
    lines: [
      first(
        "Post office clerk",
        "Welcome to the post office! This is the Contact section of the portfolio.",
      ),
      first(
        "Post office clerk",
        "The writing desk has the contact form, and the stamp machine copies the email address for you.",
      ),
    ],
  },
  reader: {
    id: "reader",
    name: "Librarian",
    lines: [
      first("Librarian", `Momen works in ${joinNames(PROFILE.languages)}.`),
      first("Librarian", "The library shelves skills by level: Advanced, Proficient and Growing."),
      first("Librarian", "Psst. There is a retro computer inside the house. Try typing 'help'."),
    ],
  },
};
