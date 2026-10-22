import { createClient } from "@supabase/supabase-js";
import { getCourse } from "@/lib/city/academic";
import { gradeStep } from "@/lib/academy/grade";

// Marks an Academic City quiz or exam on the server against the course JSON, then records the result
// (lesson order, one new lesson a day, graduation) with academy_record. The answer key never has to be
// trusted from the app. Needs SUPABASE_SERVICE_ROLE_KEY; responds 501 without it so the app falls back
// to self-reported results (allowed only while the academy.self_grading setting is on).

export async function POST(request: Request) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !serviceKey || !anonKey) return Response.json({ error: "not_configured" }, { status: 501 });

  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return Response.json({ error: "not_signed_in" }, { status: 401 });
  const { data: { user } } = await createClient(url, anonKey, { auth: { persistSession: false } }).auth.getUser(token);
  if (!user) return Response.json({ error: "not_signed_in" }, { status: 401 });

  let body: { courseId?: string; step?: number; answers?: Array<number | null>; catchUp?: number };
  try { body = await request.json(); } catch { return Response.json({ error: "bad_request" }, { status: 400 }); }
  const course = body.courseId ? getCourse(body.courseId) : undefined;
  if (!course || !Number.isInteger(body.step) || !Array.isArray(body.answers) || body.answers.length > 60) {
    return Response.json({ error: "bad_request" }, { status: 400 });
  }
  const graded = gradeStep(course, body.step!, body.answers);
  if (!graded) return Response.json({ error: "bad_step" }, { status: 400 });

  const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await admin.rpc("academy_record", {
    p_user: user.id, p_course: course.id, p_lessons: course.lessons.length, p_step: body.step,
    p_passed: graded.passed, p_score: graded.score, p_catch_up: Math.max(0, Math.floor(Number(body.catchUp) || 0)),
  });
  if (error) return Response.json({ error: error.message }, { status: 400 });
  return Response.json({ ...graded, ...(data as object) });
}
