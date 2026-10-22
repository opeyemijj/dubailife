// Marks Academic City quizzes and exams against the course JSON. Used by /api/academy/grade on the server
// and, only while server grading isn't configured, by the app itself.

import type { AcademicCourse } from "@/lib/city/academic";

/** Lesson quizzes pass at 70% (academy.pass_pct). */
export const LESSON_PASS_PCT = 70;

export type Honors = "Pass" | "Cum Laude" | "Magna Cum Laude" | "Summa Cum Laude";
export const honorsFor = (score: number): Honors => (score >= 95 ? "Summa Cum Laude" : score >= 85 ? "Magna Cum Laude" : score >= 70 ? "Cum Laude" : "Pass");

/** Grades one try. step = lesson number, or lessons + 1 for the final exam. Null when the step doesn't exist. */
export function gradeStep(course: AcademicCourse, step: number, answers: Array<number | null | undefined>) {
  const isExam = step === course.lessons.length + 1;
  const questions = isExam ? course.finalExam.questions : course.lessons.find((l) => l.lessonNumber === step)?.quiz;
  if (!questions) return null;
  if (questions.length === 0) return { isExam, correct: 0, total: 0, score: 100, passed: true };
  const correct = questions.reduce((n, q, i) => n + (answers[i] === q.correctIndex ? 1 : 0), 0);
  const score = Math.round((correct / questions.length) * 100);
  const passed = score >= (isExam ? course.finalExam.passingScore : LESSON_PASS_PCT);
  return { isExam, correct, total: questions.length, score, passed };
}
