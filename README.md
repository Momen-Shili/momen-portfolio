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
  systems/    pure logic: input, dialog, interaction zones, terminal parser, contact (form logic, send layer, mailto fallback),
              quests/ (engine, definitions, persistence, mini-game rules)
  scenes/     BootScene (loading), WorldScene (town and interiors)
  ui/         DOM overlays: panels, dialog, HUD, title, joystick, contact form, terminal
  fallback/   HTML builders shared by panels and the plain page; renderFallback.ts is the page
  plain/      optional plain-page polish (typewriter, reveal, theme)
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

## Extending the town

### Add a building

1. Draw it in `src/world/art/buildings.ts` and place it (and its door tile) in `src/world/townMap.ts`.
2. Add a name, alias and blurb in `src/content/buildings.ts`.
3. Give it an interior: copy one of `src/world/interiors/*Interior.ts`, use `InteriorBuilder` to lay
   out the room, and register its id in `MAP_IDS` (`src/world/maps.ts`). The door zone uses the
   `enter` action and the interior's exit mat uses `exit`.
4. Run `npm test`. `tests/maps.test.ts` checks that every door, NPC, hotspot and spawn is reachable.

### Add an interior item (a hotspot inside a building)

1. Add the item to `src/content/items.ts` (id, label, what it shows).
2. Add its panel view in `src/ui/itemViews.ts`. Factual text must come from `portfolio.ts`.
3. Place a zone with `action: "item"` in the interior builder. Anything revealed there also has to
   exist in a normal panel and on the plain page; the content tests check this.

### Add an animation or effect

Ambient effects (clouds, birds, butterflies, leaves, window glow) live in `src/game/effects/` and use
the sprite pool in `pool.ts` under the cap in `effectBudget.ts`, so frame time stays flat. Add the
texture in `src/world/art/effects.ts`, register it in `src/config/assets.ts`, spawn it from
`ambient.ts`, and honour `effectsReduced()` so "Reduce effects" and the OS reduced-motion setting
switch it off. Add a test to `tests/effects.test.ts`.

### The plain page

`src/fallback/renderFallback.ts` builds the whole page from `portfolio.ts` at build time (the Vite
plugin in `vite.config.ts` injects it, so it works with JavaScript off). `src/plain/enhance.ts` adds
the optional typewriter, scroll reveal, active nav, back-to-top and light/dark theme, and
`src/styles/plain.css` holds the two colour themes (contrast is checked in `tests/plainPage.test.ts`).
`public/art/walker.png` is regenerated with `npm run walker`.

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

## Contact form (Netlify Forms)

The form in the Post office and on the plain page is one shared module (`src/ui/contactForm.ts`,
state machine in `src/systems/contactFlow.ts`). It posts to this site's own Netlify Forms endpoint;
there is no backend, API key or third-party script. This is the only network request the site makes.

- **How Netlify finds the form:** a hidden static copy lives in `index.html`
  (`<form name="contact" data-netlify="true" netlify-honeypot="bot-field" hidden>`). Netlify reads it
  from the built HTML at deploy time. The real form posts the same field names (`name`, `email`,
  `message`, `source`, `bot-field`, plus `form-name=contact`); `tests/seoBuild.test.ts` fails if the two
  ever drift apart. If you add a field, change `CONTACT_FIELDS` in `src/systems/contact.ts` and the
  static form together.
- **`source`** is `game-post-office` or `plain-page`, so you can see where each message came from.
- **Spam protection:** a hidden honeypot field, a 2 second minimum fill time, and Netlify's built-in
  spam filtering. No CAPTCHA.
- **If sending fails** (offline, a local server, Netlify not set up yet), the form keeps what was
  typed and shows "Couldn't send it. You can email me directly at contact@momenshili.app" with a
  `mailto:` link that already contains the message.
- **Local development:** Netlify Forms do not exist on `npm run dev` or `npm run preview`, so a
  submit there ends in the fallback message above. That is expected. To see the success state, mock
  the endpoint in the browser console: `window.fetch = async () => new Response("", { status: 200 })`.
- **Swapping the backend later** (a Netlify Function plus an email provider): only
  `src/systems/contactSend.ts` (`sendContactMessage`) changes.
- **Redirects:** `netlify.toml` deliberately has no `[[redirects]]`. A catch-all rule would swallow the
  form POST to `/`. A test guards this.

### Netlify checklist (one time)

