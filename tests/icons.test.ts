import { existsSync, readFileSync, statSync } from "node:fs";
import { describe, expect, it } from "vitest";

const html = readFileSync("index.html", "utf8");

/** href values of every <link> in index.html that points at a local file. */
const localLinks = [...html.matchAll(/<link[^>]+href="(\/[^"]+)"/g)].map((m) => m[1] ?? "");

describe("favicon set", () => {
  it("links every icon file, and each one exists in public/", () => {
    for (const file of [
      "/favicon.ico",
      "/favicon-32x32.png",
      "/favicon-16x16.png",
      "/apple-touch-icon.png",
      "/site.webmanifest",
    ]) {
      expect(localLinks, file).toContain(file);
    }
    for (const href of localLinks) expect(existsSync(`public${href}`), href).toBe(true);
  });

  it("no longer references the old SVG favicon", () => {
    expect(html).not.toContain("favicon.svg");
    expect(existsSync("public/favicon.svg")).toBe(false);
  });

  it("has PNGs of the right pixel sizes", () => {
    const size = (file: string) => {
      const buf = readFileSync(`public/${file}`);
      expect(buf.subarray(1, 4).toString()).toBe("PNG");
      return [buf.readUInt32BE(16), buf.readUInt32BE(20)];
    };
    expect(size("favicon-16x16.png")).toEqual([16, 16]);
    expect(size("favicon-32x32.png")).toEqual([32, 32]);
    expect(size("apple-touch-icon.png")).toEqual([180, 180]);
    expect(size("icon-192.png")).toEqual([192, 192]);
    expect(size("icon-512.png")).toEqual([512, 512]);
  });

  it("packs 16, 32 and 48 pixel images into favicon.ico", () => {
    const ico = readFileSync("public/favicon.ico");
    expect(ico.readUInt16LE(2)).toBe(1);
    const count = ico.readUInt16LE(4);
    const sizes = Array.from({ length: count }, (_, i) => ico[6 + i * 16]);
    expect(sizes).toEqual([16, 32, 48]);
    expect(statSync("public/favicon.ico").size).toBeGreaterThan(300);
  });

  it("describes the icons and theme colour in the web manifest", () => {
    const manifest = JSON.parse(readFileSync("public/site.webmanifest", "utf8")) as {
      theme_color: string;
      icons: Array<{ src: string; sizes: string }>;
    };
    expect(manifest.theme_color).toBe("#1b1423");
    expect(manifest.icons.map((i) => i.sizes)).toEqual(["192x192", "512x512"]);
    for (const icon of manifest.icons) expect(existsSync(`public${icon.src}`)).toBe(true);
  });
});

describe("deploy config", () => {
  const toml = readFileSync("netlify.toml", "utf8");

  it("builds with npm and publishes dist with a pinned Node version", () => {
    expect(toml).toContain('command = "npm run build"');
    expect(toml).toContain('publish = "dist"');
    expect(toml).toMatch(/NODE_VERSION = "2[02]"/);
  });

  it("caches only hashed assets as immutable", () => {
    const blocks = toml.split("[[headers]]");
    const immutable = blocks.filter((b) => b.includes("immutable"));
    expect(immutable).toHaveLength(1);
    expect(immutable[0]).toContain('for = "/assets/*"');
  });

  it("sets security headers and no redirects", () => {
    expect(toml).toContain("X-Content-Type-Options");
    expect(toml).toContain("Permissions-Policy");
    expect(toml).not.toMatch(/^\[\[redirects\]\]/m);
  });
});
