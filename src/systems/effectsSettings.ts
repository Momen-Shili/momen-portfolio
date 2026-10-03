import type { KeyValueStorage } from "./quests/storage";

export const EFFECTS_KEY = "momen-portfolio:v1:effects";

let reduceSetting = false;
let storage: KeyValueStorage | null = null;
const listeners = new Set<() => void>();

/** Reads the saved "Reduce effects" choice. Call once when the game starts. */
export function loadEffectsSetting(store: KeyValueStorage): boolean {
  storage = store;
  try {
    reduceSetting = JSON.parse(store.getItem(EFFECTS_KEY) ?? "{}")?.reduce === true;
  } catch {
    reduceSetting = false;
  }
  return reduceSetting;
}

export function setReduceEffects(value: boolean): void {
  if (reduceSetting === value) return;
  reduceSetting = value;
  storage?.setItem(EFFECTS_KEY, JSON.stringify({ reduce: value }));
  for (const listener of listeners) listener();
}

export function getReduceEffectsSetting(): boolean {
  return reduceSetting;
}

export function onEffectsSettingChange(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Pure combiner so it can be tested: the OS preference or the in-game setting turns effects down. */
export function effectsReduced(osPrefersReduced: boolean, setting: boolean): boolean {
  return osPrefersReduced || setting;
}
