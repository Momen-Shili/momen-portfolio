import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AudioEngine } from "../src/audio/engine";
import {
  CROSSFADE_SECONDS,
  DUCK_CUTOFF_HZ,
  DUCK_GAIN,
  MASTER_LEVEL,
  MUSIC_CAP,
  OPEN_CUTOFF_HZ,
  SFX_CAP,
  clamp01,
  crossfade,
  duckCutoff,
  duckGain,
  musicGain,
  sfxGain,
  sliderToGain,
} from "../src/audio/mixer";
import { noteFreq } from "../src/audio/notes";
import { parsePattern, repeat } from "../src/audio/pattern";
import { Sequencer } from "../src/audio/sequencer";
import { DEFAULT_SETTINGS, parseSettings, serializeSettings } from "../src/audio/settings";
import { SFX, type SfxKind } from "../src/audio/sfxRecipes";
import { TRACKS, type TrackId } from "../src/audio/tracks";
import { AUDIO_KEY, type KeyValueStorage } from "../src/systems/quests/storage";

describe("notes and patterns", () => {
  it("computes equal-tempered frequencies", () => {
    expect(noteFreq("A4")).toBeCloseTo(440, 5);
    expect(noteFreq("A5")).toBeCloseTo(880, 5);
    expect(noteFreq("C4")).toBeCloseTo(261.63, 1);
    expect(noteFreq("F#3")).toBeCloseTo(185.0, 1);
    expect(noteFreq("Bb4")).toBeCloseTo(noteFreq("A#4"), 5);
  });

  it("rejects invalid note names", () => {
    for (const bad of ["H4", "C", "4C", "", "C##4"]) expect(() => noteFreq(bad)).toThrow();
  });

  it("parses notes, rests and lengths", () => {
    const parsed = parsePattern("C4:2 -:2 E4 x:3");
    expect(parsed.steps).toBe(8);
    expect(parsed.events).toEqual([
      { step: 0, note: "C4", len: 2 },
      { step: 2, note: null, len: 2 },
      { step: 4, note: "E4", len: 1 },
      { step: 5, note: "x", len: 3 },
    ]);
  });

  it("rejects bad lengths and repeats fragments", () => {
    expect(() => parsePattern("C4:0")).toThrow();
    expect(() => parsePattern("C4:1.5")).toThrow();
    expect(parsePattern(repeat("-:1 x:1", 4)).steps).toBe(8);
  });
});

describe("track data", () => {
  const ids = Object.keys(TRACKS) as TrackId[];

  it("has the three required looping tracks plus an intro, a mini-game loop and a jingle", () => {
    expect(ids.sort()).toEqual(["interior", "minigame", "title", "town", "victory"]);
    for (const id of ["town", "interior", "minigame"] as const) expect(TRACKS[id].loop).toBe(true);
    for (const id of ["title", "victory"] as const) expect(TRACKS[id].loop).toBe(false);
  });

  it("gives every voice a pattern that adds up to the track length, with valid notes", () => {
    for (const id of ids) {
      const track = TRACKS[id];
      expect(track.id).toBe(id);
      expect(track.bpm).toBeGreaterThan(60);
      expect(track.voices.length).toBeGreaterThan(0);
      for (const voice of track.voices) {
        const parsed = parsePattern(voice.pattern);
        expect(parsed.steps, `${id} voice`).toBe(track.steps);
        if (voice.wave !== "noise") {
          for (const e of parsed.events)
            if (e.note) expect(() => noteFreq(e.note ?? "")).not.toThrow();
        }
        expect(voice.gain).toBeGreaterThan(0);
        expect(voice.gain).toBeLessThanOrEqual(0.25);
      }
    }
  });

  it("keeps the summed voice gain well below clipping", () => {
    for (const id of ids) {
      const total = TRACKS[id].voices.reduce((sum, v) => sum + v.gain, 0);
      expect(total, id).toBeLessThan(0.7);
    }
  });

  it("makes the interior calmer (slower and quieter) than the town", () => {
    const sum = (id: TrackId) => TRACKS[id].voices.reduce((s, v) => s + v.gain, 0);
    expect(TRACKS.interior.bpm).toBeLessThan(TRACKS.town.bpm);
    expect(sum("interior")).toBeLessThan(sum("town"));
  });

  it("makes the loops long enough not to feel repetitive", () => {
    const seconds = (id: TrackId) => (TRACKS[id].steps * 60) / TRACKS[id].bpm / 4;
    expect(seconds("town")).toBeGreaterThan(14);
    expect(seconds("interior")).toBeGreaterThan(20);
  });
});

