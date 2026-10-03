import { type Plugin } from "vite";
import { defineConfig } from "vitest/config";
import { renderFallback } from "./src/fallback/renderFallback.ts";
import { applyTokens, robotsTxt, sitemapXml, type SeoOptions } from "./src/seo/meta.ts";

/**
 * Fills the page metadata and the plain-page fallback from src/content/portfolio.ts and emits
 * robots.txt and sitemap.xml. Netlify sets CONTEXT; anything but "production" is kept out of
 * search results (noindex meta plus a robots.txt that disallows everything).
 */
function portfolioHtml(): Plugin {
  let options: SeoOptions = { buildDate: new Date().toISOString().slice(0, 10) };
  return {
    name: "portfolio-html",
    configResolved(config) {
      options = {
        context: process.env["CONTEXT"],
        googleVerification: config.env["VITE_GOOGLE_SITE_VERIFICATION"] as string | undefined,
        bingVerification: config.env["VITE_BING_SITE_VERIFICATION"] as string | undefined,
        buildDate: new Date().toISOString().slice(0, 10),
      };
    },
    transformIndexHtml: {
      order: "pre",
      handler(html) {
        return applyTokens(html.replace("<!--FALLBACK-->", renderFallback()), options);
      },
    },
    generateBundle() {
      this.emitFile({ type: "asset", fileName: "robots.txt", source: robotsTxt(options) });
      this.emitFile({ type: "asset", fileName: "sitemap.xml", source: sitemapXml(options) });
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
