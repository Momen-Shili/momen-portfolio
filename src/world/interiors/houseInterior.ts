import type { MapDef } from "../mapTypes";
import { T } from "../tiles";
import { InteriorBuilder } from "./builder";

/** The house: portrait (About), experience wall, retro computer, bookshelf, window and a bed. */
export function buildHouse(): MapDef {
  const b = new InteriorBuilder(
    "house",
    "house",
    18,
    11,
    { floor: T.FLOOR, wall: T.WALL, wallBase: T.WALL_BASE, background: "#1b1423" },
    8,
  );

  b.hang("rug", 144, 116, { flat: true })
    .hang("bookshelf", 32, 48)
    .hang("portrait", 80, 44)
    .hang("window", 128, 40)
    .hang("frames", 176, 40)
    .furniture("computer", 14, 3, 2, { anim: true })
    .furniture("plant", 16, 3, 1)
    .furniture("bed", 1, 8, 2, { blockRows: 2 })
    .furniture("lamp-flicker", 16, 8, 1, { anim: true });

  b.hotspot("shelf", 1, 2, 2, "Read the bookshelf", { type: "item", item: "house-shelf" })
    .hotspot("portrait", 4, 2, 2, "Read about Momen (About)", { type: "panel", panel: "about" })
    .hotspot("window", 7, 2, 2, "Look out of the window", { type: "item", item: "house-window" })
    .hotspot("frames", 10, 2, 2, "Read the experience wall", {
      type: "item",
      item: "house-experience",
    })
    .hotspot("computer", 14, 3, 2, "Use the retro computer", { type: "panel", panel: "terminal" })
    .hotspot("bed", 1, 8, 2, "Look at the bed", { type: "item", item: "house-bed" });

  return b.ambientMotes(10).build("house");
}
