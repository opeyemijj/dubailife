"use client";

// The player economy (design spec sections 10 and 19.4): ventures, crews, the Job Board, shifts and payroll.
// Venture types come from src/data/economy/ventures.json; the server keeps each venture's treasury and staff.

import SYSTEM_JOBS from "@/data/economy/system-jobs.json";
import SERVICES from "@/data/economy/city-services.json";
import { supabase } from "@/lib/supabase/client";
import { refreshCitizen } from "@/lib/citizenStore";
import VENTURES from "@/data/economy/ventures.json";

export { VENTURES };
export type VentureType = (typeof VENTURES.types)[number];
export const ventureType = (id: string) => VENTURES.types.find((t) => t.id === id);
export type Requirement = keyof typeof VENTURES.requirements;

export interface Venture {
  id: number; type: string; name: string; treasury: number; daily: number; multiplier: number; nextPayroll: string;
  members: Array<{ id: string; username: string; role: "owner" | "partner" | "invited" }>;
  staff: Array<{ id: string; username: string; title: string; weeklyWage: number; shifts: number; shiftsPerWeek: number; qualified: boolean; owed: number }>;
  jobs: Array<{ id: number; title: string; weeklyWage: number; shiftsPerWeek: number; requirement: Requirement; applicants: Array<{ id: string; username: string; qualified: boolean; licence: boolean }> }>;
}
export interface MyJob { title: string; venture: string; ventureType: string; weeklyWage: number; shifts: number; shiftsPerWeek: number; workedToday: boolean; owed: number; nextPayroll: string }
export interface Economy {
  ventures: Venture[];
  invites: Array<{ id: number; name: string; type: string }>;
  job: MyJob | null;
  applications: Array<{ jobId: number; status: "pending" | "hired" | "rejected" }>;
}
export interface BoardJob { id: number; title: string; weeklyWage: number; shiftsPerWeek: number; requirement: Requirement; venture: string; ventureType: string; system: boolean; mine: boolean; service?: "doctor" | "police" | "lawyer" | null; interview?: "passed" | "failed" | null }

/** Icon for a city (system) company, from src/data/economy/system-jobs.json. */
export const companyIcon = (name: string) => [...SYSTEM_JOBS.companies, ...SERVICES.careers].find((c) => c.name === name)?.icon;

const ERRORS: Record<string, string> = {
  insufficient_funds: "You don't have enough AED for that.",
  too_many_ventures: "You can be part of at most 3 ventures.",
  not_friends: "You can only invite friends to your crew.",
  crew_full: "A crew has at most 5 members.",
  too_many_jobs: "A venture can have at most 10 open jobs.",
  job_closed: "That job has closed.",
  own_venture: "You can't apply to your own venture.",
  already_employed: "You already have a job. Quit it first to take another.",
  needs_course: "This job needs an Academic City graduate.",
  needs_degree: "This job needs a university or accelerator degree.",
  needs_licence: "This job needs a driving license.",
  too_many_applications: "You have 5 applications waiting. Wait for answers first.",
  already_worked: "You've already worked today's shift. Come back tomorrow.",
  no_job: "You don't have a job yet.",
  invalid_type: "Pick a venture type.",
  needs_interview: "Pass the interview for this job first.",
};
const explain = (m: string) => Object.entries(ERRORS).find(([k]) => m.includes(k))?.[1] ?? "Something went wrong. Try again.";

async function call<T>(fn: string, args?: Record<string, unknown>): Promise<{ data?: T; error?: string }> {
  const { data, error } = await supabase().rpc(fn, args);
  return error ? { error: explain(error.message) } : { data: data as T };
}

export const myEconomy = () => call<Economy>("my_economy");
export const jobBoard = () => call<BoardJob[]>("job_board");
export async function buyVenture(type: string, name: string) { const r = await call<number>("buy_venture", { p_type: type, p_name: name }); refreshCitizen(); return r; }
export const inviteToCrew = (venture: number, friend: string) => call<null>("venture_invite", { p_venture: venture, p_friend: friend });
export const answerCrewInvite = (venture: number, accept: boolean) => call<null>("venture_answer_invite", { p_venture: venture, p_accept: accept });
export async function collectProfit(venture: number) { const r = await call<number>("collect_profit", { p_venture: venture }); refreshCitizen(); return r; }
export const postJob = (venture: number, title: string, wage: number, shifts: number, requirement: Requirement) =>
  call<number>("post_job", { p_venture: venture, p_title: title, p_wage: wage, p_shifts: shifts, p_requirement: requirement });
export const closeJob = (job: number) => call<null>("close_job", { p_job: job });
export const applyJob = (job: number) => call<null>("apply_job", { p_job: job });
export const reviewApplication = (job: number, user: string, hire: boolean) => call<null>("review_application", { p_job: job, p_user: user, p_hire: hire });
export const endJob = (user?: string) => call<null>("end_job", user ? { p_user: user } : {});
export const workShift = () => call<{ shifts: number; shiftsPerWeek: number; weeklyWage: number }>("work_shift");

export const aed = (n: number) => `AED ${Math.round(n).toLocaleString()}`;
export const daysUntil = (iso: string, now: number) => {
  const ms = Date.parse(iso) - now, d = Math.floor(ms / 86_400_000), h = Math.floor((ms % 86_400_000) / 3_600_000);
  return d > 0 ? `${d}d ${h}h` : `${Math.max(0, h)}h`;
};
