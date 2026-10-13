"use client";

// Single source of truth for the signed-in citizen.
// Identity comes from Supabase Auth; the profile (name, wallet, game state) from public.profiles.
// The wallet is authoritative on the server: spending updates the screen at once and is
// confirmed by the adjust_balance function, which can never let it go below zero.

import { useEffect, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import type { AvatarLookProps } from "@/components/avatar/roster";
import { withHomeItems, type OwnedFurniture, type Placement } from "@/lib/furniture";
import type { Accessory } from "@/lib/city/types";
import { supabase } from "@/lib/supabase/client";

export interface InventoryItem {
  uid: string;
  productId: string;
  storeId: string;
  name: string;
  price: number;
  boughtAt: string;
  icon?: string;
  /** Accessory kind if it can be worn on the avatar. */
  wearable?: Accessory;
  /** Tickets and bookings rather than objects. */
  service?: boolean;
}

export interface CitizenJob {
  storeId: string;
  storeName: string;
  role: string;
  wage: number; // AED per shift
  lastShiftAt?: string;
}

export type NeedKey = "hunger" | "energy" | "fun" | "social" | "hygiene" | "bladder";
export type Needs = Record<NeedKey, number>;
export const DEFAULT_NEEDS: Needs = { hunger: 92, energy: 85, fun: 80, social: 65, hygiene: 90, bladder: 88 };

export interface Citizen {
  id: string;
  name: string;
  username: string;
  email?: string;
  look?: AvatarLookProps;
  traits?: string[];
  dream?: string;
  home?: string;
  balance: number;
  furniture?: OwnedFurniture[];
  inventory?: InventoryItem[];
  /** Accessory product ids currently worn on the avatar. */
  worn?: string[];
  job?: CitizenJob;
  /** Wellbeing meters, 0–100. */
  needs?: Partial<Needs>;
  /** Venues visited ("placeId/venueId"), for the profile. */
  visited?: string[];
  /** Last place on the city map (world units), so travel continues across pages. */
  location?: { x: number; y: number; placeId?: string };
  createdAt: string;
}

/** Fields the client may save into profiles.citizen (identity and wallet live in their own columns). */
type GameState = Omit<Citizen, "id" | "name" | "username" | "email" | "balance" | "createdAt">;

export interface CitizenState {
  citizen: Citizen | null;
  isLoggedIn: boolean;
  /** False until the auth session (and profile) have been checked. */
  hydrated: boolean;
  /** Signed in with Supabase but hasn't finished onboarding (no profile yet). */
  needsOnboarding: boolean;
  session: { userId: string; email?: string; meta: Record<string, unknown> } | null;
}

export const DEFAULT_BALANCE = 50000;

const SERVER_STATE: CitizenState = { citizen: null, isLoggedIn: false, hydrated: false, needsOnboarding: false, session: null };

let state: CitizenState = SERVER_STATE;
let started = false;
// Set by signOut so protected pages send the user home instead of to the sign-up modal.
let signedOutOnPurpose = false;
const listeners = new Set<() => void>();

function setState(next: CitizenState) {
  state = next;
  listeners.forEach((l) => l());
}

interface ProfileRow {
  id: string;
  username: string;
  display_name: string;
  balance: number | string;
  citizen: GameState | null;
  created_at: string;
}

function toCitizen(row: ProfileRow, email?: string): Citizen {
  return { ...(row.citizen ?? {}), id: row.id, name: row.display_name, username: row.username, email, balance: Number(row.balance), createdAt: row.created_at };
}

async function loadSession() {
  const { data } = await supabase().auth.getSession();
  const user = data.session?.user;
  if (!user) {
    setState({ citizen: null, isLoggedIn: false, hydrated: true, needsOnboarding: false, session: null });
    return;
  }
  const session = { userId: user.id, email: user.email, meta: user.user_metadata ?? {} };
  const { data: row } = await supabase().from("profiles").select("id, username, display_name, balance, citizen, created_at").eq("id", user.id).maybeSingle();
  if (!row) {
    setState({ citizen: null, isLoggedIn: false, hydrated: true, needsOnboarding: true, session });
    return;
  }
  signedOutOnPurpose = false;
  const fresh = toCitizen(row as ProfileRow, user.email);
  // Re-reading the same account (e.g. after a purchase) only refreshes server-owned fields; local game
  // state may hold changes that haven't been saved yet and must not be rolled back.
  const current = state.citizen;
  const citizen = current && current.id === fresh.id ? { ...current, balance: fresh.balance, name: fresh.name, username: fresh.username } : fresh;
  setState({ citizen, isLoggedIn: true, hydrated: true, needsOnboarding: false, session });
}

function start() {
  if (started || typeof window === "undefined") return;
  started = true;
  loadSession();
  supabase().auth.onAuthStateChange((event) => {
    if (event === "SIGNED_IN" || event === "SIGNED_OUT" || event === "USER_UPDATED") loadSession();
  });
}

function getSnapshot(): CitizenState {
  start();
  return state;
}

function subscribe(listener: () => void) {
  start();
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useCitizen(): CitizenState {
  return useSyncExternalStore(subscribe, getSnapshot, () => SERVER_STATE);
}

/** Like useCitizen, but sends signed-out visitors to sign up, and unfinished sign-ups to onboarding. */
export function useRequireCitizen(): CitizenState {
  const router = useRouter();
  const current = useCitizen();
  useEffect(() => {
    if (!current.hydrated || current.isLoggedIn) return;
    if (current.needsOnboarding) router.replace("/onboarding/look");
    else router.replace(signedOutOnPurpose ? "/" : "/?signup=true");
  }, [current.hydrated, current.isLoggedIn, current.needsOnboarding, router]);
  return current;
}

/** Current state outside React (e.g. right after logging in). */
export function getCitizenState() {
  return state;
}

/** Re-reads the profile (e.g. after a property purchase changed the balance on the server). */
export function refreshCitizen() {
  return loadSession();
}

// ---------------------------------------------------------------- auth

export type AuthResult = { ok: true; needsConfirmation?: boolean } | { ok: false; error: string };

const friendly = (message: string) =>
  /already registered|already been registered/i.test(message) ? "An account with this email already exists. Log in instead."
  : /invalid login credentials/i.test(message) ? "Email or password is incorrect."
  : /email not confirmed/i.test(message) ? "Please confirm your email first — check your inbox for the link."
  : /rate limit|too many/i.test(message) ? "We're getting a lot of sign-ups right now and can't send another confirmation email yet. Please try again in a little while."
  : /email address .* is invalid/i.test(message) ? "That email address doesn't look right — please check it."
  : /password/i.test(message) && /at least/i.test(message) ? "Password must be at least 6 characters."
  : message;

export async function isUsernameTaken(username: string) {
  const { data } = await supabase().from("profiles").select("id").eq("username", username).maybeSingle();
  return !!data;
}

/**
 * Creates the account. Preferred path: the server creates it already confirmed (no email is sent),
 * then we log straight in. Without the server key, falls back to Supabase sign-up, which emails a
 * confirmation link and only gives a session once it's clicked.
 */
export async function signUpWithEmail(email: string, password: string, meta: { username: string; display_name: string }): Promise<AuthResult> {
  const res = await fetch("/api/auth/signup", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, ...meta }),
  }).catch(() => null);
  if (res && res.status !== 501) {
    const body = await res.json().catch(() => ({}));
    if (!res.ok) return { ok: false, error: body.error ?? "Sign-up failed. Please try again." };
    return logIn(email, password);
  }
  // Instant sign-up: the account is created already confirmed, then signed in — no email step.
  const { error } = await supabase().rpc("register_account", { p_email: email, p_password: password, p_username: meta.username, p_display_name: meta.display_name });
  if (error) {
    const m = error.message;
    return {
      ok: false,
      error: /already_registered/.test(m) ? "An account with this email already exists. Log in instead."
        : /username_taken/.test(m) ? `@${meta.username} is taken — pick another username.`
        : /invalid_email/.test(m) ? "That email address doesn't look right — please check it."
        : /weak_password/.test(m) ? "Password must be at least 8 characters."
        : /invalid_username/.test(m) ? "Usernames are 3–24 letters, numbers, dots or underscores."
        : /too_many/.test(m) ? "Lots of people are joining right now — please try again in a minute."
        : "Sign-up failed. Please try again.",
    };
  }
  return logIn(email, password);
}


