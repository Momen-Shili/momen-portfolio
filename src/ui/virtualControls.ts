import { JoystickModel } from "../systems/joystick";
import type { InputState } from "../systems/input";
import { el } from "./dom";

/** On-screen joystick and action button for touch devices. */
export class VirtualControls {
  private readonly element: HTMLElement;
  private readonly model = new JoystickModel();
  private readonly knob: HTMLElement;

  constructor(
    root: HTMLElement,
    private readonly input: InputState,
  ) {
    this.knob = el("div", { class: "joy-knob" });
    const base = el("div", { class: "joy-base", "aria-hidden": "true" }, this.knob);
    const action = el(
      "button",
      { type: "button", class: "action-btn", "aria-label": "Interact" },
      "E",
    );
    this.element = el("div", { class: "virtual-controls" }, base, action);
    root.append(this.element);

    const offset = (e: PointerEvent): [number, number] => {
      const rect = base.getBoundingClientRect();
      return [e.clientX - (rect.left + rect.width / 2), e.clientY - (rect.top + rect.height / 2)];
    };

    base.addEventListener("pointerdown", (e) => {
      if (!this.model.press(e.pointerId, ...offset(e))) return;
      try {
        base.setPointerCapture(e.pointerId);
      } catch {
        // Capture is an optimisation; the window-level listeners below end the drag anyway.
      }
      this.apply();
    });
    base.addEventListener("pointermove", (e) => {
      this.model.move(e.pointerId, ...offset(e));
      this.apply();
    });
    // The finger can lift anywhere (even outside the stick) or the browser can take the pointer
    // away, so every ending is listened for on the window as well.
    window.addEventListener("pointerup", this.onEnd);
    window.addEventListener("pointercancel", this.onEnd);
    base.addEventListener("lostpointercapture", this.onEnd);
    window.addEventListener("blur", this.releaseAll);
    document.addEventListener("visibilitychange", this.releaseAll);

    action.addEventListener("pointerdown", (e) => {
      e.preventDefault();
      this.input.pressAction();
    });
    // Keyboard / assistive-tech activation of the button.
    action.addEventListener("click", (e) => {
      if (e.detail === 0) this.input.pressAction();
    });
  }

  private apply(): void {
    const { axis, knob } = this.model;
    this.knob.style.transform = `translate(${knob.x}px, ${knob.y}px)`;
    this.input.setVirtualAxis(axis.x, axis.y);
  }

  private readonly onEnd = (e: PointerEvent): void => {
    this.model.release(e.pointerId);
    this.apply();
  };

  private readonly releaseAll = (): void => {
    this.model.release();
    this.apply();
  };

  /** Hiding the controls (a panel opened) must also end any drag in progress. */
  setVisible(visible: boolean): void {
    if (!visible) this.releaseAll();
    this.element.hidden = !visible;
  }

  destroy(): void {
    window.removeEventListener("pointerup", this.onEnd);
    window.removeEventListener("pointercancel", this.onEnd);
    window.removeEventListener("blur", this.releaseAll);
    document.removeEventListener("visibilitychange", this.releaseAll);
    this.element.remove();
  }
}
