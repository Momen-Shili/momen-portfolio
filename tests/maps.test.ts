import { describe, expect, it } from "vitest";
import { BUILDINGS } from "../src/content/buildings";
import { NPCS } from "../src/content/npcs";
import type { MapDef } from "../src/world/mapTypes";
import { MAP_IDS, getMap } from "../src/world/maps";
import { allItems, itemDef } from "../src/content/items";
import { PROFILE, PROJECTS, SKILLS } from "../src/content/portfolio";
import { itemHtml } from "../src/ui/itemViews";
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

describe.each(MAP_IDS.map((id) => [id, id === "town" ? "start" : "in"] as const))(
  "map %s",
  (id, startSpawn) => {
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
  },
);

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
    // Every building door now means "enter"; the section panels open from objects inside.
    for (const id of ["house", "workshop", "library", "post"]) expect(panelOf(id)).toBe("enter");
    expect(panelOf("board")).toBe("board");
  });

  it("offers a spawn for every building so the terminal can teleport anywhere", () => {
    for (const b of BUILDINGS) expect(town.spawns[`door-${b.id}`], b.id).toBeDefined();
  });

  it("only places NPCs that have dialog, in every map", () => {
    for (const id of MAP_IDS) {
      for (const npc of getMap(id).npcs) expect(NPCS[npc.id], `${id}/${npc.id}`).toBeDefined();
    }
    const placed = MAP_IDS.flatMap((id) => getMap(id).npcs.map((n) => n.id)).sort();
    expect(placed).toEqual(["clerk", "guide", "reader", "smith"]);
  });

  it("links every door to an interior and every interior back to its door", () => {
    for (const id of ["house", "workshop", "library", "post"]) {
      const enter = town.zones.find((z) => z.id === id)?.action;
      expect(enter).toMatchObject({ type: "enter", map: id, spawn: "in", building: id });
      const inside = getMap(id);
      expect(inside.spawns["in"], id).toBeDefined();
      const exit = inside.zones.find((z) => z.id === "exit")?.action;
      expect(exit).toMatchObject({ type: "exit", map: "town", spawn: `door-${id}`, building: id });
    }
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

  it.each(MAP_IDS)("lets the player walk between every spawn of %s", (id) => {
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

  it.each(MAP_IDS)(
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

  it.each(MAP_IDS)("avoids heavily overlapping interaction zones in %s", (id) => {
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
    for (const id of MAP_IDS) {
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

describe("interiors", () => {
  const INTERIORS = ["house", "workshop", "library", "post"] as const;
  const zonesOf = (id: string) =>
    getMap(id).zones.filter((z) => z.id !== "exit" && !z.id.startsWith("npc-"));

  it.each(INTERIORS)("%s has 4 or more hotspots and a visible exit prompt", (id) => {
    const map = getMap(id);
    expect(zonesOf(id).filter((z) => !z.item).length).toBeGreaterThanOrEqual(4);
    expect(map.zones.find((z) => z.id === "exit")?.prompt).toMatch(/^Leave the /);
    expect(map.ambient?.motes ?? 0).toBeGreaterThan(0);
  });

  it("opens each section's panel from its main object", () => {
    const panelAt = (map: string, zone: string) => {
      const a = getMap(map).zones.find((z) => z.id === zone)?.action;
      return a?.type === "panel" ? a.panel : a?.type;
    };
    expect(panelAt("house", "portrait")).toBe("about");
    expect(panelAt("house", "computer")).toBe("terminal");
    expect(panelAt("workshop", "blueprint")).toBe("projects");
    expect(panelAt("library", "desk")).toBe("skills");
    expect(panelAt("post", "desk")).toBe("contact");
  });

  it("puts a workbench in the workshop for every project, in order", () => {
    const benches = getMap("workshop").zones.filter((z) => z.id.startsWith("bench-"));
    expect(benches).toHaveLength(PROJECTS.length);
    benches.forEach((z, i) => {
      expect(z.action).toEqual({ type: "item", item: `workshop-bench-${i}` });
      expect(z.prompt).toContain(PROJECTS[i]?.name ?? "?");
    });
  });

  it("puts a bookshelf in the library for every skill group", () => {
    const shelves = getMap("library").zones.filter((z) => z.id.startsWith("shelf-"));
    expect(shelves.map((z) => (z.action.type === "item" ? z.action.item : ""))).toEqual([
      "library-shelf-Advanced",
      "library-shelf-Proficient",
      "library-shelf-Growing",
    ]);
  });

  it("re-homes the shopkeepers inside their buildings", () => {
    const where = (npc: string) => MAP_IDS.find((id) => getMap(id).npcs.some((n) => n.id === npc));
    expect(where("smith")).toBe("workshop");
    expect(where("reader")).toBe("library");
    expect(where("clerk")).toBe("post");
    expect(where("guide")).toBe("town");
  });

  it("hides the three skill gems in different places, one per group", () => {
    const gems = MAP_IDS.flatMap((id) =>
      getMap(id)
        .zones.filter((z) => z.action.type === "gem")
        .map((z) => [id, z.item] as const),
    );
    expect(gems.sort()).toEqual([
      ["library", "gem-growing"],
      ["town", "gem-advanced"],
      ["workshop", "gem-proficient"],
    ]);
  });
});

describe("interior items", () => {
  const usedItems = MAP_IDS.flatMap((id) =>
    getMap(id).zones.flatMap((z) =>
      z.action.type === "item" || z.action.type === "climb" ? [z.action.item] : [],
    ),
  );

  it("only reference items that exist, and every item is used somewhere", () => {
    for (const id of usedItems) expect(itemDef(id), id).toBeDefined();
    for (const item of allItems()) expect(usedItems, item.id).toContain(item.id);
  });

  it("render panel items from the content file and give flavor items a line", () => {
    for (const item of allItems()) {
      if (item.kind === "panel") expect(itemHtml(item.id), item.id).toBeTruthy();
      else expect(item.lines?.length ?? 0, item.id).toBeGreaterThan(0);
    }
  });

  it("shows each project's own card on its bench", () => {
    PROJECTS.forEach((p, i) => {
      const html = itemHtml(`workshop-bench-${i}`) ?? "";
      expect(html).toContain(p.status);
      for (const tag of p.tags) expect(html).toContain(tag.replace(/&/g, "&amp;"));
    });
  });

  it("lists exactly the skills of a group on its shelf, with levels", () => {
    for (const group of ["Advanced", "Proficient", "Growing"] as const) {
      const html = itemHtml(`library-shelf-${group}`) ?? "";
      for (const s of SKILLS)
        expect(html.includes(s.name), `${group}/${s.name}`).toBe(s.label === group);
      expect(html).toContain("out of 10");
    }
  });

  it("shows location and languages from the profile", () => {
    for (const id of ["house-shelf", "library-globe"]) {
      const html = itemHtml(id) ?? "";
      expect(html).toContain(PROFILE.location);
      for (const lang of PROFILE.languages) expect(html).toContain(lang);
    }
  });

  it("lists every status label on the chalkboard", () => {
    const html = itemHtml("workshop-chalkboard") ?? "";
    for (const status of new Set(PROJECTS.map((p) => p.status))) expect(html).toContain(status);
  });

  it("keeps flavor text free of digits and names so it cannot assert facts", () => {
    for (const item of allItems()) {
      if (item.kind !== "flavor") continue;
      for (const line of item.lines ?? []) {
        expect(line, item.id).not.toMatch(/\d/);
        expect(line, item.id).not.toContain(PROFILE.name);
      }
    }
  });
});
