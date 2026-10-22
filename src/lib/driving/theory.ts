// The Driving Academy theory exam: 20 questions drawn from src/data/driving/theory.json, 80% to pass.
// Graded by /api/driving/theory on the server, or here only while self-grading is allowed.

import THEORY from "@/data/driving/theory.json";

export { THEORY };
export const EXAM_SIZE = 20;

/** Picks 20 distinct question indexes in random order. */
export function drawExam(): number[] {
  const all = THEORY.questions.map((_, i) => i);
  for (let i = all.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [all[i], all[j]] = [all[j], all[i]]; }
  return all.slice(0, Math.min(EXAM_SIZE, all.length));
}

/** Grades {questionIndex: chosenOption} for exactly the drawn questions. Null when the paper is invalid. */
export function gradeTheory(answers: Array<[number, number]>) {
  const seen = new Set<number>();
  for (const [q] of answers) if (!Number.isInteger(q) || q < 0 || q >= THEORY.questions.length || seen.has(q) || !seen.add(q)) return null;
  if (answers.length !== Math.min(EXAM_SIZE, THEORY.questions.length)) return null;
  const correct = answers.filter(([q, a]) => THEORY.questions[q].correctIndex === a).length;
  const score = Math.round((correct / answers.length) * 100);
  return { correct, total: answers.length, score, passed: score >= THEORY.passPct };
}
