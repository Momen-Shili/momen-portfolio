import type { BuildingId } from "../../content/buildings";
import { TERMINAL_BANNER, runCommand, type TerminalContext } from "../../systems/terminal";
import type { QuestEvent } from "../../systems/quests/types";
import { el, nextId } from "../dom";

export function createTerminal(
  onOpen: (target: BuildingId) => void,
  services: { context: TerminalContext; emit: (event: QuestEvent) => void },
): {
  element: HTMLElement;
  input: HTMLInputElement;
} {
  const id = nextId("term");
  const out = el("div", { class: "term-out", role: "log", "aria-live": "polite" });
  const input = el("input", {
    id: `${id}-input`,
    class: "term-input",
    type: "text",
    autocomplete: "off",
    autocapitalize: "off",
    spellcheck: "false",
    "aria-label": "Terminal command",
  });
  const form = el(
    "form",
    { class: "term-form" },
    el("label", { for: input.id, class: "term-prompt" }, "C:\\momen>"),
    input,
  );
  const element = el("div", { class: "terminal" }, out, form);
  const history: string[] = [];
  let cursor = 0;

  const print = (line: string, cls = ""): void => {
    out.append(el("div", { class: `term-line ${cls}`.trim() }, line === "" ? "\u00a0" : line));
    out.scrollTop = out.scrollHeight;
  };
  TERMINAL_BANNER.forEach((line) => print(line, "term-dim"));

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const raw = input.value;
    input.value = "";
    if (raw.trim() !== "") {
      history.push(raw);
      cursor = history.length;
    }
    print(`C:\\momen> ${raw}`, "term-echo");
    const result = runCommand(raw, services.context);
    if (result.action?.type === "clear") {
      out.replaceChildren();
      return;
    }
    result.lines.forEach((line) => print(line));
    result.events?.forEach((event) => services.emit(event));
    if (result.action?.type === "open") {
      const target = result.action.target;
      input.disabled = true;
      window.setTimeout(() => onOpen(target), 600);
    }
  });

  input.addEventListener("keydown", (event) => {
    if (event.key === "ArrowUp" && history.length > 0) {
      event.preventDefault();
      cursor = Math.max(0, cursor - 1);
      input.value = history[cursor] ?? "";
    } else if (event.key === "ArrowDown") {
      event.preventDefault();
      cursor = Math.min(history.length, cursor + 1);
      input.value = history[cursor] ?? "";
    }
  });

  element.addEventListener("click", () => {
    if (!window.getSelection()?.toString()) input.focus();
  });

  return { element, input };
}
