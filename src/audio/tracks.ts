import { repeat } from "./pattern";

export type TrackId = "title" | "town" | "interior" | "minigame" | "victory";
export type Wave = "square" | "triangle" | "sawtooth" | "noise";

export interface Envelope {
  /** Attack and decay in seconds, sustain as a 0-1 level, release in seconds. */
  a: number;
  d: number;
  s: number;
  r: number;
}

export interface VoiceDef {
  wave: Wave;
  /** Peak level before the music bus; keep the sum of voices well below 1. */
  gain: number;
  env: Envelope;
  pattern: string;
  /** Fraction of each note's length that is held before the release. */
  gate?: number;
  /** Noise voices only: how the noise is shaped (hi-hat vs snare). */
  noise?: { type: BiquadFilterType; freq: number };
}

export interface TrackDef {
  id: TrackId;
  bpm: number;
  /** Loop length in sixteenth-note steps. Every voice pattern must add up to this. */
  steps: number;
  voices: readonly VoiceDef[];
  /** One-shot jingles play once instead of looping. */
  loop: boolean;
}

const LEAD_ENV: Envelope = { a: 0.01, d: 0.08, s: 0.6, r: 0.08 };
const BASS_ENV: Envelope = { a: 0.01, d: 0.05, s: 0.8, r: 0.06 };
const ARP_ENV: Envelope = { a: 0.005, d: 0.06, s: 0.35, r: 0.05 };
const PAD_ENV: Envelope = { a: 0.08, d: 0.2, s: 0.7, r: 0.3 };
const HAT_ENV: Envelope = { a: 0.001, d: 0.03, s: 0, r: 0.02 };
const SNARE_ENV: Envelope = { a: 0.001, d: 0.09, s: 0, r: 0.04 };

/** A bar of four quarter-note bass hits, each held for three of four steps. */
const bassBar = (a: string, b: string, c: string, d: string): string =>
  `${a}:3 -:1 ${b}:3 -:1 ${c}:3 -:1 ${d}:3 -:1`;
/** A bar of sixteenth-note arpeggio over four notes. */
const arpBar = (n: string[]): string => repeat(n.join(" "), 4);

const TOWN_BARS = 8;
const town: TrackDef = {
  id: "town",
  bpm: 112,
  steps: TOWN_BARS * 16,
  loop: true,
  voices: [
    {
      // Melody over C - Am - F - G - C - Em - F - G
      wave: "square",
      gain: 0.1,
      env: LEAD_ENV,
      pattern: [
        "E5:2 G5:2 E5:2 C5:2 D5:2 E5:4 -:2",
        "C5:2 E5:2 A5:2 E5:2 D5:2 C5:4 -:2",
        "A4:2 C5:2 F5:2 C5:2 E5:2 F5:4 -:2",
        "G5:2 F5:2 E5:2 D5:2 E5:4 -:4",
        "G5:2 E5:2 C5:2 E5:2 G5:4 E5:2 -:2",
        "B4:2 E5:2 G5:2 E5:2 B5:4 G5:4",
        "A5:2 G5:2 F5:2 E5:2 F5:4 C5:4",
        "D5:2 E5:2 G5:2 B5:2 D6:4 -:4",
      ].join(" "),
    },
    {
      wave: "triangle",
      gain: 0.22,
      env: BASS_ENV,
      pattern: [
        bassBar("C3", "C3", "G3", "C3"),
        bassBar("A2", "A2", "E3", "A2"),
        bassBar("F2", "F2", "C3", "F2"),
        bassBar("G2", "G2", "D3", "G2"),
        bassBar("C3", "C3", "G3", "C3"),
        bassBar("E2", "E2", "B2", "E2"),
        bassBar("F2", "F2", "C3", "F2"),
        bassBar("G2", "G2", "D3", "G2"),
      ].join(" "),
    },
    {
      wave: "square",
      gain: 0.045,
      env: ARP_ENV,
      pattern: [
        arpBar(["C4", "E4", "G4", "E4"]),
        arpBar(["A3", "C4", "E4", "C4"]),
        arpBar(["F3", "A3", "C4", "A3"]),
        arpBar(["G3", "B3", "D4", "B3"]),
        arpBar(["C4", "E4", "G4", "E4"]),
        arpBar(["E4", "G4", "B4", "G4"]),
        arpBar(["F3", "A3", "C4", "A3"]),
        arpBar(["G3", "B3", "D4", "B3"]),
      ].join(" "),
    },
    {
      wave: "noise",
      gain: 0.035,
      env: HAT_ENV,
      pattern: repeat("-:1 x:1", TOWN_BARS * 8),
      noise: { type: "highpass", freq: 7000 },
    },
    {
      wave: "noise",
      gain: 0.05,
      env: SNARE_ENV,
      pattern: repeat("-:4 x:1 -:7 x:1 -:3", TOWN_BARS),
      noise: { type: "bandpass", freq: 1800 },
    },
  ],
};