describe("Sequencer (mock clock)", () => {
  const expectedNotes = (id: TrackId) =>
    TRACKS[id].voices.reduce(
      (n, v) => n + parsePattern(v.pattern).events.filter((e) => e.note !== null).length,
      0,
    );

  /** Runs the sequencer on a fake clock in fixed increments. */
  function run(seq: Sequencer, from: number, to: number, stepSize = 0.025) {
    const notes = [];
    for (let t = from; t <= to; t += stepSize) notes.push(...seq.tick(t));
    return notes;
  }

  it("schedules every note exactly once per loop, in time order", () => {
    const seq = new Sequencer(TRACKS.minigame);
    seq.start(1);
    const notes = run(seq, 1, 1 + seq.lengthSeconds - 0.2);
    // Stop just before the loop restarts: one full pass of the pattern.
    const onePass = notes.filter((n) => n.time < 1 + seq.lengthSeconds - 1e-9);
    expect(onePass).toHaveLength(expectedNotes("minigame"));
    const times = onePass.map((n) => n.time);
    expect([...times].sort((a, b) => a - b)).toEqual(times);
    expect(times[0]).toBeCloseTo(1, 6);
  });

  it("never returns the same note twice", () => {
    const seq = new Sequencer(TRACKS.town);
    seq.start(0);
    const notes = run(seq, 0, seq.lengthSeconds * 1.5, 0.04);
    const keys = notes.map(
      (n) => `${n.time.toFixed(6)}|${n.voice.pattern.length}|${n.voice.wave}|${n.freq}`,
    );
    const unique = new Set(keys);
    // Two voices can legitimately share time, wave and freq only if they are different voices.
    expect(unique.size).toBe(keys.length);
  });

  it("loops seamlessly: the second pass repeats the first, one loop length later", () => {
    const seq = new Sequencer(TRACKS.minigame);
    seq.start(0);
    const notes = run(seq, 0, seq.lengthSeconds * 2 - 0.2);
    const loop = seq.lengthSeconds;
    const first = notes.filter((n) => n.time < loop - 1e-9).map((n) => [n.time, n.freq]);
    const second = notes
      .filter((n) => n.time >= loop - 1e-9 && n.time < 2 * loop - 1e-9)
      .map((n) => [n.time - loop, n.freq]);
    expect(second.length).toBe(first.length);
    second.forEach(([t, f], i) => {
      expect(t).toBeCloseTo(first[i]?.[0] ?? -1, 5);
      expect(f).toBe(first[i]?.[1]);
    });
  });

  it("plays a non-looping track once and then goes quiet", () => {
    const seq = new Sequencer(TRACKS.victory);
    seq.start(0);
    const notes = run(seq, 0, seq.lengthSeconds + 1);
    expect(notes).toHaveLength(expectedNotes("victory"));
    expect(seq.isFinished).toBe(true);
    expect(seq.tick(100)).toEqual([]);
  });

  it("resyncs after a long stall instead of dumping a burst of late notes", () => {
    const seq = new Sequencer(TRACKS.town);
    seq.start(0);
    seq.tick(0.1);
    const burst = seq.tick(500); // a throttled background tab
    expect(burst.length).toBeLessThan(20);
    for (const n of burst) expect(n.time).toBeGreaterThanOrEqual(500 - 0.01);
  });

  it("holds notes for at most their length and never zero", () => {
    const seq = new Sequencer(TRACKS.interior);
    seq.start(0);
    const notes = run(seq, 0, 10);
    for (const n of notes) {
      expect(n.duration).toBeGreaterThan(0);
      expect(n.duration).toBeLessThanOrEqual(8 * seq.stepSeconds + 1e-9);
    }
  });

  it("rejects a track whose voice does not match the loop length", () => {
    const bad = { ...TRACKS.victory, voices: [{ ...TRACKS.victory.voices[0]!, pattern: "C5:2" }] };
    expect(() => new Sequencer(bad)).toThrow();
  });
});

