import type { QuestEngine } from "../systems/quests/engine";
import type { QuestDef } from "../systems/quests/types";
import { el } from "./dom";

const CONFIRM_MS = 4000;

function questItem(engine: QuestEngine, def: QuestDef): HTMLElement {
  const status = engine.progress(def.id).status;
  const item = el("li", { class: `quest quest-${status}` });

  if (status === "locked") {
    item.append(
      el("h4", { class: "quest-title" }, "Undiscovered quest"),
      el("p", { class: "quest-hint" }, `Hint: ${def.lockedHint}`),
    );
    return item;
  }

  item.append(el("h4", { class: "quest-title" }, def.title), el("p", {}, def.blurb));
  if (status === "done") {
    item.append(el("p", { class: "quest-reward" }, `Badge earned: ${def.reward.badge.name}`));
    return item;
  }
  const step = engine.currentStep(def.id);
  if (step) {
    const progress = engine.progress(def.id);
    const goal = def.steps[step.index]?.trigger.count ?? 1;
    const counter = goal > 1 ? ` (${progress.count}/${goal})` : "";
    item.append(
      el("p", { class: "quest-step" }, `Now: ${step.text}${counter}`),
      el("p", { class: "quest-hint" }, `Hint: ${step.hint}`),
    );
  }
  return item;
}

function section(title: string, items: readonly HTMLElement[], empty: string): HTMLElement {
  return el(
    "section",
    { class: "quest-section" },
    el("h3", {}, title),
    items.length > 0
      ? el("ul", { class: "quest-list" }, ...items)
      : el("p", { class: "quest-empty" }, empty),
  );
}

/** Builds the quest log. Quests are optional bonuses; nothing here gates portfolio content. */
export function createQuestLog(engine: QuestEngine): { element: HTMLElement; focus: HTMLElement } {
  const element = el("div", { class: "quest-log" });
  const focus = el("p", { class: "quest-summary", tabindex: "-1" });
  let confirmTimer = 0;

  const render = (): void => {
    window.clearTimeout(confirmTimer);
    const byStatus = (s: string) => engine.quests.filter((d) => engine.progress(d.id).status === s);
    const badges = engine.state.badges
      .map((id) => engine.quests.find((d) => d.reward.badge.id === id)?.reward.badge)
      .filter((b): b is NonNullable<typeof b> => b !== undefined);

    focus.textContent = `${engine.doneCount} / ${engine.total} quests complete`;
    const meter = el("progress", {
      class: "quest-meter",
      max: String(engine.total),
      value: String(engine.doneCount),
      "aria-label": "Quests completed",
    });

    const badgeList =
      badges.length > 0
        ? el(
            "ul",
            { class: "badge-list" },
            ...badges.map((b) =>
              el(
                "li",
                { class: "badge-chip", title: b.description },
                `${b.name}: ${b.description}`,
              ),
            ),
          )
        : el("p", { class: "quest-empty" }, "No badges yet. Quests are optional bonuses.");

    const reset = el(
      "button",
      { type: "button", class: "btn-ghost quest-reset" },
      "Reset progress",
    );
    reset.addEventListener("click", () => {
      if (reset.dataset.confirm === "1") {
        engine.reset();
        render();
        (element.querySelector(".quest-reset") as HTMLElement | null)?.focus();
        return;
      }
      reset.dataset.confirm = "1";
      reset.textContent = "Click again to erase all quest progress";
      confirmTimer = window.setTimeout(() => {
        reset.dataset.confirm = "";
        reset.textContent = "Reset progress";
      }, CONFIRM_MS);
    });

    element.replaceChildren(
      el("div", { class: "quest-top" }, focus, meter),
      el(
        "p",
        { class: "quest-note" },
        "Side quests are optional. All portfolio content is available without them.",
      ),
      el("section", { class: "quest-section" }, el("h3", {}, "Badges"), badgeList),
      section(
        "Active",
        byStatus("active").map((d) => questItem(engine, d)),
        "No active quests.",
      ),
      section(
        "Completed",
        byStatus("done").map((d) => questItem(engine, d)),
        "Nothing completed yet.",
      ),
      section(
        "Locked",
        byStatus("locked").map((d) => questItem(engine, d)),
        "No locked quests.",
      ),
      reset,
    );
  };

  render();
  return { element, focus };
}
