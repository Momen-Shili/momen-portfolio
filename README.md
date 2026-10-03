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

| Script              | What it does                                              |
| ------------------- | --------------------------------------------------------- |
| `npm run dev`       | Vite dev server                                           |
| `npm run build`     | Type-check, then production build into `dist/`            |
| `npm run preview`   | Serve `dist/` locally                                     |
| `npm run lint`      | ESLint                                                    |
| `npm run typecheck` | `tsc --noEmit` (strict)                                   |
| `npm run test`      | Vitest (parser, dialog, zones, input, map, content)       |
| `npm run og`        | Regenerate `public/og-image.png` (needs Node 22.6+)       |
| `npm run icons`     | Regenerate the favicon set from `art-source/portrait.png` |

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
  systems/    pure logic: input, dialog, interaction zones, terminal parser, contact/mailto,
              quests/ (engine, definitions, persistence, mini-game rules)
  scenes/     BootScene (loading), WorldScene (town and interiors)
  ui/         DOM overlays: panels, dialog, HUD, title, joystick, contact form, terminal
  fallback/   HTML builders shared by panels and the plain page
  audio/      music data, sequencer, mixer math, effects and the Web Audio engine
  game/       start-up wiring, quest director, bug-hunt controller (Phaser loads lazily from here)
  main.ts     chooses game or plain mode
tests/        Vitest
```

Panels, dialogs and the HUD are real DOM on top of the canvas, so text is selectable and readable
by screen readers, focus is trapped in a panel and returned on close, and the game world freezes
while a panel is open. The plain page never downloads Phaser.

## Side quests (optional)

Seven optional quests make the town more fun. None of them gates content: every panel and the plain
page work without touching a quest. Open the quest log with `Q` or the "Quests" HUD button; it shows
badges, active, completed and locked quests, hints and a reset button. Progress is saved in
`localStorage` (the game still works if storage is blocked) and never leaves the browser.

| Quest            | How it works                                                                                                              |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------- |
| Skill gems       | Three gems are hidden in quiet corners; each pops up the skills of one level from `SKILLS`. Reward: gem trail.            |
| Special delivery | The post office clerk gives a parcel for the smith; the Projects panel then features a random project.                    |
| Bug hunt         | The guide starts a 30 s plaza mini-game: squash 7 bugs by walking into them or tapping. No fail state.                    |
| Gone fishing     | Cast at the pond and press at the bite. Fish are named after `PROJECTS` tags and show their project. Reward: fishing hat. |
| Match the stack  | The librarian's 4-round quiz built from `PROJECTS`; wrong answers just show the right one.                                |
| Terminal secret  | A hidden command on the retro computer (the librarian hints at it). `achievements` lists progress.                        |
| Night watch      | Stand still by the fountain for about ten seconds.                                                                        |

Finishing all seven opens a friendly celebration with a contact call to action built from `LINKS`.

### Adding a quest

1. Append a definition to `src/systems/quests/definitions.ts` (id, title, giver, steps, reward). A
   step has a `trigger`: an event type, optional `where` field matches, and optional `count` or
   `distinct` counting.
2. Emit the events it listens for (`quests.emit({ type: "..." })`) from a scene, panel or the
   director in `src/game/questDirector.ts`. Add a new event type to `QuestEvent` if needed.
3. If it has a giver, add that NPC's lines in `src/systems/quests/npcTalk.ts`.
4. Add tests next to `tests/quests.test.ts`. The "all seven quests" test will tell you to update the
   count.

Quest text must not state facts about Momen. Anything factual is built from `portfolio.ts`.

### Fun facts

`FUN_FACTS` in `portfolio.ts` is empty on purpose (`TODO(Momen)`). When you add entries, the guide,
the night-watch sparkle and the About panel / plain page start using them. While it is empty, none of
those features appear.

## Audio

All audio is generated in the browser with the Web Audio API: no audio files, no licences, no download.

- `src/audio/tracks.ts` holds the music as data: a title intro, a town loop, a calmer interior loop,
  a bug-hunt loop and a victory jingle. Patterns are compact strings (`C4:2 E4 -:2`), played by a
  lookahead sequencer (`sequencer.ts`) that is tested on a mock clock.
- `src/audio/sfxRecipes.ts` describes the 14 sound effects (footsteps, interact, pickups, quest
  steps, squash, bite, catch, terminal keys...).
- `src/audio/engine.ts` owns the audio graph: crossfades between scenes, ducking (quieter and duller)
  while a panel, dialog or the fishing card is open, a master limiter, and pause-when-hidden.
- Nothing starts before the visitor clicks "Start with sound" or "Start silent" (silent is focused by
  default; the last choice is remembered). `M` mutes, and the "Audio" HUD button opens separate music
  and effects sliders. Leaving the game (the plain-page link) closes the audio context.

To use a real recording, set `file` for a track in `src/config/audio.ts`
(for example `{ town: { file: "audio/town.ogg" } }`, file under `public/audio/`). It loops (the title
and victory tracks play once) and the generated version is the fallback if the file fails to load.

## Deploy to Netlify in 3 minutes

The repo already contains `netlify.toml` (build command, publish folder, Node 22, cache and security
headers), so Netlify detects everything.

1. Sign in at [app.netlify.com](https://app.netlify.com) and click **Add new site -> Import an existing project**.
2. Choose **GitHub**, authorise Netlify if asked, and pick the `momen-os-portfolio` repository
   (for a private repo, allow Netlify access to it when GitHub asks).
3. The settings are filled in from `netlify.toml` (build command `npm run build`, publish directory
   `dist`). Leave the branch as `main` and click **Deploy**.
4. When it finishes you get a `*.netlify.app` URL. Every push to `main` redeploys automatically.
   Branch deploys for `dev` can be switched on under **Site configuration -> Build & deploy ->
   Branches and deploy contexts** to preview work in progress.

### Custom domain (momenshili.app)

1. **Domain management -> Add a domain** and enter `momenshili.app`.
2. Easiest: choose **Use Netlify DNS** and set the nameservers Netlify shows at your registrar.
3. Or keep your registrar's DNS and add the records Netlify displays, normally:
   - `A` record for `momenshili.app` pointing to Netlify's load-balancer IP (shown in the dashboard)
   - `CNAME` record for `www` pointing to `<your-site>.netlify.app`
4. Netlify issues the HTTPS certificate automatically once DNS resolves. Set the primary domain to
   `momenshili.app` so `www` redirects to it.

Other hosts also work (Vercel config in `vercel.json`, GitHub Pages via `public/CNAME`, Cloudflare
Pages via `public/_headers`). The old "Deploy to momenshili.app" notes below still apply to them.

## Other static hosts

`npm run build` produces a static `dist/` folder. Any static host works:

- **Vercel**: import the repo; `vercel.json` sets the build command, output folder and caching.
- **Netlify**: `netlify.toml` is included. **Cloudflare Pages**: build command `npm run build`,
  output `dist` (`public/_headers` is picked up).
- **GitHub Pages**: publish `dist/`; `public/CNAME` already contains `momenshili.app`.

Then point the domain's DNS at the host (apex `A`/`ALIAS` plus `www` `CNAME`, per the host's
instructions). The canonical URL, sitemap and social tags assume `https://momenshili.app`.

## Notes

- Initial download is about 4 KB of JS plus 2 KB of CSS and the HTML. The game engine, quests,
  audio and the game styles (about 355 KB gzipped) load on demand when the game starts.
- `prefers-reduced-motion` turns off water, flag, NPC and fountain animation and the camera
  smoothing/fade.
- Run `npm run lint && npm run typecheck && npm run test` before committing.
