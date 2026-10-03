import type { InputState } from "../systems/input";
import { el } from "./dom";

const RADIUS = 44;

/** On-screen joystick and action button for touch devices. */
export class VirtualControls {
  private readonly element: HTMLElement;
  private activePointer: number | null = null;

  constructor(
    root: HTMLElement,
    private readonly input: InputState,
  ) {
    const knob = el("div", { class: "joy-knob" });
    const base = el("div", { class: "joy-base", "aria-hidden": "true" }, knob);
    const action = el(
      "button",
      { type: "button", class: "action-btn", "aria-label": "Interact" },
      "E",
    );
    this.element = el("div", { class: "virtual-controls" }, base, action);
    root.append(this.element);

    const update = (e: PointerEvent): void => {
      const rect = base.getBoundingClientRect();
      const dx = e.clientX - (rect.left + rect.width / 2);
      const dy = e.clientY - (rect.top + rect.height / 2);
      const len = Math.hypot(dx, dy);
      const k = len > RADIUS ? RADIUS / len : 1;
      const x = (dx * k) / RADIUS;
      const y = (dy * k) / RADIUS;
      knob.style.transform = `translate(${x * RADIUS}px, ${y * RADIUS}px)`;
      // Dead zone so a resting thumb does not drift.
      const magnitude = Math.hypot(x, y);
      this.input.setVirtualAxis(magnitude < 0.22 ? 0 : x, magnitude < 0.22 ? 0 : y);
    };
    const release = (): void => {
      this.activePointer = null;
      knob.style.transform = "translate(0, 0)";
      this.input.setVirtualAxis(0, 0);
    };

    base.addEventListener("pointerdown", (e) => {
      if (this.activePointer !== null) return;
      this.activePointer = e.pointerId;
      try {
        base.setPointerCapture(e.pointerId);
      } catch {
        // Pointer capture is an optimisation; dragging still works without it.
      }
      update(e);
    });
    base.addEventListener("pointermove", (e) => {
      if (e.pointerId === this.activePointer) update(e);
    });
    base.addEventListener("pointerup", (e) => {
      if (e.pointerId === this.activePointer) release();
    });
    base.addEventListener("pointercancel", release);

    action.addEventListener("pointerdown", (e) => {
      e.preventDefault();
      this.input.pressAction();
    });
    // Keyboard / assistive-tech activation of the button.
    action.addEventListener("click", (e) => {
      if (e.detail === 0) this.input.pressAction();
    });
  }

  setVisible(visible: boolean): void {
    this.element.hidden = !visible;
  }

  destroy(): void {
    this.element.remove();
  }
}
