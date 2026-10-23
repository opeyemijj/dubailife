import { createClient } from "@supabase/supabase-js";
import { ageFrom, MIN_AGE } from "@/lib/age";

// Creates an account that is already confirmed, so sign-up never sends an email (and never hits
// Supabase's email rate limit). Needs SUPABASE_SERVICE_ROLE_KEY — a server-only secret.
// Responds 501 when the key isn't configured so the client can fall back to normal sign-up.

const USERNAME = /^[a-z0-9_]{3,24}$/;

export async function POST(request: Request) {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!serviceKey || !url) return Response.json({ error: "not_configured" }, { status: 501 });

  let body: { email?: string; password?: string; username?: string; display_name?: string; dob?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid request." }, { status: 400 });
  }
  const email = body.email?.trim().toLowerCase() ?? "";
  const password = body.password ?? "";
  const username = body.username?.trim().toLowerCase() ?? "";
  const displayName = body.display_name?.trim() ?? "";
  if (!/^\S+@\S+\.\S+$/.test(email)) return Response.json({ error: "Enter a valid email." }, { status: 400 });
  if (password.length < 8) return Response.json({ error: "Password must be at least 8 characters." }, { status: 400 });
  if (!USERNAME.test(username)) return Response.json({ error: "Username needs 3–24 letters, numbers or underscores." }, { status: 400 });
  if (!displayName || displayName.length > 60) return Response.json({ error: "Enter your name." }, { status: 400 });
  // Dubai Life is 21+.
  const dob = body.dob ?? "";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dob) || Number.isNaN(Date.parse(dob)) || dob < "1900-01-01" || ageFrom(dob) < MIN_AGE)
    return Response.json({ error: "Dubai Life is for players aged 21 and over." }, { status: 403 });

  const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });

  const { data: taken } = await admin.from("profiles").select("id").eq("username", username).maybeSingle();
  if (taken) return Response.json({ error: `@${username} is taken — pick another username.` }, { status: 409 });

  const { error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { username, display_name: displayName, date_of_birth: dob },
  });
  if (error) {
    const exists = /already.*(registered|exists)/i.test(error.message);
    return Response.json({ error: exists ? "An account with this email already exists. Log in instead." : error.message }, { status: exists ? 409 : 400 });
  }
  return Response.json({ ok: true });
}
