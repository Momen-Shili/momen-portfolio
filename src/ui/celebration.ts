import { contactLinksHtml } from "../fallback/html";
import { LINKS, PROFILE } from "../content/portfolio";
import { el, prefersReducedMotion } from "./dom";

const COLORS = ["#ff5d73", "#4db8ff", "#5be37a", "#ffd34e", "#c08bff"];
const PIECES = 36;

/** Confetti as CSS-animated spans. Skipped entirely when the visitor prefers reduced motion. */
function confetti(): HTMLElement | null {
  if (prefersReducedMotion()) return null;
  const layer = el("div", { class: "confetti", "aria-hidden": "true" });
  for (let i = 0; i < PIECES; i++) {
    const piece = el("i");
    piece.style.left = `${(i * 97) % 100}%`;
    piece.style.background = COLORS[i % COLORS.length] ?? "#ffd34e";
    piece.style.animationDelay = `${(i % 9) * 0.25}s`;
    piece.style.animationDuration = `${3.2 + (i % 5) * 0.5}s`;
    layer.append(piece);
  }
  return layer;
}

/** Shown when every quest is complete: a friendly thank-you and a way to get in touch. */
export function createCelebration(): { element: HTMLElement; focus: HTMLElement } {
  const heading = el(
    "h3",
    { class: "celebration-heading", tabindex: "-1" },
    "You found everything!",
  );
  const element = el("div", { class: "celebration" });
  const layer = confetti();
  if (layer) element.append(layer);

  const cta = el("p", { class: "celebration-cta" });
  cta.append(
    `Thank you for exploring ${PROFILE.name}'s town. If you'd like to talk about a project or an opportunity, `,
    "an email is the best way to start: ",
    el("a", { href: `mailto:${LINKS.email}`, class: "celebration-mail" }, LINKS.email),
    ".",
  );
  const links = el("div", { class: "celebration-links" });
  links.innerHTML = contactLinksHtml();
  element.append(
    heading,
    el("p", {}, "Every quest is complete and every badge is yours. Nicely done."),
    cta,
    links,
  );
  return { element, focus: heading };
}
