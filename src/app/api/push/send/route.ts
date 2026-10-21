import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { sendPushToUser } from "@/lib/push/server";
import type { PushPayload } from "@/lib/push/types";

export async function POST(req: Request) {
  try {
    const supabase = await supabaseServer();
    const { data: { user } } = await supabase.auth.getUser();

    const body = await req.json();
    const toUserId = body.toUserId;
    const notification: PushPayload = body.notification;

    if (!toUserId || !notification?.title || !notification?.body) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Verify authentication if user session is present
    const callerId = user?.id || body.fromUserId;
    if (!callerId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const result = await sendPushToUser(toUserId, notification);
    return NextResponse.json({ ok: true, ...result });
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Failed to send notification" }, { status: 500 });
  }
}

