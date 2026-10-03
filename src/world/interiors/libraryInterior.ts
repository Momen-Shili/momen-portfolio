import { shelfItemId } from "../../content/items";
import { GEM_IDS } from "../../systems/quests/helpers";
import type { MapDef } from "../mapTypes";
import { T } from "../tiles";
import { InteriorBuilder } from "./builder";

/** The library: a bookshelf per skill group, reading desk, globe, ladder and the librarian. */
export function buildLibrary(): MapDef {
  const b = new InteriorBuilder(
    "library",
    "library",
    20,
    12,
    { floor: T.FLOOR_STONE, wall: T.WALL_BLUE, wallBase: T.WALL_BASE, background: "#1b1423" },
    9,
  );

  b.hang("shelves", 48, 48, { frame: 0 })
    .hang("shelves", 112, 48, { frame: 1 })
    .hang("shelves", 176, 48, { frame: 2 })
    .hang("ladder", 224, 50)
    .furniture("globe", 17, 3, 1)
    .furniture("readingdesk", 8, 5, 2)
    .furniture("candle", 1, 4, 1, { anim: true })
    .furniture("candle", 18, 4, 1, { anim: true })
    .hang("rug", 160, 148, { flat: true });

  b.hotspot("shelf-advanced", 2, 2, 2, "Browse the Advanced shelf", {
    type: "item",
    item: shelfItemId("Advanced"),
  })
    .hotspot("shelf-proficient", 6, 2, 2, "Browse the Proficient shelf", {
      type: "item",
      item: shelfItemId("Proficient"),
    })
    .hotspot("shelf-growing", 10, 2, 2, "Browse the Growing shelf", {
      type: "item",
      item: shelfItemId("Growing"),
    })
    .hotspot("ladder", 13, 2, 1, "Climb the ladder", { type: "climb", item: "library-ladder" })
    .hotspot("globe", 17, 3, 1, "Spin the globe", { type: "item", item: "library-globe" })
    .hotspot("desk", 8, 5, 2, "Sit at the reading desk (Skills)", {
      type: "panel",
      panel: "skills",
    });

  b.npc("reader", "npc-reader", 16, 7, "left");
  b.collectible("gem-growing", "gem", 2, 18, 10, GEM_IDS.Growing, {
    type: "gem",
    group: "Growing",
  });

  return b.ambientMotes(14).build("library");
}
