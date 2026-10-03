import { AUDIO_MANIFEST, type AudioTrackSpec } from "../config/audio";
import { AUDIO_KEY, type KeyValueStorage } from "../systems/quests/storage";
import {
  CROSSFADE_SECONDS,
  MASTER_LEVEL,
  clamp01,
  crossfade,
  duckCutoff,
  duckGain,
  musicGain,
  sfxGain,
} from "./mixer";
import { Sequencer, type ScheduledNote } from "./sequencer";
import { SFX, type SfxKind, type SfxPart } from "./sfxRecipes";
import { parseSettings, serializeSettings, type AudioSettings } from "./settings";
import { TRACKS, type TrackId } from "./tracks";

/** Which looping track belongs to where the player is. */
export type MusicScene = "town" | "interior" | "minigame";

type Listener = () => void;

interface Graph {
  master: GainNode;
  musicBus: GainNode;
  sfxBus: GainNode;
  duckFilter: BiquadFilterNode;
  duck: GainNode;
  noise: AudioBuffer;
}

interface ActiveTrack {
  id: TrackId;
  gain: GainNode;
  seq: Sequencer | null;
  source: AudioBufferSourceNode | null;
  /** Called once a non-looping track has finished playing. */
  onEnd: (() => void) | null;
  endsAt: number;
}

const PUMP_MS = 40;
const SFX_THROTTLE_S = 0.04;
const FADE_CURVE_POINTS = 32;

const fadeInCurve = Float32Array.from(
  { length: FADE_CURVE_POINTS },
  (_, i) => crossfade(i / (FADE_CURVE_POINTS - 1)).in,
);

/**
 * Procedural chiptune music and sound effects on the Web Audio API. Nothing is created until the
 * visitor presses Start, so browser autoplay rules are respected, and `destroy()` closes the
 * context so nothing keeps playing after the game is left.
 */
export class AudioEngine {
  private ctx: AudioContext | null = null;
  private graph: Graph | null = null;
  private current: ActiveTrack | null = null;
  private readonly fading = new Set<ActiveTrack>();
  private readonly jingles = new Set<{ seq: Sequencer }>();
  private readonly buffers = new Map<TrackId, AudioBuffer>();
  private readonly loading = new Set<TrackId>();
  private readonly listeners = new Set<Listener>();
  private settingsState: AudioSettings;
  private started = false;
  private muted = true;
  private ducked = false;
  private scene: MusicScene = "town";
  private introPlaying = false;
  private timer = 0;
  private lastSfx = new Map<SfxKind, number>();
  private stepToggle = false;
  private destroyed = false;
  private unavailable = false;

  constructor(
    private readonly storage: KeyValueStorage,
    private readonly manifest: Readonly<Record<TrackId, AudioTrackSpec>> = AUDIO_MANIFEST,
  ) {
    this.settingsState = parseSettings(storage.getItem(AUDIO_KEY));
    document.addEventListener("visibilitychange", this.onVisibility);
  }

  // ---- state ----

  get settings(): AudioSettings {
    return this.settingsState;
  }

  /** True when sound is actually playing (started, not muted, and the browser allows audio). */
  get isOn(): boolean {
    return this.started && !this.muted && !this.unavailable;
  }

  /** The track currently playing (for tests and debugging). */
  get currentTrack(): TrackId | null {
    return this.current?.id ?? null;
  }

