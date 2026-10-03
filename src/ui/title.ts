import { PROFILE } from "../content/portfolio";
import type { SoundChoice } from "../audio/settings";
import { el, isTouchDevice } from "./dom";

/**
 * "Press Start" screen shown over the idle town. Two real buttons, so the click that starts the
 * game also counts as the user gesture browsers require before audio can play.
 */
export function showTitle(
  root: HTMLElement,
  options: { remembered: SoundChoice | null; onStart(withSound: boolean): void },
): () => void {
  const silent = el("button", { type: "button", class: "btn-start" }, "Start silent");
  const sound = el(
    "button",
    { type: "button", class: "btn-start btn-start-alt" },
    "Start with sound",
  );

  const screen = el(
    "div",
    {
      class: "title-screen",
      role: "dialog",
      "aria-modal": "true",
      "aria-label": `${PROFILE.name} portfolio game`,
    },
    el(
      "div",
      { class: "title-card" },
      el("p", { class: "title-kicker" }, "A portfolio you can walk through"),
      el("h1", { class: "title-name" }, PROFILE.name),
      el("p", { class: "title-sub" }, `${PROFILE.title} · ${PROFILE.location}`),
      el("div", { class: "title-buttons" }, silent, sound),
      el(
        "p",
        { class: "title-hint" },
        isTouchDevice()
          ? "Use the joystick to move · tap the yellow button to interact"
          : "Arrows / WASD to move · E or Space to interact · Esc to close · M mutes",
      ),
      el(
        "p",
        { class: "title-hint" },
        "Music is made in your browser, nothing is downloaded. Looking for the content fast? Use “Skip game” at the top-left.",
      ),
    ),
  );
  root.append(screen);
  // Silent is the default; if the visitor chose sound last time, that button gets focus instead.
  (options.remembered === "sound" ? sound : silent).focus({ preventScroll: true });

  const finish = (withSound: boolean): void => {
    screen.remove();
    options.onStart(withSound);
  };
  silent.addEventListener("click", () => finish(false));
  sound.addEventListener("click", () => finish(true));
  return () => screen.remove();
}
