"use client";

// Driving Academy progress (design spec section 8): one row per learner on the server.

import { supabase } from "@/lib/supabase/client";
import { gradeTheory } from "./theory";

export interface DrivingProgress {
  eye_passed_at: string | null; theory_passed_at: string | null; theory_score: number | null;
  yard_passed_at: string | null; road_passed_at: string | null; licence_no: string | null; issued_at: string | null; attempts: number;
}

export async function drivingProgress(): Promise<DrivingProgress | null> {
  const { data: { user } } = await supabase().auth.getUser();
  if (!user) return null;
  const { data } = await supabase().from("driving_progress").select("*").eq("user_id", user.id).maybeSingle();
  return (data as DrivingProgress) ?? null;
}

/** Records the eye test or Smart Yard result (played in the app). */
export async function recordStage(stage: "eye" | "yard", passed: boolean): Promise<DrivingProgress | null> {
  const { data, error } = await supabase().rpc("driving_record_self", { p_stage: stage, p_passed: passed });
  return error ? null : (data as DrivingProgress);
}

/** Hands in the theory exam: graded on the server when configured, otherwise here. */
export async function submitTheory(answers: Array<[number, number]>): Promise<{ score: number; passed: boolean; progress: DrivingProgress | null } | { error: string }> {
  const { data: { session } } = await supabase().auth.getSession();
  if (!session) return { error: "Log in to take the exam." };
  const res = await fetch("/api/driving/theory", {
    method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` }, body: JSON.stringify({ answers }),
  }).catch(() => null);
  if (res && res.status !== 501) {
    const body = await res.json().catch(() => ({}));
    return res.ok ? body : { error: "Couldn't hand in the exam. Try again." };
  }
  const graded = gradeTheory(answers);
  if (!graded) return { error: "Answer every question first." };
  const { data, error } = await supabase().rpc("driving_record_self", { p_stage: "theory", p_passed: graded.passed, p_score: graded.score });
  return error ? { error: "Couldn't hand in the exam. Try again." } : { ...graded, progress: data as DrivingProgress };
}
