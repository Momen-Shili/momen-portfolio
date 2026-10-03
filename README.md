# Momen Shili - game portfolio

A 2D top-down RPG-style portfolio. Walk a small pixel-art town; each building is a section
(House = About, Workshop = Projects, Library = Skills, Post office = Contact). A "Skip game: view as
plain page" link at the top-left shows the same content as a normal web page, rendered from the same
data file.

Built with **Phaser 3 + Vite + TypeScript (strict)**. Static build, no backend.

This is a **new project in its own directory**. The old Lovable site (`screen-snap-magic-193`) is
untouched and was used only as a reference for the content and the retro terminal.

## Run it

```bash
npm install
npm run dev        # http://localhost:5173
```

Bun works too (`bun install`, `bun run dev`) because every script is a plain package script.

| Script              | What it does                                        |
| ------------------- | --------------------------------------------------- |
| `npm run dev`       | Vite dev server                                     |
| `npm run build`     | Type-check, then production build into `dist/`      |
| `npm run preview`   | Serve `dist/` locally                               |
| `npm run lint`      | ESLint                                              |
| `npm run typecheck` | `tsc --noEmit` (strict)                             |
| `npm run test`      | Vitest (parser, dialog, zones, input, map, content) |
| `npm run og`        | Regenerate `public/og-image.png` (needs Node 22.6+) |

## Controls

Arrows / WASD move, E or Space interact, Esc closes panels. On touch devices a joystick and an
action button appear. The "?" button (or the notice board) shows the overview and controls. Sound is
off until you switch it on.

## Edit the content

All portfolio text lives in **`src/content/portfolio.ts`**: profile, links, projects, skills,
experience. Nothing else holds portfolio copy, so editing that one file updates:

- the panels in the game,
- the retro terminal output,
- the plain-page fallback (injected into `index.html` at build time),
- the page title, meta description, Open Graph tags and JSON-LD.

Optional fields already supported on a project: `url` (adds a "Visit" link) and `image` (adds a
screenshot; put the file in `public/` and use a path such as `/shots/tunexa.png`).

Other authored text, kept small and separate:

- `src/content/npcs.ts` - NPC dialog. Project facts in it are computed from `portfolio.ts`.
- `src/content/buildings.ts` - building names, terminal aliases (`open workshop`, `open projects`) and
  one-line descriptions.

Language: the copy is English. Strings are kept out of the scenes so French/Arabic can be added
later, but there is no i18n layer yet.

## Swap the art

Every texture is listed in **`src/config/assets.ts`**. By default each is generated in code
(`src/world/art/`). To use real art, add a `file` to that entry:

```ts
{ key: "player", file: "art/player.png", frame: { width: 16, height: 16 } },
```

Put the image in `public/art/`. Sheet layout for characters: 3 columns (idle, walk A, walk B) by
3 rows (down, up, left); right-facing is the left row flipped. The tileset is a single row of 16x16
tiles in the order of `src/world/tiles.ts`. The framed portrait on the house wall and the About avatar use `public/art/portrait*.png`
(originals are kept in `art-source/`).

Maps are plain data in `src/world/townMap.ts` and `src/world/houseMap.ts` (a Tiled export is not
needed). `tests/maps.test.ts` checks that every door, NPC and spawn is reachable.

## How it is organised

```
src/
  content/    portfolio.ts (single source of truth), npcs.ts, buildings.ts
  config/     assets.ts (asset manifest)
  world/      map data, tile indices, pixel font, generated art
  systems/    pure logic: input, dialog, interaction zones, terminal parser, contact/mailto, audio
  scenes/     BootScene (loading), WorldScene (town and interiors)
  ui/         DOM overlays: panels, dialog, HUD, title, joystick, contact form, terminal
  fallback/   HTML builders shared by panels and the plain page
  game/       start-up wiring (Phaser is imported only here, so it loads lazily)
  main.ts     chooses game or plain mode
tests/        Vitest
```

Panels, dialogs and the HUD are real DOM on top of the canvas, so text is selectable and readable
by screen readers, focus is trapped in a panel and returned on close, and the game world freezes
while a panel is open. The plain page never downloads Phaser.

## Deploy to momenshili.app

`npm run build` produces a static `dist/` folder. Any static host works:

- **Vercel**: import the repo; `vercel.json` sets the build command, output folder and caching.
- **Netlify**: `netlify.toml` is included. **Cloudflare Pages**: build command `npm run build`,
  output `dist` (`public/_headers` is picked up).
- **GitHub Pages**: publish `dist/`; `public/CNAME` already contains `momenshili.app`.

Then point the domain's DNS at the host (apex `A`/`ALIAS` plus `www` `CNAME`, per the host's
instructions). The canonical URL, sitemap and social tags assume `https://momenshili.app`.

## Notes

- Initial download is about 4 KB of JS plus 3 KB of CSS and the HTML; the game engine (about
  335 KB gzipped) loads on demand when the game starts.
- `prefers-reduced-motion` turns off water, flag, NPC and fountain animation and the camera
  smoothing/fade.
- Run `npm run lint && npm run typecheck && npm run test` before committing.
