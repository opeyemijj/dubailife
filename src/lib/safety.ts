"use client";

// Trust and safety (design spec section 15): block and report players, delete your own account, and give a
// date of birth on accounts made before the 21+ gate. The database refuses messages, friend requests,
// money and knocks between blocked players (error 'blocked').

import { supabase } from "@/lib/supabase/client";

export const REPORT_REASONS = [
  { id: "harassment", label: "Harassment or bullying" },
  { id: "hate", label: "Hate or insults about religion, race or a country" },
  { id: "sexual", label: "Sexual messages or content" },
  { id: "scam", label: "Scam or asking for real money" },
  { id: "spam", label: "Spam" },
  { id: "underage", label: "Seems to be under 21" },
  { id: "other", label: "Something else" },
] as const;
export type ReportReason = (typeof REPORT_REASONS)[number]["id"];

/** The player-facing text for a database 'blocked' refusal. */
export const BLOCKED_TEXT = "You can't do that — one of you has blocked the other.";
export const isBlockedError = (e: { message?: string } | null | undefined) => !!e?.message && /\bblocked\b/.test(e.message);

/** Explains a refused chat message (blocked or muted) in a toast. */
export function chatRefused(e: { message?: string } | null | undefined) {
  const text = isBlockedError(e) ? BLOCKED_TEXT
    : e?.message && /\bmuted\b/.test(e.message) ? "You're muted for 7 days for breaking the community rules."
    : e?.message && /phone_hacked/.test(e.message) ? "📵 Your phone was hacked in the scam simulation. Chat is paused for 2 hours." : null;
  if (text) window.dispatchEvent(new CustomEvent("dubai:toast", { detail: text }));
}

export async function blockUser(userId: string): Promise<string | null> {
  const { error } = await supabase().rpc("block_user", { p_user: userId });
  if (!error) blocked = null;
  return error ? "Couldn't block them. Try again." : null;
}

export async function unblockUser(userId: string): Promise<string | null> {
  const { error } = await supabase().rpc("unblock_user", { p_user: userId });
  if (!error) blocked = null;
  return error ? "Couldn't unblock them. Try again." : null;
}

let blocked: Promise<Set<string>> | null = null;
/** Ids of the players I've blocked (cached until I block or unblock someone). */
export function myBlocks(): Promise<Set<string>> {
  return (blocked ??= Promise.resolve(supabase().from("user_blocks").select("blocked_id")).then(
    ({ data }) => new Set((data ?? []).map((r: { blocked_id: string }) => r.blocked_id)),
  ));
}

export async function reportUser(userId: string, reason: ReportReason, context?: string, details?: string): Promise<string | null> {
  const { error } = await supabase().rpc("report_user", { p_user: userId, p_reason: reason, p_context: context ?? null, p_details: details?.trim() || null });
  if (!error) return null;
  return /too_many/.test(error.message) ? "You've sent a lot of reports today. Our team is on it." : "Couldn't send the report. Try again.";
}

/** Deletes the signed-in account and everything in it, then signs out. */
export async function deleteMyAccount(): Promise<string | null> {
  const { error } = await supabase().rpc("delete_my_account");
  if (error) return /admins_cannot/.test(error.message) ? "Admin accounts can't be deleted from here." : "Couldn't delete your account. Try again.";
  await supabase().auth.signOut().catch(() => {});
  try { localStorage.clear(); sessionStorage.clear(); } catch { /* storage blocked */ }
  return null;
}

/** Saves a date of birth once. Resolves to whether the player is 21+, or an error message. */
export async function setMyDob(iso: string): Promise<{ ok: boolean; error?: string }> {
  const { data, error } = await supabase().rpc("set_my_dob", { p_dob: iso });
  if (error) return { ok: false, error: /already_set/.test(error.message) ? "Your date of birth is already saved." : "Couldn't save it. Try again." };
  await supabase().auth.refreshSession().catch(() => {});
  return { ok: data === true };
}
