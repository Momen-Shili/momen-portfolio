import { clamp01 } from "./mixer";

export type SoundChoice = "sound" | "silent";

export interface AudioSettings {
  musicVolume: number;
  sfxVolume: number;
  /** What the visitor picked on the title screen last time; null on a first visit. */
  choice: SoundChoice | null;
}

export const DEFAULT_SETTINGS: AudioSettings = {
  musicVolume: 0.6,
  sfxVolume: 0.7,
  choice: null,
};

const num = (value: unknown, fallback: number): number =>
  typeof value === "number" && Number.isFinite(value) ? clamp01(value) : fallback;

/** Reads saved settings from untrusted JSON, falling back to defaults field by field. */
export function parseSettings(text: string | null): AudioSettings {
  if (!text) return DEFAULT_SETTINGS;
  try {
    const raw = JSON.parse(text) as unknown;
    if (typeof raw !== "object" || raw === null) return DEFAULT_SETTINGS;
    const r = raw as Record<string, unknown>;
    return {
      musicVolume: num(r["musicVolume"], DEFAULT_SETTINGS.musicVolume),
      sfxVolume: num(r["sfxVolume"], DEFAULT_SETTINGS.sfxVolume),
      choice: r["choice"] === "sound" || r["choice"] === "silent" ? r["choice"] : null,
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function serializeSettings(settings: AudioSettings): string {
  return JSON.stringify(settings);
}
