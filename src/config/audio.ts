/**
 * Audio manifest. Every track is generated in code by default (src/audio/tracks.ts). To use a
 * real recording instead, set `file` (a path under /public, for example "audio/town.ogg"). Files
 * loop, except the `title` intro and the `victory` jingle which play once. The generated version
 * is the fallback if the file cannot be loaded.
 */
import type { TrackId } from "../audio/tracks";

export interface AudioTrackSpec {
  file?: string;
}

export const AUDIO_MANIFEST: Readonly<Record<TrackId, AudioTrackSpec>> = {
  title: {},
  town: {},
  interior: {},
  minigame: {},
  victory: {},
};
