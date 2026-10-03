import { itemDef } from "../content/items.ts";
import { PROJECTS, SKILLS, type Skill } from "../content/portfolio.ts";
import {
  contactLinksHtml,
  esc,
  experienceHtml,
  languagesHtml,
  projectCardHtml,
  skillGroupHtml,
  statusGuideHtml,
} from "../fallback/html.ts";

const GROUPS: ReadonlyArray<Skill["label"]> = ["Advanced", "Proficient", "Growing"];

/**
 * The HTML shown for a "panel" item, built only from portfolio.ts. Returns null for unknown ids,
 * so a typo in a map shows up in the tests instead of as an empty window.
 */
export function itemHtml(id: string): string | null {
  if (!itemDef(id)) return null;
  if (id === "house-shelf" || id === "library-globe") {
    return `${languagesHtml()}<p class="item-note">Languages and location are also on the About page.</p>`;
  }
  if (id === "house-experience") {
    return `<h3>Experience</h3>${experienceHtml()}`;
  }
  if (id === "workshop-chalkboard") {
    return `<p class="item-note">What each project status label means:</p>${statusGuideHtml()}`;
  }
  if (id === "post-mailboxes") return contactLinksHtml();
  const bench = /^workshop-bench-(\d+)$/.exec(id);
  if (bench) {
    const project = PROJECTS[Number(bench[1])];
    return project ? projectCardHtml(project) : null;
  }
  const shelf = /^library-shelf-(Advanced|Proficient|Growing)$/.exec(id);
  if (shelf) {
    const group = GROUPS.find((g) => g === shelf[1]);
    if (!group || !SKILLS.some((s) => s.label === group)) return null;
    return skillGroupHtml(group);
  }
  return null;
}

/** Plain-text summary for tests and screen-reader announcements. */
export function itemSummary(id: string): string {
  const html = itemHtml(id);
  return html
    ? html
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ")
        .trim()
    : esc(id);
}