describe("mixer math", () => {
  it("clamps and squares slider values", () => {
    expect(clamp01(-1)).toBe(0);
    expect(clamp01(2)).toBe(1);
    expect(clamp01(Number.NaN)).toBe(0);
    expect(sliderToGain(0)).toBe(0);
    expect(sliderToGain(1)).toBe(1);
    expect(sliderToGain(0.5)).toBeCloseTo(0.25);
    expect(sliderToGain(0.3)).toBeLessThan(sliderToGain(0.6));
  });

  it("keeps music under the effects and both under safe caps at full volume", () => {
    expect(musicGain(1)).toBe(MUSIC_CAP);
    expect(sfxGain(1)).toBe(SFX_CAP);
    expect(MUSIC_CAP).toBeLessThan(SFX_CAP);
    expect(MASTER_LEVEL).toBeLessThanOrEqual(1);
    // Full-scale effects and music together must still fit under the limiter.
    expect((MUSIC_CAP + SFX_CAP) * 0.3).toBeLessThan(1);
    expect(musicGain(0)).toBe(0);
  });

  it("ducks gain and cutoff, and restores them", () => {
    expect(duckGain(true)).toBe(DUCK_GAIN);
    expect(duckGain(false)).toBe(1);
    expect(duckCutoff(true)).toBe(DUCK_CUTOFF_HZ);
    expect(duckCutoff(false)).toBe(OPEN_CUTOFF_HZ);
    expect(DUCK_GAIN).toBeLessThan(1);
  });

  it("crossfades with constant power", () => {
    expect(crossfade(0)).toEqual({ out: 1, in: 0 });
    const end = crossfade(1);
    expect(end.out).toBeCloseTo(0, 10);
    expect(end.in).toBeCloseTo(1, 10);
    for (let t = 0; t <= 1; t += 0.1) {
      const { out, in: inn } = crossfade(t);
      expect(out * out + inn * inn).toBeCloseTo(1, 10);
    }
    expect(crossfade(-5)).toEqual(crossfade(0));
    expect(CROSSFADE_SECONDS).toBeGreaterThan(0.5);
  });
});

describe("audio settings", () => {
  it("returns defaults for missing or corrupt data", () => {
    expect(parseSettings(null)).toEqual(DEFAULT_SETTINGS);
    expect(parseSettings("nope")).toEqual(DEFAULT_SETTINGS);
    expect(parseSettings("[]")).toEqual(DEFAULT_SETTINGS);
    expect(parseSettings("42")).toEqual(DEFAULT_SETTINGS);
  });

  it("clamps volumes and ignores invalid fields one by one", () => {
    const parsed = parseSettings(
      JSON.stringify({ musicVolume: 7, sfxVolume: "loud", choice: "maybe" }),
    );
    expect(parsed).toEqual({ musicVolume: 1, sfxVolume: DEFAULT_SETTINGS.sfxVolume, choice: null });
  });

  it("round-trips valid settings", () => {
    const s = { musicVolume: 0.25, sfxVolume: 0.9, choice: "sound" as const };
    expect(parseSettings(serializeSettings(s))).toEqual(s);
    expect(parseSettings(serializeSettings({ ...s, choice: "silent" })).choice).toBe("silent");
  });

  it("starts silent by default on a first visit", () => {
    expect(DEFAULT_SETTINGS.choice).toBeNull();
  });
});

