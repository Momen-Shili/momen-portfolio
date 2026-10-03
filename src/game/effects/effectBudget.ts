/**
 * Hard upper limit on the sprites this manager creates. Everything is allocated once in the
 * constructor; nothing is created per frame. Keep the sum below `EFFECT_SPRITE_BUDGET`.
 */
export const POOL_SIZES = {
  clouds: 6,
  shadows: 6,
  birds: 3,
  butterflies: 6,
  fireflies: 10,
  leaves: 10,
  droplets: 8,
  ripples: 4,
  smoke: 10,
  dust: 8,
  glows: 8,
  tufts: 70,
} as const;

export const EFFECT_SPRITE_BUDGET = 160;
export const effectSpriteCount = (): number =>
  Object.values(POOL_SIZES).reduce((sum, n) => sum + n, 0);
