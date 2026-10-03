import { describe, expect, it } from "vitest";
import { DEAD_ZONE, JOYSTICK_RADIUS, JoystickModel } from "../src/systems/joystick";

describe("JoystickModel", () => {
  it("maps a drag to a unit-limited axis and a knob position", () => {
    const j = new JoystickModel();
    expect(j.press(1, JOYSTICK_RADIUS, 0)).toBe(true);
    expect(j.axis).toEqual({ x: 1, y: 0 });
    j.move(1, 1000, 0); // dragging far outside the base is clamped to the rim
    expect(j.axis.x).toBeCloseTo(1);
    expect(j.knob.x).toBeCloseTo(JOYSTICK_RADIUS);
  });

  it("keeps diagonals at unit length", () => {
    const j = new JoystickModel();
    j.press(1, 100, 100);
    expect(Math.hypot(j.axis.x, j.axis.y)).toBeCloseTo(1);
  });

  it("has a dead zone so a resting thumb does not drift", () => {
    const j = new JoystickModel();
    j.press(1, JOYSTICK_RADIUS * (DEAD_ZONE - 0.05), 0);
    expect(j.axis).toEqual({ x: 0, y: 0 });
    j.move(1, JOYSTICK_RADIUS * (DEAD_ZONE + 0.1), 0);
    expect(j.axis.x).toBeGreaterThan(0);
  });

  it("ignores a second finger while the first holds the stick (multi-touch)", () => {
    const j = new JoystickModel();
    j.press(1, 30, 0);
    expect(j.press(2, -40, 0)).toBe(false);
    j.move(2, -40, 0);
    expect(j.axis.x).toBeGreaterThan(0);
    j.release(2); // the other finger lifting must not stop the stick
    expect(j.activePointer).toBe(1);
  });

  it("releases on the right pointer, wherever the finger lifts", () => {
    const j = new JoystickModel();
    j.press(7, 40, 0);
    j.release(7);
    expect(j.axis).toEqual({ x: 0, y: 0 });
    expect(j.activePointer).toBeNull();
    expect(j.press(8, 0, 40)).toBe(true); // usable again straight away
  });

  it("can be force-released when the controls are hidden or the tab loses focus", () => {
    const j = new JoystickModel();
    j.press(3, 40, 0);
    j.release();
    expect(j.activePointer).toBeNull();
    expect(j.knob).toEqual({ x: 0, y: 0 });
    expect(j.press(4, 40, 0)).toBe(true);
  });

  it("ignores moves from pointers that are not holding the stick", () => {
    const j = new JoystickModel();
    j.move(9, 40, 0);
    expect(j.axis).toEqual({ x: 0, y: 0 });
  });
});
