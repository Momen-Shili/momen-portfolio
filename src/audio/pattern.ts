export interface PatternEvent {
  /** Step the event starts on. */
  step: number;
  /** Note name, or null for a rest. */
  note: string | null;
  /** Length in steps. */
  len: number;
}

export interface ParsedPattern {
  events: PatternEvent[];
  /** Total length in steps (rests included). */
  steps: number;
}

/**
 * Parses a compact pattern: whitespace-separated tokens like `C4:2` (note, length in steps),
 * `-:4` (rest) or `x` (a one-step hit for noise voices). Length defaults to 1.
 */
export function parsePattern(source: string): ParsedPattern {
  const events: PatternEvent[] = [];
  let step = 0;
  for (const token of source.trim().split(/\s+/)) {
    if (token === "") continue;
    const [name = "", lenText] = token.split(":");
    const len = lenText === undefined ? 1 : Number(lenText);
    if (!Number.isInteger(len) || len < 1) throw new Error(`Invalid pattern length in "${token}"`);
    events.push({ step, note: name === "-" ? null : name, len });
    step += len;
  }
  return { events, steps: step };
}

/** Repeats a pattern fragment, e.g. for hi-hats that run through the whole track. */
export function repeat(fragment: string, times: number): string {
  return Array.from({ length: times }, () => fragment).join(" ");
}
