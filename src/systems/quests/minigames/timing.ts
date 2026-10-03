/**
 * Longest time step a mini-game will simulate in one go. A hidden tab or a slow device can report
 * a gap of seconds; without a cap that would time the player out or teleport bugs through walls.
 */
export const MAX_FRAME_MS = 100;

export function clampFrame(dtMs: number): number {
  if (!Number.isFinite(dtMs) || dtMs < 0) return 0;
  return Math.min(dtMs, MAX_FRAME_MS);
}
