import { type Plugin } from "vite";
import { defineConfig } from "vitest/config";
import { LINKS, PROFILE } from "./src/content/portfolio.ts";
import { renderFallback } from "./src/fallback/renderFallback.ts";

const SITE_URL = "https://momenshili.app";

function jsonLd(): string {
  const data = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: PROFILE.name,
    jobTitle: PROFILE.title,
    url: SITE_URL,
    description: PROFILE.short,
    address: { "@type": "PostalAddress", addressLocality: PROFILE.location },
    knowsLanguage: [...PROFILE.languages],
    email: `mailto:${LINKS.email}`,
    sameAs: [LINKS.linkedin, LINKS.github],
  };
  return JSON.stringify(data).replace(/</g, "\\u003c");
}

/** Fills the page metadata and the plain-page fallback from src/content/portfolio.ts. */
function portfolioHtml(): Plugin {
  const escAttr = (v: string): string => v.replace(/&/g, "&amp;").replace(/"/g, "&quot;");
  const tokens: Record<string, string> = {
    "{{TITLE}}": escAttr(`${PROFILE.name} - ${PROFILE.title}`),
    "{{NAME}}": escAttr(PROFILE.name),
    "{{DESCRIPTION}}": escAttr(PROFILE.short),
    "{{SITE_URL}}": SITE_URL,
    "{{OG_IMAGE}}": `${SITE_URL}/og-image.png`,
    "{{JSON_LD}}": jsonLd(),
  };
  return {
    name: "portfolio-html",
    transformIndexHtml: {
      order: "pre",
      handler(html) {
        let out = html.replace("<!--FALLBACK-->", renderFallback());
        for (const [token, value] of Object.entries(tokens)) out = out.split(token).join(value);
        return out;
      },
    },
  };
}

export default defineConfig({
  plugins: [portfolioHtml()],
  build: {
    target: "es2022",
    chunkSizeWarningLimit: 1500,
  },
  test: {
    include: ["tests/**/*.test.ts"],
  },
});