describe("sound effect recipes", () => {
  const kinds = Object.keys(SFX) as SfxKind[];

  it("covers every effect the game asks for", () => {
    for (const k of [
      "step",
      "interact",
      "open",
      "close",
      "pickup",
      "quest",
      "complete",
      "squash",
      "bite",
      "catch",
      "key",
    ] as const) {
      expect(kinds).toContain(k);
    }
  });

  it("keeps each effect short, quiet and well-formed", () => {
    for (const kind of kinds) {
      const parts = SFX[kind];
      expect(parts.length, kind).toBeGreaterThan(0);
      const length = Math.max(...parts.map((p) => p.at + p.dur));
      expect(length, kind).toBeLessThan(0.8);
      for (const p of parts) {
        expect(p.gain).toBeGreaterThan(0);
        expect(p.gain).toBeLessThanOrEqual(0.35);
        expect(p.freq).toBeGreaterThan(0);
        expect(p.dur).toBeGreaterThan(0);
        expect(p.at).toBeGreaterThanOrEqual(0);
      }
    }
  });

  it("makes footsteps much quieter than other effects", () => {
    const peak = (k: SfxKind) => Math.max(...SFX[k].map((p) => p.gain));
    expect(peak("step")).toBeLessThan(peak("pickup") / 2);
  });
});

// ---------- engine against a fake Web Audio implementation ----------

class FakeParam {
  value = 0;
  events: string[] = [];
  setValueAtTime(v: number, t: number) {
    this.value = v;
    this.events.push(`set@${t}`);
    return this;
  }
  linearRampToValueAtTime(v: number) {
    this.value = v;
    return this;
  }
  exponentialRampToValueAtTime(v: number) {
    this.value = v;
    return this;
  }
  setTargetAtTime(v: number, t: number) {
    this.value = v;
    this.events.push(`target@${t}`);
    return this;
  }
  setValueCurveAtTime(_c: Float32Array, t: number, d: number) {
    this.events.push(`curve@${t}+${d}`);
    return this;
  }
  cancelScheduledValues() {
    return this;
  }
}

class FakeNode {
  connected: FakeNode[] = [];
  disconnected = false;
  started = 0;
  stopped = 0;
  onended: (() => void) | null = null;
  gain = new FakeParam();
  frequency = new FakeParam();
  threshold = new FakeParam();
  knee = new FakeParam();
  ratio = new FakeParam();
  attack = new FakeParam();
  release = new FakeParam();
  type = "";
  buffer: unknown = null;
  loop = false;
  connect(n: FakeNode) {
    this.connected.push(n);
    return n;
  }
  disconnect() {
    this.disconnected = true;
  }
  start() {
    this.started++;
  }
  stop() {
    this.stopped++;
  }
}

class FakeContext {
  static instances: FakeContext[] = [];
  currentTime = 0;
  sampleRate = 8000;
  state: "running" | "suspended" | "closed" = "running";
  destination = new FakeNode();
  nodes: FakeNode[] = [];
  oscillators: FakeNode[] = [];
  closed = false;
  suspendCalls = 0;
  resumeCalls = 0;
  constructor() {
    FakeContext.instances.push(this);
  }
  private make(list?: FakeNode[]) {
    const n = new FakeNode();
    this.nodes.push(n);
    list?.push(n);
    return n;
  }
  createGain() {
    return this.make();
  }
  createOscillator() {
    return this.make(this.oscillators);
  }
  createBufferSource() {
    return this.make(this.oscillators);
  }
  createBiquadFilter() {
    return this.make();
  }
  createDynamicsCompressor() {
    return this.make();
  }
  createBuffer(_c: number, length: number) {
    return { getChannelData: () => new Float32Array(length), duration: length / this.sampleRate };
  }
  resume() {
    this.resumeCalls++;
    this.state = "running";
    return Promise.resolve();
  }
  suspend() {
    this.suspendCalls++;
    this.state = "suspended";
    return Promise.resolve();
  }
  close() {
    this.closed = true;
    this.state = "closed";
    return Promise.resolve();
  }
}

