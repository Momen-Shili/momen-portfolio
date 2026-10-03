import { existsSync, mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { build } from "vite";
import { beforeAll, describe, expect, it } from "vitest";
import { LINKS, PROFILE, PROJECTS } from "../src/content/portfolio";
import { CONTACT_FIELDS, CONTACT_FORM_NAME, encodePayload } from "../src/systems/contact";
import {
  SITE_URL,
  applyTokens,
  pageDescription,
  pageTitle,
  robotsTxt,
  verificationTags,
} from "../src/seo/meta";

interface Built {
  dir: string;
  html: string;
  robots: string;
  sitemap: string;
}

async function buildWith(context: string | undefined): Promise<Built> {
  const dir = mkdtempSync(join(tmpdir(), "momen-seo-"));
  const previous = process.env["CONTEXT"];
  if (context === undefined) delete process.env["CONTEXT"];
  else process.env["CONTEXT"] = context;
  try {
    await build({ logLevel: "silent", build: { outDir: dir, emptyOutDir: true } });
  } finally {
    if (previous === undefined) delete process.env["CONTEXT"];
    else process.env["CONTEXT"] = previous;
  }
  const read = (f: string) => readFileSync(join(dir, f), "utf8");
  return {
    dir,
    html: read("index.html"),
    robots: read("robots.txt"),
    sitemap: read("sitemap.xml"),
  };
}

let prod: Built;
let preview: Built;
beforeAll(async () => {
  prod = await buildWith("production");
  preview = await buildWith("deploy-preview");
}, 120_000);

const meta = (html: string, attr: "name" | "property", key: string): string | undefined =>
  new RegExp(`<meta ${attr}="${key}" content="([^"]*)"`).exec(html)?.[1];

describe("production build: head and metadata", () => {
  it("has a title of about 50 to 60 characters with name and role", () => {
    const title = /<title>([^<]*)<\/title>/.exec(prod.html)?.[1] ?? "";
    expect(title).toBe(pageTitle());
    expect(title.length).toBeGreaterThanOrEqual(50);
    expect(title.length).toBeLessThanOrEqual(60);
    expect(title).toContain(PROFILE.name);
    expect(title).toContain(PROFILE.title);
  });

  it("has a description of about 150 to 160 characters built from PROFILE", () => {
    const d = meta(prod.html, "name", "description") ?? "";
    expect(d).toBe(pageDescription());
    expect(d.length).toBeGreaterThanOrEqual(150);
    expect(d.length).toBeLessThanOrEqual(160);
    expect(d).toContain(PROFILE.short);
  });

  it("has canonical, robots, lang, viewport, author and theme colours", () => {
    expect(prod.html).toContain(`<link rel="canonical" href="${SITE_URL}/" />`);
    expect(meta(prod.html, "name", "robots")).toBe("index, follow, max-image-preview:large");
    expect(prod.html).toContain('<html lang="en"');
    expect(prod.html).toContain("viewport-fit=cover");
    expect(meta(prod.html, "name", "author")).toBe(PROFILE.name);
    expect(prod.html).toContain('name="color-scheme"');
    expect(prod.html.match(/name="theme-color"/g)).toHaveLength(2);
    expect(prod.html).toContain(`<link rel="me" href="${LINKS.linkedin}" />`);
    expect(prod.html).toContain(`<link rel="me" href="${LINKS.github}" />`);
  });

  it("has Open Graph and Twitter tags with absolute URLs and no unreplaced tokens", () => {
    const og = (k: string) => meta(prod.html, "property", `og:${k}`);
    expect(og("type")).toBe("website");
    expect(og("site_name")).toBe(PROFILE.name);
    expect(og("title")).toBe(pageTitle());
    expect(og("description")).toBe(pageDescription());
    expect(og("url")).toBe(`${SITE_URL}/`);
    expect(og("image")).toBe(`${SITE_URL}/og-image.png`);
    expect(og("image:width")).toBe("1200");
    expect(og("image:height")).toBe("630");
    expect(og("image:alt")).toBeTruthy();
    expect(og("locale")).toBe("en_US");
    const tw = (k: string) => meta(prod.html, "name", `twitter:${k}`);
    expect(tw("card")).toBe("summary_large_image");
    expect(tw("image")).toBe(`${SITE_URL}/og-image.png`);
    expect(tw("title")).toBe(pageTitle());
    expect(tw("image:alt")).toBeTruthy();
    expect(prod.html).not.toMatch(/\{\{[A-Z_]+\}\}/);
    expect(prod.html).not.toContain("twitter:site");
  });

  it("emits no search-console tags without tokens", () => {
    expect(prod.html).not.toContain("google-site-verification");
    expect(prod.html).not.toContain("msvalidate.01");
  });
});

describe("robots.txt and sitemap.xml", () => {
  it("production allows crawling and the sitemap points at the canonical URL", () => {
    expect(prod.robots).toContain("Allow: /");
    expect(prod.robots).toContain(`Sitemap: ${SITE_URL}/sitemap.xml`);
    expect(prod.sitemap).toContain(`<loc>${SITE_URL}/</loc>`);
    expect(prod.sitemap).toMatch(/<lastmod>\d{4}-\d{2}-\d{2}<\/lastmod>/);
  });

  it("non-production builds are kept out of search results", () => {
    expect(meta(preview.html, "name", "robots")).toBe("noindex, nofollow");
    expect(preview.robots).toContain("Disallow: /");
    expect(preview.robots).not.toContain("Allow:");
    expect(preview.html).toContain(`<link rel="canonical" href="${SITE_URL}/" />`);
  });

  it("treats a missing CONTEXT (local build) as non-production", () => {
    expect(robotsTxt({ buildDate: "2026-01-01" })).toContain("Disallow: /");
    expect(robotsTxt({ buildDate: "2026-01-01", context: "production" })).toContain("Allow: /");
  });
});

describe("search-console verification", () => {
  it("is injected only when set, and escaped", () => {
    const base = { buildDate: "2026-01-01" };
    expect(verificationTags(base)).toBe("");
    expect(verificationTags({ ...base, googleVerification: "  " })).toBe("");
    const tags = verificationTags({
      ...base,
      googleVerification: 'abc"def',
      bingVerification: "xyz",
    });
    expect(tags).toContain('name="google-site-verification" content="abc&quot;def"');
    expect(tags).toContain('name="msvalidate.01" content="xyz"');
    expect(applyTokens("{{VERIFICATION}}", { ...base, bingVerification: "tok" })).toContain("tok");
  });
});

describe("structured data", () => {
  const blocks = (html: string) =>
    [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map(
      (m) => JSON.parse(m[1] ?? "") as { "@graph": Array<Record<string, unknown>> },
    );

  it("parses and is built only from the content file", () => {
    const [data] = blocks(prod.html);
    const graph = data?.["@graph"] ?? [];
    const type = (t: string) => graph.find((n) => n["@type"] === t) as Record<string, unknown>;
    const person = type("Person");
    expect(person["name"]).toBe(PROFILE.name);
    expect(person["jobTitle"]).toBe(PROFILE.title);
    expect(person["email"]).toBe(LINKS.email);
    expect(person["sameAs"]).toEqual([LINKS.linkedin, LINKS.github]);
    expect(person["knowsLanguage"]).toEqual([...PROFILE.languages]);
    expect(person["address"]).toMatchObject({ addressLocality: PROFILE.location });
    expect(person["image"]).toMatch(/^https:\/\/momenshili\.app\//);
    expect(type("WebSite")["url"]).toBe(SITE_URL);
    expect(type("ProfilePage")["mainEntity"]).toEqual({ "@id": person["@id"] });
    const items = (type("ItemList")["itemListElement"] as Array<{ item: { name: string } }>).map(
      (i) => i.item.name,
    );
    expect(items).toEqual(PROJECTS.map((p) => p.name));
  });
});

describe("content, anchors and assets", () => {
  it("has exactly one h1, the five section anchors and the landmarks", () => {
    expect(prod.html.match(/<h1[ >]/g)).toHaveLength(1);
    for (const id of ["about", "experience", "projects", "skills", "contact"]) {
      expect(prod.html).toContain(`id="${id}"`);
    }
    for (const tag of ["<header", "<nav", "<main", "<footer"]) expect(prod.html).toContain(tag);
  });

  it("has the full portfolio text in the static HTML, with a noscript note", () => {
    for (const p of PROJECTS) expect(prod.html).toContain(p.name.replace(/&/g, "&amp;"));
    expect(prod.html).toContain(PROFILE.bio.replace(/&/g, "&amp;"));
    expect(prod.html).toMatch(/<noscript>[\s\S]*mailto:contact@momenshili\.app/);
  });

  it("never mentions the banned name", () => {
    expect(prod.html.toLowerCase()).not.toContain("deduck");
  });

  it("has no broken internal anchors", () => {
    const ids = new Set([...prod.html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]));
    for (const m of prod.html.matchAll(/href="#([^"]*)"/g)) {
      if (m[1]) expect(ids.has(m[1]), `#${m[1]}`).toBe(true);
    }
  });

  it("ships every local file the page references", () => {
    const refs = [...prod.html.matchAll(/(?:href|src)="(\/[^"?#]+)"/g)].map((m) => m[1] ?? "");
    expect(refs.length).toBeGreaterThan(8);
    for (const ref of refs) {
      if (ref !== "/") expect(existsSync(join(prod.dir, ref)), ref).toBe(true);
    }
    const manifest = JSON.parse(readFileSync(join(prod.dir, "site.webmanifest"), "utf8")) as {
      icons: Array<{ src: string }>;
    };
    for (const icon of manifest.icons) expect(existsSync(join(prod.dir, icon.src))).toBe(true);
  });

  it("keeps the social image small", () => {
    const size = readFileSync(join(prod.dir, "og-image.png")).length;
    expect(size).toBeLessThan(300 * 1024);
  });
});

describe("Netlify contact form detection", () => {
  const formTag = (html: string) => /<form name="contact"[^>]*>([\s\S]*?)<\/form>/.exec(html) ?? [];

  it("has exactly one static form with the Netlify attributes, hidden", () => {
    expect(prod.html.match(/<form[ >]/g)).toHaveLength(1);
    const [whole] = formTag(prod.html);
    expect(whole).toContain(`name="${CONTACT_FORM_NAME}"`);
    expect(whole).toContain('data-netlify="true"');
    expect(whole).toContain('netlify-honeypot="bot-field"');
    expect(whole).toContain('method="POST"');
    expect(/<form[^>]*\shidden[\s>]/.test(whole ?? "")).toBe(true);
  });

  it("has exactly the field names the real form posts", () => {
    const [, inner] = formTag(prod.html);
    const staticNames = [...(inner ?? "").matchAll(/name="([^"]+)"/g)].map((m) => m[1]).sort();
    const posted = [
      ...encodePayload({
        name: "",
        email: "",
        message: "",
        source: "plain-page",
        honeypot: "",
      }).keys(),
    ].sort();
    expect(staticNames).toEqual(posted);
    expect(staticNames).toEqual(["form-name", ...CONTACT_FIELDS].sort());
  });

  it("is not duplicated by the real form's markup", () => {
    const ui = readFileSync("src/ui/contactForm.ts", "utf8");
    expect(ui).not.toContain("data-netlify");
    for (const field of CONTACT_FIELDS.filter((f) => f !== "source")) {
      expect(ui, field).toContain(`name: "${field}"`);
    }
  });
});

describe("hosting config", () => {
  const toml = readFileSync("netlify.toml", "utf8");

  it("has no redirect that could swallow the form POST to /", () => {
    expect(toml).not.toMatch(/^\s*\[\[redirects\]\]/m);
    expect(existsSync("public/_redirects")).toBe(false);
  });

  it("sets caching and security headers, with a CSP that allows the form POST", () => {
    expect(toml).toContain("max-age=31536000, immutable");
    expect(toml).toContain("must-revalidate");
    for (const h of ["X-Content-Type-Options", "Referrer-Policy", "Permissions-Policy"]) {
      expect(toml).toContain(h);
    }
    const csp = /Content-Security-Policy = "([^"]+)"/.exec(toml)?.[1] ?? "";
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("connect-src 'self'");
    expect(csp).toContain("form-action 'self'");
    expect(csp).not.toMatch(/https?:\/\//);
  });

  it("keeps a single source for headers", () => {
    expect(existsSync("public/_headers")).toBe(false);
  });

  it("needs no inline script (CSP script-src 'self')", () => {
    const inline = [...prod.html.matchAll(/<script(?![^>]*\ssrc=)(?![^>]*ld\+json)[^>]*>/g)];
    expect(inline).toEqual([]);
  });
});