1. Netlify -> Forms: **Enable form detection**.
2. Deploy a build that contains the form (merge `dev` into `main`, or deploy the branch) and wait for
   it to finish. The `contact` form only appears after such a deploy. If it does not, use Deploys ->
   Trigger deploy -> **Clear cache and deploy site**.
3. Forms -> contact -> Settings & notifications -> Form notifications -> **Add notification ->
   Email notification**, and enter the address that should receive messages.
4. Send a real test message from the live plain page and another from the game's Post office. Check
   that each arrives by email and shows in the Netlify submissions list with the right `source`.
5. Check the spam folder once and mark the sender as not spam.

`contact@momenshili.app` (used by the `mailto:` links and the failure fallback) must also receive mail:
set up email forwarding or a mailbox for that address with your domain or email provider.

## SEO and meta

Everything factual is generated from `src/content/portfolio.ts`; nothing is hand-written in the HTML.

| What                                                                  | Where                                             |
| --------------------------------------------------------------------- | ------------------------------------------------- |
| Title (about 55 characters), description (about 155), JSON-LD         | `src/seo/meta.ts`                                 |
| Head tags (canonical, Open Graph, Twitter, robots, `rel="me"`, icons) | `index.html` with `{{TOKENS}}` filled at build    |
| `robots.txt` and `sitemap.xml` (lastmod = build date)                 | emitted by the plugin in `vite.config.ts`         |
| Social image 1200x630 (under 300 KB)                                  | `npm run og` (`scripts/make-og.mjs`)              |
| Caching and security headers (including a CSP)                        | `netlify.toml`                                    |
| The plain page the crawlers read                                      | `src/fallback/renderFallback.ts`, built into HTML |

Structured data is a `Person`, `WebSite`, `ProfilePage` and an `ItemList` of projects (name and
description only). The page never sets a Twitter/X handle.

**Only production is indexable.** Netlify sets `CONTEXT`; anything other than `production` (deploy
previews, branch deploys, and local builds) gets `<meta name="robots" content="noindex, nofollow">` and
a `robots.txt` that disallows everything. The canonical URL always points at `https://momenshili.app/`.
Once the custom domain works, make the default `*.netlify.app` address redirect to it (Netlify ->
Domain management -> set the custom domain as primary). Add a redirect rule only with the exact
subdomain, and keep it host-specific so it cannot catch the form POST.

**Search console tokens (optional).** In Netlify -> Site configuration -> Environment variables add
`VITE_GOOGLE_SITE_VERIFICATION` and/or `VITE_BING_SITE_VERIFICATION` (the token string only), then
redeploy. The meta tag is added only when a value is set.

**Submit the sitemap.** Google: Search Console -> add the property -> verify (token above or DNS) ->
Sitemaps -> enter `sitemap.xml`. Bing: Webmaster Tools -> add the site (or import from Google) ->
Sitemaps -> submit `https://momenshili.app/sitemap.xml`.

**Preview the social card** with the free debuggers: Facebook's Sharing Debugger, LinkedIn's Post
Inspector, and X's card preview (or just post the link in a private chat). These platforms cache images,
so use their "scrape again" option after changing `og-image.png`.

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
Pages, which would need the headers from `netlify.toml` copied to a `_headers` file). The old "Deploy to momenshili.app" notes below still apply to them.

## Other static hosts

`npm run build` produces a static `dist/` folder. Any static host works:

- **Vercel**: import the repo; `vercel.json` sets the build command, output folder and caching.
- **Netlify**: `netlify.toml` is included. **Cloudflare Pages**: build command `npm run build`,
  output `dist`. Netlify Forms and the headers in `netlify.toml` are Netlify features, so the contact form falls back to the `mailto:` link there.
- **GitHub Pages**: publish `dist/`; `public/CNAME` already contains `momenshili.app`.

Then point the domain's DNS at the host (apex `A`/`ALIAS` plus `www` `CNAME`, per the host's
instructions). The canonical URL, sitemap and social tags assume `https://momenshili.app`.

## Notes

- Initial download is about 4 KB of JS plus 2 KB of CSS and the HTML. The game engine, quests,
  audio and the game styles (about 355 KB gzipped) load on demand when the game starts.
- `prefers-reduced-motion` turns off water, flag, NPC and fountain animation and the camera
  smoothing/fade.
- Run `npm run lint && npm run typecheck && npm run test` before committing.
