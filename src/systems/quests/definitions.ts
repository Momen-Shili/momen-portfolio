import type { QuestDef } from "./types";

/**
 * Quest data. To add a quest, append a definition here, emit the events it listens for from a
 * scene or panel, and (if it has a giver) add dialog for that NPC in src/game/questDirector.ts.
 * Quest text must not state facts about Momen: anything factual is built from portfolio.ts.
 */
export const QUESTS: readonly QuestDef[] = [
  {
    id: "skill-gems",
    title: "Skill gems",
    giver: null,
    blurb: "Three gems are hidden around town, one for each skill level.",
    lockedHint: "Explore the corners of town.",
    steps: [
      {
        id: "collect",
        text: "Find the three skill gems",
        hint: "Look in quiet corners: west of the house, the far east edge and the north-east corner.",
        trigger: { type: "item_collected", distinct: "id", count: 3 },
      },
    ],
    reward: {
      badge: { id: "gem-hunter", name: "Gem Hunter", description: "Found every skill gem." },
      cosmetic: "gem-trail",
    },
  },
  {
    id: "delivery",
    title: "Special delivery",
    giver: "clerk",
    blurb: "The post office has a parcel for the workshop.",
    lockedHint: "Talk to the clerk outside the post office.",
    unlock: { type: "npc_talked", where: { npc: "clerk" } },
    steps: [
      {
        id: "deliver",
        text: "Deliver the parcel to the smith at the workshop",
        hint: "Walk from the post office to the workshop and talk to the smith.",
        trigger: { type: "parcel_delivered" },
      },
    ],
    reward: {
      badge: { id: "courier", name: "Courier", description: "Delivered the parcel." },
    },
  },
];
