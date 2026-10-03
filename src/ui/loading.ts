/** The loading screen markup lives in index.html so it shows before any JS has loaded. */
export function setLoadingProgress(progress: number): void {
  const bar = document.getElementById("loading");
  const fill = document.getElementById("loading-fill");
  if (!bar || !fill) return;
  const pct = Math.round(Math.max(0, Math.min(1, progress)) * 100);
  fill.style.width = `${pct}%`;
  bar.setAttribute("aria-valuenow", String(pct));
}

export function showLoading(): void {
  const bar = document.getElementById("loading");
  if (bar) bar.hidden = false;
  setLoadingProgress(0);
}

export function hideLoading(): void {
  const bar = document.getElementById("loading");
  if (bar) bar.hidden = true;
}

/** A line under the progress bar, used when loading is slow. Pass null to remove it. */
export function setLoadingNote(text: string | null): void {
  const bar = document.getElementById("loading");
  if (!bar) return;
  let note = document.getElementById("loading-note");
  if (text === null) {
    note?.remove();
    return;
  }
  if (!note) {
    note = document.createElement("p");
    note.id = "loading-note";
    note.className = "loading-note";
    bar.append(note);
  }
  note.textContent = text;
}
