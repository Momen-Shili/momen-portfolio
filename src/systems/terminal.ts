import { EXPERIENCE, LINKS, PROFILE, PROJECTS, SKILLS } from "../content/portfolio";
import { BUILDINGS, findBuilding, type BuildingId } from "../content/buildings";

export type TerminalAction = { type: "clear" } | { type: "open"; target: BuildingId };

export interface TerminalResult {
  lines: string[];
  action?: TerminalAction;
}

export const TERMINAL_BANNER = [
  `${PROFILE.name} - retro terminal`,
  "Type 'help' to list commands.",
];

const COMMANDS: ReadonlyArray<[string, string]> = [
  ["help", "list commands"],
  ["about", "who I am"],
  ["experience", "where I have worked"],
  ["projects", "what I have built"],
  ["skills", "what I work with"],
  ["contact", "how to reach me"],
  ["open <building>", "walk to a building"],
  ["clear", "clear the screen"],
];

function bar(level: number): string {
  const filled = Math.max(0, Math.min(10, Math.round(level)));
  return "#".repeat(filled) + ".".repeat(10 - filled);
}

function help(): string[] {
  const width = Math.max(...COMMANDS.map(([c]) => c.length));
  return ["Available commands:", ...COMMANDS.map(([c, d]) => `  ${c.padEnd(width)}  ${d}`)];
}

function about(): string[] {
  return [
    `${PROFILE.name} - ${PROFILE.title}`,
    `Location:  ${PROFILE.location}`,
    `Languages: ${PROFILE.languages.join(", ")}`,
    "",
    PROFILE.bio,
  ];
}

function experience(): string[] {
  return EXPERIENCE.map((e) => `${e.period.padEnd(11)} ${e.role} @ ${e.org}`);
}

function projects(): string[] {
  return PROJECTS.flatMap((p) => [
    `${p.name} [${p.status}]`,
    `  ${p.desc}`,
    `  Stack: ${p.tags.join(", ")}`,
  ]);
}

function skills(): string[] {
  const width = Math.max(...SKILLS.map((s) => s.name.length));
  return SKILLS.map((s) => `${s.name.padEnd(width)}  ${bar(s.level)}  ${s.level}/10  ${s.label}`);
}

function contact(): string[] {
  return [`Email:    ${LINKS.email}`, `LinkedIn: ${LINKS.linkedin}`, `GitHub:   ${LINKS.github}`];
}

function open(args: string[]): TerminalResult {
  const list = BUILDINGS.map((b) => b.aliases[0]).join(", ");
  if (args.length === 0) return { lines: [`Usage: open <building>  (${list})`] };
  const query = args.join(" ");
  const building = findBuilding(query);
  if (!building) return { lines: [`No building called '${query}'. Try: ${list}`] };
  return {
    lines: [`Walking to the ${building.label.toLowerCase()}...`],
    action: { type: "open", target: building.id },
  };
}

export function runCommand(raw: string): TerminalResult {
  const trimmed = raw.trim();
  if (trimmed === "") return { lines: [] };
  const [cmd = "", ...args] = trimmed.split(/\s+/);
  switch (cmd.toLowerCase()) {
    case "help":
      return { lines: help() };
    case "about":
      return { lines: about() };
    case "experience":
      return { lines: experience() };
    case "projects":
      return { lines: projects() };
    case "skills":
      return { lines: skills() };
    case "contact":
      return { lines: contact() };
    case "clear":
      return { lines: [], action: { type: "clear" } };
    case "open":
      return open(args);
    default:
      return { lines: [`'${cmd}' is not recognized. Try 'help'.`] };
  }
}
