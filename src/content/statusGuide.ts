import type { ProjectStatus } from "./portfolio.ts";

/**
 * What each project status label means in general. These are neutral definitions of the words
 * used in the Projects section, not claims about any particular project. They appear on the
 * workshop chalkboard, in the Projects panel and on the plain page.
 */
export const STATUS_GUIDE: Readonly<Record<ProjectStatus, string>> = {
  Live: "Available and in use.",
  "In production": "Running in day-to-day use.",
  MVP: "A first working version, still being proven.",
  Beta: "Open to early testers while it is polished.",
  "In development": "Still being built.",
  Freelance: "Client work done on a freelance basis.",
};

export const STATUS_ORDER: readonly ProjectStatus[] = [
  "Live",
  "In production",
  "MVP",
  "Beta",
  "In development",
  "Freelance",
];
