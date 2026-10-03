import { benchItemId } from "../../content/items";
import { PROJECTS } from "../../content/portfolio";
import { GEM_IDS } from "../../systems/quests/helpers";
import type { MapDef } from "../mapTypes";
import { T } from "../tiles";
import { InteriorBuilder } from "./builder";

/** Bench positions: [column, base row]. One bench per project, in the order of PROJECTS. */
export const BENCH_SPOTS: ReadonlyArray<readonly [number, number]> = [
  [2, 6],
  [6, 6],
  [10, 6],
  [14, 6],
  [2, 9],
  [6, 9],
  [14, 9],
];

/** The workshop: a workbench per project, tool wall, blueprint board, chalkboard, forge and smith. */
export function buildWorkshop(): MapDef {
  const b = new InteriorBuilder(
    "workshop",
    "workshop",
    22,
    14,
    { floor: T.FLOOR_DARK, wall: T.WALL_BRICK, wallBase: T.WALL_BASE, background: "#1b1423" },
    10,
  );

  b.hang("toolwall", 40, 46)
    .hang("blueprint", 104, 46)
    .hang("chalkboard", 176, 46)
    .furniture("forge", 15, 3, 2, { anim: true })
    .furniture("anvil", 18, 4, 1)
    .furniture("barrel", 19, 10, 1)
    .furniture("crate", 20, 10, 1)
    .furniture("lamp-flicker", 20, 3, 1, { anim: true });

  b.hotspot("tools", 1, 2, 3, "Look at the tool wall", { type: "item", item: "workshop-tools" })
    .hotspot("blueprint", 5, 2, 3, "Study the blueprint board (Projects)", {
      type: "panel",
      panel: "projects",
    })
    .hotspot("chalkboard", 9, 2, 4, "Read the chalkboard", {
      type: "item",
      item: "workshop-chalkboard",
    });

  PROJECTS.forEach((project, i) => {
    const spot = BENCH_SPOTS[i];
    if (!spot) return;
    const [tx, ty] = spot;
    b.furniture("benches", tx, ty, 2, { frame: i });
    b.hotspot(`bench-${i}`, tx, ty, 2, `Inspect the ${project.name} bench`, {
      type: "item",
      item: benchItemId(i),
    });
  });

  b.npc("smith", "npc-smith", 19, 4, "left");
  b.collectible("gem-proficient", "gem", 1, 20, 11, GEM_IDS.Proficient, {
    type: "gem",
    group: "Proficient",
  });

  return b.ambientMotes(12).build("workshop");
}
