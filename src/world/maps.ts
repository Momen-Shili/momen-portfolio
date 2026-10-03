import { buildHouse } from "./houseMap";
import type { MapDef } from "./mapTypes";
import { buildTown } from "./townMap";

const builders: Record<string, () => MapDef> = {
  town: buildTown,
  house: buildHouse,
};

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
