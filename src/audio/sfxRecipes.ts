export type SfxKind =
  | "step"
  | "interact"
  | "open"
  | "close"
  | "talk"
  | "wish"
  | "pickup"
  | "quest"
  | "complete"
  | "squash"
  | "bite"
  | "catch"
  | "miss"
  | "key";

export type SfxWave = "square" | "triangle" | "sine" | "sawtooth" | "noise";

/** One tone or noise burst of a sound effect. All times are in seconds from the effect's start. */
export interface SfxPart {
  wave: SfxWave;
  /** Start frequency in Hz (the filter centre for noise). */
  freq: number;
  /** Optional end frequency for a pitch slide. */
  freqEnd?: number;
  at: number;
  dur: number;
  gain: number;
  /** Noise only. */
  filter?: { type: BiquadFilterType; freq: number };
}

const blip = (
  freq: number,
  at: number,
  dur = 0.09,
  gain = 0.3,
  wave: SfxWave = "square",
): SfxPart => ({
  wave,
  freq,
  at,
  dur,
  gain,
});

/** All effects are short and quiet; the SFX bus cap in mixer.ts sets the final level. */
export const SFX: Readonly<Record<SfxKind, readonly SfxPart[]>> = {
  step: [
    {
      wave: "noise",
      freq: 500,
      at: 0,
      dur: 0.05,
      gain: 0.1,
      filter: { type: "lowpass", freq: 500 },
    },
  ],
  interact: [blip(587, 0, 0.06, 0.22), blip(784, 0.05, 0.08, 0.22)],
  open: [blip(523, 0, 0.08), blip(659, 0.07, 0.1)],
  close: [blip(659, 0, 0.07), blip(440, 0.06, 0.1)],
  talk: [blip(392, 0, 0.07, 0.22, "triangle"), blip(440, 0.07, 0.07, 0.22, "triangle")],
  wish: [blip(523, 0, 0.1), blip(659, 0.09, 0.1), blip(784, 0.18, 0.18)],
  pickup: [blip(784, 0, 0.07, 0.3), blip(1047, 0.07, 0.14, 0.3)],
  quest: [blip(659, 0, 0.09), blip(784, 0.09, 0.09), blip(988, 0.18, 0.16)],
  complete: [blip(523, 0, 0.1), blip(659, 0.1, 0.1), blip(784, 0.2, 0.1), blip(1047, 0.3, 0.28)],
  squash: [
    { wave: "square", freq: 300, freqEnd: 90, at: 0, dur: 0.12, gain: 0.3 },
    {
      wave: "noise",
      freq: 900,
      at: 0,
      dur: 0.08,
      gain: 0.18,
      filter: { type: "bandpass", freq: 900 },
    },
  ],
  bite: [blip(880, 0, 0.07, 0.3, "triangle"), blip(880, 0.1, 0.07, 0.3, "triangle")],
  catch: [blip(523, 0, 0.08), blip(784, 0.08, 0.08), blip(1047, 0.16, 0.2)],
  miss: [{ wave: "triangle", freq: 330, freqEnd: 180, at: 0, dur: 0.25, gain: 0.25 }],
  key: [
    {
      wave: "noise",
      freq: 2500,
      at: 0,
      dur: 0.025,
      gain: 0.12,
      filter: { type: "highpass", freq: 2500 },
    },
  ],
};
