import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { BUILDINGS } from "../src/content/buildings";
import { NPCS } from "../src/content/npcs";
import { EXPERIENCE, LINKS, PROFILE, PROJECTS, SKILLS } from "../src/content/portfolio";
import { aboutHtml, boardHtml, projectsHtml, skillsHtml, statusClass } from "../src/fallback/html";
import { renderFallback } from "../src/fallback/renderFallback";
import { TERMINAL_BANNER, runCommand } from "../src/systems/terminal";

// Built from parts so this guard does not itself contain the cancelled startup's name.
const FORBIDDEN = new RegExp(["deduck", "ing"].join(""), "i");

describe("portfolio content", () => {
  it("matches the agreed facts", () => {
    expect(PROFILE.name).toBe("Momen Shili");
    expect(PROJECTS.map((p) => p.name)).toEqual([
      "Tunexa",
      "Atable",
      "NaroOps",
      "Penturom AI",
      "Mentra",
      "Dari (دار)",
      "E-commerce Work",
    ]);
    expect(SKILLS).toHaveLength(11);
    expect(EXPERIENCE).toHaveLength(4);
    expect(LINKS.email).toBe("contact@momenshili.app");
  });

  it("has valid skill levels whose labels match their level", () => {
    for (const s of SKILLS) {
      expect(s.level).toBeGreaterThanOrEqual(1);
      expect(s.level).toBeLessThanOrEqual(10);
      const expected = s.level >= 8 ? "Advanced" : s.level === 7 ? "Proficient" : "Growing";
      expect(s.label).toBe(expected);
    }
  });

  it("maps every project status to a badge style", () => {
    for (const p of PROJECTS) expect(statusClass(p.status)).toMatch(/^status-/);
  });

  it("never mentions the cancelled startup anywhere", () => {
    const everything = [
      JSON.stringify({ PROFILE, LINKS, PROJECTS, SKILLS, EXPERIENCE, BUILDINGS, NPCS }),
      renderFallback(),
      aboutHtml(),
      projectsHtml(),
      skillsHtml(),
      boardHtml(),
      TERMINAL_BANNER.join("\n"),
      ...["help", "about", "experience", "projects", "skills", "contact"].map((c) =>
        runCommand(c).lines.join("\n"),
      ),
      readFileSync("index.html", "utf8"),
      readFileSync("vite.config.ts", "utf8"),
    ].join("\n");
    expect(everything).not.toMatch(FORBIDDEN);
  });
});

describe("plain-page fallback", () => {
  const html = renderFallback();

  it("contains every project, skill, experience line and contact link", () => {
    for (const p of PROJECTS) expect(html).toContain(p.name.replace(/&/g, "&amp;"));
    for (const s of SKILLS) expect(html).toContain(s.name);
    for (const e of EXPERIENCE) expect(html).toContain(e.org);
    expect(html).toContain(PROFILE.bio);
    expect(html).toContain(`mailto:${LINKS.email}`);
    expect(html).toContain(LINKS.linkedin);
    expect(html).toContain(LINKS.github);
  });

  it("isolates right-to-left names so Dari renders correctly", () => {
    expect(html).toContain("<bdi>Dari (دار)</bdi>");
  });

  it("opens external links safely and escapes text", () => {
    expect(html).toContain('rel="noopener noreferrer"');
    expect(html).not.toMatch(/<script/i);
  });

  it("groups skills by label", () => {
    const skills = skillsHtml();
    expect(skills.indexOf("Advanced")).toBeLessThan(skills.indexOf("Proficient"));
    expect(skills.indexOf("Proficient")).toBeLessThan(skills.indexOf("Growing"));
  });
});
