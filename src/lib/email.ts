"use client";

// Email verification (sent by the database through Postmark; see *_email_verification.sql).

import { supabase } from "@/lib/supabase/client";

export interface EmailStatus { email: string | null; verified: boolean; sentAt: string | null }

export async function emailStatus(): Promise<EmailStatus | null> {
  const { data } = await supabase().rpc("my_email_status");
  return (data as EmailStatus) ?? null;
}

/** Emails a verification link. Resolves to a message for the player. */
export async function sendVerification(): Promise<{ ok: boolean; text: string }> {
  const { data, error } = await supabase().rpc("send_verification_email");
  if (error) return { ok: false, text: /not_configured/.test(error.message) ? "Email isn't set up yet. Try again later." : "Couldn't send the email. Try again." };
  switch (data) {
    case "sent": return { ok: true, text: "Sent! Check your inbox (and spam) for the link." };
    case "already_verified": return { ok: true, text: "Your email is already verified ✓" };
    case "too_soon": return { ok: false, text: "We just sent one. Wait a minute before asking again." };
    default: return { ok: false, text: "That's the most emails for today. Try again tomorrow." };
  }
}

export async function verifyEmail(token: string): Promise<{ ok: boolean; username?: string; error?: "expired" | "invalid" }> {
  const { data, error } = await supabase().rpc("verify_email", { p_token: token });
  if (error) return { ok: false, error: /expired/.test(error.message) ? "expired" : "invalid" };
  return { ok: true, username: data as string };
}

// ---------------------------------------------------------------- forgot password

/** Asks for a reset link by email or @username. Always "sent" (we never reveal whether an account exists). */
export async function requestPasswordReset(identifier: string): Promise<string | null> {
  const { error } = await supabase().rpc("request_password_reset", { p_identifier: identifier });
  return error ? "Couldn't send the email. Try again in a minute." : null;
}

export async function checkPasswordReset(token: string): Promise<"ok" | "expired" | "invalid"> {
  const { data } = await supabase().rpc("check_password_reset", { p_token: token });
  return (data as "ok" | "expired" | "invalid") ?? "invalid";
}

/** Sets the new password. Resolves to the account email (to sign straight in), or an error message. */
export async function resetPassword(token: string, password: string): Promise<{ email?: string; error?: string }> {
  const { data, error } = await supabase().rpc("reset_password", { p_token: token, p_password: password });
  if (!error) return { email: data as string };
  return { error: /weak_password/.test(error.message) ? "Use at least 8 characters." : /expired/.test(error.message) ? "This link has expired. Ask for a new one." : "This link doesn't work any more. Ask for a new one." };
}
