import type { Notification } from "./types";

/** One short line for the toast shown when quest progress changes. */
export function describeNotification(note: Notification): string {
  switch (note.type) {
    case "started":
      return `New quest: ${note.title}`;
    case "step":
      return note.of > 1 && note.count < note.of
        ? `${note.title}: ${note.count}/${note.of}`
        : `${note.title}: step complete`;
    case "quest_done":
      return `Quest complete: ${note.title}. Badge earned: ${note.badge.name}`;
    case "all_done":
      return "Every quest is complete! Open the quest log for a surprise.";
  }
}
