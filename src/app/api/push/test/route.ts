import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { sendPushToUser } from "@/lib/push/server";

export async function POST(req: Request) {
  try {
    const supabase = await supabaseServer();
    const { data: { user } } = await supabase.auth.getUser();

    // Only ever to yourself.
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const targetUserId = user.id;

    const result = await sendPushToUser(targetUserId, {
      title: "mydubailife.app 🏙️",
      body: "Push notifications are working! Friend requests and messages will pop up right here.",
      url: "/phone",
      tag: "test-notification",
    });

    return NextResponse.json({ ok: true, result });
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Test failed" }, { status: 500 });
  }
}