function memoryStorage(): KeyValueStorage & { data: Map<string, string> } {
  const data = new Map<string, string>();
  return {
    data,
    getItem: (k) => data.get(k) ?? null,
    setItem: (k, v) => void data.set(k, v),
    removeItem: (k) => void data.delete(k),
  };
}

describe("AudioEngine", () => {
  const doc = {
    hidden: false,
    listeners: new Map<string, Set<() => void>>(),
    addEventListener(type: string, fn: () => void) {
      const set = this.listeners.get(type) ?? new Set();
      set.add(fn);
      this.listeners.set(type, set);
    },
    removeEventListener(type: string, fn: () => void) {
      this.listeners.get(type)?.delete(fn);
    },
    fire(type: string) {
      this.listeners.get(type)?.forEach((fn) => fn());
    },
  };

  beforeEach(() => {
    vi.useFakeTimers();
    FakeContext.instances = [];
    doc.hidden = false;
    doc.listeners.clear();
    vi.stubGlobal("window", {
      AudioContext: FakeContext,
      setInterval: globalThis.setInterval,
      clearInterval: globalThis.clearInterval,
      setTimeout: globalThis.setTimeout,
      clearTimeout: globalThis.clearTimeout,
    });
    vi.stubGlobal("document", doc);
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  const lastCtx = () => FakeContext.instances[FakeContext.instances.length - 1] as FakeContext;
  /** Moves the fake audio clock forward and lets the scheduler pump run. */
  const advance = (ctx: FakeContext, seconds: number) => {
    const ticks = Math.round(seconds / 0.04);
    for (let i = 0; i < ticks; i++) {
      ctx.currentTime += 0.04;
      vi.advanceTimersByTime(40);
    }
  };

  it("creates no audio context until the visitor starts with sound", () => {
    const engine = new AudioEngine(memoryStorage());
    expect(FakeContext.instances).toHaveLength(0);
    engine.setScene("town");
    engine.play("open");
    expect(FakeContext.instances).toHaveLength(0);
    engine.start(false);
    expect(FakeContext.instances).toHaveLength(0);
    expect(engine.isOn).toBe(false);
    engine.destroy();
  });

  it("starts the intro and then the town music after a gesture", () => {
    const store = memoryStorage();
    const engine = new AudioEngine(store);
    engine.start(true);
    expect(FakeContext.instances).toHaveLength(1);
    expect(engine.isOn).toBe(true);
    expect(engine.currentTrack).toBe("title");
    const ctx = lastCtx();
    advance(ctx, 1);
    expect(ctx.oscillators.filter((o) => o.started > 0).length).toBeGreaterThan(0);
    // The intro is a single pass (~8 s at 120 bpm), then the town loop takes over.
    advance(ctx, 9);
    expect(engine.currentTrack).toBe("town");
    expect(JSON.parse(store.data.get(AUDIO_KEY) ?? "{}").choice).toBe("sound");
    engine.destroy();
  });

  it("crossfades between scenes without leaving two loops running", () => {
    const engine = new AudioEngine(memoryStorage());
    engine.start(true);
    const ctx = lastCtx();
    advance(ctx, 10);
    vi.advanceTimersByTime(3000); // let the intro's fade-out finish
    expect(engine.fadingTracks).toBe(0);
    engine.setScene("interior");
    expect(engine.currentTrack).toBe("interior");
    expect(engine.fadingTracks).toBe(1);
    advance(ctx, 1);
    vi.advanceTimersByTime((CROSSFADE_SECONDS + 1) * 1000);
    expect(engine.fadingTracks).toBe(0);
    // Switching to the scene already playing does nothing.
    const nodesBefore = ctx.nodes.length;
    engine.setScene("interior");
    expect(ctx.nodes.length).toBe(nodesBefore);
    engine.destroy();
  });

  it("ducks the music while something is open and restores it", () => {
    const engine = new AudioEngine(memoryStorage());
    engine.start(true);
    const ctx = lastCtx();
    const filters = ctx.nodes.filter((n) => n.type === "lowpass");
    expect(filters.length).toBeGreaterThan(0);
    engine.setDucked(true);
    expect(filters[0]?.frequency.value).toBe(DUCK_CUTOFF_HZ);
    engine.setDucked(false);
    expect(filters[0]?.frequency.value).toBe(OPEN_CUTOFF_HZ);
    engine.destroy();
  });

  it("mutes and unmutes, scheduling nothing while muted", () => {
    const engine = new AudioEngine(memoryStorage());
    engine.start(true);
    const ctx = lastCtx();
    advance(ctx, 1);
    expect(engine.toggleMuted()).toBe(false);
    const started = ctx.oscillators.length;
    advance(ctx, 2);
    engine.play("open");
    expect(ctx.oscillators.length).toBe(started);
    expect(engine.toggleMuted()).toBe(true);
    advance(ctx, 1);
    expect(ctx.oscillators.length).toBeGreaterThan(started);
    engine.destroy();
  });

  it("plays sound effects only when on, and throttles bursts of the same one", () => {
    const engine = new AudioEngine(memoryStorage());
    engine.start(true);
    const ctx = lastCtx();
    const before = ctx.oscillators.length;
    engine.play("squash");
    const afterOne = ctx.oscillators.length;
    expect(afterOne).toBeGreaterThan(before);
    engine.play("squash"); // same instant: throttled
    expect(ctx.oscillators.length).toBe(afterOne);
    ctx.currentTime += 0.1;
    engine.play("squash");
    expect(ctx.oscillators.length).toBeGreaterThan(afterOne);
    engine.destroy();
  });

  it("persists volumes and clamps them", () => {
    const store = memoryStorage();
    const engine = new AudioEngine(store);
    engine.setMusicVolume(5);
    engine.setSfxVolume(-1);
    expect(engine.settings.musicVolume).toBe(1);
    expect(engine.settings.sfxVolume).toBe(0);
    expect(parseSettings(store.data.get(AUDIO_KEY) ?? null)).toMatchObject({
      musicVolume: 1,
      sfxVolume: 0,
    });
    expect(new AudioEngine(store).settings.musicVolume).toBe(1);
    engine.destroy();
  });

  it("suspends when the tab is hidden and resumes when it is visible again", () => {
    const engine = new AudioEngine(memoryStorage());
    engine.start(true);
    const ctx = lastCtx();
    doc.hidden = true;
    doc.fire("visibilitychange");
    expect(ctx.suspendCalls).toBe(1);
    doc.hidden = false;
    doc.fire("visibilitychange");
    expect(ctx.state).toBe("running");
    engine.destroy();
  });

  it("stops everything on destroy: context closed, no more notes, listeners removed", () => {
    const engine = new AudioEngine(memoryStorage());
    engine.start(true);
    const ctx = lastCtx();
    advance(ctx, 2);
    engine.destroy();
    expect(ctx.closed).toBe(true);
    expect(doc.listeners.get("visibilitychange")?.size ?? 0).toBe(0);
    const count = ctx.oscillators.length;
    advance(ctx, 3);
    engine.play("open");
    engine.setScene("interior");
    expect(ctx.oscillators.length).toBe(count);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("degrades quietly when Web Audio is not available", () => {
    vi.stubGlobal("window", {
      setInterval: globalThis.setInterval,
      clearInterval: globalThis.clearInterval,
      setTimeout: globalThis.setTimeout,
      clearTimeout: globalThis.clearTimeout,
    });
    const engine = new AudioEngine(memoryStorage());
    expect(() => engine.start(true)).not.toThrow();
    expect(engine.isOn).toBe(false);
    expect(() => engine.play("open")).not.toThrow();
    engine.destroy();
  });
});
