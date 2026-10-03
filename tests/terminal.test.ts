import { describe, expect, it } from "vitest";
import { EXPERIENCE, LINKS, PROFILE, PROJECTS, SKILLS } from "../src/content/portfolio";
import { runCommand } from "../src/systems/terminal";

const text = (input: string): string => runCommand(input).lines.join("\n");

describe("terminal command parser", () => {
  it("prints nothing for blank input", () => {
    expect(runCommand("   ")).toEqual({ lines: [] });
  });

  it("lists every command in help", () => {
    const out = text("help");
    for (const cmd of [
      "help",
      "about",
      "experience",
      "projects",
      "skills",
      "contact",
      "open",
      "clear",
    ]) {
      expect(out).toContain(cmd);
    }
  });

  it("is case-insensitive and ignores extra whitespace", () => {
    expect(text("  ABOUT ")).toBe(text("about"));
  });

  it("drives about/experience/projects/skills/contact from portfolio.ts", () => {
    expect(text("about")).toContain(PROFILE.bio);
    for (const e of EXPERIENCE) expect(text("experience")).toContain(e.org);
    for (const p of PROJECTS) expect(text("projects")).toContain(p.name);
    for (const s of SKILLS) expect(text("skills")).toContain(s.name);
    expect(text("contact")).toContain(LINKS.email);
    expect(text("contact")).toContain(LINKS.github);
  });

  it("reports unknown commands with the exact message", () => {
    expect(runCommand("sudo").lines).toEqual(["'sudo' is not recognized. Try 'help'."]);
  });

  it("returns a clear action", () => {
    expect(runCommand("clear").action).toEqual({ type: "clear" });
  });

  it("opens buildings by name or alias, including multi-word names", () => {
    expect(runCommand("open workshop").action).toEqual({ type: "open", target: "workshop" });
    expect(runCommand("open projects").action).toEqual({ type: "open", target: "workshop" });
    expect(runCommand("open post office").action).toEqual({ type: "open", target: "post" });
    expect(runCommand("OPEN Library").action).toEqual({ type: "open", target: "library" });
    expect(runCommand("open house").action).toEqual({ type: "open", target: "house" });
  });

  it("explains usage for `open` without a valid building", () => {
    expect(runCommand("open").action).toBeUndefined();
    expect(text("open")).toContain("Usage");
    expect(runCommand("open castle").action).toBeUndefined();
    expect(text("open castle")).toContain("No building called 'castle'");
  });
});
