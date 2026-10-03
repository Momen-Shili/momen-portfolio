/**
 * Optional polish for the plain page: typewriter tagline, scroll reveal, active-section nav,
 * back-to-top button, light/dark theme and a little hero parallax. The page is complete without
 * any of it. Motion is skipped when reduced (OS setting or the in-game "Reduce effects").
 */
import { prefersReducedMotion } from "../ui/dom";

export type Theme = "light" | "dark";
export const THEME_KEY = "momen-portfolio:v1:theme";

export function readTheme(): Theme | null {
  try {
    const v = window.localStorage.getItem(THEME_KEY);
    return v === "light" || v === "dark" ? v : null;
  } catch {
    return null;
  }
}

function osTheme(): Theme {
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function applyTheme(theme: Theme): void {
  document.documentElement.dataset.theme = theme;
  const meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
  if (meta) meta.content = theme === "dark" ? "#1b1423" : "#f6ecd4";
}

function saveTheme(theme: Theme): void {
  try {
    window.localStorage.setItem(THEME_KEY, theme);
  } catch {
    /* private mode: the choice just lasts for this visit */
  }
}

function setupTheme(root: HTMLElement): void {
  const button = root.querySelector<HTMLButtonElement>(".theme-toggle");
  const sync = (): void => {
    const dark = document.documentElement.dataset.theme === "dark";
    if (button) {
      button.setAttribute("aria-pressed", String(dark));
      button.textContent = "Dark mode";
    }
  };
  applyTheme(readTheme() ?? osTheme());
  sync();
  button?.addEventListener("click", () => {
    const next: Theme = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
    applyTheme(next);
    saveTheme(next);
    sync();
  });
}

function setupTypewriter(root: HTMLElement): void {
  const tagline = root.querySelector<HTMLElement>(".tagline");
  const full = tagline?.querySelector<HTMLElement>(".tw-full");
  const live = tagline?.querySelector<HTMLElement>(".tw-live");
  if (!tagline || !full || !live || prefersReducedMotion()) return;
  const text = full.textContent ?? "";
  tagline.classList.add("typing");
  // The real sentence stays in the DOM for screen readers; the typed copy is aria-hidden.
  full.classList.add("sr-only");
  let i = 0;
  const tick = (): void => {
    i += 1;
    live.textContent = text.slice(0, i);
    if (i < text.length) window.setTimeout(tick, 28);
    else {
      tagline.classList.remove("typing");
      full.classList.remove("sr-only");
      live.textContent = "";
    }
  };
  window.setTimeout(tick, 350);
}

function setupReveal(root: HTMLElement): void {
  const items = [...root.querySelectorAll<HTMLElement>(".reveal")];
  if (prefersReducedMotion() || typeof IntersectionObserver === "undefined") {
    for (const item of items) item.classList.add("in");
    return;
  }
  const io = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        entry.target.classList.add("in");
        io.unobserve(entry.target);
      }
    },
    { rootMargin: "0px 0px -8% 0px", threshold: 0.08 },
  );
  for (const item of items) io.observe(item);
}

function setupActiveNav(root: HTMLElement): void {
  const links = [...root.querySelectorAll<HTMLAnchorElement>(".site-nav a")];
  const sections = links
    .map((a) => root.querySelector<HTMLElement>(a.hash))
    .filter((s): s is HTMLElement => s !== null);
  if (sections.length === 0) return;
  const update = (): void => {
    const line = window.innerHeight * 0.35;
    let current: HTMLElement | undefined;
    for (const s of sections) if (s.getBoundingClientRect().top <= line) current = s;
    for (const a of links) {
      if (current && a.hash === `#${current.id}`) a.setAttribute("aria-current", "true");
      else a.removeAttribute("aria-current");
    }
  };
  window.addEventListener("scroll", update, { passive: true });
  window.addEventListener("resize", update);
  update();
}

function setupToTopAndParallax(root: HTMLElement): void {
  const toTop = root.querySelector<HTMLElement>(".to-top");
  const hero = root.querySelector<HTMLElement>(".hero");
  let ticking = false;
  const update = (): void => {
    ticking = false;
    if (root.hidden) return;
    const y = window.scrollY;
    toTop?.classList.toggle("show", y > window.innerHeight * 0.6);
    if (hero && !prefersReducedMotion() && y < hero.offsetHeight) {
      hero.style.setProperty("--par", `${Math.round(y * -0.15)}px`);
    }
  };
  window.addEventListener(
    "scroll",
    () => {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(update);
    },
    { passive: true },
  );
  update();
}

/** Wires everything up. `onPlay` is called by every "Play the game" control. */
export function enhancePlainPage(root: HTMLElement, onPlay: () => void): void {
  setupTheme(root);
  setupTypewriter(root);
  setupReveal(root);
  setupActiveNav(root);
  setupToTopAndParallax(root);
  root.addEventListener("click", (event) => {
    const link = (event.target as Element | null)?.closest<HTMLElement>("[data-play]");
    if (!link) return;
    event.preventDefault();
    onPlay();
  });
}
