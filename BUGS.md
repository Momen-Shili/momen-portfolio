# Bug log

Found by a systematic review of the code plus exploratory testing in the browser (desktop, a
320 px phone viewport, 125% display scaling, dev server and production preview). Each entry says what
was wrong, where, why, how it was fixed, and which test covers it. "Browser" means it can only be
checked in a real page, so it was verified by hand and is described instead of unit-tested.

## Fixed

### 1. A tab refocus could time out or break a mini-game

- **Where:** bug hunt, fishing, night watch (`src/systems/quests/minigames/`, `WorldScene.update`).
- **Cause:** frame deltas were used unclamped. After a hidden tab or a stall, one frame could report
  seconds: the 30 s bug-hunt timer ran out at once, bugs jumped through the fountain and benches,
  the fishing bite window expired, and night watch could complete without the player waiting.
- **Fix:** `clampFrame` (max 100 ms per step) in the pure mini-game classes and in the scene.
- **Test:** `tests/minigames.test.ts` ("frame clamp"). The older tests that relied on one huge step
  now advance in small steps like a real loop.

### 2. Joystick could get stuck or die

- **Where:** `src/ui/virtualControls.ts`.
- **Cause:** a drag only ended on `pointerup` over the stick. Releasing outside it, losing pointer
  capture, or a panel opening mid-drag (the controls get hidden) never delivered the release, so the
  player kept walking, or the joystick ignored all later touches because it still thought a pointer
  held it.
- **Fix:** logic moved to a DOM-free `JoystickModel` (`src/systems/joystick.ts`). Every way a drag can
  end is handled: window-level `pointerup` / `pointercancel`, `lostpointercapture`, window blur, tab
  hidden, and hiding the controls. A second finger is ignored while the first holds the stick.
- **Test:** `tests/joystick.test.ts`.

### 3. Resetting quests left the hat and collected gems behind

- **Where:** `WorldScene`.
- **Cause:** the scene only checked the quest state when it was created. After "Reset progress" the
  straw hat stayed on the player and picked-up gems did not reappear until the scene restarted.
- **Fix:** the scene subscribes to the quest engine and re-syncs the hat, gem sprites and zones.
- **Test:** Browser (state sync is scene code). The engine side is covered by the reset test in
  `tests/quests.test.ts`.

### 4. Two toast stacks could overlap

- **Where:** `src/ui/hud.ts`.
- **Cause:** general messages ("Squash 7 bugs!") and quest toasts used separate containers at the
  same position.
- **Fix:** one shared, capped stack.
- **Test:** Browser.

### 5. Uneven pixels at 125% and 150% display scaling

- **Where:** `src/game/start.ts`.
- **Cause:** the canvas was sized in CSS pixels and the browser scaled it by the device pixel ratio,
  so a 4-pixel art pixel became 5 device pixels wide in some columns and 6 in others.
- **Fix:** the canvas is sized in device pixels and shown at CSS size (`deviceSize`), and the camera
  zoom is an integer in device pixels, so every art pixel is the same size at 100/125/150/200%.
  Resizes, rotation and browser zoom are followed by a `ResizeObserver`. Pointer input was checked
  at 125% with a real mouse click on a bug.
- **Test:** Browser.

### 6. Leaving the game leaked listeners

- **Where:** Phaser (kept one `visibilitychange` listener per game, which keeps the dead game
  reachable) and any other global handler.
- **Fix:** `GlobalListenerTracker` records every window/document listener added while the game runs
  and removes what is left on destroy, or if start-up fails. Measured: identical listener counts
  after repeated game <-> plain page cycles, one canvas and one UI root.
- **Test:** `tests/globalListeners.test.ts`.

### 7. Damaged saves could lose a badge

- **Where:** `src/systems/quests/storage.ts`.
- **Cause:** badges and cosmetics were restored from the saved lists, so a done quest could end up
  without its badge if that list was corrupt.
- **Fix:** they are always derived from the completed quests.
- **Test:** `tests/quests.test.ts` ("restores the badge and cosmetic...").

### 8. Right-to-left project names in sentences

- **Where:** fishing result, delivery banner, quiz feedback.
- **Cause:** `Dari (دار)` was inserted as plain text, so surrounding punctuation could jump.
- **Fix:** names are wrapped in `<bdi>` (`bidiNames`).
- **Test:** Browser; the plain-page and panel markup is covered by `tests/content.test.ts`.

### 9. Slow or failed game load

- **Where:** `src/main.ts`.
- **Cause:** a failed game chunk only logged an error; a very slow load gave no hint.
- **Fix:** after 8 s the loading screen says it can be skipped. If the chunk fails, the plain page
  opens with an explanation and a "Try the game again" button.
- **Test:** Browser (see "Verification notes").

### 10. Notches and double-tap zoom

- **Where:** HUD, skip link, mini-game counter, buttons.
- **Fix:** controls respect `env(safe-area-inset-*)`; buttons use `touch-action: manipulation` and the
  game surface already uses `touch-action: none`.
- **Test:** Browser (emulation only; see "Not verified").

### 11. Plain page landmark and dark-theme contrast issues

While redesigning the plain page, axe found a duplicate banner landmark, a floating button outside any
landmark and a yellow button with light text in the dark theme. All fixed; axe now reports zero
violations in both themes, and a test checks theme contrast.

### 12. Inline script blocked a strict CSP

The early mode/theme script was inline, which a `script-src 'self'` policy would block. It now lives in
`public/early.js`, so the CSP in `netlify.toml` needs no `unsafe-inline` for scripts.

## Checked and found fine

- Console: zero errors and zero warnings on load, every panel, the dialog, fishing, map changes and
  mode switches (dev and production preview).
- Diagonal speed is normalised; collisions use merged tile blocks; the player cannot leave the map.
- Map tests: every zone and every spawn is reachable, all spawns share one region, the reachable area
  is over 90% of walkable tiles, zones do not overlap heavily and stay inside the map.
- Panels at 320 px: no overflow or horizontal scroll; focus is trapped and returned; Esc closes.
- Corrupted quest and audio saves fall back to safe values; unavailable storage works in memory.
- Audio: silence after leaving the game, no overlapping loops, no clicks at crossfades, mute and
  volume persist (measured in the browser).

## Intentionally left

- **Phaser keeps its own texture and sound state per game instance.** Each replay builds a fresh game;
  the heap returned to the same size in testing, so this is fine.
- **Autoplay on every browser:** audio starts only from a click or key press. Chrome was tested; Safari
  and Firefox follow the same gesture rule but were not available here.

## Verification notes

- The browser pane's tab stops animating when it is in the background, which stalls a Phaser game.
  Tests that needed live frames were run with the tab in front.
