import { createClient } from "@supabase/supabase-js";
import { gradeTheory } from "@/lib/driving/theory";

// Grades the Driving Academy theory exam on the server and records it with driving_record. Needs
// SUPABASE_SERVICE_ROLE_KEY; responds 501 without it so the app falls back to self-reporting (allowed only
// while academy.self_grading is on).

export async function POST(request: Request) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !serviceKey || !anonKey) return Response.json({ error: "not_configured" }, { status: 501 });

  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  const { data: { user } } = token ? await createClient(url, anonKey, { auth: { persistSession: false } }).auth.getUser(token) : { data: { user: null } };
  if (!user) return Response.json({ error: "not_signed_in" }, { status: 401 });

  let body: { answers?: Array<[number, number]> };
  try { body = await request.json(); } catch { return Response.json({ error: "bad_request" }, { status: 400 }); }
  const graded = Array.isArray(body.answers) ? gradeTheory(body.answers) : null;
  if (!graded) return Response.json({ error: "bad_request" }, { status: 400 });

  const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await admin.rpc("driving_record", { p_user: user.id, p_stage: "theory", p_passed: graded.passed, p_score: graded.score });
  if (error) return Response.json({ error: error.message }, { status: 400 });
  return Response.json({ ...graded, progress: data });
}
