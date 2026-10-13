"use client";

// In-progress sign-up, kept in localStorage so a refresh — or the email-confirmation link opening
// in a new tab — picks up where the user was.
// Cleared when onboarding finishes. The password is never stored.

import { useSyncExternalStore } from "react";
import type { AvatarLookProps } from "@/components/avatar/roster";

export interface SignupForm {
  name: string;
  username: string;
  email: string;
  dobDay: string;
  dobMonth: string;
  dobYear: string;
  agree18: boolean;
}

export interface SignupDraft {
  /** What's typed into the sign-up form so far. */
  form?: Partial<SignupForm>;
  /** Set once the age check is confirmed; onboarding needs it. */
  account?: { name: string; username: string; email?: string; dob: { day: string; month: string; year: string } };
  look?: AvatarLookProps;
  traits?: string[];
  dream?: string;
  home?: string;
}

const KEY = "dubai_signup_draft";
const EMPTY: SignupDraft = {};
let draft: SignupDraft | null = null; // null until read on the client
const listeners = new Set<() => void>();

function read(): SignupDraft {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : EMPTY;
  } catch {
    return EMPTY;
  }
}

function getSnapshot(): SignupDraft {
  if (draft === null) draft = read();
  return draft;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** The current draft, or null during server render / before hydration. */
export function useSignupDraft(): SignupDraft | null {
  return useSyncExternalStore(subscribe, getSnapshot, () => null);
}

export function updateSignupDraft(patch: Partial<SignupDraft> | ((d: SignupDraft) => Partial<SignupDraft>)) {
  const current = getSnapshot();
  draft = { ...current, ...(typeof patch === "function" ? patch(current) : patch) };
  try {
    localStorage.setItem(KEY, JSON.stringify(draft));
  } catch {}
  listeners.forEach((l) => l());
}

export function clearSignupDraft() {
  draft = EMPTY;
  try {
    localStorage.removeItem(KEY);
  } catch {}
  listeners.forEach((l) => l());
}
