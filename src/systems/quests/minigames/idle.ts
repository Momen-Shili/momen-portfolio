export const IDLE_MS = 10_000;

/** Fires once after the player stands still inside a zone for `thresholdMs`. */
export class IdleTracker {
  private elapsed = 0;
  private fired = false;

  constructor(private readonly thresholdMs: number = IDLE_MS) {}

  /** Returns true on the frame the threshold is reached. */
  update(dtMs: number, state: { inZone: boolean; moving: boolean }): boolean {
    if (!state.inZone || state.moving) {
      this.elapsed = 0;
      this.fired = false;
      return false;
    }
    if (this.fired) return false;
    this.elapsed += dtMs;
    if (this.elapsed < this.thresholdMs) return false;
    this.fired = true;
    return true;
  }

  reset(): void {
    this.elapsed = 0;
    this.fired = false;
  }
}
