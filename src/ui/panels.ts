import type { BuildingId } from "../content/buildings";
import { aboutHtml, boardHtml, contactLinksHtml, projectsHtml, skillsHtml } from "../fallback/html";
import type { PanelId } from "../systems/interaction";
import type { QuestEngine } from "../systems/quests/engine";
import { achievementLines } from "../systems/quests/helpers";
import { createContactForm } from "./contactForm";
import { createCelebration } from "./celebration";
import { createQuestLog } from "./questLog";
import { createQuiz } from "./quizPanel";
import { el, focusableIn, nextId } from "./dom";
import { createTerminal } from "./sections/terminalView";

export interface PanelContext {
  close(): void;
  teleport(target: BuildingId): void;
  quests: QuestEngine;
  open(id: PanelId): void;
}

export interface PanelOptions {
  /** Project name to feature when the Workshop panel opens (special delivery quest). */
  highlightProject?: string;
}

interface PanelView {
  element: HTMLElement;
  /** Element that receives focus when the panel opens. */
  focus?: HTMLElement;
}

interface PanelDef {
  title: string;
  variant: string;
  render(ctx: PanelContext, options: PanelOptions): PanelView;
}

function htmlView(html: string): PanelView {
  const element = el("div", { class: "panel-content" });
  element.innerHTML = html;
  return { element };
}

/** Features one project: a banner above the list, the card marked and scrolled into view. */
function highlightProject(root: HTMLElement, name: string): void {
  const cards = [...root.querySelectorAll<HTMLElement>(".project")];
  const card = cards.find((c) => c.querySelector(".project-name")?.textContent === name);
  if (!card) return;
  card.classList.add("is-featured");
  const banner = el("p", { class: "featured-banner", role: "status" }, `Special delivery: ${name}`);
  root.prepend(banner);
  card.setAttribute("data-featured", "true");
  window.requestAnimationFrame(() => card.scrollIntoView({ block: "nearest" }));
}

const DEFS: Record<PanelId, PanelDef> = {
  about: { title: "About", variant: "parchment", render: () => htmlView(aboutHtml()) },
  projects: {
    title: "Workshop: Projects",
    variant: "parchment",
    render: (_ctx, options) => {
      const view = htmlView(projectsHtml());
      if (options.highlightProject) highlightProject(view.element, options.highlightProject);
      return view;
    },
  },
  skills: { title: "Library: Skills", variant: "parchment", render: () => htmlView(skillsHtml()) },
  board: { title: "Notice board", variant: "parchment", render: () => htmlView(boardHtml()) },
  contact: {
    title: "Post office: Contact",
    variant: "parchment",
    render: () => {
      const { element } = htmlView(contactLinksHtml());
      const { form, firstField } = createContactForm();
      element.append(el("h3", {}, "Send a message"), form);
      return { element, focus: firstField };
    },
  },
  quests: {
    title: "Quest log",
    variant: "parchment",
    render: (ctx) => {
      const { element, focus } = createQuestLog(ctx.quests, {
        onCelebrate: () => ctx.open("celebration"),
      });
      return { element, focus };
    },
  },
  quiz: {
    title: "Library: Match the stack",
    variant: "parchment",
    render: (ctx) => {
      const { element, focus } = createQuiz((correct, rounds) =>
        ctx.quests.emit({ type: "quiz_completed", correct, rounds }),
      );
      return { element, focus };
    },
  },
  celebration: {
    title: "Quest complete",
    variant: "parchment",
    render: (ctx) => {
      ctx.quests.markCelebrated();
      return createCelebration();
    },
  },
  terminal: {
    title: "Retro computer",
    variant: "terminal",
    render: (ctx) => {
      const { element, input } = createTerminal((target) => ctx.teleport(target), {
        context: { achievements: () => achievementLines(ctx.quests) },
        emit: (event) => ctx.quests.emit(event),
      });
      return { element, focus: input };
    },
  },
};

/** Modal DOM panels shown over the canvas. Text is real DOM so it is selectable and accessible. */
export class PanelManager {
  private overlay: HTMLElement | null = null;
  private returnFocus: HTMLElement | null = null;

  constructor(
    private readonly root: HTMLElement,
    private readonly handlers: {
      onChange(open: boolean): void;
      teleport(target: BuildingId): void;
      quests: QuestEngine;
    },
  ) {}

  get isOpen(): boolean {
    return this.overlay !== null;
  }

  open(id: PanelId, options: PanelOptions = {}): void {
    if (this.overlay) this.close();
    const def = DEFS[id];
    this.returnFocus =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;

    const titleId = nextId("panel-title");
    const view = def.render(
      {
        close: () => this.close(),
        teleport: (target) => {
          this.close();
          this.handlers.teleport(target);
        },
        quests: this.handlers.quests,
        open: (next) => this.open(next),
      },
      options,
    );

    const closeBtn = el(
      "button",
      { type: "button", class: "panel-close", "aria-label": "Close panel" },
      "×",
    );
    const dialog = el(
      "section",
      {
        class: `panel panel-${def.variant}`,
        role: "dialog",
        "aria-modal": "true",
        "aria-labelledby": titleId,
        tabindex: "-1",
      },
      el("header", { class: "panel-header" }, el("h2", { id: titleId }, def.title), closeBtn),
      el("div", { class: "panel-body" }, view.element),
      el("footer", { class: "panel-footer" }, "Esc to close"),
    );
    const overlay = el("div", { class: "panel-backdrop" }, dialog);

    closeBtn.addEventListener("click", () => this.close());
    overlay.addEventListener("pointerdown", (e) => {
      if (e.target === overlay) this.close();
    });
    overlay.addEventListener("keydown", (e) => this.onKeyDown(e, dialog));

    this.overlay = overlay;
    this.root.append(overlay);
    this.handlers.onChange(true);
    (view.focus ?? dialog).focus({ preventScroll: true });
  }

  close(): void {
    if (!this.overlay) return;
    this.overlay.remove();
    this.overlay = null;
    this.handlers.onChange(false);
    const target = this.returnFocus;
    this.returnFocus = null;
    if (target && document.contains(target)) target.focus({ preventScroll: true });
  }

  destroy(): void {
    this.overlay?.remove();
    this.overlay = null;
  }

  private onKeyDown(event: KeyboardEvent, dialog: HTMLElement): void {
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      this.close();
      return;
    }
    if (event.key !== "Tab") return;
    const items = focusableIn(dialog);
    const first = items[0];
    const last = items[items.length - 1];
    if (!first || !last) {
      event.preventDefault();
      return;
    }
    const active = document.activeElement;
    if (event.shiftKey && (active === first || active === dialog)) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && active === last) {
      event.preventDefault();
      first.focus();
    }
  }
}
