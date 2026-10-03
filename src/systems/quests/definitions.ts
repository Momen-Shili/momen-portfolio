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
        hint: "Look for glints: west of the house outside, and tucked away inside the workshop and the library.",
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
    lockedHint: "Talk to the clerk inside the post office.",
    unlock: { type: "npc_talked", where: { npc: "clerk" } },
    steps: [
      {
        id: "deliver",
        text: "Deliver the parcel to the smith inside the workshop",
        hint: "Carry the parcel from the post office to the workshop and talk to the smith.",
        trigger: { type: "parcel_delivered" },
      },
    ],
    reward: {
      badge: { id: "courier", name: "Courier", description: "Delivered the parcel." },
    },
  },
  {
    id: "bug-hunt",
    title: "Bug hunt",
    giver: "guide",
    blurb: "Pesky bugs have scurried into the plaza.",
    lockedHint: "Talk to the town guide in the plaza.",
    unlock: { type: "npc_talked", where: { npc: "guide" } },
    steps: [
      {
        id: "squash",
        text: "Squash 7 bugs in the plaza before the timer runs out",
        hint: "Walk into the bugs or tap them. If time runs out, talk to the guide to try again.",
        trigger: { type: "minigame_won", where: { game: "bug-hunt" } },
      },
    ],
    reward: {
      badge: { id: "debugger", name: "Debugger", description: "Cleared the plaza of bugs." },
    },
  },
  {
    id: "fishing",
    title: "Gone fishing",
    giver: null,
    blurb: "Catch three different fish at the pond.",
    lockedHint: "Look for water.",
    steps: [
      {
        id: "catch",
        text: "Catch three different fish",
        hint: "Stand on the pond shore and press E (or tap the prompt) to cast. Press again when the bobber dips.",
        trigger: { type: "fish_caught", distinct: "tag", count: 3 },
      },
    ],
    reward: {
      badge: { id: "angler", name: "Angler", description: "Caught three different fish." },
      cosmetic: "fishing-hat",
    },
  },
  {
    id: "quiz",
    title: "Match the stack",
    giver: "reader",
    blurb: "The librarian has a four-round quiz about the projects.",
    lockedHint: "Talk to the librarian inside the library.",
    unlock: { type: "npc_talked", where: { npc: "reader" } },
    steps: [
      {
        id: "answer",
        text: "Finish the four-round quiz",
        hint: "Talk to the librarian again and answer. Wrong answers cost nothing.",
        trigger: { type: "quiz_completed" },
      },
    ],
    reward: {
      badge: { id: "bookworm", name: "Bookworm", description: "Finished the stack quiz." },
    },
  },
  {
    id: "terminal-secret",
    title: "Terminal secret",
    giver: null,
    blurb: "The retro computer in the house hides a secret command.",
    lockedHint: "Visit the retro computer.",
    steps: [
      {
        id: "command",
        text: "Find the secret command on the retro computer",
        hint: "The librarian mentioned a word from an ancient cave adventure. Type it on the retro computer.",
        trigger: { type: "command_run", where: { command: "xyzzy" } },
      },
    ],
    reward: {
      badge: { id: "secret-keeper", name: "Secret Keeper", description: "Cracked the terminal." },
    },
  },
  {
    id: "night-watch",
    title: "Night watch",
    giver: null,
    blurb: "Some things only happen to those who wait.",
    lockedHint: "Be patient by the fountain.",
    steps: [
      {
        id: "watch",
        text: "Stand perfectly still by the fountain for about ten seconds",
        hint: "The fountain is in the middle of the plaza. Do not move a muscle.",
        trigger: { type: "idle_at", where: { place: "fountain" } },
      },
    ],
    reward: {
      badge: { id: "night-watch", name: "Night Watch", description: "Waited by the fountain." },
    },
  },
];
