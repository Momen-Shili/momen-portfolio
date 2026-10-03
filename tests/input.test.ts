import { afterEach, describe, expect, it } from "vitest";
import { InputState, normalizeAxis } from "../src/systems/input";

function key(
  type: "keydown" | "keyup",
  k: string,
  extra: Record<string, unknown> = {},
  targetEl?: { tagName: string },
): Event {
  const event = Object.assign(new Event(type, { cancelable: true }), {
    key: k,
    ctrlKey: false,
    ...extra,
  });
  if (targetEl) Object.defineProperty(event, "target", { value: targetEl });
  return event;
}

describe("normalizeAxis", () => {
  it("keeps diagonals at unit length", () => {
    const { x, y } = normalizeAxis(1, 1);
    expect(Math.hypot(x, y)).toBeCloseTo(1);
  });
  it("leaves partial joystick values alone", () => {
    expect(normalizeAxis(0.5, 0)).toEqual({ x: 0.5, y: 0 });
    expect(normalizeAxis(0, 0)).toEqual({ x: 0, y: 0 });
  });
});

describe("InputState", () => {
  let target = new EventTarget();
  let input: InputState | null = null;
  let blocked = false;

  const create = (): InputState => {
    target = new EventTarget();
    blocked = false;
    input = new InputState(target, () => blocked);
    return input;
  };
  afterEach(() => input?.destroy());

  it("maps WASD and arrows to the axis", () => {
    const i = create();
    target.dispatchEvent(key("keydown", "d"));
    expect(i.getAxis()).toEqual({ x: 1, y: 0 });
    target.dispatchEvent(key("keyup", "d"));
    target.dispatchEvent(key("keydown", "ArrowUp"));
    expect(i.getAxis()).toEqual({ x: 0, y: -1 });
  });

  it("cancels opposite keys", () => {
    const i = create();
    target.dispatchEvent(key("keydown", "a"));
    target.dispatchEvent(key("keydown", "d"));
    expect(i.getAxis().x).toBe(0);
  });

  it("queues one action per press of E or Space", () => {
    const i = create();
    target.dispatchEvent(key("keydown", "e"));
    expect(i.consumeAction()).toBe(true);
    expect(i.consumeAction()).toBe(false);
    target.dispatchEvent(key("keydown", " "));
    expect(i.consumeAction()).toBe(true);
    target.dispatchEvent(key("keydown", "e", { repeat: true }));
    expect(i.consumeAction()).toBe(false);
  });

  it("ignores keys while blocked (a panel is open)", () => {
    const i = create();
    blocked = true;
    target.dispatchEvent(key("keydown", "w"));
    target.dispatchEvent(key("keydown", "e"));
    expect(i.getAxis()).toEqual({ x: 0, y: 0 });
    expect(i.consumeAction()).toBe(false);
  });

  it("does not steal keys typed into a text field", () => {
    const i = create();
    target.dispatchEvent(key("keydown", "e", {}, { tagName: "INPUT" }));
    target.dispatchEvent(key("keydown", "w", {}, { tagName: "TEXTAREA" }));
    expect(i.getAxis()).toEqual({ x: 0, y: 0 });
    expect(i.consumeAction()).toBe(false);
  });

  it("uses the virtual joystick when no key is held and clears on reset", () => {
    const i = create();
    i.setVirtualAxis(0.5, -0.5);
    expect(i.getAxis().x).toBeCloseTo(0.5);
    i.reset();
    expect(i.getAxis()).toEqual({ x: 0, y: 0 });
    i.pressAction();
    expect(i.consumeAction()).toBe(true);
  });
});
