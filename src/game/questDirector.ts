import type { WorldApi } from "./context";
import type { QuestEngine } from "../systems/quests/engine";
import { GEM_IDS, gemLines, pickHighlight, type SkillGroup } from "../systems/quests/helpers";
import { planTalk, type AfterAction } from "../systems/quests/npcTalk";
import type { DialogBox } from "../ui/dialogBox";
import type { PanelManager } from "../ui/panels";

/**
 * Glue between the world and the quest system. The scene reports "the player talked to X" or
 * "picked up gem Y"; the director decides what dialog to show and which quest events follow.
 * Quests stay optional: every conversation starts with the NPC's normal portfolio dialog.
 */
export class QuestDirector {
  constructor(
    private readonly quests: QuestEngine,
    private readonly ui: { dialog: DialogBox; panels: PanelManager },
    private readonly getWorld: () => WorldApi | null,
  ) {}

  /** Returns false when the NPC has nothing to say (unknown id). */
  talk(npcId: string): boolean {
    const plan = planTalk(npcId, this.quests);
    if (!plan) return false;
    for (const event of plan.emit) this.quests.emit(event);
    this.ui.dialog.open(plan.lines, () => this.runAfter(plan.after));
    return true;
  }

  collectGem(group: SkillGroup): void {
    this.quests.emit({ type: "item_collected", id: GEM_IDS[group] });
    this.ui.dialog.open(gemLines(group));
  }

  private runAfter(actions: readonly AfterAction[]): void {
    for (const action of actions) {
      switch (action.type) {
        case "deliver_parcel":
          this.quests.emit({ type: "parcel_delivered" });
          this.ui.panels.open("projects", { highlightProject: pickHighlight().name });
          break;
        case "start_bug_hunt":
          this.getWorld()?.startBugHunt();
          break;
        case "open_quiz":
          this.ui.panels.open("quiz");
          break;
      }
    }
  }
}
