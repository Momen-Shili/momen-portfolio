export type BuildingId = "house" | "workshop" | "library" | "post" | "board";

export interface BuildingInfo {
  id: BuildingId;
  /** Portfolio section the building stands for. */
  section: string;
  /** Name shown on the sign in the world. */
  label: string;
  /** Terminal `open <alias>` aliases (lowercase, no spaces). */
  aliases: string[];
  blurb: string;
}

export const BUILDINGS: readonly BuildingInfo[] = [
  {
    id: "house",
    section: "About",
    label: "HOUSE",
    aliases: ["house", "about", "home"],
    blurb: "Who Momen is, plus experience. The retro computer is inside.",
  },
  {
    id: "workshop",
    section: "Projects",
    label: "WORKSHOP",
    aliases: ["workshop", "projects", "work"],
    blurb: "One workbench per project, with status, stack and description.",
  },
  {
    id: "library",
    section: "Skills",
    label: "LIBRARY",
    aliases: ["library", "skills", "books"],
    blurb: "One bookshelf per skill group: Advanced, Proficient, Growing.",
  },
  {
    id: "post",
    section: "Contact",
    label: "POST OFFICE",
    aliases: ["post", "postoffice", "contact", "mail"],
    blurb: "Send an email, or copy the email, LinkedIn and GitHub links.",
  },
  {
    id: "board",
    section: "Notice board",
    label: "NOTICE BOARD",
    aliases: ["board", "notice", "noticeboard", "help"],
    blurb: "Overview and controls.",
  },
];

export function findBuilding(query: string): BuildingInfo | undefined {
  const key = query.toLowerCase().replace(/[\s_-]+/g, "");
  return BUILDINGS.find((b) => b.id === key || b.aliases.includes(key));
}

export function getBuilding(id: BuildingId): BuildingInfo {
  const found = BUILDINGS.find((b) => b.id === id);
  if (!found) throw new Error(`Unknown building: ${id}`);
  return found;
}
