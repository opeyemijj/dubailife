import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { sendPushToUser } from "@/lib/push/server";
import type { PushPayload } from "@/lib/push/types";

const MAX_TITLE = 80, MAX_BODY = 240;

/** Sends a notification to another player. Only for a signed-in session; the sender comes from it, never the request. */
export async function POST(req: Request) {
  try {
    const supabase = await supabaseServer();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const toUserId = body.toUserId;
    const n: PushPayload = body.notification;
    if (typeof toUserId !== "string" || typeof n?.title !== "string" || typeof n?.body !== "string" || !n.title || !n.body) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Short text, and tapping it can only open a page in the game (never another site).
    const url = typeof n.url === "string" && n.url.startsWith("/") && !n.url.startsWith("//") && !n.url.includes("\\") ? n.url : "/phone";
    const result = await sendPushToUser(toUserId, {
      title: n.title.slice(0, MAX_TITLE),
      body: n.body.slice(0, MAX_BODY),
      url,
      tag: typeof n.tag === "string" ? n.tag.slice(0, 80) : undefined,
    });
    return NextResponse.json({ ok: true, ...result });
  } catch {
    return NextResponse.json({ error: "Failed to send notification" }, { status: 500 });
  }
}