  /** How many old tracks are still fading out. */
  get fadingTracks(): number {
    return this.fading.size;
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private emitChange(): void {
    for (const listener of this.listeners) listener();
  }

  private save(): void {
    this.storage.setItem(AUDIO_KEY, serializeSettings(this.settingsState));
  }

  // ---- lifecycle ----

  /** Called from the title screen button, so the browser counts it as a user gesture. */
  start(withSound: boolean): void {
    this.started = true;
    this.settingsState = { ...this.settingsState, choice: withSound ? "sound" : "silent" };
    this.save();
    if (withSound) this.setMuted(false, true);
    else this.emitChange();
  }

  toggleMuted(): boolean {
    this.setMuted(!this.muted);
    return this.isOn;
  }

  setMuted(muted: boolean, intro = false): void {
    if (this.destroyed || !this.started) return;
    this.muted = muted;
    this.settingsState = { ...this.settingsState, choice: muted ? "silent" : "sound" };
    this.save();
    if (muted) {
      this.setMasterLevel(0);
    } else if (this.ensureContext()) {
      void this.ctx?.resume();
      this.setMasterLevel(MASTER_LEVEL);
      this.startPump();
      if (intro) this.playIntro();
      else this.switchTo(this.scene);
    }
    this.emitChange();
  }

  /** Re-creates nothing; stops all sound, closes the context and removes every listener. */
  destroy(): void {
    this.destroyed = true;
    window.clearInterval(this.timer);
    document.removeEventListener("visibilitychange", this.onVisibility);
    this.stopTrack(this.current);
    for (const t of this.fading) this.stopTrack(t);
    this.current = null;
    this.fading.clear();
    this.jingles.clear();
    this.listeners.clear();
    const ctx = this.ctx;
    this.ctx = null;
    this.graph = null;
    void ctx?.close().catch(() => undefined);
  }

  // ---- settings ----

  setMusicVolume(value: number): void {
    this.settingsState = { ...this.settingsState, musicVolume: clamp01(value) };
    this.save();
    this.applyVolumes();
  }

  setSfxVolume(value: number): void {
    this.settingsState = { ...this.settingsState, sfxVolume: clamp01(value) };
    this.save();
    this.applyVolumes();
  }

  /** Quieter, duller music while a panel or dialog is open. */
  setDucked(ducked: boolean): void {
    this.ducked = ducked;
    const g = this.graph;
    const ctx = this.ctx;
    if (!g || !ctx) return;
    const t = ctx.currentTime;
    g.duck.gain.setTargetAtTime(duckGain(ducked), t, 0.12);
    g.duckFilter.frequency.setTargetAtTime(duckCutoff(ducked), t, 0.12);
  }

  // ---- music ----

  setScene(scene: MusicScene): void {
    if (scene === this.scene && this.current && !this.introPlaying) return;
    this.scene = scene;
    if (this.isOn && !this.introPlaying) this.switchTo(scene);
  }

  /** The title tune plays once when the game starts with sound, then the town music takes over. */
  private playIntro(): void {
    this.introPlaying = true;
    this.switchTo("title", () => {
      this.introPlaying = false;
      this.switchTo(this.scene);
    });
  }

  /** A short fanfare on the SFX bus; does not interrupt the music. */
  playJingle(id: TrackId = "victory"): void {
    const ctx = this.ctx;
    if (!this.isOn || !ctx) return;
    const seq = new Sequencer(TRACKS[id]);
    seq.start(ctx.currentTime + 0.05);
    this.jingles.add({ seq });
  }

  private switchTo(id: TrackId, onEnd: (() => void) | null = null): void {
    const ctx = this.ctx;
    const g = this.graph;
    if (!ctx || !g || this.destroyed) return;
    const now = ctx.currentTime;

    const old = this.current;
    if (old) {
      old.onEnd = null;
      old.seq = null; // stop scheduling new notes; ones already queued fade out with the gain
      old.gain.gain.cancelScheduledValues(now);
      old.gain.gain.setTargetAtTime(0, now, CROSSFADE_SECONDS / 4);
      this.fading.add(old);
      window.setTimeout(
        () => {
          this.stopTrack(old);
          this.fading.delete(old);
        },
        CROSSFADE_SECONDS * 1000 + 600,
      );
    }

    const gain = ctx.createGain();
    gain.gain.value = 0;
    gain.connect(g.musicBus);
    gain.gain.setValueCurveAtTime(fadeInCurve, now, CROSSFADE_SECONDS);

    const track = TRACKS[id];
    const buffer = this.buffers.get(id);
    const next: ActiveTrack = {
      id,
      gain,
      seq: null,
      source: null,
      onEnd,
      endsAt: Number.POSITIVE_INFINITY,
    };
    if (buffer) {
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.loop = track.loop;
      source.connect(gain);
      source.start(now + 0.05);
      next.source = source;
      if (!track.loop) next.endsAt = now + 0.05 + buffer.duration;
    } else {
      const seq = new Sequencer(track);
      seq.start(now + 0.05);
      next.seq = seq;
      if (!track.loop) next.endsAt = now + 0.05 + seq.lengthSeconds;
      this.maybeLoadFile(id);
    }
    this.current = next;
  }

  /** If the manifest points at a real recording, fetch it once and switch to it when ready. */
  private maybeLoadFile(id: TrackId): void {
    const file = this.manifest[id].file;
    const ctx = this.ctx;
    if (!file || !ctx || this.buffers.has(id) || this.loading.has(id)) return;
    this.loading.add(id);
    void fetch(file)
      .then((r) => (r.ok ? r.arrayBuffer() : Promise.reject(new Error(String(r.status)))))
      .then((data) => ctx.decodeAudioData(data))
      .then((buffer) => {
        this.buffers.set(id, buffer);
        if (!this.destroyed && this.current?.id === id && this.isOn) this.switchTo(id);
      })
      .catch(() => undefined) // keep the generated track if the file is missing
      .finally(() => this.loading.delete(id));
  }

  private stopTrack(track: ActiveTrack | null): void {
    if (!track) return;
    track.seq = null;
    try {
      track.source?.stop();
    } catch {
      // already stopped
    }
    track.gain.disconnect();
  }

  // ---- scheduling ----

  private startPump(): void {
    window.clearInterval(this.timer);
    this.timer = window.setInterval(() => this.pump(), PUMP_MS);
  }

  private pump(): void {
    const ctx = this.ctx;
    if (!ctx || ctx.state !== "running" || !this.isOn || this.destroyed) return;
    const now = ctx.currentTime;

    const cur = this.current;
    if (cur?.seq) for (const note of cur.seq.tick(now)) this.playNote(note, cur.gain);
    if (cur && cur.onEnd && now >= cur.endsAt) {
      const done = cur.onEnd;
      cur.onEnd = null;
      done();
    }

    for (const jingle of this.jingles) {
      const sfx = this.graph?.sfxBus;
      if (!sfx) break;
      for (const note of jingle.seq.tick(now)) this.playNote(note, sfx);
      if (jingle.seq.isFinished) this.jingles.delete(jingle);
    }
  }

  private playNote(note: ScheduledNote, dest: AudioNode): void {
    const ctx = this.ctx;
    const g = this.graph;
    if (!ctx || !g) return;
    const { voice, freq, time, duration } = note;
    const { a, d, s, r } = voice.env;
    const end = time + duration;
    const env = ctx.createGain();
    // Envelope: attack, decay to sustain, then a smooth release so notes never click.
    const attackEnd = Math.min(time + a, end);
    const decayEnd = Math.min(attackEnd + d, end);
    env.gain.setValueAtTime(0, time);
    env.gain.linearRampToValueAtTime(voice.gain, attackEnd);
    env.gain.linearRampToValueAtTime(voice.gain * s, decayEnd);
    env.gain.setTargetAtTime(0, end, Math.max(0.005, r / 3));
    const stopAt = end + r + 0.06;

    let source: AudioScheduledSourceNode;
    if (voice.wave === "noise") {
      const src = ctx.createBufferSource();
      src.buffer = g.noise;
      src.loop = true;
      const filter = ctx.createBiquadFilter();
      filter.type = voice.noise?.type ?? "highpass";
      filter.frequency.value = voice.noise?.freq ?? 6000;
      src.connect(filter).connect(env);
      src.start(time, Math.random() * 0.8);
      source = src;
    } else {
      const osc = ctx.createOscillator();
      osc.type = voice.wave;
      osc.frequency.value = freq ?? 440;
      osc.connect(env);
      osc.start(time);
      source = osc;
    }
    env.connect(dest);
    source.stop(stopAt);
    source.onended = () => env.disconnect();
  }

  // ---- sound effects ----

  play(kind: SfxKind): void {
    const ctx = this.ctx;
    const g = this.graph;
    if (!this.isOn || !ctx || !g || ctx.state !== "running") return;
    const now = ctx.currentTime;
    if (now - (this.lastSfx.get(kind) ?? -1) < SFX_THROTTLE_S) return;
    this.lastSfx.set(kind, now);
    this.stepToggle = !this.stepToggle;
    for (const part of SFX[kind]) this.playPart(part, now, kind === "step" && this.stepToggle);
  }

  private playPart(part: SfxPart, now: number, lowStep: boolean): void {
    const ctx = this.ctx;
    const g = this.graph;
    if (!ctx || !g) return;
    const start = now + part.at;
    const end = start + part.dur;
    const env = ctx.createGain();
    env.gain.setValueAtTime(0, start);
    env.gain.linearRampToValueAtTime(part.gain, start + 0.005);
    env.gain.setTargetAtTime(0, end - part.dur * 0.4, Math.max(0.008, part.dur * 0.25));
    let source: AudioScheduledSourceNode;
    if (part.wave === "noise") {
      const src = ctx.createBufferSource();
      src.buffer = g.noise;
      src.loop = true;
      const filter = ctx.createBiquadFilter();
      filter.type = part.filter?.type ?? "bandpass";
      filter.frequency.value = (part.filter?.freq ?? part.freq) * (lowStep ? 0.8 : 1);
      src.connect(filter).connect(env);
      src.start(start, Math.random() * 0.8);
      source = src;
    } else {
      const osc = ctx.createOscillator();
      osc.type = part.wave;
      osc.frequency.setValueAtTime(part.freq, start);
      if (part.freqEnd) osc.frequency.exponentialRampToValueAtTime(part.freqEnd, end);
      osc.connect(env);
      osc.start(start);
      source = osc;
    }
    env.connect(g.sfxBus);
    source.stop(end + 0.1);
    source.onended = () => env.disconnect();
  }

  // ---- graph ----

  private ensureContext(): boolean {
    if (this.destroyed || this.unavailable) return false;
    if (this.ctx && this.graph) return true;
    try {
      const Ctor =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) throw new Error("Web Audio is not supported");
      const ctx = new Ctor();
      const master = ctx.createGain();
      master.gain.value = 0;
      const compressor = ctx.createDynamicsCompressor();
      // Used as a gentle limiter: only the loudest overlaps get squashed, music is untouched.
      compressor.threshold.value = -8;
      compressor.knee.value = 6;
      compressor.ratio.value = 10;
      compressor.attack.value = 0.003;
      compressor.release.value = 0.2;
      master.connect(compressor).connect(ctx.destination);

      const musicBus = ctx.createGain();
      const duckFilter = ctx.createBiquadFilter();
      duckFilter.type = "lowpass";
      duckFilter.frequency.value = duckCutoff(this.ducked);
      const duck = ctx.createGain();
      duck.gain.value = duckGain(this.ducked);
      musicBus.connect(duckFilter).connect(duck).connect(master);

      const sfxBus = ctx.createGain();
      sfxBus.connect(master);

      const noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
      const data = noise.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;

      this.ctx = ctx;
      this.graph = { master, musicBus, sfxBus, duckFilter, duck, noise };
      this.applyVolumes(true);
      return true;
    } catch {
      this.unavailable = true;
      this.emitChange();
      return false;
    }
  }

  private applyVolumes(immediate = false): void {
    const g = this.graph;
    const ctx = this.ctx;
    if (!g || !ctx) return;
    const t = ctx.currentTime;
    const { musicVolume, sfxVolume } = this.settingsState;
    if (immediate) {
      g.musicBus.gain.value = musicGain(musicVolume);
      g.sfxBus.gain.value = sfxGain(sfxVolume);
      return;
    }
    g.musicBus.gain.setTargetAtTime(musicGain(musicVolume), t, 0.04);
    g.sfxBus.gain.setTargetAtTime(sfxGain(sfxVolume), t, 0.04);
  }

  private setMasterLevel(level: number): void {
    const g = this.graph;
    const ctx = this.ctx;
    if (!g || !ctx) return;
    g.master.gain.setTargetAtTime(level, ctx.currentTime, 0.03);
  }

  private readonly onVisibility = (): void => {
    const ctx = this.ctx;
    if (!ctx || this.destroyed) return;
    if (document.hidden) void ctx.suspend().catch(() => undefined);
    else if (this.isOn) void ctx.resume().catch(() => undefined);
  };
}
