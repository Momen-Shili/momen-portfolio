import { afterEach, describe, expect, it } from "vitest";
import { GlobalListenerTracker } from "../src/game/globalListeners";

/** Counts how many times a type fires on a target, so we can tell if a listener is still attached. */
function fires(target: EventTarget, type: string): number {
  let n = 0;
  const probe = () => n++;
  // Listeners cannot be enumerated, so dispatch and see whether the tracked ones ran.
  target.addEventListener(type, probe);
  target.dispatchEvent(new Event(type));
  target.removeEventListener(type, probe);
  return n;
}

describe("GlobalListenerTracker", () => {
  let tracker: GlobalListenerTracker | null = null;
  afterEach(() => tracker?.stop());

  it("removes listeners that a library forgot to remove", () => {
    const target = new EventTarget();
    let calls = 0;
    tracker = new GlobalListenerTracker([target]);
    tracker.start();
    target.addEventListener("visibilitychange", () => calls++);
    target.dispatchEvent(new Event("visibilitychange"));
    expect(calls).toBe(1);
    tracker.stop();
    target.dispatchEvent(new Event("visibilitychange"));
    expect(calls).toBe(1);
  });

  it("tracks only the targets it was given", () => {
    const watched = new EventTarget();
    const other = new EventTarget();
    let otherCalls = 0;
    tracker = new GlobalListenerTracker([watched]);
    tracker.start();
    other.addEventListener("x", () => otherCalls++);
    watched.addEventListener("x", () => undefined);
    expect(tracker.tracked).toBe(1);
    tracker.stop();
    other.dispatchEvent(new Event("x"));
    expect(otherCalls).toBe(1);
  });

  it("removes capture listeners correctly", () => {
    const target = new EventTarget();
    let calls = 0;
    tracker = new GlobalListenerTracker([target]);
    tracker.start();
    target.addEventListener("keydown", () => calls++, true);
    target.addEventListener("keydown", () => calls++, { capture: true });
    tracker.stop();
    target.dispatchEvent(new Event("keydown"));
    expect(calls).toBe(0);
  });

  it("is harmless when the code already removed its own listener", () => {
    const target = new EventTarget();
    const fn = () => undefined;
    tracker = new GlobalListenerTracker([target]);
    tracker.start();
    target.addEventListener("a", fn);
    target.removeEventListener("a", fn);
    expect(() => tracker?.stop()).not.toThrow();
  });

  it("restores the original addEventListener and does not track after stopping", () => {
    const original = EventTarget.prototype.addEventListener;
    const target = new EventTarget();
    tracker = new GlobalListenerTracker([target]);
    tracker.start();
    expect(EventTarget.prototype.addEventListener).not.toBe(original);
    tracker.stop();
    expect(EventTarget.prototype.addEventListener).toBe(original);
    let calls = 0;
    target.addEventListener("late", () => calls++);
    expect(tracker.tracked).toBe(0);
    target.dispatchEvent(new Event("late"));
    expect(calls).toBe(1);
    expect(fires(target, "late")).toBeGreaterThan(0);
  });

  it("can be started again after stopping (replaying the game)", () => {
    const target = new EventTarget();
    tracker = new GlobalListenerTracker([target]);
    for (let i = 0; i < 3; i++) {
      tracker.start();
      target.addEventListener("cycle", () => undefined);
      expect(tracker.tracked).toBe(1);
      tracker.stop();
      expect(tracker.tracked).toBe(0);
    }
  });
});
