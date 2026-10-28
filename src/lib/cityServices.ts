"use client";

// City services on the phone: job interviews, falling ill and seeing a doctor, and the police and courts.
// Rules and texts: src/data/economy/city-services.json (mirrored in *_city_services.sql). Players who work
// as doctors, police officers and lawyers serve other players; Locals step in when none is free.

import { useEffect, useSyncExternalStore } from "react";
import { supabase } from "@/lib/supabase/client";
import { refreshCitizen } from "@/lib/citizenStore";
import SERVICES from "@/data/economy/city-services.json";

export { SERVICES };
export type Service = "doctor" | "police" | "lawyer";
export type IllnessKind = (typeof SERVICES.illness.kinds)[number];
export interface Question { q: string; options: string[]; answer: number }

export interface Professional { id: string; username: string; look?: { gender: "woman" | "man"; preset?: string } | null; fee: number }
export interface CaseView {
  id: number; held: number; reason: string; status: "open" | "cleared" | "guilty"; fine: number | null;
  lawyerKind: "player" | "aid" | "senior" | null; lawyer: string | null; defence: number | null; officer: string | null;
  hearingAt: string; verdictAt: string | null; createdAt: string;
  kind?: "transfer" | "fake_licence"; jailUntil?: string | null;
}
export interface MyServices {
  service: Service | null;
  fee: number | null;
  illness: { kind: string; since: string } | null;
  waiting: { id: number; doctor: string; fee: number; since: string } | null;
  patients: Array<{ id: number; patient: string; kind: string; fee: number; since: string }>;
  cases: CaseView[];
  clients: Array<{ id: number; client: string; held: number; reason: string; defence: number | null; status: string; hearingAt: string }>;
  arrests: Array<{ id: number; suspect: string; held: number; status: string }>;
}

export const illnessOf = (kind?: string | null) => SERVICES.illness.kinds.find((k) => k.id === kind) ?? null;
export const careerOf = (company: string) => SERVICES.careers.find((c) => c.name === company) ?? null;
/** The interview for a job: the company's own questions, or the general set for player ventures. */
export const interviewFor = (company: string, system: boolean): Question[] =>
  (system ? (SERVICES.interviews as unknown as Record<string, Question[]>)[company] : null) ?? SERVICES.interviews._player;

// Friendlier words for the database's refusals.
const ERRORS: Record<string, string> = {
  retry_tomorrow: "You've had your interview for this job today. Try again tomorrow.",
  needs_interview: "Pass the interview first.",
  needs_course: "This job needs a finished course from Academic City.",
  needs_degree: "This job needs a university degree.",
  needs_licence: "This job needs a driving licence.",
  already_employed: "You already have a job. Quit it first.",
  insufficient_funds: "You don't have enough AED for that.",
  already_waiting: "You're already waiting for a doctor.",
  not_ill: "You're not ill.",
  account_frozen: "Your account is frozen while your court case is open.",
  already_represented: "You already have a lawyer.",
  defence_not_ready: "Your lawyer hasn't prepared your defence yet.",
  fee_out_of_range: "That fee is outside the allowed range.",
  already_prepared: "The defence is already prepared.",
  not_in_custody: "You're not in custody.",
};
export const friendly = (msg: string) => ERRORS[Object.keys(ERRORS).find((k) => msg.includes(k)) ?? ""] ?? msg;

async function call<T>(fn: string, args: Record<string, unknown> = {}): Promise<{ data?: T; error?: string }> {
  const { data, error } = await supabase().rpc(fn, args);
  return error ? { error: friendly(error.message) } : { data: data as T };
}

// ---------------------------------------------------------------- live store

let state: MyServices | null = null;
const listeners = new Set<() => void>();
let loading: Promise<void> | null = null;

export function reloadServices() {
  loading ??= call<MyServices>("my_services").then((r) => {
    if (r.data) { state = r.data; listeners.forEach((l) => l()); }
  }).finally(() => { loading = null; });
  return loading;
}