export async function resendConfirmation(email: string): Promise<AuthResult> {
  const { error } = await supabase().auth.resend({ type: "signup", email, options: { emailRedirectTo: `${window.location.origin}/auth/callback?next=/onboarding/look` } });
  return error ? { ok: false, error: friendly(error.message) } : { ok: true };
}

/** Signs in with an email address or a @username. */
export async function logIn(identifier: string, password: string): Promise<AuthResult> {
  let email = identifier.trim();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    // A username: the server swaps it for the account email only if the password is right.
    const { data, error: lookupError } = await supabase().rpc("email_for_login", { p_username: email, p_password: password });
    if (lookupError) return { ok: false, error: /too_many/.test(lookupError.message) ? "Too many attempts. Please wait 15 minutes and try again." : "Couldn't log in. Please try again." };
    if (!data) return { ok: false, error: "Username or password is incorrect." };
    email = data as string;
  }
  const { error } = await supabase().auth.signInWithPassword({ email, password });
  if (error) return { ok: false, error: friendly(error.message) };
  await loadSession();
  return { ok: true };
}

/** Finishes onboarding: creates the profile row for the signed-in account. */
export async function createProfile(input: { username: string; name: string; balance: number; game: GameState }): Promise<AuthResult> {
  const userId = state.session?.userId;
  if (!userId) return { ok: false, error: "Your session expired. Please log in again." };
  const { error } = await supabase().from("profiles").insert({
    id: userId,
    username: input.username,
    display_name: input.name,
    balance: input.balance,
    citizen: input.game,
  });
  if (error) return { ok: false, error: /duplicate key.*username/i.test(error.message) ? "That username is taken — go back and pick another." : error.message };
  await loadSession();
  return { ok: true };
}

