import { PROJECTS } from "../../../content/portfolio";

export interface QuizRound {
  project: string;
  /** Three tags in shuffled order; exactly one belongs to the project. */
  options: string[];
  answer: string;
  /** All the project's tags, shown after answering. */
  projectTags: string[];
}

export const QUIZ_ROUNDS = 4;

function shuffle<T>(items: readonly T[], rng: () => number): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j] as T, out[i] as T];
  }
  return out;
}

/** Builds the quiz from PROJECTS. Wrong options are tags that project does not use. */
export function buildQuiz(rng: () => number, rounds = QUIZ_ROUNDS): QuizRound[] {
  const allTags = [...new Set(PROJECTS.flatMap((p) => p.tags))];
  const projects = shuffle(PROJECTS, rng).slice(0, Math.min(rounds, PROJECTS.length));
  return projects.map((project) => {
    const answer = shuffle(project.tags, rng)[0] as string;
    const distractors = shuffle(
      allTags.filter((t) => !project.tags.includes(t)),
      rng,
    ).slice(0, 2);
    return {
      project: project.name,
      options: shuffle([answer, ...distractors], rng),
      answer,
      projectTags: [...project.tags],
    };
  });
}
