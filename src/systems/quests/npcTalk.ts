import { NPCS } from "../../content/npcs";
import type { DialogLine } from "../dialog";
import { funFactLine } from "./helpers";
import type { QuestEvent } from "./types";

/** Work to do once the dialog box closes. */
export type AfterAction =
  { type: "deliver_parcel" } | { type: "start_bug_hunt" } | { type: "open_quiz" };

export interface TalkPlan {
  lines: DialogLine[];
  /** Quest events emitted as the dialog opens. */
  emit: QuestEvent[];
  after: AfterAction[];
}

/** The part of the quest engine NPC dialog needs, so it can be faked in tests. */
export interface QuestView {
  isOnStep(questId: string, stepId: string): boolean;
  isDone(questId: string): boolean;
  progress(questId: string): { status: "locked" | "active" | "done" };
}

const say = (speaker: string, text: string): DialogLine => ({ speaker, text });

/**
 * Decides what an NPC says and which quest events the conversation causes. Always includes the
 * NPC's normal portfolio dialog first, so quests only ever add to it.
 */
export function planTalk(
  npcId: string,
  quests: QuestView,
  random: () => number = Math.random,
): TalkPlan | null {
  const npc = NPCS[npcId];
  if (!npc) return null;
  const plan: TalkPlan = {
    lines: [...npc.lines],
    emit: [{ type: "npc_talked", npc: npcId }],
    after: [],
  };

  if (npcId === "clerk") {
    const speaker = npc.name;
    if (quests.progress("delivery").status === "locked") {
      plan.lines.push(
        say(speaker, "Oh, and one more thing: I have a parcel for the workshop."),
        say(speaker, "Could you take it to the smith? It is a short walk up the road."),
      );
    } else if (quests.isOnStep("delivery", "deliver")) {
      plan.lines = [
        say(speaker, "Have you taken the parcel to the workshop yet? The smith is expecting it."),
      ];
    } else if (quests.isDone("delivery")) {
      plan.lines.push(say(speaker, "Thank you again for delivering that parcel!"));
    }
  }

  if (npcId === "smith" && quests.isOnStep("delivery", "deliver")) {
    const speaker = npc.name;
    plan.lines = [
      say(speaker, "A parcel from the post office? Splendid, thank you!"),
      say(speaker, "While you are here, let me pull one project off the shelf for you."),
    ];
    plan.after.push({ type: "deliver_parcel" });
  }

  if (npcId === "guide") {
    const speaker = npc.name;
    const fact = funFactLine(random);
    if (fact) plan.lines.push(say(speaker, `Fun fact: ${fact}`));
    const status = quests.progress("bug-hunt").status;
    if (status === "locked") {
      plan.lines.push(
        say(speaker, "Oh no, bugs have scurried into the plaza! Could you squash seven of them?"),
        say(
          speaker,
          "You have thirty seconds. Walk into them or tap them. No pressure, try as often as you like.",
        ),
      );
      plan.after.push({ type: "start_bug_hunt" });
    } else if (status === "active") {
      plan.lines.push(say(speaker, "The bugs are back! Ready for another go?"));
      plan.after.push({ type: "start_bug_hunt" });
    } else {
      plan.lines.push(say(speaker, "The plaza is bug-free, thanks to you!"));
    }
  }

  if (npcId === "reader") {
    const speaker = npc.name;
    if (!quests.isDone("terminal-secret")) {
      plan.lines.push(
        say(
          speaker,
          "Psst. Old computers keep secrets. A word from an ancient cave adventure might still wake that one up.",
        ),
      );
    }
    if (quests.isDone("quiz")) {
      plan.lines.push(say(speaker, "Welcome back, bookworm!"));
    } else {
      plan.lines.push(
        say(
          speaker,
          "Fancy a quick quiz? Match each project to a technology it uses. Wrong answers cost nothing.",
        ),
      );
      plan.after.push({ type: "open_quiz" });
    }
  }

  return plan;
}