export async function signOut() {
  signedOutOnPurpose = true;
  setState({ ...state, citizen: null, isLoggedIn: false, needsOnboarding: false, session: null });
  await supabase().auth.signOut();
}

// ---------------------------------------------------------------- game state

let saveTimer: ReturnType<typeof setTimeout> | null = null;

function gameStateOf(c: Citizen): GameState {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { id, name, username, email, balance, createdAt, ...game } = c;
  return game;
}

/** Updates the citizen locally and saves its game state to the profile shortly after. */
export function updateCitizen(fn: (c: Citizen) => Citizen) {
  if (!state.citizen) return;
  const next = fn(state.citizen);
  setState({ ...state, citizen: next });
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    supabase().from("profiles").update({ citizen: gameStateOf(next) }).eq("id", next.id).then(() => {});
  }, 600);
}

/**
 * Adds (or with a negative delta, removes) AED. Returns false without changing anything if the
 * citizen can't afford it. The server confirms the change; if it refuses, the balance is re-read.
 */
export function adjustBalance(delta: number): boolean {
  const c = state.citizen;
  if (!c) return false;
  const balance = c.balance + delta;
  if (balance < 0) return false;
  setState({ ...state, citizen: { ...c, balance } });
  supabase().rpc("adjust_balance", { p_delta: delta }).then(({ data, error }) => {
    if (error) loadSession();
    else if (state.citizen) setState({ ...state, citizen: { ...state.citizen, balance: Number(data) } });
  });
  return true;
}

/** Charges the price and adds the item to storage. Returns its uid, or null if unaffordable. */
export function buyFurniture(itemId: string, price: number): string | null {
  if (!adjustBalance(-price)) return null;
  const uid = `${itemId}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
  updateCitizen((c) => ({ ...c, furniture: [...(c.furniture ?? []), { uid, itemId, placement: null }] }));
  return uid;
}

/** Places, moves, or (with null) stores an owned item. */
export function setFurniturePlacement(uid: string, placement: Placement | null) {
  updateCitizen((c) => ({
    ...c,
    // Includes what came with the home, so those can be moved and stored too.
    furniture: withHomeItems(c.furniture ?? []).map((f) => (f.uid === uid ? { ...f, placement } : f)),
  }));
}

/** Raises (or lowers) a need, clamped to 0–100. */
export function boostNeed(need: NeedKey, amount: number) {
  updateCitizen((c) => {
    const needs = { ...DEFAULT_NEEDS, ...c.needs };
    return { ...c, needs: { ...needs, [need]: Math.max(0, Math.min(100, needs[need] + amount)) } };
  });
}
