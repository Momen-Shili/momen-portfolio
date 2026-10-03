import { describe, expect, it } from "vitest";
import { BUILDINGS } from "../src/content/buildings";
import { NPCS } from "../src/content/npcs";
import type { MapDef } from "../src/world/mapTypes";
import { getMap } from "../src/world/maps";
import { textWidth } from "../src/world/pixelFont";
import { TILE } from "../src/world/tiles";

function reachable(map: MapDef, startX: number, startY: number): Set<number> {
  const seen = new Set<number>();
  const queue: Array<[number, number]> = [[Math.floor(startX / TILE), Math.floor(startY / TILE)]];
  while (queue.length > 0) {
    const [x, y] = queue.pop() as [number, number];
    if (x < 0 || y < 0 || x >= map.cols || y >= map.rows) continue;
    const idx = y * map.cols + x;
    if (seen.has(idx) || map.blocked[idx]) continue;
    seen.add(idx);
    queue.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
  }
  return seen;
}

function zoneReachable(map: MapDef, seen: Set<number>, z: MapDef["zones"][number]): boolean {
  for (let ty = Math.floor(z.y / TILE); ty <= Math.floor((z.y + z.h) / TILE); ty++) {
    for (let tx = Math.floor(z.x / TILE); tx <= Math.floor((z.x + z.w) / TILE); tx++) {
      if (seen.has(ty * map.cols + tx)) return true;
    }
  }
  return false;
}

describe.each([
  ["town", "start"],
  ["house", "in"],
])("map %s", (id, startSpawn) => {
  const map = getMap(id);
  const start = map.spawns[startSpawn];

  it("has consistent array sizes", () => {
    expect(map.ground).toHaveLength(map.cols * map.rows);
    expect(map.blocked).toHaveLength(map.cols * map.rows);
  });

  it("has a walkable start spawn", () => {
    expect(start).toBeDefined();
    if (!start) return;
    expect(map.blocked[Math.floor(start.y / TILE) * map.cols + Math.floor(start.x / TILE)]).toBe(
      false,
    );
  });

  it("lets the player reach every interaction zone and spawn", () => {
    if (!start) throw new Error("missing start");
    const seen = reachable(map, start.x, start.y);
    for (const z of map.zones) expect(zoneReachable(map, seen, z), `zone ${z.id}`).toBe(true);
    for (const [name, s] of Object.entries(map.spawns)) {
      const idx = Math.floor((s.y - 2) / TILE) * map.cols + Math.floor(s.x / TILE);
      expect(seen.has(idx), `spawn ${name}`).toBe(true);
    }
  });

  it("seals the map edge so the player cannot walk off it", () => {
    for (let x = 0; x < map.cols; x++) {
      expect(map.blocked[x]).toBe(true);
      expect(map.blocked[(map.rows - 1) * map.cols + x]).toBe(true);
    }
    for (let y = 0; y < map.rows; y++) {
      expect(map.blocked[y * map.cols]).toBe(true);
      expect(map.blocked[y * map.cols + map.cols - 1]).toBe(true);
    }
  });
});

describe("town contents", () => {
  const town = getMap("town");
  const zoneIds = town.zones.map((z) => z.id);

  it("has a door zone for each portfolio building and a notice board", () => {
    for (const id of ["house", "workshop", "library", "post", "board"])
      expect(zoneIds).toContain(id);
  });

  it("wires each section to the right panel", () => {
    const panelOf = (id: string) => {
      const a = town.zones.find((z) => z.id === id)?.action;
      return a?.type === "panel" ? a.panel : a?.type;
    };
    expect(panelOf("workshop")).toBe("projects");
    expect(panelOf("library")).toBe("skills");
    expect(panelOf("post")).toBe("contact");
    expect(panelOf("board")).toBe("board");
    expect(panelOf("house")).toBe("enter");
  });

  it("offers a spawn for every building so the terminal can teleport anywhere", () => {
    for (const b of BUILDINGS) expect(town.spawns[`door-${b.id}`], b.id).toBeDefined();
  });

  it("only places NPCs that have dialog", () => {
    for (const npc of town.npcs) expect(NPCS[npc.id], npc.id).toBeDefined();
    expect(town.npcs.length).toBeGreaterThanOrEqual(2);
    expect(town.npcs.length).toBeLessThanOrEqual(4);
  });

  it("links the house interior back to town and has the retro computer", () => {
    const house = getMap("house");
    const exit = house.zones.find((z) => z.id === "exit")?.action;
    expect(exit).toMatchObject({ type: "exit", map: "town", spawn: "door-house" });
    const computer = house.zones.find((z) => z.id === "computer")?.action;
    expect(computer).toMatchObject({ type: "panel", panel: "terminal" });
  });
});

describe("pixel font", () => {
  it("measures sign text", () => {
    expect(textWidth("")).toBe(0);
    expect(textWidth("POST OFFICE")).toBe(11 * 4 - 1);
  });
});

describe("no trapped player, no confusing zones", () => {
  const overlapArea = (a: MapDef["zones"][number], b: MapDef["zones"][number]): number => {
    const w = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
    const h = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
    return w > 0 && h > 0 ? w * h : 0;
  };

  it.each(["town", "house"])("lets the player walk between every spawn of %s", (id) => {
    const map = getMap(id);
    const spawns = Object.entries(map.spawns);
    const first = spawns[0];
    if (!first) throw new Error("no spawns");
    const region = reachable(map, first[1].x, first[1].y - 2);
    for (const [name, s] of spawns) {
      const idx = Math.floor((s.y - 2) / TILE) * map.cols + Math.floor(s.x / TILE);
      expect(region.has(idx), `${name} is in a different region`).toBe(true);
    }
  });

  it.each(["town", "house"])(
    "keeps the reachable area large (no tiny pockets as the start region) in %s",
    (id) => {
      const map = getMap(id);
      const start = Object.values(map.spawns)[0];
      if (!start) throw new Error("no spawns");
      const region = reachable(map, start.x, start.y - 2);
      const walkable = map.blocked.filter((b) => !b).length;
      expect(region.size / walkable).toBeGreaterThan(0.9);
    },
  );

  it.each(["town", "house"])("avoids heavily overlapping interaction zones in %s", (id) => {
    const zones = getMap(id).zones;
    for (let i = 0; i < zones.length; i++) {
      for (let j = i + 1; j < zones.length; j++) {
        const a = zones[i];
        const b = zones[j];
        if (!a || !b) continue;
        const smaller = Math.min(a.w * a.h, b.w * b.h);
        expect(overlapArea(a, b) / smaller, `${a.id} vs ${b.id}`).toBeLessThan(0.15);
      }
    }
  });

  it("never places a zone or spawn outside the map", () => {
    for (const id of ["town", "house"]) {
      const map = getMap(id);
      for (const z of map.zones) {
        expect(z.x).toBeGreaterThanOrEqual(0);
        expect(z.y).toBeGreaterThanOrEqual(0);
        expect(z.x + z.w).toBeLessThanOrEqual(map.cols * TILE);
        expect(z.y + z.h).toBeLessThanOrEqual(map.rows * TILE);
      }
    }
  });
});
