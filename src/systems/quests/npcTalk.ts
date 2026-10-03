import { NPCS } from "../../content/npcs";
import type { DialogLine } from "../dialog";
import type { QuestEvent } from "./types";

/** Work to do once the dialog box closes. */
export type AfterAction = { type: "deliver_parcel" };

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
export function planTalk(npcId: string, quests: QuestView): TalkPlan | null {
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

  return plan;
}