const subscribe = (l: () => void) => { listeners.add(l); return () => { listeners.delete(l); }; };

// One live connection however many parts of the screen are watching.
let live: { me: string; users: number; stop: () => void } | null = null;
function watch(me: string) {
  if (live?.me === me) { live.users++; return; }
  live?.stop();
  void reloadServices();
  const db = supabase();
  const ch = db.channel(`services:${me}`);
  for (const table of ["consults", "cases", "illnesses"]) ch.on("postgres_changes", { event: "*", schema: "public", table }, () => { void reloadServices(); void refreshCitizen(); });
  ch.subscribe();
  // Hearings fall due on their own; check now and then.
  const t = setInterval(() => void reloadServices(), 60_000);
  live = { me, users: 1, stop: () => { clearInterval(t); void db.removeChannel(ch); } };
}
function unwatch(me: string) {
  if (live?.me !== me || --live.users > 0) return;
  live.stop();
  live = null;
}

/** The citizen's illness, doctor visits, court cases and (for professionals) their work, kept live. */
export function useServices(me: string | null | undefined): MyServices | null {
  useEffect(() => {
    if (!me) return;
    watch(me);
    return () => unwatch(me);
  }, [me]);
  return useSyncExternalStore(subscribe, () => state, () => null);
}

export const currentServices = () => state;
export const isIll = () => !!state?.illness;

const after = async <T,>(p: Promise<{ data?: T; error?: string }>) => { const r = await p; await Promise.all([reloadServices(), refreshCitizen()]); return r; };

export const takeInterview = (job: number, answers: number[]) => call<{ passed: boolean; score: number }>("take_interview", { p_job: job, p_answers: answers });
export const professionals = (service: Service) => call<Professional[]>("professionals", { p_service: service });
export const setServiceFee = (fee: number) => after(call<null>("set_service_fee", { p_fee: fee }));
export const localClinic = () => after(call<null>("local_clinic"));
export const requestDoctor = (doctor: string) => after(call<number>("request_doctor", { p_doctor: doctor }));
export const cancelConsult = (id: number) => after(call<null>("cancel_consult", { p_consult: id }));
export const treatPatient = (id: number, treatment: number) => after(call<boolean>("treat_patient", { p_consult: id, p_treatment: treatment }));
export const hireLawyer = (caseId: number, kind: "player" | "aid" | "senior", lawyer?: string) => after(call<null>("hire_lawyer", { p_case: caseId, p_kind: kind, p_lawyer: lawyer ?? null }));
export const prepareDefence = (caseId: number, answers: number[]) => after(call<number>("prepare_defence", { p_case: caseId, p_answers: answers }));
export const payBail = (caseId: number) => after(call<null>("pay_bail", { p_case: caseId }));
export const goToCourt = (caseId: number) => after(call<CaseView>("go_to_court", { p_case: caseId }));

// ---------------------------------------------------------------- falling ill

let lastRoll = 0;
/** Rolls the dice after something risky: a meal, being run down, or the midday heat. */
export function maybeFallIll(trigger: "meal" | "rundown" | "heat") {
  if (state?.illness || Date.now() - lastRoll < 60_000) return;
  lastRoll = Date.now();
  const { mealChance, runDownChance, heatChance } = SERVICES.illness;
  const [chance, kind] = trigger === "meal" ? [mealChance, "food-poisoning"] : trigger === "rundown" ? [runDownChance, "flu"] : [heatChance, "heatstroke"];
  if (Math.random() >= chance) return;
  void supabase().rpc("fall_ill", { p_kind: kind }).then(({ error }) => {
    if (error) return;
    void reloadServices();
    const k = illnessOf(kind);
    window.dispatchEvent(new CustomEvent("dubai:toast", { detail: `${k?.icon} You've come down with ${k?.name.toLowerCase()}. See a doctor in your phone's Clinic app.` }));
  });
}

export const openServices = (app: "clinic" | "court" | "jobs") => window.dispatchEvent(new CustomEvent("dubai:open-phone", { detail: app }));
