import "./styles/main.css";
import type { RunningGame } from "./game/start";
import { installCopyHandler } from "./ui/clipboard";
import { createContactForm } from "./ui/contactForm";
import { hideLoading, setLoadingNote, setLoadingProgress, showLoading } from "./ui/loading";

type Mode = "game" | "plain";

const html = document.documentElement;
const gameRoot = document.getElementById("game-root") as HTMLElement;
const plain = document.getElementById("plain") as HTMLElement;
const toggle = document.getElementById("mode-toggle") as HTMLAnchorElement;
const live = document.getElementById("sr-status");

let running: RunningGame | null = null;
let starting = false;

function announce(message: string): void {
  if (live) live.textContent = message;
}

function setUrl(mode: Mode): void {
  const url = new URL(window.location.href);
  if (mode === "plain") url.searchParams.set("plain", "1");
  else url.searchParams.delete("plain");
  url.hash = "";
  window.history.replaceState(null, "", url);
}

const SLOW_LOAD_MS = 8000;

/** Explains why the plain page is showing after a failed start, with a way to try again. */
function showLoadError(): void {
  clearLoadError();
  const box = document.createElement("div");
  box.id = "load-error";
  box.className = "load-error";
  box.setAttribute("role", "alert");
  const retry = document.createElement("button");
  retry.type = "button";
  retry.className = "btn-primary";
  retry.textContent = "Try the game again";
  retry.addEventListener("click", () => applyMode("game"));
  box.append(
    "The game could not be loaded, which usually means a slow or interrupted connection. " +
      "Everything is available on this page instead. ",
    retry,
  );
  plain.prepend(box);
}

function clearLoadError(): void {
  document.getElementById("load-error")?.remove();
}

async function enterGame(): Promise<void> {
  if (running || starting) return;
  starting = true;
  clearLoadError();
  showLoading();
  const slowTimer = window.setTimeout(
    () => setLoadingNote("Still loading. You can skip to the plain page at any time."),
    SLOW_LOAD_MS,
  );
  try {
    // Phaser is the heavy part of the bundle, so the plain page never downloads it.
    const { startGame } = await import("./game/start");
    if (!html.classList.contains("mode-game")) return; // visitor switched to plain meanwhile
    running = startGame(gameRoot);
  } catch (error) {
    console.error("The game failed to start, showing the plain page instead.", error);
    applyMode("plain");
    showLoadError();
  } finally {
    window.clearTimeout(slowTimer);
    setLoadingNote(null);
    starting = false;
  }
}

function leaveGame(): void {
  running?.destroy();
  running = null;
}

function applyMode(mode: Mode, focus = false): void {
  html.classList.toggle("mode-game", mode === "game");
  html.classList.toggle("mode-plain", mode === "plain");
  plain.hidden = mode === "game";
  gameRoot.hidden = mode === "plain";
  toggle.textContent = mode === "game" ? "Skip game: view as plain page" : "Play the game instead";
  toggle.href = mode === "game" ? "?plain=1" : window.location.pathname;
  setUrl(mode);

  if (mode === "game") {
    void enterGame();
  } else {
    leaveGame();
    hideLoading();
    if (focus) {
      const heading = plain.querySelector<HTMLElement>("h1");
      heading?.setAttribute("tabindex", "-1");
      heading?.focus();
    }
  }
}

toggle.addEventListener("click", (event) => {
  event.preventDefault();
  applyMode(html.classList.contains("mode-game") ? "plain" : "game", true);
});

installCopyHandler(announce);

const plainForm = document.getElementById("plain-contact-form");
if (plainForm) {
  const { form } = createContactForm();
  plainForm.append(form);
}

setLoadingProgress(0);
applyMode(new URLSearchParams(window.location.search).has("plain") ? "plain" : "game");
