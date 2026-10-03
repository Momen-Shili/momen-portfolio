import { buildHouse } from "./interiors/houseInterior";
import { buildLibrary } from "./interiors/libraryInterior";
import { buildPostOffice } from "./interiors/postInterior";
import { buildWorkshop } from "./interiors/workshopInterior";
import type { MapDef } from "./mapTypes";
import { buildTown } from "./townMap";

const builders: Record<string, () => MapDef> = {
  town: buildTown,
  house: buildHouse,
  workshop: buildWorkshop,
  library: buildLibrary,
  post: buildPostOffice,
};

/** Every map the game can load. Tests walk this list. */
export const MAP_IDS: readonly string[] = Object.keys(builders);

const cache = new Map<string, MapDef>();

export function getMap(id: string): MapDef {
  const cached = cache.get(id);
  if (cached) return cached;
  const build = builders[id];
  if (!build) throw new Error(`Unknown map: ${id}`);
  const map = build();
  cache.set(id, map);
  return map;
}
