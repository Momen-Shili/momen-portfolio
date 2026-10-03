import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { EXPERIENCE, LINKS, PROFILE, PROJECTS, SKILLS } from "../src/content/portfolio";
import { NAV_LINKS, heroTagline, renderFallback } from "../src/fallback/renderFallback";

const html = renderFallback();

describe("plain page markup", () => {
  it("has exactly one h1 and a labelled heading per section", () => {
    expect(html.match(/<h1[ >]/g)).toHaveLength(1);
    for (const [id] of NAV_LINKS) {
      expect(html).toContain(`id="${id}"`);
      expect(html).toContain(`aria-labelledby="${id}-h"`);
      expect(html).toContain(`id="${id}-h"`);
    }
  });

  it("renders all content from portfolio.ts without JavaScript", () => {
    expect(html).toContain(PROFILE.name);
    expect(html).toContain(LINKS.email);
    for (const p of PROJECTS) expect(html).toContain(p.name.replace(/&/g, "&amp;"));
    for (const e of EXPERIENCE) expect(html).toContain(e.role.replace(/&/g, "&amp;"));
    for (const s of SKILLS) expect(html).toContain(s.name.replace(/&/g, "&amp;"));
  });

  it("types the last sentence of the short bio and keeps the full text in the DOM", () => {
    expect(PROFILE.short.endsWith(heroTagline())).toBe(true);
    expect(html).toContain('class="tw-full"');
  });

  it("offers the game, contact and a way back to the top", () => {
    expect(html.match(/data-play/g)?.length ?? 0).toBeGreaterThanOrEqual(2);
    expect(html).toContain('href="#contact"');
    expect(html).toContain('href="#top"');
  });

  it("has decorative layers hidden from assistive tech and never mentions the banned name", () => {
    expect(html).toContain('class="hero-sky" aria-hidden="true"');
    expect(html).toContain('class="walker-lane" aria-hidden="true"');
    expect(html.toLowerCase()).not.toContain("deduck");
  });
});

function luminance(hex: string): number {
  const ch = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const [r, g, b] = ch.map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * (r ?? 0) + 0.7152 * (g ?? 0) + 0.0722 * (b ?? 0);
}
function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return ((hi ?? 0) + 0.05) / ((lo ?? 0) + 0.05);
}

describe("plain page theme contrast", () => {
  const css = readFileSync(new URL("../src/styles/plain.css", import.meta.url), "utf8");
  function tokens(block: RegExp): Record<string, string> {
    const body = block.exec(css)?.[1] ?? "";
    return Object.fromEntries(
      [...body.matchAll(/--(p-[\w-]+):\s*(#[0-9a-f]{6})/gi)].map((m) => [m[1], m[2]]),
    );
  }
  const light = tokens(/^\.plain \{([^}]*)\}/m);
  const dark = tokens(/data-theme="dark"\] \.plain \{([^}]*)\}/);

  for (const [name, t] of [
    ["light", light],
    ["dark", dark],
  ] as const) {
    it(`${name}: text, links and buttons meet WCAG AA`, () => {
      const pairs: Array<[string, string, string]> = [
        ["p-ink", "p-bg", "body text"],
        ["p-soft", "p-bg", "secondary text"],
        ["p-soft", "p-bg-2", "secondary text on band"],
        ["p-ink", "p-card", "card text"],
        ["p-link", "p-bg", "link"],
        ["p-link", "p-card", "link on card"],
        ["p-accent-ink", "p-accent", "primary button"],
      ];
      for (const [fg, bg, label] of pairs) {
        const a = t[fg];
        const b = t[bg];
        expect(a, `${name} ${fg}`).toBeDefined();
        expect(b, `${name} ${bg}`).toBeDefined();
        expect(contrast(a as string, b as string), `${name}: ${label}`).toBeGreaterThanOrEqual(4.5);
      }
    });
  }
});
