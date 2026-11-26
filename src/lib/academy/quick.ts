"use client";

// Quick courses at Abu Dhabi's and Doha's universities (src/data/academy/quick-courses.json): enrol and pay, three
// short lessons, a three-question quiz, a certificate and a skill. The server checks the fee, the city, the study
// time and the answers (public.enroll_quick_course / complete_quick_course).

import { supabase } from "@/lib/supabase/client";
export { QUICK_COURSES, QUICK_MIN_SECONDS, quickCourse, quickCourseActivities, type QuickCourse } from "./quickData";

const ERR: Record<string, string> = {
  not_in_city: "This course is taught on its campus: be in its city to enrol.",
  insufficient_funds: "You don't have enough AED for the course fee.",
  too_fast: "Take a moment with the lessons before the quiz.",
  not_enrolled: "Enrol first.",
};
const explain = (m: string) => ERR[m.split(":")[0]] ?? m;

export interface Enrolment { course_id: string; enrolled_at: string; completed_at: string | null; score: number | null }
export async function myQuickCourses(): Promise<{ course: string; enrolled_at: string; completed_at: string | null; score: number | null }[]> {
  const { data } = await supabase().rpc("my_quick_courses");
  return (data ?? []) as { course: string; enrolled_at: string; completed_at: string | null; score: number | null }[];
}
export async function enrollQuick(id: string): Promise<{ data?: Enrolment; error?: string }> {
  const { data, error } = await supabase().rpc("enroll_quick_course", { p_course: id });
  return error ? { error: explain(error.message) } : { data: data as Enrolment };
}
export async function completeQuick(id: string, answers: number[]): Promise<{ data?: { passed: boolean; score: number }; error?: string }> {
  const { data, error } = await supabase().rpc("complete_quick_course", { p_course: id, p_answers: answers });
  return error ? { error: explain(error.message) } : { data: data as { passed: boolean; score: number } };
}
