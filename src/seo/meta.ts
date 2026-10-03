/**
 * Everything SEO-related that is derived from the content file. Pure functions, no Vite or DOM,
 * so the build plugin and the tests use exactly the same code. Nothing here is hand-written fact.
 */
import { LINKS, PROFILE, PROJECTS } from "../content/portfolio.ts";

export const SITE_URL = "https://momenshili.app";
export const OG_IMAGE_URL = `${SITE_URL}/og-image.png`;
export const PORTRAIT_URL = `${SITE_URL}/art/portrait.png`;

export interface SeoOptions {
  /** Netlify build context: "production", "deploy-preview", "branch-deploy" or undefined (local). */
  context?: string | undefined;
  googleVerification?: string | undefined;
  bingVerification?: string | undefined;
  /** ISO date (YYYY-MM-DD) used for sitemap lastmod. */
  buildDate: string;
}

export const isProduction = (context: string | undefined): boolean => context === "production";

/** "Hammam-Lif, Tunis" -> "Tunis": the broader place name, used in the page title. */
function broadPlace(): string {
  return PROFILE.location.split(",").pop()?.trim() ?? PROFILE.location;
}

export function pageTitle(): string {
  return `${PROFILE.name} - ${PROFILE.title} in ${broadPlace()} | Portfolio`;
}

export function pageDescription(): string {
  return `${PROFILE.short} Based in ${PROFILE.location}. Works in ${listWords(PROFILE.languages)}.`;
}

function listWords(items: readonly string[]): string {
  if (items.length < 2) return items.join("");
  return `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
}

export const ogImageAlt = (): string =>
  `Pixel-art portrait of ${PROFILE.name}, ${PROFILE.title}, in front of a small town`;

export function robotsMeta(options: SeoOptions): string {
  return isProduction(options.context)
    ? "index, follow, max-image-preview:large"
    : "noindex, nofollow";
}

export function robotsTxt(options: SeoOptions): string {
  if (!isProduction(options.context)) return "User-agent: *\nDisallow: /\n";
  return `User-agent: *\nAllow: /\n\nSitemap: ${SITE_URL}/sitemap.xml\n`;
}

export function sitemapXml(options: SeoOptions): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${SITE_URL}/</loc>
    <lastmod>${options.buildDate}</lastmod>
  </url>
</urlset>
`;
}

export function jsonLdGraph(): Record<string, unknown> {
  const personId = `${SITE_URL}/#person`;
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Person",
        "@id": personId,
        name: PROFILE.name,
        jobTitle: PROFILE.title,
        url: SITE_URL,
        image: PORTRAIT_URL,
        description: PROFILE.short,
        address: { "@type": "PostalAddress", addressLocality: PROFILE.location },
        knowsLanguage: [...PROFILE.languages],
        email: LINKS.email,
        sameAs: [LINKS.linkedin, LINKS.github],
      },
      {
        "@type": "WebSite",
        "@id": `${SITE_URL}/#website`,
        url: SITE_URL,
        name: PROFILE.name,
        inLanguage: "en",
        publisher: { "@id": personId },
      },
      {
        "@type": "ProfilePage",
        "@id": `${SITE_URL}/#profile`,
        url: SITE_URL,
        name: pageTitle(),
        inLanguage: "en",
        isPartOf: { "@id": `${SITE_URL}/#website` },
        mainEntity: { "@id": personId },
      },
      {
        "@type": "ItemList",
        "@id": `${SITE_URL}/#projects`,
        name: `Projects by ${PROFILE.name}`,
        itemListElement: PROJECTS.map((p, i) => ({
          "@type": "ListItem",
          position: i + 1,
          item: { "@type": "CreativeWork", name: p.name, description: p.desc },
        })),
      },
    ],
  };
}

/** A less-than sign written as a JSON escape (backslash, u, 003c), so it can never close a script tag. */
const LT = String.fromCharCode(92) + "u003c";

/** JSON for a <script type="application/ld+json">, safe against "</script>". */
export function jsonLdScript(): string {
  return JSON.stringify(jsonLdGraph()).replace(/</g, LT);
}

const escAttr = (v: string): string =>
  v.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");

/** Optional search-console verification tags: only emitted when a token is provided. */
export function verificationTags(options: SeoOptions): string {
  const tags: string[] = [];
  const google = options.googleVerification?.trim();
  const bing = options.bingVerification?.trim();
  if (google) tags.push(`<meta name="google-site-verification" content="${escAttr(google)}" />`);
  if (bing) tags.push(`<meta name="msvalidate.01" content="${escAttr(bing)}" />`);
  return tags.join("\n    ");
}

/** Values for the {{TOKENS}} in index.html. */
export function htmlTokens(options: SeoOptions): Record<string, string> {
  return {
    "{{TITLE}}": escAttr(pageTitle()),
    "{{NAME}}": escAttr(PROFILE.name),
    "{{DESCRIPTION}}": escAttr(pageDescription()),
    "{{SITE_URL}}": SITE_URL,
    "{{OG_IMAGE}}": OG_IMAGE_URL,
    "{{OG_IMAGE_ALT}}": escAttr(ogImageAlt()),
    "{{ROBOTS}}": robotsMeta(options),
    "{{VERIFICATION}}": verificationTags(options),
    "{{LINKEDIN}}": LINKS.linkedin,
    "{{GITHUB}}": LINKS.github,
    "{{EMAIL}}": LINKS.email,
    "{{JSON_LD}}": jsonLdScript(),
  };
}

export function applyTokens(html: string, options: SeoOptions): string {
  let out = html;
  for (const [token, value] of Object.entries(htmlTokens(options))) {
    out = out.split(token).join(value);
  }
  return out;
}
