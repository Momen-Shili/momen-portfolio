import { describe, expect, it } from "vitest";
import { findInteraction, type Zone } from "../src/systems/interaction";

const zone = (id: string, x: number, y: number, w: number, h: number): Zone => ({
  id,
  x,
  y,
  w,
  h,
  prompt: id,
  action: { type: "wish" },
});

describe("findInteraction", () => {
  const zones = [zone("a", 0, 0, 40, 40), zone("b", 100, 0, 40, 40)];

  it("returns null outside every zone", () => {
    expect(findInteraction(70, 20, zones)).toBeNull();
  });

  it("returns the zone that contains the point, edges included", () => {
    expect(findInteraction(20, 20, zones)?.id).toBe("a");
    expect(findInteraction(100, 0, zones)?.id).toBe("b");
    expect(findInteraction(140, 40, zones)?.id).toBe("b");
  });

  it("prefers the zone whose centre is closest when zones overlap", () => {
    const overlap = [zone("wide", 0, 0, 200, 40), zone("near", 60, 0, 40, 40)];
    expect(findInteraction(85, 20, overlap)?.id).toBe("near");
    expect(findInteraction(10, 20, overlap)?.id).toBe("wide");
  });

  it("handles an empty zone list", () => {
    expect(findInteraction(0, 0, [])).toBeNull();
  });
});
