import { PROFILE } from "../content/portfolio";
import { el, isTouchDevice } from "./dom";

/** "Press Start" screen shown over the idle town. */
export function showTitle(
  root: HTMLElement,
  options: { soundOn: boolean; onToggleSound(): boolean; onStart(): void },
): () => void {
  const start = el("button", { type: "button", class: "btn-start" }, "Press Start");
  const sound = el("button", {
    type: "button",
    class: "btn-ghost",
    "aria-pressed": String(options.soundOn),
  });
  const label = (on: boolean): string => (on ? "Sound: on" : "Sound: off");
  sound.textContent = label(options.soundOn);

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
      start,
      sound,
      el(
        "p",
        { class: "title-hint" },
        isTouchDevice()
          ? "Use the joystick to move · tap the yellow button to interact"
          : "Arrows / WASD to move · E or Space to interact · Esc to close",
      ),
      el(
        "p",
        { class: "title-hint" },
        "Looking for the content fast? Use “Skip game” at the top-left.",
      ),
    ),
  );
  root.append(screen);
  start.focus({ preventScroll: true });

  const finish = (): void => {
    screen.remove();
    options.onStart();
  };
  start.addEventListener("click", finish);
  sound.addEventListener("click", () => {
    const on = options.onToggleSound();
    sound.setAttribute("aria-pressed", String(on));
    sound.textContent = label(on);
  });
  return () => screen.remove();
}
