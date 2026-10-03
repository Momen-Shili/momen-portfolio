export interface DayState {
  /** 0 in full daylight, 1 in the deepest evening. */
  evening: number;
  /** Multiply-blend colour for the screen tint, as 0xRRGGBB. */
  tint: number;
}

const DAY = { r: 255, g: 255, b: 255 };
const DUSK = { r: 255, g: 206, b: 160 };
const NIGHT = { r: 150, g: 160, b: 215 };

const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;
const mix = (
  from: { r: number; g: number; b: number },
  to: { r: number; g: number; b: number },
  t: number,
): number =>
  (Math.round(lerp(from.r, to.r, t)) << 16) |
  (Math.round(lerp(from.g, to.g, t)) << 8) |
  Math.round(lerp(from.b, to.b, t));

/** Smoothly eases 0 -> 1 so the colour does not change speed abruptly at phase boundaries. */
const ease = (t: number): number => t * t * (3 - 2 * t);

/**
 * One slow loop through day, dusk, evening and dawn. `phase` is 0-1 through the cycle. The
 * evening is deliberately gentle (never darker than the NIGHT tint) so the game stays readable.
 *
 *   0.00 - 0.45  day
 *   0.45 - 0.55  day -> dusk
 *   0.55 - 0.65  dusk -> evening
 *   0.65 - 0.80  evening
 *   0.80 - 0.90  evening -> dawn (dusk colours)
 *   0.90 - 1.00  dawn -> day
 */
export function dayState(phase: number): DayState {
  const p = ((phase % 1) + 1) % 1;
  if (p < 0.45) return { evening: 0, tint: mix(DAY, DAY, 0) };
  if (p < 0.55) {
    const t = ease((p - 0.45) / 0.1);
    return { evening: 0.35 * t, tint: mix(DAY, DUSK, t) };
  }
  if (p < 0.65) {
    const t = ease((p - 0.55) / 0.1);
    return { evening: lerp(0.35, 1, t), tint: mix(DUSK, NIGHT, t) };
  }
  if (p < 0.8) return { evening: 1, tint: mix(NIGHT, NIGHT, 0) };
  if (p < 0.9) {
    const t = ease((p - 0.8) / 0.1);
    return { evening: lerp(1, 0.35, t), tint: mix(NIGHT, DUSK, t) };
  }
  const t = ease((p - 0.9) / 0.1);
  return { evening: 0.35 * (1 - t), tint: mix(DUSK, DAY, t) };
}

/** Length of one full day in milliseconds. Slow on purpose: it should be felt, not watched. */
export const DAY_LENGTH_MS = 240_000;
export const dayPhaseAt = (timeMs: number): number => (timeMs / DAY_LENGTH_MS) % 1;
