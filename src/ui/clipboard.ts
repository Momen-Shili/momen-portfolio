async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const area = document.createElement("textarea");
    area.value = text;
    area.setAttribute("readonly", "");
    area.style.position = "fixed";
    area.style.opacity = "0";
    document.body.append(area);
    area.select();
    let ok: boolean;
    try {
      ok = document.execCommand("copy");
    } catch {
      ok = false;
    }
    area.remove();
    return ok;
  }
}

/** One delegated handler for every `[data-copy]` button (panels and the plain page). */
export function installCopyHandler(announce: (message: string) => void): void {
  document.addEventListener("click", (event) => {
    const button = (event.target as HTMLElement | null)?.closest<HTMLButtonElement>("[data-copy]");
    if (!button) return;
    const value = button.dataset.copy ?? "";
    void copyText(value).then((ok) => {
      const original = button.textContent ?? "Copy";
      button.textContent = ok ? "Copied!" : "Copy failed";
      announce(ok ? `Copied ${value}` : "Copy failed. Select the text and copy it manually.");
      window.setTimeout(() => {
        button.textContent =
          original === "Copied!" || original === "Copy failed" ? "Copy" : original;
      }, 1600);
    });
  });
}
