import { buildQuiz, type QuizRound } from "../systems/quests/minigames/quiz";
import { el } from "./dom";

/** "Match the stack": four rounds, no penalty. Calls `onDone` once the last answer is given. */
export function createQuiz(
  onDone: (correct: number, rounds: number) => void,
  rng: () => number = Math.random,
): { element: HTMLElement; focus: HTMLElement } {
  const rounds = buildQuiz(rng);
  const element = el("div", { class: "quiz" });
  const heading = el("h3", { class: "quiz-heading", tabindex: "-1" });
  let index = 0;
  let correct = 0;

  const showSummary = (): void => {
    heading.textContent = "Quiz complete";
    element.replaceChildren(
      heading,
      el(
        "p",
        { class: "quiz-summary" },
        `You matched ${correct} of ${rounds.length}. Thanks for playing!`,
      ),
      el("p", { class: "quiz-note" }, "Every project and its stack is listed in the Workshop."),
    );
    heading.focus();
  };

  const showRound = (round: QuizRound): void => {
    heading.textContent = `Round ${index + 1} of ${rounds.length}`;
    const feedback = el("p", { class: "quiz-feedback", role: "status" });
    const next = el(
      "button",
      { type: "button", class: "btn-primary quiz-next" },
      index === rounds.length - 1 ? "Finish" : "Next round",
    );
    next.hidden = true;

    const buttons = round.options.map((option) => {
      const button = el("button", { type: "button", class: "quiz-option" }, option);
      button.addEventListener("click", () => {
        const right = option === round.answer;
        if (right) correct += 1;
        for (const b of buttons) {
          b.disabled = true;
          if (b.textContent === round.answer) b.classList.add("is-correct");
        }
        if (!right) button.classList.add("is-wrong");
        if (right) feedback.textContent = "Correct!";
        else {
          feedback.replaceChildren(
            "Not quite. ",
            el("bdi", {}, round.project),
            ` uses ${round.answer}. All its tags: ${round.projectTags.join(", ")}.`,
          );
        }
        next.hidden = false;
        next.focus();
        if (index === rounds.length - 1) onDone(correct, rounds.length);
      });
      return button;
    });

    const prompt = el("p", { class: "quiz-prompt" }, "Which of these does ");
    prompt.append(el("bdi", {}, round.project), " use?");
    next.addEventListener("click", () => {
      index += 1;
      const upcoming = rounds[index];
      if (upcoming) showRound(upcoming);
      else showSummary();
    });
    element.replaceChildren(
      heading,
      prompt,
      el("div", { class: "quiz-options" }, ...buttons),
      feedback,
      next,
    );
    heading.focus();
  };

  const first = rounds[0];
  if (first) showRound(first);
  return { element, focus: heading };
}
