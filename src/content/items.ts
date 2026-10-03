import { PROJECTS, type Skill } from "./portfolio.ts";

/**
 * Interior hotspots that show something when you interact with them. "panel" items open the same
 * panel window as the main sections; "flavor" items say a short neutral line. Nothing here states a
 * fact about Momen: factual content is rendered from portfolio.ts by src/ui/itemViews.ts.
 */
export interface ItemDef {
  id: string;
  title: string;
  kind: "panel" | "flavor";
  /** Flavor items: what the dialog says. */
  lines?: readonly string[];
  speaker?: string;
}

export const benchItemId = (index: number): string => `workshop-bench-${index}`;
export const shelfItemId = (group: Skill["label"]): string => `library-shelf-${group}`;

const FLAVOR: ReadonlyArray<[string, string, string[]]> = [
  [
    "house-window",
    "Window",
    ["Through the window you can see the whole town: the plaza, the pond and the other buildings."],
  ],
  ["house-bed", "Bed", ["A neatly made bed. Nothing to see here, but it looks comfortable."]],
  [
    "workshop-tools",
    "Tool wall",
    ["Saws, hammers and wrenches hang in tidy rows. Everything has its own hook."],
  ],
  [
    "library-ladder",
    "Library ladder",
    ["You climb up, admire the rows of books from above, and climb carefully back down."],
  ],
  [
    "post-conveyor",
    "Conveyor belt",
    ["Parcels glide along the belt. Somebody, somewhere, is waiting for each of them."],
  ],
];

const PANEL_ITEMS: ReadonlyArray<[string, string]> = [
  ["house-shelf", "Bookshelf"],
  ["house-experience", "Experience wall"],
  ["workshop-chalkboard", "Chalkboard: project status"],
  ["library-globe", "Globe"],
  ["post-mailboxes", "Mailbox wall"],
];

export function allItems(): ItemDef[] {
  const groups: Array<Skill["label"]> = ["Advanced", "Proficient", "Growing"];
  return [
    ...FLAVOR.map(([id, title, lines]): ItemDef => ({
      id,
      title,
      kind: "flavor",
      lines,
      speaker: title,
    })),
    ...PANEL_ITEMS.map(([id, title]): ItemDef => ({ id, title, kind: "panel" })),
    ...PROJECTS.map((p, i): ItemDef => ({
      id: benchItemId(i),
      title: `Workbench: ${p.name}`,
      kind: "panel",
    })),
    ...groups.map((g): ItemDef => ({
      id: shelfItemId(g),
      title: `Bookshelf: ${g} skills`,
      kind: "panel",
    })),
  ];
}

const index = new Map<string, ItemDef>();
export function itemDef(id: string): ItemDef | undefined {
  if (index.size === 0) for (const item of allItems()) index.set(item.id, item);
  return index.get(id);
}
