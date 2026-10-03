/**
 * HTML builders shared by the in-game panels and the plain-page fallback.
 * Everything is rendered from src/content/portfolio.ts - no portfolio text lives here.
 */
import { BUILDINGS } from "../content/buildings.ts";
import {
  EXPERIENCE,
  FUN_FACTS,
  LINKS,
  PROFILE,
  PROJECTS,
  SKILLS,
  type Project,
  type ProjectStatus,
  type Skill,
} from "../content/portfolio.ts";
import { STATUS_GUIDE, STATUS_ORDER } from "../content/statusGuide.ts";

export function esc(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const STATUS_CLASS: Record<ProjectStatus, string> = {
  Live: "status-live",
  "In production": "status-production",
  MVP: "status-mvp",
  Beta: "status-beta",
  "In development": "status-dev",
  Freelance: "status-freelance",
};

export function statusClass(status: ProjectStatus): string {
  return STATUS_CLASS[status];
}

export function projectHtml(p: Project): string {
  const image = p.image
    ? `<img class="project-image" src="${esc(p.image)}" alt="Screenshot of ${esc(p.name)}" loading="lazy">`
    : "";
  const link = p.url
    ? `<a class="project-link" href="${esc(p.url)}" target="_blank" rel="noopener noreferrer">Visit ${esc(p.name)}</a>`
    : "";
  return `<li class="project">
  <div class="project-head">
    <h3 class="project-name"><bdi>${esc(p.name)}</bdi></h3>
    <span class="badge ${statusClass(p.status)}">${esc(p.status)}</span>
  </div>
  ${image}
  <p class="project-desc">${esc(p.desc)}</p>
  <ul class="tags" aria-label="Technologies">${p.tags.map((t) => `<li>${esc(t)}</li>`).join("")}</ul>
  ${link}
</li>`;
}

/** A single project card, as used by the workshop benches. */
export function projectCardHtml(p: Project): string {
  return `<ul class="project-list">${projectHtml(p)}</ul>`;
}

/** The status labels with their general meaning (workshop chalkboard, Projects panel, plain page). */
export function statusGuideHtml(): string {
  return `<dl class="status-guide">${STATUS_ORDER.map(
    (status) =>
      `<div><dt><span class="badge ${statusClass(status)}">${esc(status)}</span></dt><dd>${esc(STATUS_GUIDE[status])}</dd></div>`,
  ).join("")}</dl>`;
}

export function projectsHtml(): string {
  return `<ul class="project-list">${PROJECTS.map(projectHtml).join("")}</ul>
<details class="status-details"><summary>What the status labels mean</summary>${statusGuideHtml()}</details>`;
}

const SKILL_GROUPS: ReadonlyArray<Skill["label"]> = ["Advanced", "Proficient", "Growing"];

export function skillGroupHtml(label: Skill["label"]): string {
  const items = SKILLS.filter((s) => s.label === label);
  if (items.length === 0) return "";
  return `<section class="skill-group">
  <h3>${label}</h3>
  <ul class="skill-list">${items
    .map(
      (s) => `<li class="skill">
    <span class="skill-name">${esc(s.name)}</span>
    <span class="meter" role="img" aria-label="${s.level} out of 10"><i style="width:${s.level * 10}%"></i></span>
    <span class="skill-level" aria-hidden="true">${s.level}/10</span>
  </li>`,
    )
    .join("")}</ul>
</section>`;
}

export function skillsHtml(): string {
  return SKILL_GROUPS.map(skillGroupHtml).join("");
}

/** Location and languages, as shown on the house bookshelf and the library globe. */
export function languagesHtml(): string {
  return `<dl class="facts">
  <div><dt>Location</dt><dd>${esc(PROFILE.location)}</dd></div>
  <div><dt>Languages</dt><dd>${PROFILE.languages.map(esc).join(", ")}</dd></div>
</dl>`;
}

export function experienceHtml(): string {
  return `<ol class="timeline">${EXPERIENCE.map(
    (e) => `<li>
  <span class="timeline-period">${esc(e.period)}</span>
  <span class="timeline-role">${esc(e.role)}</span>
  <span class="timeline-org">${esc(e.org)}</span>
</li>`,
  ).join("")}</ol>`;
}

/** Rendered only when FUN_FACTS has entries, so the section never shows up empty. */
export function funFactsHtml(): string {
  if (FUN_FACTS.length === 0) return "";
  return `<h3>Fun facts</h3><ul class="board-list">${FUN_FACTS.map((f) => `<li>${esc(f)}</li>`).join("")}</ul>`;
}

export function aboutHtml(): string {
  return `<div class="about">
  <div class="about-head">
    <img class="avatar" src="/art/portrait-avatar.png" width="64" height="64" alt="Pixel-art portrait of ${esc(PROFILE.name)}">
    <div>
      <p class="about-name">${esc(PROFILE.name)}</p>
      <p class="about-title">${esc(PROFILE.title)}</p>
    </div>
  </div>
  <dl class="facts">
    <div><dt>Location</dt><dd>${esc(PROFILE.location)}</dd></div>
    <div><dt>Languages</dt><dd>${PROFILE.languages.map(esc).join(", ")}</dd></div>
  </dl>
  <p class="about-bio">${esc(PROFILE.bio)}</p>
  <h3>Experience</h3>
  ${experienceHtml()}
  ${funFactsHtml()}
</div>`;
}

interface ContactLink {
  label: string;
  value: string;
  href: string;
  external: boolean;
}

export function contactLinks(): ContactLink[] {
  return [
    { label: "Email", value: LINKS.email, href: `mailto:${LINKS.email}`, external: false },
    { label: "LinkedIn", value: LINKS.linkedin, href: LINKS.linkedin, external: true },
    { label: "GitHub", value: LINKS.github, href: LINKS.github, external: true },
  ];
}

export function contactLinksHtml(): string {
  return `<ul class="contact-links">${contactLinks()
    .map(
      (l) => `<li>
  <span class="contact-label">${esc(l.label)}</span>
  <a href="${esc(l.href)}"${l.external ? ' target="_blank" rel="noopener noreferrer"' : ""}>${esc(l.value)}</a>
  <button type="button" class="copy-btn js-only" data-copy="${esc(l.value)}" aria-label="Copy ${esc(l.label)}">Copy</button>
</li>`,
    )
    .join("")}</ul>`;
}

export function boardHtml(): string {
  return `<div class="board">
  <p class="board-lead">${esc(PROFILE.short)}</p>
  <h3>Around town</h3>
  <ul class="board-list">${BUILDINGS.filter((b) => b.id !== "board")
    .map((b) => `<li><strong>${esc(b.section)}</strong> - ${esc(b.blurb)}</li>`)
    .join("")}</ul>
  <h3>Controls</h3>
  <ul class="board-list">
    <li><kbd>Arrows</kbd> or <kbd>W A S D</kbd> to walk. On a phone, use the joystick.</li>
    <li><kbd>E</kbd> or <kbd>Space</kbd> to go through doors, look closer at things and talk. On a phone, tap the action button.</li>
    <li><kbd>Esc</kbd> closes any panel.</li>
  </ul>
  <p class="board-note">Prefer a normal page? Use the "Skip game" link at the top-left.</p>
</div>`;
}
