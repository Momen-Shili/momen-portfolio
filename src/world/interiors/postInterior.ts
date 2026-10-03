import { LINKS } from "../../content/portfolio";
import type { MapDef } from "../mapTypes";
import { T } from "../tiles";
import { InteriorBuilder } from "./builder";

/** The post office: mailbox wall, stamp machine, conveyor, writing desk and the clerk's counter. */
export function buildPostOffice(): MapDef {
  const b = new InteriorBuilder(
    "post",
    "post",
    20,
    12,
    { floor: T.FLOOR_CHECK, wall: T.WALL_GREEN, wallBase: T.WALL_BASE, background: "#1b1423" },
    9,
  );

  b.hang("mailboxwall", 48, 48)
    .hang("clock", 152, 40, { anim: true })
    .furniture("stampmachine", 6, 3, 1)
    .furniture("conveyor", 12, 3, 4, { anim: true })
    .furniture("counter", 11, 8, 5)
    .furniture("writingdesk", 2, 7, 2)
    .furniture("parcelstack", 1, 9, 1);

  b.hotspot("mailboxes", 1, 2, 4, "Open the mailbox wall (links)", {
    type: "item",
    item: "post-mailboxes",
  })
    .hotspot("stamp", 6, 3, 1, "Use the stamp machine (copy email)", {
      type: "copy",
      value: LINKS.email,
      label: "Email",
    })
    .hotspot("conveyor", 12, 3, 4, "Watch the conveyor belt", {
      type: "item",
      item: "post-conveyor",
    })
    .hotspot("desk", 2, 7, 2, "Write at the desk (Contact)", { type: "panel", panel: "contact" });

  b.npc("clerk", "npc-clerk", 13, 7, "down", 24);

  return b.ambientMotes(8).build("post office");
}
