export const TILE = 16;

/** Indices into the `tiles` tileset (one row of 16x16 tiles). */
export const T = {
  GRASS: 0,
  GRASS2: 1,
  FLOWER_W: 2,
  PATH: 3,
  WATER_A: 4,
  WATER_B: 5,
  PLAZA: 6,
  DARK_GRASS: 7,
  FLOWER_Y: 8,
  SAND: 9,
  FLOOR: 10,
  WALL: 11,
  WALL_BASE: 12,
  DOOR_IN: 13,
  VOID: 14,
  FLOOR_STONE: 15,
  FLOOR_DARK: 16,
  FLOOR_CHECK: 17,
  WALL_BRICK: 18,
  WALL_GREEN: 19,
  WALL_BLUE: 20,
} as const;

export const TILE_COUNT = 21;
