import { effectsReduced, getReduceEffectsSetting } from "../systems/effectsSettings";

export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attrs: Record<string, string> = {},
  ...children: Array<Node | string>
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (key === "class") node.className = value;
    else node.setAttribute(key, value);
  }
  node.append(...children);
  return node;
}

/** Project names may be right-to-left; <bdi> keeps their punctuation from jumping around. */
export function bidiNames(names: readonly string[], joiner = " and "): Array<Node | string> {
  return names
    .flatMap((name, i) => [i > 0 ? joiner : "", el("bdi", {}, name)])
    .filter((n) => n !== "");
}

let uid = 0;
export function nextId(prefix: string): string {
  uid += 1;
  return `${prefix}-${uid}`;
}

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function focusableIn(root: HTMLElement): HTMLElement[] {
  return [...root.querySelectorAll<HTMLElement>(FOCUSABLE)].filter(
    (n) => n.offsetParent !== null || n === document.activeElement,
  );
}

export function osPrefersReducedMotion(): boolean {
  return typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** True when the visitor asked for calmer visuals: the OS preference or the in-game setting. */
export function prefersReducedMotion(): boolean {
  return effectsReduced(osPrefersReducedMotion(), getReduceEffectsSetting());
}

export function isTouchDevice(): boolean {
  return (
    typeof matchMedia === "function" && matchMedia("(hover: none) and (pointer: coarse)").matches
  );
}
