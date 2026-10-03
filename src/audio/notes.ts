const SEMITONES: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

/** Frequency in Hz for a note name such as "C4", "F#3" or "Bb5" (A4 = 440 Hz). */
export function noteFreq(name: string): number {
  const match = /^([A-G])([#b]?)(-?\d)$/.exec(name);
  if (!match) throw new Error(`Invalid note name: ${name}`);
  const [, letter = "", accidental = "", octave = "0"] = match;
  const accidentalShift = accidental === "#" ? 1 : accidental === "b" ? -1 : 0;
  const midi = (SEMITONES[letter] ?? 0) + accidentalShift + (Number(octave) + 1) * 12;
  return 440 * 2 ** ((midi - 69) / 12);
}
