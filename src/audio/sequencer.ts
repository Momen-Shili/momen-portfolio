import { noteFreq } from "./notes";
import { parsePattern, type PatternEvent } from "./pattern";
import type { TrackDef, VoiceDef } from "./tracks";

export interface ScheduledNote {
  voice: VoiceDef;
  /** Hz, or null for noise hits. */
  freq: number | null;
  /** Start time in the audio clock's seconds. */
  time: number;
  /** Held length in seconds, before the release. */
  duration: number;
}

export const STEPS_PER_BEAT = 4;
export const DEFAULT_LOOKAHEAD = 0.15;

/**
 * Lookahead scheduler for a chiptune track. It never touches Web Audio: `tick()` is given the
 * current clock time and returns the notes that should be scheduled, so timing and looping can be
 * tested with a fake clock. Notes are returned exactly once.
 */
export class Sequencer {
  readonly stepSeconds: number;
  private readonly byStep: Array<Array<{ voice: VoiceDef; event: PatternEvent }>>;
  private nextTime = 0;
  private stepIndex = 0;
  private started = false;
  private finished = false;

  constructor(
    readonly track: TrackDef,
    private readonly lookahead: number = DEFAULT_LOOKAHEAD,
  ) {
    this.stepSeconds = 60 / track.bpm / STEPS_PER_BEAT;
    this.byStep = Array.from({ length: track.steps }, () => []);
    for (const voice of track.voices) {
      const parsed = parsePattern(voice.pattern);
      if (parsed.steps !== track.steps) {
        throw new Error(`${track.id}: a voice has ${parsed.steps} steps, expected ${track.steps}`);
      }
      for (const event of parsed.events) {
        if (event.note !== null) this.byStep[event.step]?.push({ voice, event });
      }
    }
  }

  get isFinished(): boolean {
    return this.finished;
  }

  /** Current position in steps (for tests and debugging). */
  get position(): number {
    return this.stepIndex;
  }

  start(atTime: number): void {
    this.nextTime = atTime;
    this.stepIndex = 0;
    this.started = true;
    this.finished = false;
  }

  /** Notes whose start time falls before `now + lookahead` and that were not returned before. */
  tick(now: number): ScheduledNote[] {
    if (!this.started || this.finished) return [];
    const out: ScheduledNote[] = [];
    // After a long stall (a throttled tab) skip ahead instead of dumping a burst of late notes.
    const behind = now - this.nextTime;
    if (behind > this.lookahead * 2) {
      const skip = Math.ceil(behind / this.stepSeconds);
      this.nextTime += skip * this.stepSeconds;
      this.stepIndex = (this.stepIndex + skip) % this.track.steps;
    }
    while (this.nextTime < now + this.lookahead) {
      for (const { voice, event } of this.byStep[this.stepIndex] ?? []) {
        const gate = voice.gate ?? 0.9;
        out.push({
          voice,
          freq: voice.wave === "noise" ? null : noteFreq(event.note ?? "A4"),
          time: this.nextTime,
          duration: Math.max(0.03, event.len * this.stepSeconds * gate),
        });
      }
      this.nextTime += this.stepSeconds;
      this.stepIndex += 1;
      if (this.stepIndex >= this.track.steps) {
        if (!this.track.loop) {
          this.finished = true;
          break;
        }
        this.stepIndex = 0;
      }
    }
    return out;
  }

  /** Seconds from `start()` until a non-looping track has played its last note. */
  get lengthSeconds(): number {
    return this.track.steps * this.stepSeconds;
  }
}
