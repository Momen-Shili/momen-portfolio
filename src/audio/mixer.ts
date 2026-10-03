export const clamp01 = (v: number): number =>
  Number.isFinite(v) ? Math.min(1, Math.max(0, v)) : 0;

/**
 * Loudness caps. Music tops out well below SFX so effects always sit on top, and neither can
 * exceed a safe level even with both sliders at maximum.
 */
export const MUSIC_CAP = 0.9;
export const SFX_CAP = 1.0;
export const MASTER_LEVEL = 0.7;

/** Slider position (0-1) to a gain. Squared so the low end of the slider is usable. */
export function sliderToGain(value: number): number {
  const v = clamp01(value);
  return v * v;
}

export const musicGain = (slider: number): number => sliderToGain(slider) * MUSIC_CAP;
export const sfxGain = (slider: number): number => sliderToGain(slider) * SFX_CAP;

/** While a panel or dialog is open the music gets quieter and duller. */
export const DUCK_GAIN = 0.35;
export const DUCK_CUTOFF_HZ = 900;
export const OPEN_CUTOFF_HZ = 18_000;

export const duckGain = (ducked: boolean): number => (ducked ? DUCK_GAIN : 1);
export const duckCutoff = (ducked: boolean): number => (ducked ? DUCK_CUTOFF_HZ : OPEN_CUTOFF_HZ);

/** Equal-power crossfade: `t` runs 0 -> 1, and out^2 + in^2 stays 1 so the level does not dip. */
export function crossfade(t: number): { out: number; in: number } {
  const p = clamp01(t) * (Math.PI / 2);
  return { out: Math.cos(p), in: Math.sin(p) };
}

export const CROSSFADE_SECONDS = 1.4;
