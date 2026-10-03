import type { AudioEngine } from "../audio/engine";
import { getReduceEffectsSetting, setReduceEffects } from "../systems/effectsSettings";
import { el, nextId, osPrefersReducedMotion } from "./dom";

/** Audio settings: mute toggle and separate music / effects volume sliders. */
export function createSettings(audio: AudioEngine): { element: HTMLElement; focus: HTMLElement } {
  const element = el("div", { class: "settings" });

  const toggle = el("button", { type: "button", class: "btn-primary" });
  const refreshToggle = (): void => {
    toggle.textContent = audio.isOn
      ? "Sound is on (click to mute)"
      : "Sound is off (click to turn on)";
    toggle.setAttribute("aria-pressed", String(audio.isOn));
  };
  toggle.addEventListener("click", () => {
    audio.toggleMuted();
    refreshToggle();
  });
  refreshToggle();

  const slider = (label: string, value: number, apply: (v: number) => void): HTMLElement => {
    const id = nextId("vol");
    const output = el("output", { class: "slider-value", for: id }, `${Math.round(value * 100)}%`);
    const input = el("input", {
      id,
      type: "range",
      min: "0",
      max: "100",
      step: "5",
      value: String(Math.round(value * 100)),
    });
    input.addEventListener("input", () => {
      const v = Number(input.value) / 100;
      output.textContent = `${input.value}%`;
      apply(v);
    });
    return el("div", { class: "slider-row" }, el("label", { for: id }, label), input, output);
  };

  const test = el("button", { type: "button", class: "btn-ghost" }, "Play a test sound");
  test.addEventListener("click", () => audio.play("quest"));

  const reduceId = nextId("reduce");
  const reduce = el("input", { id: reduceId, type: "checkbox" });
  reduce.checked = getReduceEffectsSetting() || osPrefersReducedMotion();
  reduce.disabled = osPrefersReducedMotion();
  reduce.addEventListener("change", () => setReduceEffects(reduce.checked));
  const reduceNote = osPrefersReducedMotion()
    ? "Your system asks for reduced motion, so effects are already reduced."
    : "Calmer visuals: no drifting clouds, birds, swaying plants, day and evening tint, or screen animations. Applies when you close this window.";
  const reduceRow = el(
    "div",
    { class: "reduce-row" },
    reduce,
    el("label", { for: reduceId }, "Reduce effects"),
    el("p", { class: "quiz-note" }, reduceNote),
  );

  element.append(
    el(
      "p",
      {},
      "Music is generated in your browser. Nothing is downloaded and it stays silent until you turn it on.",
    ),
    toggle,
    slider("Music volume", audio.settings.musicVolume, (v) => audio.setMusicVolume(v)),
    slider("Effects volume", audio.settings.sfxVolume, (v) => audio.setSfxVolume(v)),
    test,
    el("p", { class: "quiz-note" }, "Press M at any time to mute or unmute."),
    reduceRow,
  );
  return { element, focus: toggle };
}