const interior: TrackDef = {
  id: "interior",
  bpm: 78,
  steps: 8 * 16,
  loop: true,
  voices: [
    {
      // Calm A minor: Am - F - C - G - Am - F - G - Em
      wave: "triangle",
      gain: 0.085,
      env: PAD_ENV,
      pattern: [
        "A4:4 C5:4 E5:8",
        "F5:4 E5:4 C5:8",
        "G4:4 C5:4 E5:8",
        "D5:4 B4:4 G4:8",
        "E5:4 A4:4 C5:8",
        "A4:4 C5:4 F5:8",
        "B4:4 D5:4 G5:4 D5:4",
        "E5:8 G4:4 B4:4",
      ].join(" "),
      gate: 0.95,
    },
    {
      wave: "triangle",
      gain: 0.12,
      env: BASS_ENV,
      pattern: [
        "A2:8 E3:8",
        "F2:8 C3:8",
        "C3:8 G3:8",
        "G2:8 D3:8",
        "A2:8 E3:8",
        "F2:8 C3:8",
        "G2:8 D3:8",
        "E2:8 B2:8",
      ].join(" "),
      gate: 0.9,
    },
    {
      wave: "square",
      gain: 0.02,
      env: ARP_ENV,
      pattern: [
        "A3:2 C4:2 E4:2 C4:2 A3:2 C4:2 E4:2 C4:2",
        "F3:2 A3:2 C4:2 A3:2 F3:2 A3:2 C4:2 A3:2",
        "C4:2 E4:2 G4:2 E4:2 C4:2 E4:2 G4:2 E4:2",
        "G3:2 B3:2 D4:2 B3:2 G3:2 B3:2 D4:2 B3:2",
        "A3:2 C4:2 E4:2 C4:2 A3:2 C4:2 E4:2 C4:2",
        "F3:2 A3:2 C4:2 A3:2 F3:2 A3:2 C4:2 A3:2",
        "G3:2 B3:2 D4:2 B3:2 G3:2 B3:2 D4:2 B3:2",
        "E3:2 G3:2 B3:2 G3:2 E3:2 G3:2 B3:2 G3:2",
      ].join(" "),
    },
  ],
};

/** Bright intro: plays once when the game starts with sound. */
const title: TrackDef = {
  id: "title",
  bpm: 120,
  steps: 4 * 16,
  loop: false,
  voices: [
    {
      wave: "square",
      gain: 0.11,
      env: LEAD_ENV,
      pattern: [
        "C5:2 E5:2 G5:2 E5:2 C6:4 G5:4",
        "A5:2 G5:2 E5:2 G5:2 A5:8",
        "F5:2 A5:2 C6:2 A5:2 F5:4 C5:4",
        "G5:2 B5:2 D6:2 B5:2 G5:8",
      ].join(" "),
    },
    {
      wave: "triangle",
      gain: 0.22,
      env: BASS_ENV,
      pattern: [
        "C3:4 G3:4 C3:4 G3:4",
        "A2:4 E3:4 A2:4 E3:4",
        "F2:4 C3:4 F2:4 C3:4",
        "G2:4 D3:4 G2:4 D3:4",
      ].join(" "),
      gate: 0.85,
    },
    {
      wave: "square",
      gain: 0.04,
      env: ARP_ENV,
      pattern: [
        arpBar(["C4", "E4", "G4", "E4"]),
        arpBar(["A3", "C4", "E4", "C4"]),
        arpBar(["F3", "A3", "C4", "A3"]),
        arpBar(["G3", "B3", "D4", "B3"]),
      ].join(" "),
    },
    {
      wave: "noise",
      gain: 0.03,
      env: HAT_ENV,
      pattern: repeat("-:1 x:1", 32),
      noise: { type: "highpass", freq: 7000 },
    },
  ],
};

/** Faster, slightly tense loop for the bug hunt. */
const minigame: TrackDef = {
  id: "minigame",
  bpm: 150,
  steps: 32,
  loop: true,
  voices: [
    {
      wave: "square",
      gain: 0.09,
      env: ARP_ENV,
      pattern: [
        "A4 C5 E5 A5 E5 C5 E5 C5 A4 C5 E5 A5 E5 C5 E5 C5",
        "G4 B4 D5 G5 D5 B4 D5 B4 F4 A4 C5 F5 C5 A4 C5 A4",
      ].join(" "),
    },
    {
      wave: "triangle",
      gain: 0.22,
      env: BASS_ENV,
      pattern: [repeat("A2:2", 8), repeat("G2:2", 4), repeat("F2:2", 4)].join(" "),
      gate: 0.7,
    },
    {
      wave: "noise",
      gain: 0.04,
      env: HAT_ENV,
      pattern: repeat("x:1 -:1", 16),
      noise: { type: "highpass", freq: 7500 },
    },
    {
      wave: "noise",
      gain: 0.055,
      env: SNARE_ENV,
      pattern: repeat("-:4 x:1 -:7 x:1 -:3", 2),
      noise: { type: "bandpass", freq: 1800 },
    },
  ],
};

/** Short fanfare for finishing every quest. */
const victory: TrackDef = {
  id: "victory",
  bpm: 140,
  steps: 16,
  loop: false,
  voices: [
    {
      wave: "square",
      gain: 0.12,
      env: LEAD_ENV,
      pattern: "C5:2 E5:2 G5:2 C6:6 -:4",
    },
    { wave: "triangle", gain: 0.22, env: BASS_ENV, pattern: "C3:4 G3:4 C3:8" },
    {
      wave: "square",
      gain: 0.05,
      env: ARP_ENV,
      pattern: "E5:2 G5:2 C6:2 E6:6 -:4",
    },
  ],
};

export const TRACKS: Readonly<Record<TrackId, TrackDef>> = {
  title,
  town,
  interior,
  minigame,
  victory,
};
