export type SfxKind =
  | "open"
  | "close"
  | "talk"
  | "wish"
  | "squash"
  | "bite"
  | "catch"
  | "pickup"
  | "quest"
  | "complete";

const NOTES: Record<SfxKind, readonly number[]> = {
  open: [523, 659],
  close: [659, 440],
  talk: [392],
  wish: [523, 659, 784],
  squash: [330, 220],
  bite: [880, 880],
  catch: [523, 784, 1047],
  pickup: [784, 1047],
  quest: [659, 784],
  complete: [523, 659, 784, 1047],
};

/** Tiny WebAudio blips. Silent until the visitor opts in; the AudioContext is created lazily. */
export class Sfx {
  private ctx: AudioContext | null = null;
  private on = false;

  get enabled(): boolean {
    return this.on;
  }

  setEnabled(value: boolean): void {
    this.on = value;
    if (value) this.play("open");
  }

  play(kind: SfxKind): void {
    if (!this.on) return;
    try {
      this.ctx ??= new AudioContext();
      const ctx = this.ctx;
      if (ctx.state === "suspended") void ctx.resume();
      const start = ctx.currentTime;
      NOTES[kind].forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "square";
        osc.frequency.value = freq;
        const t = start + i * 0.08;
        gain.gain.setValueAtTime(0.04, t);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.12);
        osc.connect(gain).connect(ctx.destination);
        osc.start(t);
        osc.stop(t + 0.13);
      });
    } catch {
      // Audio is a nicety; ignore failures (blocked autoplay, no device).
    }
  }

  destroy(): void {
    void this.ctx?.close();
    this.ctx = null;
  }
}
