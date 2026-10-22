"use client";

// Academic City progress kept on the server: lessons in order, one new lesson (or the exam) per course every
// 20 hours, graduation. Course content stays in JSON; see supabase/migrations/*_academy_progress.sql.

import { supabase } from "@/lib/supabase/client";
import type { AcademicCourse } from "@/lib/city/academic";
import { gradeStep } from "./grade";

export interface AcademyProgress { passed: number; lastPassedAt: string | null; graduatedAt: string | null; examScore: number | null }

export type GradeStatus = "passed" | "failed" | "already" | "locked" | "out_of_order" | "graduated" | "graduated_now";
export interface GradeResult {
  status: GradeStatus;
  score: number;
  correct: number;
  total: number;
  passed: number;
  unlockAt?: string;
  next?: number;
}

export const UNLOCK_HOURS = 20;

/** The player's server-side progress on a course, or null if nothing is recorded yet. */
export async function academyProgress(courseId: string): Promise<AcademyProgress | null> {
  const { data: { user } } = await supabase().auth.getUser();
  if (!user) return null;
  const { data } = await supabase().from("academy_enrolments").select("passed, last_passed_at, graduated_at, exam_score")
    .eq("user_id", user.id).eq("course_id", courseId).maybeSingle();
  return data ? { passed: data.passed, lastPassedAt: data.last_passed_at, graduatedAt: data.graduated_at, examScore: data.exam_score } : null;
}

/** When the next step opens (null = open now). */
export function unlockAt(p: AcademyProgress | null): Date | null {
  if (!p?.lastPassedAt) return null;
  const at = new Date(Date.parse(p.lastPassedAt) + UNLOCK_HOURS * 3_600_000);
  return at.getTime() > Date.now() ? at : null;
}

/** Hands in a lesson quiz (step = lesson number) or the exam (step = lessons + 1). Graded on the server when
    it's configured; otherwise graded here and reported (allowed only while self-grading is switched on). */
export async function submitStep(course: AcademicCourse, step: number, answers: Array<number | null | undefined>, catchUp: number): Promise<GradeResult | { error: string }> {
  const { data: { session } } = await supabase().auth.getSession();
  if (!session) return { error: "Log in to save your progress." };
  const res = await fetch("/api/academy/grade", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
    body: JSON.stringify({ courseId: course.id, step, answers, catchUp }),
  }).catch(() => null);
  if (res && res.status !== 501) {
    const body = await res.json().catch(() => ({}));
    return res.ok ? (body as GradeResult) : { error: "Couldn't save your answers. Try again." };
  }
  const graded = gradeStep(course, step, answers);
  if (!graded) return { error: "This step doesn't exist." };
  const { data, error } = await supabase().rpc("academy_record_self", {
    p_course: course.id, p_lessons: course.lessons.length, p_step: step, p_passed: graded.passed, p_score: graded.score, p_catch_up: catchUp,
  });
  if (error) return { error: "Couldn't save your answers. Try again." };
  return { ...graded, ...(data as { status: GradeStatus; passed: number; unlockAt?: string; next?: number }) };
}

export const untilText = (at: Date) => {
  const mins = Math.max(1, Math.round((at.getTime() - Date.now()) / 60000));
  return mins >= 60 ? `${Math.floor(mins / 60)}h ${mins % 60}m` : `${mins}m`;
};
