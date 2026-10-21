import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { sendPushToUser } from "@/lib/push/server";

export async function POST(req: Request) {
  try {
    const supabase = await supabaseServer();
    const { data: { user } } = await supabase.auth.getUser();

    const body = await req.json().catch(() => ({}));
    const targetUserId = user?.id || body?.userId;

    if (!targetUserId) {
      return NextResponse.json({ error: "Unauthorized or missing userId" }, { status: 401 });
    }

    const result = await sendPushToUser(targetUserId, {
      title: "Dubai Life 🏙️",
      body: "Push notifications are working! Friend requests and messages will pop up right here.",
      url: "/phone",
      tag: "test-notification",
    });

    return NextResponse.json({ ok: true, result });
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Test failed" }, { status: 500 });
  }
}

