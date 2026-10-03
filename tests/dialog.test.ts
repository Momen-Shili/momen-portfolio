import { describe, expect, it } from "vitest";
import { NPCS } from "../src/content/npcs";
import { PROJECTS } from "../src/content/portfolio";
import { DialogRunner } from "../src/systems/dialog";

describe("DialogRunner", () => {
  const lines = [
    { speaker: "A", text: "one" },
    { speaker: "A", text: "two" },
    { speaker: "B", text: "three" },
  ];

  it("starts on the first line and steps through them", () => {
    const runner = new DialogRunner(lines);
    expect(runner.current.text).toBe("one");
    expect(runner.position).toEqual({ index: 1, total: 3 });
    expect(runner.advance()).toBe(false);
    expect(runner.current.text).toBe("two");
    expect(runner.isLast).toBe(false);
    expect(runner.advance()).toBe(false);
    expect(runner.isLast).toBe(true);
  });

  it("reports completion on the advance after the last line and does not overrun", () => {
    const runner = new DialogRunner(lines);
    runner.advance();
    runner.advance();
    expect(runner.advance()).toBe(true);
    expect(runner.current.text).toBe("three");
  });

  it("refuses an empty dialog", () => {
    expect(() => new DialogRunner([])).toThrow();
  });
});

describe("NPC content", () => {
  it("has at least two NPCs with usable dialog", () => {
    const npcs = Object.values(NPCS);
    expect(npcs.length).toBeGreaterThanOrEqual(2);
    for (const npc of npcs) expect(() => new DialogRunner(npc.lines)).not.toThrow();
  });

  it("derives project facts from portfolio.ts", () => {
    const smith = NPCS["smith"]?.lines.map((l) => l.text).join(" ") ?? "";
    expect(smith).toContain(String(PROJECTS.length));
    for (const p of PROJECTS.filter((x) => x.status === "Live")) expect(smith).toContain(p.name);
  });
});
